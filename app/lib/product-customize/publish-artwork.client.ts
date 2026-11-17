import {
  GENERATED_ARTWORK_NAME_PREFIX,
  type ArtworkUrlPayload,
} from "./types";

const MAX_UPLOAD_BYTES = 9 * 1024 * 1024;
const MAX_PUBLISH_PAYLOAD_BYTES = 768 * 1024;
const UPLOAD_CONCURRENCY = 4;
const PROJECTED_ARTWORK_URL =
  `https://generated-artwork.invalid/${"x".repeat(512)}`;

type ArtworkField = "artworkUrl" | "customArtworkUrl";

type UploadJob = {
  dataUrl: string;
  colorCode: string;
  placement: string;
  kind: ArtworkField;
};

type ArtworkReference = {
  dataUrl: string;
  item: ArtworkUrlPayload;
  field: ArtworkField;
};

export class GeneratedArtworkUploadError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "GeneratedArtworkUploadError";
  }
}

function assertPayloadSize(formData: FormData, artworkUrls: string): void {
  let bytes = 0;
  for (const [name, value] of formData.entries()) {
    const valueBytes =
      name === "artworkUrls"
        ? new Blob([artworkUrls]).size
        : typeof value === "string"
          ? new Blob([value]).size
          : value.size;
    bytes += new Blob([name]).size + valueBytes + 128;
  }

  if (bytes > MAX_PUBLISH_PAYLOAD_BYTES) {
    const sizeMb = (bytes / (1024 * 1024)).toFixed(1);
    throw new Error(
      `The final publish request is ${sizeMb} MB, above the 768 KB safety limit. Reduce the number of artwork layers and retry.`
    );
  }
}

function projectArtworkUrls(
  artworkUrls: Record<string, ArtworkUrlPayload>
): string {
  const projected: Record<string, ArtworkUrlPayload> = {};

  for (const [key, item] of Object.entries(artworkUrls)) {
    projected[key] = {
      ...item,
      artworkUrl: item.artworkUrl.startsWith("data:image/")
        ? PROJECTED_ARTWORK_URL
        : item.artworkUrl,
      customArtworkUrl: item.customArtworkUrl?.startsWith("data:image/")
        ? PROJECTED_ARTWORK_URL
        : item.customArtworkUrl,
    };
  }

  return JSON.stringify(projected);
}

async function hashBlob(blob: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure image caching is unavailable. Reload the Shopify admin and retry.");
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    await blob.arrayBuffer()
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeFilePart(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "artwork"
  );
}

async function sendArtworkFile(
  job: UploadJob,
  productKey: string,
  blob: Blob
): Promise<string> {
  const extension =
    blob.type === "image/webp"
      ? "webp"
      : blob.type === "image/jpeg"
        ? "jpg"
        : "png";
  const file = new File(
    [blob],
    `${GENERATED_ARTWORK_NAME_PREFIX}${safeFilePart(job.placement)}-${safeFilePart(job.colorCode)}-${job.kind}.${extension}`,
    { type: blob.type }
  );
  const body = new FormData();
  body.set("file", file);
  body.set("productKey", productKey);
  body.set("placement", job.placement);
  body.set("colorCode", job.colorCode);

  let response: Response;
  try {
    response = await fetch("/app/api/artworks-upload", {
      method: "POST",
      body,
    });
  } catch {
    throw new GeneratedArtworkUploadError(
      "The artwork upload connection failed. Retry the upload.",
      true
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    item?: { url?: string } | null;
  };

  if (!response.ok || !payload.ok || !payload.item?.url) {
    const retryable =
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500;
    const message =
      response.status === 413
        ? "A generated artwork exceeds the server's individual upload limit. Reduce the source image size and retry."
        : payload.error ||
          `Generated artwork upload failed (${response.status}).`;
    throw new GeneratedArtworkUploadError(
      message,
      retryable
    );
  }

  return payload.item.url;
}

async function uploadGeneratedArtwork(
  job: UploadJob,
  productKey: string,
  uploadedUrlCache: Map<string, string>,
  inFlightUploads: Map<string, Promise<string>>
): Promise<string> {
  let blob: Blob;
  try {
    const response = await fetch(job.dataUrl);
    if (!response.ok) {
      throw new Error("Could not read the generated image.");
    }
    blob = await response.blob();
  } catch {
    throw new GeneratedArtworkUploadError(
      "Could not read a generated artwork image. Rebuild the preview and retry.",
      false
    );
  }

  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new GeneratedArtworkUploadError(
      `A generated artwork exceeds the 9 MB per-file upload limit. Reduce its source image size and retry.`,
      false
    );
  }

  const hash = await hashBlob(blob);
  const cachedUrl = uploadedUrlCache.get(hash);
  if (cachedUrl) return cachedUrl;

  let upload = inFlightUploads.get(hash);
  if (!upload) {
    upload = sendArtworkFile(job, productKey, blob);
    inFlightUploads.set(hash, upload);
  }

  try {
    const url = await upload;
    uploadedUrlCache.set(hash, url);
    return url;
  } finally {
    if (inFlightUploads.get(hash) === upload) {
      inFlightUploads.delete(hash);
    }
  }
}

