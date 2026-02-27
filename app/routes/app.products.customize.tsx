import { useState, useCallback, useEffect, useRef } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams, useFetcher } from "react-router";
import { Page, Card, BlockStack, Text, InlineStack, Banner, Button } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { createExternalApiHeaders } from "../lib/external-api.server";
import { getDtftaBlankByKey } from "../lib/dtfta-products.server";
import { getDesignAssetUrl, type DesignPlacement } from "../lib/design-assets";
import { buildPrintPlan } from "../lib/dtfta-design";
import DesignCanvas, { exportCanvasToDataUrl, type DesignableRegion } from "../components/DesignCanvas";
import type { Canvas } from "fabric";

const DEFAULT_DESIGN_REGION: DesignableRegion = { left: 125, top: 125, size: 250 };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const productKey = url.searchParams.get("productKey") ?? url.searchParams.get("productId") ?? "";
  const productId = url.searchParams.get("productId") ?? productKey;
  const blank = productKey ? getDtftaBlankByKey(productKey) : undefined;
  return {
    productKey,
    productId,
    blank: blank
      ? {
          key: blank.key,
          name: blank.name,
          image: blank.image,
          model: blank.model,
        }
      : null,
    productName: blank?.name ?? "Product",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return { ok: false, error: "Method not allowed" };
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const shop = session.shop;
  const productKey = formData.get("productKey") as string;
  const title = (formData.get("title") as string) || undefined;
  const printPlan = formData.get("printPlan") as string;
  const artworkFront = (formData.get("artworkFront") as string) || undefined;
  const artworkBack = (formData.get("artworkBack") as string) || undefined;

  if (!productKey?.trim()) {
    return { ok: false, error: "Missing product key" };
  }

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const payload = {
    shop,
    productKey,
    title,
    printPlan,
    artworkUrls: { front: artworkFront, back: artworkBack },
  };
  const headers = createExternalApiHeaders(payload, { "X-Shop": shop });

  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/products/create-in-shopify`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.message || data.error || `Request failed: ${res.status}`,
      };
    }
    return {
      ok: true,
      productId: data.productId,
      handle: data.handle,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function ProductCustomize() {
  const loaderData = useLoaderData<LoaderData>();
  const [searchParams] = useSearchParams();
  const fetcher = useFetcher<{ ok: boolean; error?: string; productId?: string; handle?: string }>();
  const shopify = useAppBridge();

  const [placement, setPlacement] = useState<DesignPlacement>("front");
  const [frontCanvas, setFrontCanvas] = useState<Canvas | null>(null);
  const [backCanvas, setBackCanvas] = useState<Canvas | null>(null);
  const [frontPrint, setFrontPrint] = useState({ width: 12, height: 16 });
  const [backPrint, setBackPrint] = useState({ width: 12, height: 16 });
  const [frontRegion, setFrontRegion] = useState<DesignableRegion>(DEFAULT_DESIGN_REGION);
  const [backRegion, setBackRegion] = useState<DesignableRegion>(DEFAULT_DESIGN_REGION);

  const productKey = loaderData.productKey || searchParams.get("productKey") || searchParams.get("productId");
  const productName = loaderData.productName;
  const frontImageUrl = productKey ? getDesignAssetUrl(productKey, "front") : undefined;
  const backImageUrl = productKey ? getDesignAssetUrl(productKey, "back") : undefined;

  const handleAddToStore = useCallback(() => {
    const printPlan = buildPrintPlan({
      front: frontPrint,
      back: backPrint,
    });
    const artworkFront = exportCanvasToDataUrl(frontCanvas);
    const artworkBack = exportCanvasToDataUrl(backCanvas);
    if (!printPlan && !artworkFront && !artworkBack) {
      shopify.toast.show("Add at least one placement (print size or artwork).");
      return;
    }
    const formData = new FormData();
    formData.set("productKey", productKey ?? "");
    formData.set("title", `${productName} Custom`);
    formData.set("printPlan", printPlan);
    if (artworkFront) formData.set("artworkFront", artworkFront);
    if (artworkBack) formData.set("artworkBack", artworkBack);
    fetcher.submit(formData, { method: "POST" });
  }, [frontCanvas, backCanvas, frontPrint, backPrint, productKey, productName, fetcher, shopify]);

  const successHandled = useRef(false);
  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.productId && !successHandled.current) {
      successHandled.current = true;
      shopify.toast.show("Product created");
      try {
        shopify.intents.invoke?.("edit:shopify/Product", { value: fetcher.data.productId });
      } catch {
        // ignore
      }
    }
  }, [fetcher.data?.ok, fetcher.data?.productId, shopify]);

  if (!productKey) {
    return (
      <Page title="Customize product" backAction={{ url: "/app/products", content: "Products" }}>
        <Banner tone="critical" title="Product required">
          Select a product from the Products page and click "Customize and add to store".
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      fullWidth
      title={`Customize: ${productName}`}
      backAction={{ url: "/app/products", content: "Products" }}
      primaryAction={{
        content: "Add to store",
        loading: fetcher.state !== "idle",
        onAction: handleAddToStore,
      }}
    >
      <BlockStack gap="400">
        {fetcher.data && !fetcher.data.ok && (
          <Banner tone="critical" onDismiss={() => {}}>
            {fetcher.data.error}
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              Add artwork and text for front and back. Switch with the buttons below; set print dimensions (inches).
              When ready, click "Add to store" to create the product in your Shopify store.
            </Text>
            <InlineStack gap="200" blockAlign="center">
              <Button
                variant={placement === "front" ? "primary" : "secondary"}
                onClick={() => setPlacement("front")}
              >
                Front
              </Button>
              <Button
                variant={placement === "back" ? "primary" : "secondary"}
                onClick={() => setPlacement("back")}
              >
                Back
              </Button>
            </InlineStack>
            <div
              style={{
                width: "100%",
                minWidth: 0,
                height: "min(75vw, calc(100vh - 220px))",
                minHeight: 280,
              }}
            >
              <div style={{ display: placement === "front" ? "block" : "none", width: "100%", minWidth: 0, height: "100%" }}>
                <DesignCanvas
                  label="Front"
                  fillWidth
                  onCanvasReady={setFrontCanvas}
                  printWidth={frontPrint.width}
                  printHeight={frontPrint.height}
                  onPrintDimensionsChange={(w, h) => setFrontPrint({ width: w, height: h })}
                  backgroundImageUrl={frontImageUrl}
                  designableRegion={frontRegion}
                  onDesignableRegionChange={setFrontRegion}
                />
              </div>
              <div style={{ display: placement === "back" ? "block" : "none", width: "100%", minWidth: 0, height: "100%" }}>
                <DesignCanvas
                  label="Back"
                  fillWidth
                  onCanvasReady={setBackCanvas}
                  printWidth={backPrint.width}
                  printHeight={backPrint.height}
                  onPrintDimensionsChange={(w, h) => setBackPrint({ width: w, height: h })}
                  backgroundImageUrl={backImageUrl}
                  designableRegion={backRegion}
                  onDesignableRegionChange={setBackRegion}
                />
              </div>
            </div>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
