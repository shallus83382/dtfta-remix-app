## What Shopify expects from this page

Shopify’s checklist asks for a link to a page that:

1. **Describes any charges billed outside Shopify’s Billing API**
2. Lets merchants **get more information or register** for the required service

Your reviewer also asked you to **state that you have a Billing API exemption** (they submitted it because shipping rates fluctuate and fulfillment costs are charged off-platform).

This page should therefore be:

- Public (no login required)
- Clear about **who pays**, **how**, **when**, and **what for**
- Explicit that charges are **outside Shopify Billing**, via **Square**
- Include a simple **how to get started / register** path

It does **not** need a full fixed dollar price list if prices are product-specific and shown in-app — but it **must** explain the fee types and where merchants see exact amounts.

---

## Important accuracy notes (from our product)

Use these facts on the page (do not invent other fees):

| Topic | How it actually works |
|--------|------------------------|
| App install | Free — no subscription / monthly app fee on the Square path |
| Who is charged | The **merchant (store owner)**, not the end customer |
| Payment processor | **Square** (card on file in app **Wallet**) |
| When charged | **Before fulfillment** (pre-fulfillment), per order |
| Charge formula | `Variant subtotal + Print placement fees + Shipping + Tax` |
| Variant price | Set per **color × size** (SKU) in catalog; shown in Product Customizer |
| Print fees | Fixed **price per print placement** (e.g. front, back) — **not** calculated as width × height × rate. Placement dimensions are for design layout only. |
| Shipping | Included from the Shopify order’s shipping amount |
| Tax | Included from the Shopify order’s tax amount when present |
| Failed charge | Fulfillment is blocked until a valid card is on file and the charge succeeds |
| Minimum order / inventory storage | None |

---

## Recommended page structure (sections to build)

### 1. Page title / H1
**Merchant Pricing & Billing**  
(subtitle) Fulfillment charges for the DTFTA Shopify app

### 2. Billing API exemption notice (required for listing context)
Short callout merchants and reviewers can see immediately.

**Draft copy:**

> **Shopify Billing API exemption**  
> DTFTA has approval from Shopify to charge merchants outside the Shopify Billing API.  
> App installation is free. Fulfillment and related costs for print-on-demand apparel are billed separately through our PCI-compliant payment partner (**Square**), because charges vary by product, print placement, shipping, and tax on each order.

### 3. Who this page is for
**Draft copy:**

> This page explains how DTF Transfer Authority (DTFTA) charges Shopify merchants who use our app for custom apparel fulfillment.  
> Your store’s end customers continue to pay you through normal Shopify checkout. DTFTA bills **you (the merchant)** for the cost of producing and fulfilling those orders.

### 4. How to register / get started (Shopify “sign up” requirement)
**Draft copy:**

> **How to get started**
> 1. Install the **DTFTA** app from the Shopify App Store (or open it in your Shopify admin).
> 2. Complete onboarding / profile setup in the app.
> 3. Open **Wallet** in the app and add a payment card (processed securely by Square).
> 4. Customize products, publish them to your store, and fulfill customer orders as usual.
>
> Billing becomes active once a valid card is saved in Wallet. Without an active payment method, fulfillment is paused until billing is set up.

Optional CTA buttons:
- Install / open app: `https://shop.dtftransferauthority.com` (or App Store listing URL)
- Contact: `mailto:orders@dtftransferauthority.com`

### 5. Pricing model overview
**Draft copy:**

> **Pricing model**
> - **App install:** Free  
> - **Monthly / subscription app fee:** None (on our standard Square billing path)  
> - **What you pay:** Per-order fulfillment costs only, when an order is processed for fulfillment  
> - **Payment method:** Card on file via **Square** (managed inside the DTFTA app Wallet)

### 6. What you are charged for (core section)

**Draft copy:**

> **Per-order fulfillment charge**  
> Before we fulfill an order, we calculate and charge:
>
> **Total = Product variant cost + Print fees + Shipping + Tax**

#### 6a. Product / variant cost (color & size)
> Blank / base product costs depend on the **variant** selected by the customer — typically **color** and **size**.  
> Each color/size combination has its own wholesale fulfillment price in our catalog.  
> In the DTFTA Product Customizer, you can review variant pricing before you publish a product so you can set profitable retail prices on Shopify.

#### 6b. Print fees (by print placement / area)
> Print fees are charged **per print placement** used on the item (for example front, back, or other available locations).  
> Each placement has a set print price in our catalog. If a line item uses more than one placement, those print fees are added together and multiplied by quantity.  
> **Note:** Print “area” here means the **placement location** on the garment (front/back/etc.), not a math formula based on design width × height.

#### 6c. Shipping
> Shipping charged to you for fulfillment is based on the shipping amount associated with the Shopify order (carrier / rate selected for that order). Shipping can fluctuate by destination, method, and order details.

