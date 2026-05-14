import { useCallback, useEffect, useMemo, useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import {
  AppProvider as PolarisAppProvider,
  Page,
  Card,
  BlockStack,
  Badge,
  InlineStack,
  List,
  Text,
  Modal,
  DropZone,
  Thumbnail,
  Scrollable,
  useMediaQuery,
} from "@shopify/polaris";
import translations from "@shopify/polaris/locales/en.json";
import CustomizeCanvasSection from "../components/product-customize/CustomizeCanvasSection";
import ArtworkLayersPanel from "../components/product-customize/ArtworkLayersPanel";
import type { DesignLayerSummary } from "../lib/product-customize/design-layer-summary";
import ColorSelector from "../components/product-customize/ColorSelector";
import ProductMeta from "../components/product-customize/ProductMeta";
import AppHeroBanner from "../common/AppHeroBanner";
import { useProductCustomize } from "../lib/product-customize/useProductCustomize";
import type { MultiPlacementPreview } from "../lib/product-customize/mockup-composer";
import {
  loadCustomizeProduct,
  publishCustomizeProduct,
} from "../lib/product-customize/customize-product.server";
import { normalizePlacementKey } from "../lib/product-customize/helpers";
import {
  brandColors,
  brandPrimaryButtonBg,
  brandPrimaryCtaShadow,
} from "../lib/brand-theme";

export const loader = async (args: LoaderFunctionArgs) => {
  return loadCustomizeProduct(args);
};

export const action = async (args: ActionFunctionArgs) => {
  return publishCustomizeProduct(args);
};

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function ProductCustomize() {
  const acceptedArtworkMimeTypes = "image/svg+xml,image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/bmp,image/tiff";
  const [canvasActions, setCanvasActions] = useState<{
    addText: () => void;
    addImage: (file: File) => Promise<void>;
    addImageFromUrl: (
      url: string,
      options?: { libraryArtworkId?: string }
    ) => Promise<void>;
    deleteSelected: () => void;
    clear: () => void;
  } | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] =
    useState<MultiPlacementPreview | null>(null);
  const [previewPlacement, setPreviewPlacement] = useState<string>("");
  const [previewColor, setPreviewColor] = useState<string>("");
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [isBuildingPreview, setIsBuildingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const PREVIEW_ZOOM_MIN = 0.5;
  const PREVIEW_ZOOM_MAX = 3;
  const PREVIEW_ZOOM_STEP = 0.25;
  const [apiArtworkAssets, setApiArtworkAssets] = useState<
    Array<{ id: string; name: string; url: string; createdAt?: string; source?: string }>
  >([]);
  const [isLoadingArtwork, setIsLoadingArtwork] = useState(false);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const [artworkLoadError, setArtworkLoadError] = useState<string | null>(null);
  const [artworkCursor, setArtworkCursor] = useState("");
  const [hasMoreArtwork, setHasMoreArtwork] = useState(false);
  const [artworkType, setArtworkType] = useState<"all" | "svg" | "raster">("all");
  const [artworkSort, setArtworkSort] = useState<"recent" | "name_asc" | "name_desc">("recent");
  const [artworkSearch, setArtworkSearch] = useState("");
  const [designLayers, setDesignLayers] = useState<DesignLayerSummary[]>([]);

  const loaderData = useLoaderData<LoaderData>();
  const [searchParams] = useSearchParams();
  /** Below ~1040px the three-column studio layout stacks (matches Polaris stacked content breakpoint). */
  const isStudioStacked = useMediaQuery("(max-width: 1040px)");

  const productKey =
    loaderData.productKey ||
    searchParams.get("productKey") ||
    searchParams.get("productId") ||
    "";

  const product = loaderData.product;
  const productName = loaderData.productName;
  const listingImages: Array<{ id: string; name: string; url: string }> = [];

  const imageLibrary = useMemo(() => {
    const combined = [
      ...apiArtworkAssets,
      ...listingImages.filter((listingImage) => !apiArtworkAssets.some((asset) => asset.url === listingImage.url)),
    ];

    const isSvg = (url: string, name: string) => {
      const clean = url.split("?")[0]?.split("#")[0] ?? "";
      return clean.toLowerCase().endsWith(".svg") || name.toLowerCase().endsWith(".svg");
    };

    const typeFiltered = combined.filter((item) => {
      if (artworkType === "all") return true;
      const svg = isSvg(item.url, item.name);
      return artworkType === "svg" ? svg : !svg;
    });

    const searchTerm = artworkSearch.trim().toLowerCase();
    const searched = searchTerm
      ? typeFiltered.filter((item) => item.name.toLowerCase().includes(searchTerm))
      : typeFiltered;

    const sorted = [...searched].sort((a, b) => {
      if (artworkSort === "name_asc") return a.name.localeCompare(b.name);
      if (artworkSort === "name_desc") return b.name.localeCompare(a.name);
      const aTime = "createdAt" in a && typeof a.createdAt === "string" ? Date.parse(a.createdAt) : 0;
      const bTime = "createdAt" in b && typeof b.createdAt === "string" ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });

    return sorted;
  }, [apiArtworkAssets, artworkSearch, artworkSort, artworkType, listingImages]);

  const printAreas = useMemo(
    () =>
      (product?.print_areas ?? [])
        .filter((area) => area.is_active)
        .sort((a, b) => a.display_order - b.display_order),
    [product]
  );

  const {
    fetcher,
    placement,
    selectedColor,
    availableColors,
    selectedPrintArea,
    selectedRegion,
    selectedPrintSize,
    getCanvasStateForPlacement,
    handleCanvasReady,
    handlePrintSizeChange,
    handleRegionChange,
    handlePlacementChange,
    handleColorChange,
    handleAddToStore,
    setArtworkLibraryIdForPlacement,
    buildCurrentPreview,
  } = useProductCustomize({
    productKey,
    productName,
    productId: loaderData.productId,
    printAreas,
    variants: product?.variants ?? [],
    defaultColor: product?.variants?.[0]?.colorCode ?? "",
  });

  useEffect(() => {
    setDesignLayers([]);
  }, [placement]);

  const handleLibraryArtworkBindingChange = useCallback(
    (libraryArtworkId: string | null) => {
      setArtworkLibraryIdForPlacement(placement, libraryArtworkId);
    },
    [placement, setArtworkLibraryIdForPlacement]
  );

  const handlePreview = useCallback(async () => {
    setIsPreviewModalOpen(true);
    setIsBuildingPreview(true);
    setPreviewError(null);
    setPreviewData(null);
    setPreviewZoom(1);

    try {
      const preview = await buildCurrentPreview();
      if (!preview.placements.length) {
        setPreviewError(
          "Add some artwork or text to a placement before previewing the export."
        );
        return;
      }
      setPreviewData(preview);

      const normalizedCurrent = placement;
      const initialPlacement =
        preview.placements.find((p) => p.placement === normalizedCurrent)
          ?.placement ?? preview.placements[0].placement;
      setPreviewPlacement(initialPlacement);

      const initialEntry =
        preview.placements.find((p) => p.placement === initialPlacement) ??
        preview.placements[0];
      const firstColorWithMockup = Object.entries(
        initialEntry.mockupsByColor
      ).find(([, url]) => Boolean(url))?.[0];
      setPreviewColor(
        selectedColor && initialEntry.mockupsByColor[selectedColor]
          ? selectedColor
          : firstColorWithMockup ?? selectedColor ?? ""
      );
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Failed to build preview"
      );
    } finally {
      setIsBuildingPreview(false);
    }
  }, [buildCurrentPreview, placement, selectedColor]);

  const infoPanelStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    border: "1px solid rgba(255, 106, 0, 0.28)",
    background: "linear-gradient(145deg, #ffffff 0%, rgba(255, 106, 0, 0.08) 100%)",
    padding: 14,
    boxShadow: "0 14px 30px rgba(22,22,31,0.1)",
  };

  const rightPanelStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    border: "1px solid rgba(255, 106, 0, 0.28)",
    background: "linear-gradient(145deg, #ffffff 0%, rgba(255, 106, 0, 0.08) 100%)",
    padding: 14,
    boxShadow: "0 14px 30px rgba(22,22,31,0.1)",
  };

  const actionButtonStyle: React.CSSProperties = {
    borderRadius: 10,
    border: "1px solid transparent",
    height: 34,
    padding: "0 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
    background: brandPrimaryButtonBg,
    color: "#ffffff",
    boxShadow: brandPrimaryCtaShadow,
  };

  const loadArtworkLibrary = useCallback(async (opts?: { append?: boolean; cursor?: string }) => {
    setIsLoadingArtwork(true);
    setArtworkLoadError(null);

    try {
      const append = Boolean(opts?.append);
      const nextCursor = opts?.cursor ?? "";
      const params = new URLSearchParams({
        limit: "60",
        cursor: nextCursor,
        search: artworkSearch.trim(),
        type: artworkType,
        sort: artworkSort,
      });

      const response = await fetch(`/app/api/artworks?${params.toString()}`);
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        nextCursor?: string;
        items?: Array<{
          id?: string;
          name?: string;
          url?: string;
          createdAt?: string;
          source?: string;
        }>;
      };

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to load artwork library");
      }

      const rows = Array.isArray(payload.items) ? payload.items : [];

      const normalized = rows
        .filter((row) => typeof row?.id === "string" && typeof row?.url === "string")
        .map((row) => ({
          id: row.id as string,
          name: typeof row.name === "string" && row.name.trim() ? row.name : "Artwork",
          url: row.url as string,
          createdAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
          source: typeof row.source === "string" ? row.source : undefined,
        }));

      setApiArtworkAssets((prev) => {
        if (!append) return normalized;
        const merged = [...prev, ...normalized];
        const deduped = new Map<string, (typeof merged)[number]>();
        merged.forEach((item) => deduped.set(item.id, item));
        return Array.from(deduped.values());
      });
      const next = typeof payload.nextCursor === "string" ? payload.nextCursor : "";
      setArtworkCursor(next);
      setHasMoreArtwork(Boolean(next));
    } catch (error) {
      setArtworkLoadError(error instanceof Error ? error.message : "Failed to load artwork");
      if (!opts?.append) {
        setApiArtworkAssets([]);
      }
      setArtworkCursor("");
      setHasMoreArtwork(false);
    } finally {
      setIsLoadingArtwork(false);
    }
  }, [artworkSearch, artworkSort, artworkType]);

  const uploadArtwork = useCallback(
    async (file: File) => {
      setIsUploadingArtwork(true);
      setArtworkLoadError(null);

      try {
        const uploadForm = new FormData();
        uploadForm.set("file", file);
        uploadForm.set("productKey", productKey);
        uploadForm.set("placement", placement);
        uploadForm.set("colorCode", selectedColor || "");

        const response = await fetch("/app/api/artworks-upload", {
          method: "POST",
          body: uploadForm,
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          item?: { id?: string; name?: string; url?: string; createdAt?: string; source?: string } | null;
        };

        if (!response.ok || !payload?.ok || !payload?.item?.url) {
          throw new Error(payload?.error || "Artwork upload failed");
        }

        setApiArtworkAssets((prev) => {
          const nextItem = {
            id: String(payload.item?.id ?? `uploaded-${Date.now()}`),
            name: String(payload.item?.name ?? file.name),
            url: String(payload.item?.url ?? ""),
            createdAt: typeof payload.item?.createdAt === "string" ? payload.item.createdAt : new Date().toISOString(),
            source: typeof payload.item?.source === "string" ? payload.item.source : "upload",
          };
          const merged = [nextItem, ...prev];
          const deduped = new Map<string, (typeof merged)[number]>();
          merged.forEach((item) => deduped.set(item.id, item));
          return Array.from(deduped.values());
        });
      } catch (error) {
        setArtworkLoadError(error instanceof Error ? error.message : "Failed to upload artwork");
      } finally {
        setIsUploadingArtwork(false);
      }
    },
    [placement, productKey, selectedColor]
  );

  useEffect(() => {
    if (!isImageModalOpen) return;
    void loadArtworkLibrary({ append: false, cursor: "" });
  }, [isImageModalOpen, loadArtworkLibrary]);

  if (!productKey || !product) {
    return (
      <PolarisAppProvider i18n={translations}>
        <Page fullWidth backAction={{ url: "/app/products", content: "Products" }}>
          <Card>
            <div
              style={{
                borderRadius: 12,
                border: "1px solid #fecaca",
                backgroundColor: "#fff1f2",
                padding: 14,
              }}
            >
              <Text as="p" variant="bodyMd" fontWeight="semibold" tone="critical">
                Product required
              </Text>
              <Text as="p" tone="critical">
                Select a valid product from the Products page and click Customize.
              </Text>
            </div>
          </Card>
        </Page>
      </PolarisAppProvider>
    );
  }

  return (
    <PolarisAppProvider i18n={translations}>
      <Page
        fullWidth
        backAction={{ url: "/app/products", content: "Products" }}
      >
      <div
        style={{
          maxWidth: 1420,
          margin: "0 auto",
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          paddingInline: isStudioStacked ? 12 : 16,
          overflowX: "hidden",
        }}
      >
      <BlockStack gap="400">
        {fetcher.data && !fetcher.data.ok ? (
          <Card>
            <div
              style={{
                borderRadius: 12,
                border: "1px solid #fecaca",
                backgroundColor: "#fff1f2",
                padding: 14,
              }}
            >
              <Text as="p" tone="critical">
                {fetcher.data.error}
              </Text>
            </div>
          </Card>
        ) : null}

        <AppHeroBanner
          title="Product Customizer Studio"
          subtitle="Fine-tune print placement, color variants, and composition before publishing to your storefront."
          minHeight={120}
        />

        <div
          style={{
            display: "flex",
            flexDirection: isStudioStacked ? "column" : "row",
            alignItems: "stretch",
            gap: isStudioStacked ? 20 : 24,
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: isStudioStacked ? "100%" : 300,
              minWidth: isStudioStacked ? 0 : 260,
              flexShrink: 0,
              boxSizing: "border-box",
              order: isStudioStacked ? 3 : 0,
            }}
          >
            <div style={infoPanelStyle}>
              <div
                style={{
                  position: "absolute",
                  top: -26,
                  right: -20,
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(71,176,161,0.25) 0%, rgba(71,176,161,0) 72%)",
                  pointerEvents: "none",
                }}
              />
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Important product info
                  </Text>
                  <Badge tone="info">Details</Badge>
                </InlineStack>

                <Text as="p" fontWeight="semibold">
                  {productName}
                </Text>
                <Text as="p" tone="subdued">
                  {product.brand} {product.model ? `・${product.model}` : ""}
                </Text>

                <List type="bullet">
                  <List.Item>{availableColors.length} colors available</List.Item>
                  <List.Item>{printAreas.length} print placements</List.Item>
                  <List.Item>
                    {isStudioStacked
                      ? "Use Variants & options below for colors, canvas tools, and publishing."
                      : "Use right panel to configure variants"}
                  </List.Item>
                </List>
              </BlockStack>
            </div>
          </div>

          <div
            style={{
              flex: isStudioStacked ? "0 0 auto" : 1,
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              order: isStudioStacked ? 1 : 0,
            }}
          >
            <CustomizeCanvasSection
              placement={placement}
              selectedColor={selectedColor}
              selectedPrintArea={selectedPrintArea}
              selectedRegion={selectedRegion}
              selectedPrintSize={selectedPrintSize}
              initialCanvasState={getCanvasStateForPlacement(placement)}
              onCanvasReady={handleCanvasReady}
              onPrintSizeChange={handlePrintSizeChange}
              onRegionChange={handleRegionChange}
              onRegisterActions={setCanvasActions}
              onLibraryArtworkBindingChange={handleLibraryArtworkBindingChange}
              onDesignLayersChange={setDesignLayers}
            />

            <ArtworkLayersPanel
              layers={designLayers}
              dimensionUnit={selectedPrintArea?.unit ?? ""}
              printWidth={selectedPrintSize.width}
              printHeight={selectedPrintSize.height}
            />

            <div
              style={{
                marginTop: 12,
                borderRadius: 12,
                border: "1px solid #dbe3ec",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                padding: "10px 12px",
                boxShadow: "0 8px 18px rgba(22,22,31,0.06)",
              }}
            >
              <InlineStack align="center" gap="200" blockAlign="center" wrap>
                {printAreas.map((area) => {
                  const key = normalizePlacementKey(area.title);
                  const isActive = placement === key;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => handlePlacementChange(key)}
                      style={{
                        borderRadius: 999,
                        border: isActive ? "1px solid transparent" : "1px solid #cfd8e3",
                        height: 30,
                        padding: "0 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: isActive
                          ? brandPrimaryButtonBg
                          : "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
                        color: isActive ? "#ffffff" : brandColors.text,
                        boxShadow: isActive
                          ? brandPrimaryCtaShadow
                          : "0 2px 6px rgba(22,22,31,0.08)",
                        transition: "all 150ms ease",
                      }}
                    >
                      {area.title}
                    </button>
                  );
                })}
              </InlineStack>
            </div>
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: isStudioStacked ? "100%" : 340,
              minWidth: isStudioStacked ? 0 : 300,
              flexShrink: 0,
              boxSizing: "border-box",
              order: isStudioStacked ? 2 : 0,
            }}
          >
              <div style={rightPanelStyle}>
                <div
                  style={{
                    position: "absolute",
                    top: -24,
                    right: -18,
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(255, 106, 0, 0.2) 0%, rgba(255, 106, 0, 0) 72%)",
                    pointerEvents: "none",
                  }}
                />
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm">
                      Variants & options
                    </Text>
                    <Badge tone="success">Step Flow</Badge>
                  </InlineStack>
                  <Text as="p" tone="subdued">
                    {product.brand} {product.model ? `・${product.model}` : ""}
                  </Text>

                  <ProductMeta product={product} />

                  <div>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="p" fontWeight="semibold">Choose Color</Text>
                      <Badge tone="info">Step 1</Badge>
                    </InlineStack>
                    <div style={{ marginTop: 8 }}>
                      <ColorSelector
                        colors={availableColors}
                        selectedColor={selectedColor}
                        onChange={handleColorChange}
                      />
                    </div>
                  </div>

                  <div>
                    <Text as="p" fontWeight="semibold">
                      Canvas Actions
                    </Text>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => canvasActions?.addText()}
                        disabled={!canvasActions}
                        style={{
                          ...actionButtonStyle,
                          cursor: !canvasActions ? "not-allowed" : "pointer",
                          opacity: !canvasActions ? 0.6 : 1,
                        }}
                      >
                        Add text
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsImageModalOpen(true)}
                        disabled={!canvasActions}
                        style={{
                          ...actionButtonStyle,
                          cursor: !canvasActions ? "not-allowed" : "pointer",
                          opacity: !canvasActions ? 0.6 : 1,
                        }}
                      >
                        Add image
                      </button>

                      <button
                        type="button"
                        onClick={() => canvasActions?.deleteSelected()}
                        disabled={!canvasActions}
                        style={{
                          ...actionButtonStyle,
                          cursor: !canvasActions ? "not-allowed" : "pointer",
                          opacity: !canvasActions ? 0.6 : 1,
                        }}
                      >
                        Delete selected
                      </button>

                      <button
                        type="button"
                        onClick={() => canvasActions?.clear()}
                        disabled={!canvasActions}
                        style={{
                          ...actionButtonStyle,
                          cursor: !canvasActions ? "not-allowed" : "pointer",
                          opacity: !canvasActions ? 0.6 : 1,
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handlePreview()}
                    disabled={isBuildingPreview}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      height: 40,
                      width: "100%",
                      padding: "0 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isBuildingPreview ? "not-allowed" : "pointer",
                      transition: "all 180ms ease",
                      background: isBuildingPreview
                        ? "#e2e8f0"
                        : "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
                      color: brandColors.text,
                      boxShadow: "0 4px 10px rgba(15,23,42,0.08)",
                    }}
                  >
                    {isBuildingPreview ? "Generating preview..." : "Preview"}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddToStore}
                    disabled={fetcher.state !== "idle"}
                    style={{
                      borderRadius: 10,
                      border: "1px solid transparent",
                      height: 40,
                      width: "100%",
                      padding: "0 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: fetcher.state !== "idle" ? "not-allowed" : "pointer",
                      transition: "all 180ms ease",
                      background:
                        fetcher.state !== "idle"
                          ? "#cbd5e1"
                          : brandPrimaryButtonBg,
                      color: "#ffffff",
                      boxShadow:
                        fetcher.state !== "idle"
                          ? "none"
                          : brandPrimaryCtaShadow,
                    }}
                  >
                    {fetcher.state !== "idle" ? "Adding..." : "Add to Store"}
                  </button>
                </BlockStack>
              </div>
          </div>
        </div>
        <div style={{ marginBottom: 36 }} />
      </BlockStack>
      </div>
      <Modal
        open={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        title="Add image to customizer"
        primaryAction={{
          content: "Close",
          onAction: () => setIsImageModalOpen(false),
        }}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p" tone="subdued">
              Drag and drop new artwork, or choose an image from this listing library.
            </Text>
            <DropZone
              allowMultiple={false}
              accept={acceptedArtworkMimeTypes}
              onDrop={(_dropFiles, acceptedFiles) => {
                const nextFile = acceptedFiles[0];
                if (!nextFile) return;
                void uploadArtwork(nextFile);
              }}
            >
              <DropZone.FileUpload actionHint="Accepts SVG, PNG, JPG, GIF, WEBP, AVIF and more" />
            </DropZone>
            {isUploadingArtwork ? (
              <Text as="p" tone="subdued">
                Uploading artwork...
              </Text>
            ) : null}

            <Text as="h4" variant="headingSm">
              Image library
            </Text>
            <InlineStack gap="200" blockAlign="center">
              <input
                type="text"
                value={artworkSearch}
                onChange={(event) => setArtworkSearch(event.target.value)}
                placeholder="Search artworks..."
                style={{
                  flex: 1,
                  minWidth: 160,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  height: 32,
                  padding: "0 10px",
                  fontSize: 12,
                }}
              />
              <select
                value={artworkType}
                onChange={(event) => setArtworkType(event.target.value as "all" | "svg" | "raster")}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  height: 32,
                  padding: "0 8px",
                  fontSize: 12,
                }}
              >
                <option value="all">All types</option>
                <option value="svg">SVG only</option>
                <option value="raster">Raster only</option>
              </select>
              <select
                value={artworkSort}
                onChange={(event) =>
                  setArtworkSort(event.target.value as "recent" | "name_asc" | "name_desc")
                }
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  height: 32,
                  padding: "0 8px",
                  fontSize: 12,
                }}
              >
                <option value="recent">Recent uploads</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
              </select>
              <button
                type="button"
                onClick={() => void loadArtworkLibrary({ append: false, cursor: "" })}
                disabled={isLoadingArtwork}
                style={{
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  height: 32,
                  padding: "0 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isLoadingArtwork ? "not-allowed" : "pointer",
                  opacity: isLoadingArtwork ? 0.6 : 1,
                }}
              >
                Apply
              </button>
            </InlineStack>
            {isLoadingArtwork ? (
              <Text as="p" tone="subdued">
                Loading artwork library...
              </Text>
            ) : null}
            {artworkLoadError ? (
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" tone="critical">
                  {artworkLoadError}
                </Text>
                <button
                  type="button"
                  onClick={() => void loadArtworkLibrary()}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    height: 28,
                    padding: "0 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              </InlineStack>
            ) : null}
            <Scrollable shadow style={{ maxHeight: 320 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: 10,
                  padding: 4,
                }}
              >
                {imageLibrary.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={async () => {
                      if (!canvasActions) return;
                      const proxiedUrl = `/app/api/artworks-image?url=${encodeURIComponent(image.url)}`;
                      await canvasActions.addImageFromUrl(proxiedUrl, {
                        libraryArtworkId: image.id,
                      });
                      setArtworkLibraryIdForPlacement(placement, image.id);
                      setIsImageModalOpen(false);
                    }}
                    style={{
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      padding: 8,
                      cursor: "pointer",
                      background: "#ffffff",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                      <Thumbnail source={image.url} alt={image.name} size="large" />
                    </div>
                    <Text as="p" variant="bodySm" truncate>
                      {image.name}
                    </Text>
                  </button>
                ))}
              </div>
            </Scrollable>
            {hasMoreArtwork ? (
              <InlineStack align="center">
                <button
                  type="button"
                  onClick={() => void loadArtworkLibrary({ append: true, cursor: artworkCursor })}
                  disabled={isLoadingArtwork}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    height: 32,
                    padding: "0 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isLoadingArtwork ? "not-allowed" : "pointer",
                    opacity: isLoadingArtwork ? 0.6 : 1,
                  }}
                >
                  Load more
                </button>
              </InlineStack>
            ) : null}
            {imageLibrary.length === 0 ? (
              <Text as="p" tone="subdued">
                No images yet. Upload artwork to get started.
              </Text>
            ) : null}
          </BlockStack>
        </Modal.Section>
      </Modal>
      <Modal
        open={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Export preview"
        primaryAction={{
          content: "Close",
          onAction: () => setIsPreviewModalOpen(false),
        }}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p" tone="subdued">
              This is the product mockup we'll export when you click "Add to Store". Switch colors to preview each variant.
            </Text>

            {isBuildingPreview ? (
              <Text as="p" tone="subdued">
                Generating preview...
              </Text>
            ) : null}

            {previewError ? (
              <div
                style={{
                  borderRadius: 10,
                  border: "1px solid #fecaca",
                  backgroundColor: "#fff1f2",
                  padding: 12,
                }}
              >
                <Text as="p" tone="critical">
                  {previewError}
                </Text>
              </div>
            ) : null}

            {previewData && !isBuildingPreview ? (() => {
              const activeEntry =
                previewData.placements.find(
                  (entry) => entry.placement === previewPlacement
                ) ?? previewData.placements[0];

              if (!activeEntry) return null;

              const activeMockupUrl = activeEntry.mockupsByColor[previewColor];

              return (
                <BlockStack gap="300">
                  {previewData.placements.length > 1 ? (
                    <div>
                      <Text as="p" fontWeight="semibold">
                        Placement
                      </Text>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {previewData.placements.map((entry) => {
                          const isActive = entry.placement === activeEntry.placement;
                          return (
                            <button
                              key={entry.placement}
                              type="button"
                              onClick={() => {
                                setPreviewPlacement(entry.placement);
                                if (!entry.mockupsByColor[previewColor]) {
                                  const firstColor = Object.entries(
                                    entry.mockupsByColor
                                  ).find(([, url]) => Boolean(url))?.[0];
                                  if (firstColor) setPreviewColor(firstColor);
                                }
                              }}
                              style={{
                                borderRadius: 999,
                                border: isActive
                                  ? "1px solid transparent"
                                  : "1px solid #cfd8e3",
                                height: 30,
                                padding: "0 12px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                background: isActive
                                  ? brandPrimaryButtonBg
                                  : "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
                                color: isActive ? "#ffffff" : brandColors.text,
                                boxShadow: isActive
                                  ? brandPrimaryCtaShadow
                                  : "0 2px 6px rgba(22,22,31,0.08)",
                                transition: "all 150ms ease",
                              }}
                            >
                              {entry.placementTitle}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {availableColors.length > 0 ? (
                    <div>
                      <Text as="p" fontWeight="semibold">
                        Color
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        <ColorSelector
                          colors={availableColors}
                          selectedColor={previewColor}
                          onChange={setPreviewColor}
                        />
                      </div>
                    </div>
                  ) : null}

                  {activeMockupUrl ? (
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        padding: 12,
                        boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
                      }}
                    >
                      <InlineStack align="space-between" blockAlign="center" gap="200">
                        <Text as="p" variant="bodySm" fontWeight="semibold">
                          {activeEntry.placementTitle} ·{" "}
                          {availableColors.find((c) => c.colorCode === previewColor)
                            ?.colorName ??
                            previewColor ??
                            "selected color"}
                        </Text>
                        <InlineStack gap="100" blockAlign="center">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewZoom((z) =>
                                Math.max(PREVIEW_ZOOM_MIN, +(z - PREVIEW_ZOOM_STEP).toFixed(2))
                              )
                            }
                            disabled={previewZoom <= PREVIEW_ZOOM_MIN}
                            aria-label="Zoom out"
                            style={{
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              minWidth: 30,
                              height: 28,
                              padding: "0 8px",
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: previewZoom <= PREVIEW_ZOOM_MIN ? "not-allowed" : "pointer",
                              opacity: previewZoom <= PREVIEW_ZOOM_MIN ? 0.55 : 1,
                            }}
                          >
                            −
                          </button>
                          <span
                            style={{
                              minWidth: 48,
                              textAlign: "center",
                              fontSize: 12,
                              fontWeight: 700,
                              color: brandColors.text,
                            }}
                          >
                            {Math.round(previewZoom * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewZoom((z) =>
                                Math.min(PREVIEW_ZOOM_MAX, +(z + PREVIEW_ZOOM_STEP).toFixed(2))
                              )
                            }
                            disabled={previewZoom >= PREVIEW_ZOOM_MAX}
                            aria-label="Zoom in"
                            style={{
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              minWidth: 30,
                              height: 28,
                              padding: "0 8px",
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: previewZoom >= PREVIEW_ZOOM_MAX ? "not-allowed" : "pointer",
                              opacity: previewZoom >= PREVIEW_ZOOM_MAX ? 0.55 : 1,
                            }}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewZoom(1)}
                            disabled={previewZoom === 1}
                            style={{
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              height: 28,
                              padding: "0 10px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: previewZoom === 1 ? "not-allowed" : "pointer",
                              opacity: previewZoom === 1 ? 0.55 : 1,
                            }}
                          >
                            Reset
                          </button>
                        </InlineStack>
                      </InlineStack>
                      <div
                        style={{
                          marginTop: 8,
                          maxHeight: 460,
                          overflow: "auto",
                          background:
                            "repeating-conic-gradient(#f8fafc 0% 25%, #ffffff 0% 50%) 50% / 18px 18px",
                          borderRadius: 8,
                          padding: "12px 12px 20px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "flex-start",
                          }}
                        >
                          <img
                            src={activeMockupUrl}
                            alt={`${activeEntry.placementTitle} mockup preview`}
                            style={{
                              transform: `scale(${previewZoom})`,
                              transformOrigin: "top center",
                              transition: "transform 120ms ease",
                              maxWidth: "100%",
                              height: "auto",
                              objectFit: "contain",
                              borderRadius: 4,
                              display: "block",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        borderRadius: 10,
                        border: "1px solid #fde68a",
                        backgroundColor: "#fffbeb",
                        padding: 12,
                      }}
                    >
                      <Text as="p" tone="caution">
                        No mockup available for this color. Make sure a background image is configured for the print area.
                      </Text>
                    </div>
                  )}
                </BlockStack>
              );
            })() : null}
          </BlockStack>
        </Modal.Section>
      </Modal>
      </Page>
    </PolarisAppProvider>
  );
}