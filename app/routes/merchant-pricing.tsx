import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import styles from "../styles/merchant-pricing.module.css";

const LOGO_SRC = "/assets/get-started/logo2.jpeg";
const SUPPORT_EMAIL = "orders@dtftransferauthority.com";

export const meta: MetaFunction = () => {
  return [
    { title: "Merchant Pricing & Billing — DTFTA" },
    {
      name: "description",
      content:
        "DTF Transfer Authority merchant pricing for Shopify. Free to install. Fulfillment charges are processed through an approved external payment system. Review pricing before publishing and before charges are processed.",
    },
  ];
};

export default function MerchantPricingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.bgMesh} aria-hidden />
      <div className={styles.bgGrid} aria-hidden />
      <div className={styles.noise} aria-hidden />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.brandRow}>
            <img
              className={styles.logo}
              src={LOGO_SRC}
              alt="DTF Transfer Authority"
              width={48}
              height={48}
            />
            <div>
              <p className={styles.brandName}>DTF Transfer Authority</p>
              <p className={styles.brandTag}>DTFTA Shopify app</p>
            </div>
          </div>

          <p className={styles.eyebrow}>Merchant billing</p>
          <h1 className={styles.title}>Merchant Pricing &amp; Billing</h1>
          <p className={styles.lede}>
            How DTF Transfer Authority charges Shopify merchants for custom
            apparel fulfillment — free to install, pay only for fulfillment
            services used.
          </p>
          <p className={styles.transparencyNote}>
            Merchants can review pricing before publishing products and before
            fulfillment charges are processed.
          </p>

          <div className={styles.ctaRow}>
            <Link className={styles.btnPrimary} to="/">
              Register / Log In
            </Link>
            <a className={styles.btnGhost} href={`mailto:${SUPPORT_EMAIL}`}>
              Contact support
            </a>
          </div>
        </header>

        <section
          className={`${styles.panel} ${styles.exemption}`}
          aria-label="Approved external billing"
        >
          <span className={styles.exemptionBadge}>Approved by Shopify</span>
          <h2 className={styles.exemptionTitle}>
            External Billing (Approved by Shopify)
          </h2>
          <p className={styles.exemptionText}>
            Shopify has approved DTF Transfer Authority to process merchant
            fulfillment charges outside the Shopify Billing API. This applies
            only to fulfillment-related charges that vary by product
            configuration, print placement, shipping, and applicable taxes.
          </p>
          <p className={styles.exemptionText}>
            Installing the DTFTA Shopify app is free. Merchants are charged only
            for fulfillment services used. Charges are processed securely
            through our approved external payment system (
            <strong>Square</strong>) because fulfillment costs vary for each
            order.
          </p>
        </section>

        <section className={`${styles.panel} ${styles.whyNote}`}>
          <h2 className={styles.sectionTitle}>Why external billing?</h2>
          <p className={styles.text}>
            DTF Transfer Authority fulfills print-on-demand products. Because
            fulfillment costs vary based on the selected product, print
            locations, shipping destination, and applicable taxes, Shopify has
            approved external billing for these variable merchant charges.
          </p>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Who this is for</h2>
          <p className={styles.text}>
            This page explains how DTF Transfer Authority (DTFTA) charges
            Shopify merchants who use our app for custom apparel fulfillment.
            Your store&apos;s end customers continue to pay you through normal
            Shopify checkout. DTFTA bills <strong>you (the merchant)</strong>{" "}
            for the cost of producing and fulfilling those orders.
          </p>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Pricing summary</h2>
          <p className={styles.sectionIntro}>
            A quick overview of what merchants pay — and what they do not.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.pricingTable}>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>App installation</td>
                  <td>Free</td>
                </tr>
                <tr>
                  <td>Monthly subscription</td>
                  <td>None</td>
                </tr>
                <tr>
                  <td>Product cost</td>
                  <td>Depends on product variant (color &amp; size)</td>
                </tr>
                <tr>
                  <td>Print fee</td>
                  <td>Per print placement</td>
                </tr>
                <tr>
                  <td>Shipping</td>
                  <td>Based on the order</td>
                </tr>
                <tr>
                  <td>Tax</td>
                  <td>Where applicable</td>
                </tr>
                <tr>
                  <td>Payment method</td>
                  <td>Saved card via our secure external payment processor</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>How to register &amp; get started</h2>
          <p className={styles.sectionIntro}>
            Billing becomes active once a valid payment method is saved in
            Wallet. Without an active payment method, fulfillment is paused
            until billing is set up.
          </p>
          <ol className={styles.steps}>
            <li className={styles.step}>
              <div>
                <p className={styles.stepTitle}>Register / install DTFTA</p>
                <p className={styles.stepText}>
                  Use <strong>Register / Log In</strong> above, or install the
                  DTFTA app from the Shopify App Store and open it in your
                  Shopify admin.
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <div>
                <p className={styles.stepTitle}>Complete setup</p>
                <p className={styles.stepText}>
                  Finish onboarding and profile setup in the app (brand details,
                  settings).
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <div>
                <p className={styles.stepTitle}>Add a payment method in Wallet</p>
                <p className={styles.stepText}>
                  Open <strong>Wallet</strong> and add a payment card. Cards are
                  processed securely through our approved external payment
                  system.
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <div>
                <p className={styles.stepTitle}>Customize &amp; sell</p>
                <p className={styles.stepText}>
                  Customize products, publish them to your store, and fulfill
                  customer orders as usual.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>What you are charged for</h2>
          <p className={styles.sectionIntro}>
            Before we fulfill an order, we calculate and charge your saved
            payment method using this formula:
          </p>

          <div
            className={styles.formula}
            aria-label="Fulfillment charge formula"
          >
            <span className={styles.formulaPart}>Variant cost</span>
            <span className={styles.formulaOp} aria-hidden>
              +
            </span>
            <span className={styles.formulaPart}>Print fees</span>
            <span className={styles.formulaOp} aria-hidden>
              +
            </span>
            <span className={styles.formulaPart}>Shipping</span>
            <span className={styles.formulaOp} aria-hidden>
              +
            </span>
            <span className={styles.formulaPart}>Tax</span>
            <span className={styles.formulaEquals} aria-hidden>
              =
            </span>
            <span className={`${styles.formulaPart} ${styles.formulaTotal}`}>
              Total charge
            </span>
          </div>

          <div className={styles.chargeGrid}>
            <article className={styles.chargeCard}>
              <div className={styles.chargeHead}>
                <span className={styles.chargeNum}>1</span>
                <h3 className={styles.chargeTitle}>
                  Product / variant cost (color &amp; size)
                </h3>
              </div>
              <p className={styles.chargeText}>
                Blank and base product costs depend on the variant selected by
                the customer — typically <strong>color</strong> and{" "}
                <strong>size</strong>. Each color/size combination has its own
                wholesale fulfillment price in our catalog. Review these prices
                in the Product Customizer before you publish so you can set
                profitable retail prices on Shopify.
              </p>
            </article>

            <article className={styles.chargeCard}>
              <div className={styles.chargeHead}>
                <span className={styles.chargeNum}>2</span>
                <h3 className={styles.chargeTitle}>
                  Print fees (by print placement)
                </h3>
              </div>
              <p className={styles.chargeText}>
                Print fees are charged <strong>per print placement</strong> used
                on the item (for example front, back, or other available
                locations). Each placement has a set print price in our catalog.
                Multiple placements are added together and multiplied by
                quantity.
              </p>
            </article>

            <article className={styles.chargeCard}>
              <div className={styles.chargeHead}>
                <span className={styles.chargeNum}>3</span>
                <h3 className={styles.chargeTitle}>Shipping</h3>
              </div>
              <p className={styles.chargeText}>
                Shipping charged for fulfillment is based on the shipping amount
                associated with the Shopify order (carrier / rate for that
                order). Shipping can fluctuate by destination, method, and order
                details.
              </p>
            </article>

            <article className={styles.chargeCard}>
              <div className={styles.chargeHead}>
                <span className={styles.chargeNum}>4</span>
                <h3 className={styles.chargeTitle}>Tax</h3>
              </div>
              <p className={styles.chargeText}>
                If tax applies on the order, that tax amount is included in the
                merchant fulfillment charge when present on the Shopify order.
              </p>
            </article>
          </div>

          <p className={styles.note}>
            <strong>Note on print “area”:</strong> Print area means the{" "}
            <strong>placement location</strong> on the garment (front / back /
            etc.), not a calculation based on design width × height.
          </p>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Where to see exact prices</h2>
          <p className={styles.sectionIntro}>
            Exact dollar amounts are product- and order-specific. Merchants can
            review costs:
          </p>
          <ul className={styles.list}>
            <li>
              In the <strong>Product Customizer</strong> before publishing
              (variant prices by color/size and print placement fees)
            </li>
            <li>
              At charge time on each order (full breakdown: variants + print
              fees + shipping + tax)
            </li>
            <li>
              In <strong>Wallet / billing status</strong> inside the app for
              payment method and billing readiness
            </li>
          </ul>
          <p className={styles.text} style={{ marginTop: "0.85rem" }}>
            Because catalog prices and shipping can change, always confirm
            current costs in the app before setting retail prices.
          </p>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>
            When we charge &amp; failed payments
          </h2>
          <div className={styles.split}>
            <div className={`${styles.splitBlock} ${styles.positive}`}>
              <h3>When we charge</h3>
              <p className={styles.chargeText}>
                We charge your saved payment method{" "}
                <strong>before fulfillment starts</strong> for each billable
                order.
              </p>
            </div>
            <div className={`${styles.splitBlock} ${styles.neutral}`}>
              <h3>If a charge fails</h3>
              <p className={styles.chargeText}>
                Fulfillment is blocked until you update your payment method in
                Wallet and the charge can be completed.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>What we do not charge</h2>
          <div className={styles.split}>
            <div className={styles.splitBlock}>
              <h3>Not included</h3>
              <ul className={styles.list}>
                <li>App install fee</li>
                <li>Monthly app subscription</li>
                <li>Inventory storage fees</li>
                <li>Minimum order quantity fees</li>
                <li>
                  Separate platform % fees beyond the fulfillment components
                  above
                </li>
              </ul>
            </div>
            <div className={styles.splitBlock}>
              <h3>Card security</h3>
              <p className={styles.chargeText}>
                Cards are entered through our secure external payment
                processor&apos;s Web Payments experience. DTFTA does not store
                full card numbers or CVV. We retain only limited card metadata
                (brand, last four digits, expiry) plus payment references needed
                to process charges.
              </p>
              <p className={styles.chargeText} style={{ marginTop: "0.65rem" }}>
                Your end customers are <strong>not</strong> billed by DTFTA.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>FAQ</h2>
          <div className={styles.faqList}>
            <details className={styles.faqItem}>
              <summary>Why aren&apos;t charges on the Shopify bill?</summary>
              <p className={styles.faqBody}>
                Fulfillment costs vary by product, print placements, shipping,
                and tax. Shopify has approved DTF Transfer Authority to process
                these variable merchant fulfillment charges outside the Shopify
                Billing API through our secure external payment system.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Is the app free?</summary>
              <p className={styles.faqBody}>
                Yes — installing and using the app is free. You pay only the
                per-order fulfillment costs described on this page.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Do I need a separate payment processor account?</summary>
              <p className={styles.faqBody}>
                You add a card inside the DTFTA Wallet. Payments are processed
                by our secure external payment partner; you do not need to set
                up a separate public storefront for this flow.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Can I see prices before I sell?</summary>
              <p className={styles.faqBody}>
                Yes. Open a product in the customizer to view color/size variant
                costs and print placement fees before publishing to your store.
                Merchants can review pricing before publishing products and
                before fulfillment charges are processed.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Who pays DTFTA — me or my customer?</summary>
              <p className={styles.faqBody}>
                You (the merchant) pay DTFTA for fulfillment. Your customer pays
                you through Shopify checkout.
              </p>
            </details>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Support &amp; more information</h2>
          <div className={styles.contactGrid}>
            <p className={styles.contactLabel}>Email</p>
            <p className={styles.contactValue}>
              <a className={styles.link} href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </section>

        <div className={styles.actions}>
          <Link className={styles.homeLink} to="/">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
