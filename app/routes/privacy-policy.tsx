import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import styles from "../styles/legal-page.module.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | DTFTA" },
    {
      name: "description",
      content: "Privacy Policy for the DTFTA Shopify app.",
    },
  ];
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.bgMesh} aria-hidden />
      <div className={styles.bgGrid} aria-hidden />

      <main className={styles.main}>
        <article className={styles.card}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: 2026-05-05</p>

          <h2 className={styles.sectionTitle}>1. Who We Are</h2>
          <p className={styles.text}>
            DTF Transfer Authority (DTFTA) is a Shopify app that helps merchants
            manage custom product workflows, fulfillment operations, and
            pre-fulfillment billing controls.
          </p>

          <h2 className={styles.sectionTitle}>2. Data We Process</h2>
          <p className={styles.text}>To provide app functionality, we may process:</p>
          <ul className={styles.list}>
            <li>Shop account and configuration data (including shop domain).</li>
            <li>Product and variant data required for operations.</li>
            <li>Order and fulfillment data required for merchant workflows.</li>
            <li>Limited customer and order metadata from Shopify payloads.</li>
            <li>Billing metadata related to Shopify managed app billing.</li>
          </ul>
          <p className={styles.text}>
            We do not collect or store customer payment card numbers.
          </p>

          <h2 className={styles.sectionTitle}>3. How We Use Data</h2>
          <p className={styles.text}>We use data only to:</p>
          <ul className={styles.list}>
            <li>Provide customization and fulfillment features.</li>
            <li>Process Shopify webhooks and keep systems in sync.</li>
            <li>Apply billing rules before fulfillment when enabled.</li>
            <li>Troubleshoot, audit, and secure app operations.</li>
          </ul>

          <h2 className={styles.sectionTitle}>4. Data Retention</h2>
          <p className={styles.text}>
            We retain data only as long as needed to provide and support the app,
            satisfy legal obligations, and maintain essential operational records.
          </p>
          <p className={styles.text}>
            When uninstall or redaction requests are received, we process deletion
            or anonymization in line with Shopify requirements and applicable law.
          </p>

          <h2 className={styles.sectionTitle}>5. Shopify Privacy Webhooks</h2>
          <p className={styles.text}>
            This app supports Shopify privacy webhooks including:
          </p>
          <ul className={styles.list}>
            <li>
              <code className={styles.code}>customers/data_request</code>
            </li>
            <li>
              <code className={styles.code}>customers/redact</code>
            </li>
            <li>
              <code className={styles.code}>shop/redact</code>
            </li>
          </ul>
          <p className={styles.text}>
            Upon receipt, we process applicable export, redaction, and deletion
            actions in backend systems.
          </p>

          <h2 className={styles.sectionTitle}>6. Security</h2>
          <p className={styles.text}>
            We use industry-standard safeguards such as authentication controls,
            request verification, and access restrictions to protect merchant data.
          </p>

          <h2 className={styles.sectionTitle}>7. Data Sharing</h2>
          <p className={styles.text}>
            We do not sell merchant or customer personal data. We may use
            necessary infrastructure and service providers (such as hosting,
            storage, and logging) under appropriate safeguards.
          </p>

          <h2 className={styles.sectionTitle}>8. Your Rights</h2>
          <p className={styles.text}>
            Merchants may contact us for information related to privacy rights
            and data handling, subject to legal limitations.
          </p>

          <h2 className={styles.sectionTitle}>9. Contact</h2>
          <p className={styles.text}>
            For privacy questions, contact:{" "}
            <a className={styles.link} href="mailto:privacy@yourdomain.com">
              privacy@yourdomain.com
            </a>
          </p>
        </article>

        <div className={styles.actions}>
          <Link className={styles.homeLink} to="/">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
