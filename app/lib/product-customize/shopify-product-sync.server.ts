import { authenticate } from "../../shopify.server";

type ShopifyAdmin = Awaited<ReturnType<typeof authenticate.admin>>["admin"];

type ShopifyGraphqlError = { message: string };
type ShopifyGraphqlResult<T> = {
  data?: T;
  errors?: ShopifyGraphqlError[];
};

type ProductMockup = {
  placement: string;
  color: string;
  data_url: string;
};

type ProductMediaQueryData = {
  product: {
    media: {
      nodes: Array<{ id: string }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
};

type ProductVariantsQueryData = {
  product: {
    variants: {
      nodes: Array<{ id: string; sku: string | null }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
};

async function graphqlData<T>(
  admin: ShopifyAdmin,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await admin.graphql(query, { variables });
  const result = (await response.json()) as ShopifyGraphqlResult<T>;

  if (!response.ok) {
    throw new Error(`Shopify request failed (HTTP ${response.status}).`);
  }
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join("; "));
  }
  if (!result.data) {
    throw new Error("Shopify returned an empty GraphQL response.");
  }

  return result.data;
}

function productGid(value: string): string {
  const trimmed = value.trim();
  if (/^gid:\/\/shopify\/Product\/\d+$/.test(trimmed)) return trimmed;
  if (/^\d+$/.test(trimmed)) return `gid://shopify/Product/${trimmed}`;
  throw new Error("The publish API did not return a valid Shopify product ID.");
}

function readDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(
    dataUrl
  );
  if (!match) {
    throw new Error("A generated product mockup is not a valid PNG or JPEG.");
  }

  const mimeType = match[1];
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!bytes.length) {
    throw new Error("A generated product mockup is empty.");
  }

  return {
    mimeType,
    bytes,
    extension: mimeType === "image/png" ? "png" : "jpg",
  };
}

function assertNoUserErrors(
  errors: ShopifyGraphqlError[] | null | undefined,
  operation: string
) {
  if (errors?.length) {
    throw new Error(
      `${operation}: ${errors.map((error) => error.message).join("; ")}`
    );
  }
}

