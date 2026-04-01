(function () {
    if (!window.__DTFTA__?.enabled) return;
  
    function findProductForms() {
      return document.querySelectorAll('form[action*="/cart/add"]');
    }

    function injectTemplateIdIntoForms() {
      const templateId = window.__DTFTA__?.templateId;
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
  
    function getSelectedOption(form, optionName) {
      const lowered = optionName.toLowerCase();
  
      // First try named selects/radios commonly used by themes
      const fields = form.querySelectorAll("select, input[type='radio']:checked, input[type='hidden']");
      for (const field of fields) {
        const name = (field.getAttribute("name") || "").toLowerCase();
        const value = field.value;
  
        if (!value) continue;
        if (name.includes(lowered) || name.includes(`options[${lowered}]`) || name.includes(`option-${lowered}`)) {
          return value;
        }
      }
  
      // Fallback: look for data-option-name wrappers
      const wrapper = form.querySelector(`[data-option-name="${optionName}"]`);
      if (wrapper) {
        const input = wrapper.querySelector("select, input:checked");
        if (input && input.value) return input.value;
      }
  
      return "";
    }
  
    function getTemplateId(form) {
      const hidden =
        form.querySelector('input[name="properties[dtfta_template_id]"]') ||
        form.querySelector('input[name="dtfta_template_id"]');
  
      if (hidden && hidden.value) return hidden.value;
  
      return form.getAttribute("data-dtfta-template-id") || "";
    }
  
    function getVariantId(form) {
      const input = form.querySelector('input[name="id"]');
      return input ? input.value : "";
    }
  
    async function buildPodLineItem(payload) {
      const res = await fetch(window.__DTFTA__.proxyPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
  
      const data = await res.json();
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
          "Accept": "application/json"
        },
        body: JSON.stringify({
          id: Number(variantId),
          quantity,
          properties
        })
      });
  
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.description || "Cart add failed");
      }
      return data;
    }
  
    function bindForm(form) {
      if (form.dataset.podBound === "true") return;
      form.dataset.podBound = "true";
  
      form.addEventListener("submit", async function (event) {
        const templateId = getTemplateId(form);
        if (!templateId) return; // not one of your POD products
  
        event.preventDefault();
  
        try {
          const color = getSelectedOption(form, "Color");
          const size = getSelectedOption(form, "Size");
          const quantityInput = form.querySelector('input[name="quantity"]');
          const quantity = quantityInput ? Number(quantityInput.value || "1") : 1;
          const variantId = getVariantId(form);
  
          const result = await buildPodLineItem({
            shop: window.__DTFTA__.shop,
            customProductId: templateId,
            color,
            size,
            ajaxVariantId: variantId
          });
  
          await addToCart(result.ajaxVariantId || variantId, quantity, result.properties);
  
          document.dispatchEvent(new CustomEvent("dtfta:cart-added", { detail: result }));
  
          // optional theme refresh
          window.location.href = "/cart";
        } catch (err) {
          console.error(err);
          alert(err instanceof Error ? err.message : "Unable to add product to cart");
        }
      });
    }
  
    function init() {
      injectTemplateIdIntoForms();
      findProductForms().forEach(bindForm);
    }
  
    document.addEventListener("DOMContentLoaded", init);
    init();
  })();