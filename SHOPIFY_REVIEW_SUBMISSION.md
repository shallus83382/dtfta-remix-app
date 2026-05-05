# Shopify App Review Submission (DTFTA)

This document is prepared for Shopify App Store review submission for the embedded app **DTFTA**.

## 1) App Summary

- **App name:** DTFTA
- **App type:** Embedded Shopify app
- **Primary purpose:**  
  Enable merchants to customize apparel products, sync order/fulfillment data, and run managed fulfillment with pre-fulfillment billing controls.
- **Primary merchant value:**  
  Merchants can configure custom products, route fulfillment operations, and enforce per-order fulfillment charges before fulfillment creation.

## 2) Core Features Reviewer Should Test

1. **Product customization flow**
   - Merchant selects a product and customizes artwork (front/back placements).
   - App saves and creates custom product data in Shopify.

2. **Order + fulfillment operations**
   - App ingests order/fulfillment-related events from Shopify webhooks.
   - Merchant can view order operations inside the app.

3. **Billing / plan gating / pre-fulfillment charge**
   - App uses Shopify managed app pricing with merchant-side billing approval.
   - Before fulfillment starts, app checks billing readiness.
   - App creates a per-order usage charge and blocks fulfillment if billing is not approved or charge fails.

## 3) Billing Model (Shopify Managed App Pricing)

- **Pricing model:** Free app installation + per-order charge to merchant.
- **Charge owner:** Merchant (store owner), via Shopify managed app billing.
- **Charge timing:** At fulfillment start.
- **Charge formula used by app:**  
  `total fulfillment charge = local product subtotal + shipping + tax (if present)`
- **Failure behavior:** Hard block fulfillment and return actionable billing message until billing is approved/charge succeeds.

### Billing implementation notes

- The app requests/creates managed subscription approval URL for the merchant when needed.
- Billing status is synchronized and enforced through backend checks.
- Usage records are created with idempotency protection to prevent duplicate charges.

## 4) Required Access Scopes and Justification

Configured scopes:

- `read_locations` - Required to resolve and assign fulfillment/inventory location context.
- `read_inventory` - Required to work with inventory-linked fulfillment data.
- `read_markets_home` - Required for market-aware storefront/merchant context.
- `read_orders` - Required to ingest and process merchant orders for fulfillment operations.
- `write_products` - Required to create/update custom products and attach related data.
- `write_inventory` - Required to assign/update inventory behavior for created variants.
- `write_fulfillments` - Required to create and update fulfillments.
- `read_assigned_fulfillment_orders` - Required to read assigned fulfillment order details.
- `write_assigned_fulfillment_orders` - Required to accept/manage fulfillment order requests.
- `write_shipping` - Required for shipping profile/rate related setup workflows.

## 5) Webhooks Used

Configured webhook API version: `2026-04`

Webhook topics:

- `app/uninstalled`
- `app/scopes_update`
- `orders/create`
- `orders/updated`
- `orders/delete`
- `fulfillments/create`
- `fulfillments/update`
- `fulfillment_orders/fulfillment_request_submitted`
- `fulfillment_orders/cancellation_request_submitted`

## 6) App URLs / Auth Configuration

- **Embedded:** Yes
- **Application URL:** `https://phpstack-1180784-6299772.cloudwaysapps.com`
- **Privacy Policy URL:** `https://phpstack-1180784-6299772.cloudwaysapps.com/privacy-policy`
- **Terms of Service URL:** `https://phpstack-1180784-6299772.cloudwaysapps.com/terms-of-service`
- **Billing return URL:** `https://phpstack-1180784-6299772.cloudwaysapps.com/billing/return`
- **Auth redirect URLs:**
  - `https://phpstack-1180784-6299772.cloudwaysapps.com/auth`
  - `https://phpstack-1180784-6299772.cloudwaysapps.com/auth/callback`
  - `https://phpstack-1180784-6299772.cloudwaysapps.com/api/auth`
- **App proxy:**
  - Prefix: `apps`
  - Subpath: `dtfta-line-item`
  - URL: `https://phpstack-1180784-6299772.cloudwaysapps.com/apps/dtfta-line-item`

## 7) Theme Editor Requirement (Important)

- Merchant must enable the app embed/extension in Shopify Theme Editor.
- This step is required because the app injects frontend data/properties used by the order/customization flow.
- Without enabling the extension, storefront-side data injection will not occur and app behavior will be incomplete.
- Reviewer should treat this as a required setup step before validating storefront behavior.

## 8) Reviewer Test Instructions

1. Install the app on a development store.
2. In Shopify Admin, open **Online Store > Themes > Customize > App embeds** and enable the DTFTA app extension/embed, then save.
3. Open the embedded app admin and complete onboarding/setup if prompted.
4. Go to dashboard/orders pages and verify app loads merchant data.
5. Trigger billing approval flow:
   - Click **Activate Billing** (shown when billing is required/inactive).
   - Approve managed billing in Shopify.
   - Shopify redirects to `/billing/return`, then the app redirects to `/app/orders`.
6. Create/prepare a fulfillment scenario and start fulfillment:
   - App should calculate pre-fulfillment charge using product subtotal + shipping + tax.
   - App should create usage charge before fulfillment.
7. Verify failure behavior:
   - If billing is inactive/unapproved, fulfillment is blocked and app returns billing action info.

## 9) Data Handling and Security Notes

- App uses Shopify OAuth session handling for embedded authentication.
- Shopify webhooks are validated and then synced into backend workflow processing.
- App uses signed internal requests between app layers for backend sync routes.
- App stores operational data required for order/fulfillment/customization processing.
- No customer payment card data is stored or processed by this app.

## 10) Uninstall Behavior

- On `app/uninstalled`, app clears/deactivates session-linked shop state and marks related operational records inactive per backend logic.

## 11) Support and Review Contact

- **Support email:** `<REPLACE_WITH_SUPPORT_EMAIL>`
- **Primary reviewer contact name:** `<REPLACE_WITH_NAME>`
- **Primary reviewer contact email:** `<REPLACE_WITH_EMAIL>`
- **Optional screencast URL:** `<REPLACE_WITH_SCREENCAST_URL>`

## 12) Notes for Submission Form

When filling the Shopify review form, align answers with this document for:

- App purpose and merchant workflow
- Scope justifications
- Billing behavior and timing
- Webhook topics and usage
- Step-by-step reviewer testing flow

