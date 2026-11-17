const CORNER_SAMPLE_SIZE = 8;
const MAX_IMAGE_PIXELS = 20_000_000;
const BACKGROUND_TOLERANCE = 72;
const FULL_TRANSPARENCY_DISTANCE = 24;

type Color = [number, number, number];

function colorDistance(a: Color, b: Color): number {
  const red = a[0] - b[0];
  const green = a[1] - b[1];
  const blue = a[2] - b[2];
  return Math.sqrt(red * red + green * green + blue * blue);
}

function sampleCorner(
  pixels: ImageData,
  left: number,
  top: number
): Color | null {
  const values: [number[], number[], number[]] = [[], [], []];
  const right = Math.min(pixels.width, left + CORNER_SAMPLE_SIZE);
  const bottom = Math.min(pixels.height, top + CORNER_SAMPLE_SIZE);

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * pixels.width + x) * 4;
      if (pixels.data[offset + 3] < 230) continue;
      values[0].push(pixels.data[offset]);
      values[1].push(pixels.data[offset + 1]);
      values[2].push(pixels.data[offset + 2]);
    }
  }

  if (!values[0].length) return null;

  return values.map((channel) => {
    channel.sort((a, b) => a - b);
    return channel[Math.floor(channel.length / 2)];
  }) as Color;
}

function findBackgroundColor(corners: Array<Color | null>): Color {
  const samples = corners.filter((color): color is Color => color !== null);
  let best: Color | null = null;
  let bestCount = 0;

  for (const candidate of samples) {
    const matches = samples.filter(
      (sample) => colorDistance(candidate, sample) <= 55
    );
    if (matches.length > bestCount) {
      bestCount = matches.length;
      best = [
        Math.round(matches.reduce((sum, color) => sum + color[0], 0) / matches.length),
        Math.round(matches.reduce((sum, color) => sum + color[1], 0) / matches.length),
        Math.round(matches.reduce((sum, color) => sum + color[2], 0) / matches.length),
      ];
    }
  }

  if (!best || bestCount < 2) {
    throw new Error("Could not detect a solid-color background. Try an image with a plain background.");
  }

  return best;
}

function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not create the transparent image."));
      }
    }, "image/png");
  });
}

export async function removeSolidBackground(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);

  try {
    const { width, height } = bitmap;
    const pixelCount = width * height;
    if (!width || !height || pixelCount > MAX_IMAGE_PIXELS) {
      throw new Error("This image is too large to process in the browser.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Your browser could not prepare the image for editing.");
    }

    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, width, height);
    const background = findBackgroundColor([
      sampleCorner(pixels, 0, 0),
      sampleCorner(pixels, Math.max(0, width - CORNER_SAMPLE_SIZE), 0),
      sampleCorner(pixels, 0, Math.max(0, height - CORNER_SAMPLE_SIZE)),
      sampleCorner(
        pixels,
        Math.max(0, width - CORNER_SAMPLE_SIZE),
        Math.max(0, height - CORNER_SAMPLE_SIZE)
      ),
    ]);

    const visited = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);
    let head = 0;
    let tail = 0;

    const enqueueIfBackground = (index: number) => {
      if (visited[index]) return;
      const offset = index * 4;
      if (pixels.data[offset + 3] < 16) return;

      const distance = colorDistance(
        [pixels.data[offset], pixels.data[offset + 1], pixels.data[offset + 2]],
        background
      );
      if (distance > BACKGROUND_TOLERANCE) return;

      visited[index] = 1;
      queue[tail] = index;
      tail += 1;
    };

    for (let x = 0; x < width; x += 1) {
      enqueueIfBackground(x);
      enqueueIfBackground((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueueIfBackground(y * width);
      enqueueIfBackground(y * width + width - 1);
    }

    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0) enqueueIfBackground(index - 1);
      if (x < width - 1) enqueueIfBackground(index + 1);
      if (y > 0) enqueueIfBackground(index - width);
      if (y < height - 1) enqueueIfBackground(index + width);
    }

    if (tail < pixelCount * 0.01) {
      throw new Error("Could not find a removable solid background. Try again with a plainer background.");
    }

    for (let index = 0; index < tail; index += 1) {
      const pixelIndex = queue[index];
      const offset = pixelIndex * 4;
      const distance = colorDistance(
        [pixels.data[offset], pixels.data[offset + 1], pixels.data[offset + 2]],
        background
      );
      const opacity = Math.max(
        0,
        Math.min(
          1,
          (distance - FULL_TRANSPARENCY_DISTANCE) /
            (BACKGROUND_TOLERANCE - FULL_TRANSPARENCY_DISTANCE)
        )
      );
      pixels.data[offset + 3] = Math.round(pixels.data[offset + 3] * opacity);
    }

    context.putImageData(pixels, 0, 0);
    return await toPngBlob(canvas);
  } finally {
    bitmap.close();
  }
}
