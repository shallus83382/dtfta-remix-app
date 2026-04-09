console.log("[DTFTA] JS file loaded");

(function () {
  const config = window.DTFTA;
  console.log("[DTFTA] window.DTFTA =", config);

  if (!config?.enabled) {
    console.log("[DTFTA] exiting: config missing or disabled");
    return;
  }

  if (!config?.templateId) return;

  function findProductForms() {
    return document.querySelectorAll('form[action*="/cart/add"]');
  }

  function injectTemplateIdIntoForms() {
    const templateId = config?.templateId;
    console.log("[DTFTA] templateId =", templateId);
    if (!templateId) return;

    findProductForms().forEach((form) => {
      if (!form.getAttribute("data-dtfta-template-id")) {
        form.setAttribute("data-dtfta-template-id", String(templateId));
      }

      let input = form.querySelector('input[name="properties[dtfta_template_id]"]');
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = "properties[dtfta_template_id]";
        form.appendChild(input);
      }

      input.value = String(templateId);
    });
  }

  function getTemplateId(form) {
    const hidden =
      form.querySelector('input[name="properties[dtfta_template_id]"]') ||
      form.querySelector('input[name="dtfta_template_id"]');

    if (hidden && hidden.value) return hidden.value;

    return form.getAttribute("data-dtfta-template-id") || "";
  }

  function getVariantId(form) {
    const input = form.querySelector('[name="id"]');
    return input ? input.value : "";
  }

  async function fetchVariantSku(variantId) {
    if (!variantId) return "";

    try {
      const res = await fetch(`/variants/${variantId}.js`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Unable to fetch variant data");
      }

      const variant = await res.json();
      return String(variant?.sku || "").trim();
    } catch (error) {
      console.error("[DTFTA] Failed to fetch variant SKU", error);
      return "";
    }
  }

  async function buildPodLineItem(payload) {
    const res = await fetch(config.proxyPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Failed to build POD cart data");
    }

    return data;
  }

  async function addToCart(variantId, quantity, properties) {
    const res = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id: Number(variantId),
        quantity,
        properties: properties || {},
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.description || "Cart add failed");
    }

    return data;
  }

  function bindForm(form) {
    if (form.dataset.podBound === "true") return;
    form.dataset.podBound = "true";

    console.log("[DTFTA] bound form", form);

    form.addEventListener("submit", async function (event) {
      const templateId = getTemplateId(form);
      if (!templateId) return;

      // Stop native/theme/app cart submission
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Prevent double submit
      if (form.dataset.dtftaSubmitting === "true") {
        return;
      }
      form.dataset.dtftaSubmitting = "true";

      const submitButton =
        form.querySelector('[type="submit"]') ||
        form.querySelector('button[name="add"]');

      if (submitButton) submitButton.disabled = true;

      try {
        const quantityInput = form.querySelector('input[name="quantity"]');
        const quantity = quantityInput ? Number(quantityInput.value || "1") : 1;
        const variantId = getVariantId(form);

        if (!variantId) {
          throw new Error("Missing selected Shopify variant");
        }

        const sku = await fetchVariantSku(variantId);

        if (!sku) {
          throw new Error("Unable to determine SKU for selected variant");
        }

        const result = await buildPodLineItem({
          shop: config.shop,
          customProductId: templateId,
          sku,
          ajaxVariantId: variantId,
        });

        await addToCart(result.ajaxVariantId || variantId, quantity, result.properties);

        document.dispatchEvent(
          new CustomEvent("dtfta:cart-added", { detail: result })
        );

        window.location.href = "/cart";
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Unable to add product to cart");
      } finally {
        form.dataset.dtftaSubmitting = "false";
        if (submitButton) submitButton.disabled = false;
      }
    }, true); // use capture phase to intercept earlier
  }

  function init() {
    console.log("[DTFTA] init running");
    injectTemplateIdIntoForms();
    findProductForms().forEach(bindForm);
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();