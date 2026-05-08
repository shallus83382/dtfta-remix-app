import { useEffect } from "react";
import type { CSSProperties } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, redirect, useLoaderData, useNavigate } from "react-router";

type BillingReturnLoaderData = {
  status: "approved" | "cancelled";
  embeddedReturnUrl: string | null;
};

export const meta: MetaFunction = () => {
  return [
    { title: "Billing Return | DTFTA" },
    {
      name: "description",
      content: "Billing approval return page for DTFTA.",
    },
  ];
};

function buildEmbeddedDashboardUrl(shop: string, status: string) {
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  if (!shop || !apiKey) return null;

  const storeHandle = shop.replace(/\.myshopify\.com$/i, "").trim();
  if (!storeHandle) return null;

  // Deep-link into the embedded app dashboard inside Shopify admin so the
  // merchant lands back on the dashboard instead of the standalone app URL.
  // See: https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens/getting-started#deep-link-to-an-embedded-app
  return `https://admin.shopify.com/store/${encodeURIComponent(
    storeHandle,
  )}/apps/${encodeURIComponent(apiKey)}/app/dashboard?billing=${status}`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  const shop = url.searchParams.get("shop") || "";
  const status: "approved" | "cancelled" = chargeId ? "approved" : "cancelled";

  const embeddedReturnUrl = buildEmbeddedDashboardUrl(shop, status);

  // If we know the shop, redirect straight back into the embedded dashboard
  // inside Shopify admin instead of leaving the merchant on the public app
  // URL. We still render a fallback page below in case redirect cannot be
  // built (e.g. shop param missing).
  if (embeddedReturnUrl) {
    return redirect(embeddedReturnUrl);
  }

  const data: BillingReturnLoaderData = {
    status,
    embeddedReturnUrl,
  };

  return Response.json(data);
}

const pageStyle: CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  background: "#f6f5fb",
  padding: "20px",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "620px",
  background: "rgba(255, 255, 255, 0.92)",
  border: "1px solid rgba(26, 26, 34, 0.09)",
  borderRadius: "18px",
  boxShadow: "0 18px 40px -28px rgba(22, 22, 31, 0.26)",
  padding: "24px 22px",
  color: "#16161f",
  textAlign: "center",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "1.55rem",
};

const textStyle: CSSProperties = {
  color: "#5a5a6e",
  margin: "0.75rem 0 1.1rem",
  lineHeight: 1.6,
};

const linkStyle: CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  borderRadius: "10px",
  border: "1px solid transparent",
  padding: "0.7rem 1rem",
  fontSize: "0.95rem",
  fontWeight: 700,
  background: "#ff6a00",
  color: "#fff",
};

export default function BillingReturnPage() {
  const navigate = useNavigate();
  const { status } = useLoaderData<typeof loader>() as BillingReturnLoaderData;

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/app/dashboard");
    }, 1800);
    return () => clearTimeout(timer);
  }, [navigate]);

  const isApproved = status === "approved";

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1 style={titleStyle}>
          {isApproved ? "Billing approved" : "Billing not completed"}
        </h1>
        <p style={textStyle}>
          {isApproved
            ? "Your billing was approved successfully. Redirecting you back to the dashboard..."
            : "We could not confirm billing approval from Shopify. You can return to the dashboard and try again."}
        </p>
        <Link to="/app/dashboard" style={linkStyle}>
          Go to Dashboard
        </Link>
      </section>
    </main>
  );
}
