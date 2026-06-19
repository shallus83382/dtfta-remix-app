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
   - Merchant selects a product and customizes artwork.
   - App saves and creates custom product data in Shopify.

2. **Order + fulfillment operations**
   - App ingests order/fulfillment-related events from Shopify webhooks.
   - Merchant can view order operations inside the app.

3. **Billing / plan gating / pre-fulfillment charge**
   - Merchant adds a payment card in the app **Wallet** (powered by Square).
   - Before fulfillment starts, app checks that a chargeable card is on file.
   - App charges the merchant's saved card via Square for each order and blocks fulfillment if no card is on file or the charge fails.

## 3) Billing Model (Square Wallet — Merchant Card on File)

- **Pricing model:** Free app installation + per-order charge to merchant.
- **Charge owner:** Merchant (store owner).
- **Payment processor:** Square (merchant card on file in the app Wallet).
- **Charge timing:** Before fulfillment starts (pre-fulfillment billing).
- **Charge formula used by app:**  
  `total fulfillment charge = product variant subtotal + print area fees + shipping + tax (if present)`
- **Failure behavior:** Hard block fulfillment and return actionable billing message until a valid card is saved and the charge succeeds.

### Billing implementation notes

- Merchants tokenize and save a card through Square Web Payments SDK in the embedded app **Wallet** page.
- Full card numbers and CVV are **not** stored by DTFTA. Only limited card metadata is retained locally (e.g. card brand, last 4 digits, expiry month/year) for display and reconciliation, in line with Shopify app policy and PCI expectations.
- Square stores the vaulted card reference (`square_card_id`) used to process charges.
- Billing status is **active** when the shop has a Square customer on file and at least one active saved card.
- Per-order charges are created with idempotency protection to prevent duplicate charges.
- End customers are never billed by DTFTA — only the merchant (store owner) is charged for fulfillment costs.

## 4) Transparent Pricing

Merchants see fulfillment costs upfront across the product workflow:

- View fulfillment costs before publishing products.
- See product pricing based on selected color and size variants.
- View print area fees for each placement, including front, back, and other available print locations.
- Shipping costs are included in fulfillment calculations.
- Know costs upfront and set profitable retail margins.
- Pay only when customer orders are processed.
- No inventory investment or storage costs.
- No minimum order quantities.

## 5) Required Access Scopes and Justification

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

## 6) Webhooks Used

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


## 7) Theme Editor Requirement (Important)

- Merchant must enable the app embed/extension in Shopify Theme Editor.
- This step is required because the app injects frontend data/properties used by the order/customization flow.
- Without enabling the extension, storefront-side data injection will not occur and app behavior will be incomplete.
- Reviewer should treat this as a required setup step before validating storefront behavior.

## 8) Reviewer Test Instructions

1. Install the app on a development store.
2. In Shopify Admin, open **Online Store > Themes > Customize > App embeds** and enable the DTFTA app extension/embed, then save.
3. Open the embedded app admin and complete onboarding/setup if prompted, or set up our profile in **Settings**.
4. Go to dashboard/orders pages and verify app loads merchant data.
5. Create and publish a customized product:
   - Open **Products** in the embedded app.
   - Choose a product from the catalog.
   - Click **Customize and Add to Store** (shown after a product is selected; before selection the button reads **Choose a Product to Continue**).
   - In the Product Customizer, upload artwork and place it on available print areas (front, back, etc.).
   - Preview the product mockup by color/variant to confirm the design.
   - Click **Add to Store** to sync the customized product to the merchant's Shopify store.
   - Verify the product appears in Shopify Admin under **Products**.
6. Verify transparent pricing in the Product Customizer:
   - Open a product and confirm variant pricing updates by color and size.
   - Confirm print area fees are shown per placement (front, back, and other locations).
   - Confirm fulfillment cost visibility is available before publishing/syncing to Shopify.
7. Set up merchant billing (Wallet):
   - Open **Wallet** in the embedded app (or click **Activate Billing** when prompted — this routes to Wallet).
   - Add a payment card using the Square card form.
   - Confirm billing status shows **active** after a card is saved.
8. Create/prepare a fulfillment scenario and start fulfillment:
   - App should calculate pre-fulfillment charge using variant subtotal + print area fees + shipping + tax.
   - App should charge the merchant's saved Square card before fulfillment proceeds.
9. Verify failure behavior:
   - If no card is on file or a charge fails, fulfillment is blocked and the app prompts the merchant to add or update their payment method in Wallet.

## 9) Data Handling and Security Notes

- App uses Shopify OAuth session handling for embedded authentication.
- Shopify webhooks are validated and then synced into backend workflow processing.
- App uses signed internal requests between app layers for backend sync routes.
- App stores operational data required for order/fulfillment/customization processing.
- Merchant payment cards are tokenized and vaulted through **Square**. DTFTA does not store full card numbers or CVV.
- DTFTA stores only limited merchant card metadata for Wallet display (card brand, last 4 digits, expiry) plus Square customer/card references for charging.
- No end-customer payment card data is stored or processed by this app.

## 10) Uninstall Behavior

- On `app/uninstalled`, app clears/deactivates session-linked shop state and marks related operational records inactive per backend logic.

