import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

const LOGO_SRC = "/assets/get-started/logo.png";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

function IconBolt() {
  return (
    <svg className={styles.featureIcon} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"
      />
    </svg>
  );
}

function IconCube() {
  return (
    <svg className={styles.featureIcon} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2L2 7v2h20V7L12 2zm-8 6v9a2 2 0 002 2h16a2 2 0 002-2V9H4zm8 3.25h4v2.5h-4v-2.5z"
      />
    </svg>
  );
}

function IconStorefront() {
  return (
    <svg className={styles.featureIcon} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm0-2V5a2 2 0 012-2h14a2 2 0 012 2v2H3zm6 4v2h6v-2H9z"
      />
    </svg>
  );
}

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      <div className={styles.bgMesh} aria-hidden />
      <div className={styles.bgGrid} aria-hidden />
      <div className={styles.noise} aria-hidden />

      <main className={styles.main}>
        <header className={styles.hero}>
          <div className={styles.logoWrap}>
            <img
              className={styles.logo}
              src={LOGO_SRC}
              alt="DTF Transfer Authority"
              width={320}
              height={120}
              decoding="async"
            />
          </div>
          <p className={styles.eyebrow}>Shopify fulfillment companion</p>
          <h1 className={styles.heading}>
            Run transfers, orders, and inventory from one control room.
          </h1>
          <p className={styles.text}>
            Connect your store to streamline fulfillment workflows, keep
            inventory honest, and ship faster—without leaving Shopify.
          </p>
        </header>

        {showForm && (
          <section className={styles.loginSection} aria-label="Merchant sign in">
            <Form className={styles.form} method="post" action="/auth/login">
              <div className={styles.field}>
                <label className={styles.label} htmlFor="shop-domain">
                  Shop domain
                </label>
                <div className={styles.inputRow}>
                  <input
                    id="shop-domain"
                    className={styles.input}
                    type="text"
                    name="shop"
                    placeholder="your-store.myshopify.com"
                    autoComplete="url"
                    spellCheck={false}
                  />
                  <button className={styles.button} type="submit">
                    Log in
                  </button>
                </div>
                <p className={styles.hint}>
                  Use your <strong>.myshopify.com</strong> admin URL.
                </p>
              </div>
            </Form>
          </section>
        )}

        <ul className={styles.features}>
          <li className={styles.featureCard}>
            <span className={styles.featureGlow} aria-hidden />
            <IconBolt />
            <h2 className={styles.featureTitle}>Live order sync</h2>
            <p className={styles.featureText}>
              Webhooks keep orders, fulfillments, and cancellations aligned so
              your team always sees the truth.
            </p>
          </li>
          <li className={styles.featureCard}>
            <span className={styles.featureGlow} aria-hidden />
            <IconCube />
            <h2 className={styles.featureTitle}>Inventory you can trust</h2>
            <p className={styles.featureText}>
              Write inventory and shipping updates back to Shopify with scopes
              built for operational apps.
            </p>
          </li>
          <li className={styles.featureCard}>
            <span className={styles.featureGlow} aria-hidden />
            <IconStorefront />
            <h2 className={styles.featureTitle}>Embedded in Admin</h2>
            <p className={styles.featureText}>
              Merchants stay inside Shopify—fewer tabs, less context switching,
              faster decisions at the edge of fulfillment.
            </p>
          </li>
        </ul>

        <footer className={styles.footer}>
          <span className={styles.footerMark}>DTF Transfer Authority</span>
          <div className={styles.footerLinks}>
            <a href="/privacy-policy" className={styles.footerLink}>
              Privacy Policy
            </a>
            <span aria-hidden className={styles.footerDivider}>
              |
            </span>
            <a href="/terms-of-service" className={styles.footerLink}>
              Terms of Use
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
