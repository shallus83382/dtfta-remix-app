import type { HeadersFunction, LinksFunction, LoaderFunctionArgs } from "react-router";
import { Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import getStartedStyles from "../styles/get-started.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: getStartedStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

function IconCheckWhite() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 6l2.5 2.5L10 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRibbon() {
  return (
    <svg className="gs-feature-icon" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 4l2.5 5 5.5.8-4 3.9.9 5.5L16 16.9l-4.9 2.6.9-5.5-4-3.9 5.5-.8L16 4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M11 21v7l5-3 5 3v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconLightning() {
  return (
    <svg className="gs-feature-icon" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M18 3L8 16h6l-2 13 12-17h-7l3-9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg className="gs-feature-icon" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 4l8 3v8c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M11 16l3 3 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHeadset() {
  return (
    <svg className="gs-feature-icon" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M6 18v4a3 3 0 003 3h1M26 18v4a3 3 0 01-3 3h-1M8 18h-.5A2.5 2.5 0 005 20.5V22a2 2 0 002 2h1M24 18h.5A2.5 2.5 0 0127 20.5V22a2 2 0 01-2 2h-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 18c0-5 3.6-9 8-9s8 4 8 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function IconShopifyBag() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M6.5 10.5h15v12a2 2 0 01-2 2h-11a2 2 0 01-2-2v-12z"
        fill="#95BF47"
      />
      <path
        d="M10 10.5V8.5a4 4 0 018 0v2"
        stroke="#5E8E3E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M6.5 14h15" stroke="#5E8E3E" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

const ASSET = (name: string) => `/assets/get-started/${name}`;

export default function GetStarted() {
  return (
    <div className="gs-landing">
      <div className="gs-bg-shapes" aria-hidden="true">
        <span className="gs-bg-arc" />
        <span className="gs-bg-dots" />
        <span className="gs-bg-purple" />
        <span className="gs-bg-pink" />
        <span className="gs-bg-peach" />
      </div>
      <div className="gs-inner">
        <section className="gs-top" aria-label="Introduction">
          <div className="gs-hero">
            <img
              className="gs-logo"
              src={ASSET("logo.png")}
              alt="DTF Transfer Authority"
              width={96}
              height={96}
            />
            <h1>
              <span className="gs-line-dark">Print High-Quality</span>
              <span className="gs-line-orange">DTF Transfers on Demand</span>
            </h1>
            <p className="gs-hero-sub">
              The easiest way for Shopify merchants to create, order, and sell premium DTF transfers.
            </p>
            <ul className="gs-hero-list">
              {[
                "No Minimum Orders",
                "Vibrant Colors & Premium Quality",
                "Fast Production & Shipping",
                "Seamless Shopify Integration",
              ].map((label) => (
                <li key={label}>
                  <span className="gs-check-orange">
                    <IconCheckWhite />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
            <Link to="/app/dashboard" className="gs-btn-primary">
              Get Started
            </Link>
            <p className="gs-login-hint">
              Already have an account? <Link to="/auth/login">Log in</Link>
            </p>
          </div>

          <div className="gs-hiw">
            <header className="gs-hiw-header">
              <div className="gs-hiw-title-wrap">
                <div className="gs-hiw-lines" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <h2>How It Works</h2>
                <div className="gs-hiw-lines" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <p className="gs-hiw-sub">Simple 3 steps to get started</p>
            </header>

            <div className="gs-steps">
              <article className="gs-step-card">
                <span className="gs-step-num">1</span>
                <div className="gs-step-img-wrap">
                  <img
                    className="gs-step-img"
                    src={ASSET("step-upload.png")}
                    alt=""
                    width={140}
                    height={100}
                  />
                </div>
                <h3>Upload Your Design</h3>
                <p>
                  Upload your artwork or design file directly in the app. We support PNG, JPG, PDF, and more.
                </p>
              </article>

              <div className="gs-step-connector" aria-hidden>
                <img className="gs-curve-arrow" src={ASSET("arrow-connector.png")} alt="" />
              </div>

              <article className="gs-step-card">
                <span className="gs-step-num">2</span>
                <div className="gs-step-img-wrap">
                  <img
                    className="gs-step-img"
                    src={ASSET("step-print.png")}
                    alt=""
                    width={140}
                    height={100}
                  />
                </div>
                <h3>We Print It</h3>
                <p>
                  Our team prints your design using premium DTF technology with vibrant colors and durable quality.
                </p>
              </article>

              <div className="gs-step-connector" aria-hidden>
                <img className="gs-curve-arrow" src={ASSET("arrow-connector.png")} alt="" />
              </div>

              <article className="gs-step-card">
                <span className="gs-step-num">3</span>
                <div className="gs-step-img-wrap">
                  <img
                    className="gs-step-img"
                    src={ASSET("step-sell.png")}
                    alt=""
                    width={140}
                    height={100}
                  />
                </div>
                <h3>You Press &amp; Sell</h3>
                <p>
                  Apply the transfer to your products and start selling to your customers with confidence.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="gs-features-bar" aria-label="Features">
          <div className="gs-feature-cell">
            <IconRibbon />
            <h4>Premium Quality</h4>
            <p>Long-lasting &amp; vibrant prints</p>
          </div>
          <div className="gs-feature-cell">
            <IconLightning />
            <h4>Fast Turnaround</h4>
            <p>Quick production &amp; delivery</p>
          </div>
          <div className="gs-feature-cell">
            <IconShieldCheck />
            <h4>Durable &amp; Washable</h4>
            <p>Built to last wash after wash</p>
          </div>
          <div className="gs-feature-cell">
            <IconHeadset />
            <h4>Dedicated Support</h4>
            <p>We&apos;re here to help you grow</p>
          </div>
        </section>

        <section className="gs-bottom" aria-label="Shopify integration and products">
          <div className="gs-shopify-block">
            <h2>Built for Shopify Merchants</h2>
            <p>
              Our app seamlessly integrates with your Shopify store so you can manage DTF transfer orders without
              leaving your workflow.
            </p>
            <ul className="gs-shopify-list">
              {["Easy order management", "Real-time order tracking", "Automated fulfillment"].map((label) => (
                <li key={label}>
                  <span className="gs-check-green">
                    <IconCheckWhite />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
            <div className="gs-shopify-badge">
              <IconShopifyBag />
              <span>Shopify App Partner</span>
            </div>
          </div>

          <div className="gs-products">
            <div className="gs-product-card">
              <div className="gs-product-img-wrap">
                <img src={ASSET("product-tee.png")} alt="T-shirt with vibrant print" width={200} height={260} />
              </div>
              <span>T-Shirts</span>
            </div>
            <div className="gs-product-card">
              <div className="gs-product-img-wrap">
                <img src={ASSET("product-hoodie.png")} alt="Hoodie with graphic" width={200} height={260} />
              </div>
              <span>Hoodies</span>
            </div>
            <div className="gs-product-card">
              <div className="gs-product-img-wrap">
                <img src={ASSET("product-tote.png")} alt="Tote bag with design" width={200} height={260} />
              </div>
              <span>Tote Bags</span>
            </div>
            <div className="gs-product-card">
              <div className="gs-product-img-wrap">
                <img src={ASSET("product-cap.png")} alt="Cap with DTF logo" width={200} height={260} />
              </div>
              <span>And More...</span>
            </div>
          </div>
        </section>

        <section className="gs-cta-bar" aria-label="Call to action">
          <div className="gs-cta-icon">
            <img src={ASSET("party-popper.png")} alt="" width={44} height={44} />
          </div>
          <div className="gs-cta-text">
            <h3>Ready to Grow Your Business?</h3>
            <p>Start creating and selling custom products with premium DTF transfers.</p>
          </div>
          <Link to="/app/products" className="gs-btn-primary">
            Start Selling Now
          </Link>
        </section>
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