async function listProductMediaIds(
  admin: ShopifyAdmin,
  productId: string
): Promise<string[]> {
  const mediaIds: string[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: ProductMediaQueryData = await graphqlData<ProductMediaQueryData>(
      admin,
      `query ProductMediaForSync($id: ID!, $after: String) {
        product(id: $id) {
          media(first: 250, after: $after) {
            nodes { id }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      { id: productId, after }
    );

    if (!data.product) {
      throw new Error("The Shopify product could not be found while syncing media.");
    }

    mediaIds.push(...data.product.media.nodes.map((media) => media.id));
    hasNextPage = data.product.media.pageInfo.hasNextPage;
    after = data.product.media.pageInfo.endCursor;
  }

  return mediaIds;
}

async function waitForMediaReady(
  admin: ShopifyAdmin,
  mediaIds: string[]
): Promise<void> {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const data = await graphqlData<{
      nodes: Array<{
        id: string;
        fileStatus: string;
        preview: { image: { url: string } | null } | null;
      } | null>;
    }>(
      admin,
      `query CustomizeMediaStatus($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on MediaImage {
            id
            fileStatus
            preview { image { url } }
          }
        }
      }`,
      { ids: mediaIds }
    );

    const statuses = data.nodes.filter(
      (node): node is NonNullable<typeof node> => node !== null
    );
    if (statuses.some((media) => media.fileStatus === "FAILED")) {
      throw new Error("Shopify failed to process one or more uploaded mockups.");
    }
    if (
      statuses.length === mediaIds.length &&
      statuses.every(
        (media) => media.fileStatus === "READY" && media.preview?.image?.url
      )
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Shopify is still processing the uploaded mockups. Try again shortly.");
}

export async function syncShopifyProductMedia(
  admin: ShopifyAdmin,
  rawProductId: string,
  mockups: ProductMockup[],
  replaceExisting: boolean
) {
  if (!mockups.length) {
    return { uploaded: 0 };
  }
  if (mockups.length > 5) {
    throw new Error("Shopify media sync accepts at most five mockups per request.");
  }

  const productId = productGid(rawProductId);
  const existingMediaIds = replaceExisting
    ? await listProductMediaIds(admin, productId)
    : [];
  const mediaInputs: Array<{
    alt: string;
    mediaContentType: "IMAGE";
    originalSource: string;
  }> = [];

  for (const [index, mockup] of mockups.entries()) {
    const { bytes, mimeType, extension } = readDataUrl(mockup.data_url);
    const safeColor = mockup.color.replace(/[^a-zA-Z0-9_-]/g, "-");
    const safePlacement = mockup.placement.replace(/[^a-zA-Z0-9_-]/g, "-");
    const filename = `dtfta-${safeColor}-${safePlacement}-${Date.now()}-${index}.${extension}`;

    const stagedData = await graphqlData<{
      stagedUploadsCreate: {
        stagedTargets: Array<{
          url: string;
          resourceUrl: string;
          parameters: Array<{ name: string; value: string }>;
        }>;
        userErrors: ShopifyGraphqlError[];
      };
    }>(
      admin,
      `mutation CreateMockupUploadTarget($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets { url resourceUrl parameters { name value } }
          userErrors { message }
        }
      }`,
      {
        input: [
          {
            resource: "PRODUCT_IMAGE",
            filename,
            mimeType,
            httpMethod: "PUT",
            fileSize: String(bytes.length),
          },
        ],
      }
    );

    const target = stagedData.stagedUploadsCreate.stagedTargets[0];
    assertNoUserErrors(
      stagedData.stagedUploadsCreate.userErrors,
      "Could not prepare mockup upload"
    );
    if (!target?.url || !target.resourceUrl) {
      throw new Error("Shopify did not provide a mockup upload destination.");
    }

    const uploadHeaders = new Headers();
    for (const parameter of target.parameters) {
      uploadHeaders.set(parameter.name, parameter.value);
    }

    const uploadResponse = await fetch(target.url, {
      method: "PUT",
      headers: uploadHeaders,
      body: new Uint8Array(bytes),
    });
    if (!uploadResponse.ok) {
      throw new Error(
        `Shopify image upload failed (HTTP ${uploadResponse.status}).`
      );
    }

    mediaInputs.push({
      alt: `DTFTA artwork - ${mockup.color} - ${mockup.placement}`,
      mediaContentType: "IMAGE",
      originalSource: target.resourceUrl,
    });
  }

  const createdData = await graphqlData<{
    productCreateMedia: {
    media: Array<{ id: string; status: string }>;
      mediaUserErrors: ShopifyGraphqlError[];
      userErrors: ShopifyGraphqlError[];
    };
  }>(
    admin,
    `mutation AddCustomizeMockups($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { id status }
        mediaUserErrors { message }
        userErrors { message }
      }
    }`,
    { productId, media: mediaInputs }
  );

  assertNoUserErrors(
    createdData.productCreateMedia.mediaUserErrors,
    "Could not add product mockups"
  );
  assertNoUserErrors(
    createdData.productCreateMedia.userErrors,
    "Could not add product mockups"
  );
  if (
    createdData.productCreateMedia.media.length !== mediaInputs.length ||
    createdData.productCreateMedia.media.some(
      (media) => media.status === "FAILED"
    )
  ) {
    throw new Error("Shopify did not accept every generated product mockup.");
  }
  await waitForMediaReady(
    admin,
    createdData.productCreateMedia.media.map((media) => media.id)
  );

  for (let index = 0; index < existingMediaIds.length; index += 250) {
    const deletedData = await graphqlData<{
      productDeleteMedia: {
        mediaUserErrors: ShopifyGraphqlError[];
        userErrors: ShopifyGraphqlError[];
      };
    }>(
      admin,
      `mutation RemoveBrokenCustomizeMedia($productId: ID!, $mediaIds: [ID!]!) {
        productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
          mediaUserErrors { message }
          userErrors { message }
        }
      }`,
      { productId, mediaIds: existingMediaIds.slice(index, index + 250) }
    );

    assertNoUserErrors(
      deletedData.productDeleteMedia.mediaUserErrors,
      "Could not remove the broken product mockups"
    );
    assertNoUserErrors(
      deletedData.productDeleteMedia.userErrors,
      "Could not remove the broken product mockups"
    );
  }

  return { uploaded: mediaInputs.length };
}

export async function retainSelectedShopifyVariants(
  admin: ShopifyAdmin,
  rawProductId: string,
  selectedSkus: string[]
) {
  const normalizedSkus = new Set(
    selectedSkus.map((sku) => sku.trim()).filter(Boolean)
  );
  if (!normalizedSkus.size) {
    throw new Error("Select at least one variant before adding the product.");
  }

  const productId = productGid(rawProductId);
  const variants: Array<{ id: string; sku: string | null }> = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: ProductVariantsQueryData =
      await graphqlData<ProductVariantsQueryData>(
      admin,
      `query ProductVariantsForSelection($id: ID!, $after: String) {
        product(id: $id) {
          variants(first: 250, after: $after) {
            nodes { id sku }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      { id: productId, after }
    );

    if (!data.product) {
      throw new Error("The Shopify product could not be found while filtering variants.");
    }

    variants.push(...data.product.variants.nodes);
    hasNextPage = data.product.variants.pageInfo.hasNextPage;
    after = data.product.variants.pageInfo.endCursor;
  }

  const selectedVariants = variants.filter((variant) =>
    normalizedSkus.has(variant.sku?.trim() ?? "")
  );
  const matchingSkus = new Map<string, number>();
  for (const variant of variants) {
    const sku = variant.sku?.trim() ?? "";
    if (normalizedSkus.has(sku)) {
      matchingSkus.set(sku, (matchingSkus.get(sku) ?? 0) + 1);
    }
  }
  if (
    !selectedVariants.length ||
    Array.from(normalizedSkus).some((sku) => matchingSkus.get(sku) !== 1)
  ) {
    throw new Error(
      "Selected variant SKUs did not match exactly one Shopify variant each."
    );
  }

  const selectedIds = new Set(selectedVariants.map((variant) => variant.id));
  const variantIdsToDelete = variants
    .filter((variant) => !selectedIds.has(variant.id))
    .map((variant) => variant.id);

  for (let index = 0; index < variantIdsToDelete.length; index += 250) {
    const deletedData = await graphqlData<{
      productVariantsBulkDelete: {
        userErrors: ShopifyGraphqlError[];
      };
    }>(
      admin,
      `mutation RemoveUnselectedVariants($productId: ID!, $variantsIds: [ID!]!) {
        productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
          userErrors { message }
        }
      }`,
      {
        productId,
        variantsIds: variantIdsToDelete.slice(index, index + 250),
      }
    );

    assertNoUserErrors(
      deletedData.productVariantsBulkDelete.userErrors,
      "Could not remove unselected product variants"
    );
  }

  return {
    retained: selectedVariants.length,
    removed: variantIdsToDelete.length,
  };
}