#### 6d. Tax
> If tax applies on the order, that tax amount is included in the merchant fulfillment charge calculation when present on the Shopify order.

### 7. Where merchants see exact dollar amounts
**Draft copy:**

> Exact dollar amounts are product- and order-specific. Merchants can review costs:
> - In the **Product Customizer** before publishing (variant prices by color/size and print placement fees)
> - At charge time on each order (full breakdown: variants + print fees + shipping + tax)
> - In **Wallet / billing status** inside the app for payment method and billing readiness
>
> Because catalog prices and shipping can change, always confirm current costs in the app before setting retail prices.

### 8. When payment is taken & what happens on failure
**Draft copy:**

> **When we charge**  
> We charge your saved Square card **before fulfillment starts** for each billable order.
>
> **If a charge fails**  
> Fulfillment is blocked until you update your payment method in Wallet and the charge can be completed. This protects both you and us from fulfilling unpaid production.

### 9. What we do **not** charge (transparency)
**Draft copy:**

> On our standard model we do **not** charge:
> - An app install fee  
> - A monthly app subscription (Square billing path)  
> - Inventory storage fees  
> - Minimum order quantity fees  
> - Separate platform percentage fees beyond the fulfillment components listed above
>
> Your end customers are **not** billed by DTFTA.

### 10. Card security / PCI note (builds trust for reviewers)
**Draft copy:**

> Payment cards are entered through Square’s secure Web Payments experience. DTFTA does not store full card numbers or CVV. We retain only limited card metadata (for example brand, last four digits, and expiry) plus Square references needed to process charges.

### 11. Support / more information
**Draft copy:**

> Questions about merchant billing, pricing, or setting up Wallet?  
> Email **orders@dtftransferauthority.com**  
> DTF Transfer Authority  
> 4473 Forbes Boulevard, Lanham, MD 20706, US
>
> Related policies: [Terms of Service](/terms-of-service) · [Privacy Policy](/privacy-policy)

### 12. Optional FAQ (recommended for App Review clarity)

**Q: Why aren’t charges on the Shopify bill?**  
A: Fulfillment costs vary by product, print placements, shipping, and tax. Shopify has granted DTFTA a Billing API exemption so these variable fulfillment costs can be charged through Square.

**Q: Is the app free?**  
A: Yes — installing and using the app is free. You pay only the per-order fulfillment costs described above.

**Q: Do I need a Square account separately?**  
A: You add a card inside the DTFTA Wallet. Payments are processed by Square as our payment partner; you do not need to set up a separate public Square storefront for this flow.

**Q: Can I see prices before I sell?**  
A: Yes. Open a product in the customizer to view color/size variant costs and print placement fees before publishing to your store.

**Q: Who pays DTFTA — me or my customer?**  
A: You (the merchant) pay DTFTA for fulfillment. Your customer pays you through Shopify checkout.

---

## Listing field checklist (Partner Dashboard)

When pasting the URL into the app listing:

- [ ] Page is live over HTTPS on your app domain
- [ ] Page is public (no Shopify session required)
- [ ] Exemption language is visible near the top
- [ ] Square / off-platform billing is clearly stated
- [ ] Fee components match real product behavior
- [ ] “How to register / get started” steps are present
- [ ] Support contact is present
- [ ] App listing pricing / exemption checkbox remains enabled
- [ ] Optionally mirror one line in the App Store listing description:  
  *“DTFTA has a Shopify Billing API exemption. Fulfillment costs are charged via Square (card on file). See [merchant pricing URL].”*

---

## Suggested short listing blurb (for App Store description)

> **Billing:** Free to install. DTFTA has approval to charge merchants outside the Shopify Billing API. Per-order fulfillment costs (product variants by color/size, print placement fees, shipping, and tax) are charged to your card on file via Square before fulfillment. Details: https://shop.dtftransferauthority.com/merchant-pricing

---

## Implementation status

**Built:** Public page at route `/merchant-pricing`

- `app/routes/merchant-pricing.tsx`
- `app/styles/merchant-pricing.module.css`

**Live URL (after deploy):** `https://shop.dtftransferauthority.com/merchant-pricing`

**Next steps for you:**

1. Deploy the Remix app.
2. Paste that URL into Partner Dashboard → App listing → external billing link field.
3. Reply to Shopify review noting the exemption page URL.

---

## Content owner decisions (confirm if anything differs)

1. Do you want any **example dollar amounts** on the public page (e.g. “from $X”), or keep it formula-only + “see prices in app”?  
   **Recommendation:** formula-only unless you have stable published catalog rates.
2. Preferred slug: `/merchant-pricing` vs `/billing-and-pricing`?
3. Should “register” CTA open the app login, App Store listing, or email sales?
4. Confirm print fee wording: **per placement (front/back)** — not width×height — matches how you want to explain it to merchants.
