import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import styles from "../styles/legal-page.module.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Use | DTFTA" },
    {
      name: "description",
      content: "Terms of Use for the DTFTA Shopify app.",
    },
  ];
};

export default function TermsOfServicePage() {
  return (
    <div className={styles.page}>
      <div className={styles.bgMesh} aria-hidden />
      <div className={styles.bgGrid} aria-hidden />

      <main className={styles.main}>
        <article className={styles.card}>
          <h1 className={styles.title}>Terms of Use</h1>
          <p className={styles.updated}>Last updated: 2026-05-05</p>

          <h2 className={styles.sectionTitle}>1. Acceptance</h2>
          <p className={styles.text}>
            By installing or using DTF Transfer Authority (DTFTA), you agree to
            these Terms of Use.
          </p>

          <h2 className={styles.sectionTitle}>2. Service Description</h2>
          <p className={styles.text}>
            DTFTA provides tools for custom product operations, fulfillment
            workflow support, and billing controls within Shopify.
          </p>

          <h2 className={styles.sectionTitle}>3. Merchant Responsibilities</h2>
          <p className={styles.text}>You agree to:</p>
          <ul className={styles.list}>
            <li>Maintain accurate store and operational data.</li>
            <li>Use the app in compliance with Shopify rules and applicable law.</li>
            <li>
              Complete required app setup steps (including Theme Editor app embed
              where needed).
            </li>
          </ul>

          <h2 className={styles.sectionTitle}>4. Billing and Charges</h2>
          <p className={styles.text}>DTFTA uses Shopify managed app pricing.</p>
          <ul className={styles.list}>
            <li>
              Installation may be free, with usage-based charges as configured.
            </li>
            <li>Per-order charges may be created before fulfillment begins.</li>
            <li>
              If billing approval is missing or a required charge fails,
              fulfillment actions may be blocked until resolved.
            </li>
          </ul>
          <p className={styles.text}>
            All charges are processed through Shopify billing systems.
          </p>

          <h2 className={styles.sectionTitle}>5. Availability and Changes</h2>
          <p className={styles.text}>
            We may update, improve, or discontinue features at any time. We do
            not guarantee uninterrupted or error-free service.
          </p>

          <h2 className={styles.sectionTitle}>6. Data and Privacy</h2>
          <p className={styles.text}>
            Your use of the app is also governed by our Privacy Policy. You
            remain responsible for lawful use of customer data in your store
            operations.
          </p>

          <h2 className={styles.sectionTitle}>7. Limitation of Liability</h2>
          <p className={styles.text}>
            To the maximum extent permitted by law, DTFTA is provided &quot;as
            is&quot; without warranties of any kind, and we are not liable for
            indirect, incidental, or consequential damages.
          </p>

          <h2 className={styles.sectionTitle}>8. Termination</h2>
          <p className={styles.text}>
            You may stop using the app at any time by uninstalling it. We may
            suspend or terminate access for misuse, legal reasons, or platform
            requirements.
          </p>

          <h2 className={styles.sectionTitle}>9. Governing Law</h2>
          <p className={styles.text}>
            These terms are governed by applicable laws in your operating
            jurisdiction, unless otherwise required by law.
          </p>

          <h2 className={styles.sectionTitle}>10. Contact</h2>
          <p className={styles.text}>
            For legal or support questions, contact:{" "}
            <a className={styles.link} href="mailto:support@yourdomain.com">
              support@yourdomain.com
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
