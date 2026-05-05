import { useEffect } from "react";
import type { CSSProperties } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useNavigate } from "react-router";

type BillingReturnLoaderData = {
  status: "approved" | "cancelled";
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

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  const data: BillingReturnLoaderData = {
    status: chargeId ? "approved" : "cancelled",
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
      navigate("/app/orders");
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
            ? "Your billing was approved successfully. Redirecting you back to Orders..."
            : "We could not confirm billing approval from Shopify. You can return to Orders and try again."}
        </p>
        <Link to="/app/orders" style={linkStyle}>
          Go to Orders
        </Link>
      </section>
    </main>
  );
}