export async function uploadGeneratedArtworkUrls(
  formData: FormData,
  uploadedUrlCache: Map<string, string>,
  onProgress: (completed: number, total: number) => void
): Promise<void> {
  const raw = formData.get("artworkUrls");
  if (typeof raw !== "string") {
    throw new Error("The generated artwork payload is missing.");
  }

  const artworkUrls = JSON.parse(raw) as Record<string, ArtworkUrlPayload>;
  if (!artworkUrls || typeof artworkUrls !== "object" || Array.isArray(artworkUrls)) {
    throw new Error("The generated artwork payload is invalid.");
  }
  for (const [key, item] of Object.entries(artworkUrls)) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.colorCode !== "string" ||
      typeof item.placement !== "string" ||
      typeof item.artworkUrl !== "string" ||
      (item.customArtworkUrl != null &&
        typeof item.customArtworkUrl !== "string")
    ) {
      throw new Error("A generated artwork entry is invalid.");
    }
    if (key !== `${item.colorCode}_${item.placement}`) {
      throw new Error("A generated artwork has an invalid color or placement mapping.");
    }
  }

  const projectedArtworkUrls = projectArtworkUrls(artworkUrls);
  assertPayloadSize(formData, projectedArtworkUrls);

  const jobsByDataUrl = new Map<string, UploadJob>();
  const references: ArtworkReference[] = [];

  for (const item of Object.values(artworkUrls)) {
    for (const field of ["artworkUrl", "customArtworkUrl"] as const) {
      const dataUrl = item[field];
      if (!dataUrl?.startsWith("data:image/")) continue;
      references.push({ dataUrl, item, field });
      if (!jobsByDataUrl.has(dataUrl)) {
        jobsByDataUrl.set(dataUrl, {
          dataUrl,
          colorCode: item.colorCode,
          placement: item.placement,
          kind: field,
        });
      }
    }
  }

  const jobs = Array.from(jobsByDataUrl.values());
  if (!jobs.length) return;

  const productKey = String(formData.get("productKey") ?? "");
  const uploadedUrls = new Map<string, string>();
  const inFlightUploads = new Map<string, Promise<string>>();
  let nextJob = 0;
  let completed = 0;
  let uploadError: Error | null = null;
  onProgress(0, jobs.length);

  const workers = Array.from(
    { length: Math.min(UPLOAD_CONCURRENCY, jobs.length) },
    async () => {
      while (!uploadError) {
        const index = nextJob;
        nextJob += 1;
        const job = jobs[index];
        if (!job) return;

        try {
          uploadedUrls.set(
            job.dataUrl,
            await uploadGeneratedArtwork(
              job,
              productKey,
              uploadedUrlCache,
              inFlightUploads
            )
          );
          completed += 1;
          onProgress(completed, jobs.length);
        } catch (error) {
          uploadError =
            error instanceof Error
              ? error
              : new GeneratedArtworkUploadError(
                  "Generated artwork upload failed.",
                  false
                );
        }
      }
    }
  );

  await Promise.all(workers);
  if (uploadError) throw uploadError;

  for (const reference of references) {
    const uploadedUrl = uploadedUrls.get(reference.dataUrl);
    if (!uploadedUrl) {
      throw new Error("A generated artwork URL was not returned after upload.");
    }
    reference.item[reference.field] = uploadedUrl;
  }

  const finalArtworkUrls = JSON.stringify(artworkUrls);
  assertPayloadSize(formData, finalArtworkUrls);
  formData.set("artworkUrls", finalArtworkUrls);
}
