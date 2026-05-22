const SQUARE_SCRIPT = {
  sandbox: "https://sandbox.web.squarecdn.com/v1/square.js",
  production: "https://web.squarecdn.com/v1/square.js",
} as const;

const SCRIPT_ID = "square-web-payments-sdk";
const LOADED_ATTR = "data-square-loaded";

/** Wait until Square global is available (script onload can fire before it is set). */
export function waitForSquareGlobal(timeoutMs = 15000): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Square SDK can only load in the browser."));
  }
  if (window.Square) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.Square) {
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(
          new Error(
            "Square Web Payments SDK did not initialize. Check network/CSP or Square credentials.",
          ),
        );
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

/** Load square.js once per page and resolve when window.Square is ready. */
export function loadSquareSdk(environment: "sandbox" | "production"): Promise<void> {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("Square SDK can only load in the browser."));
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    if (existing.getAttribute(LOADED_ATTR) === "true" || window.Square) {
      return waitForSquareGlobal();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => {
        waitForSquareGlobal().then(resolve).catch(reject);
      });
      existing.addEventListener("error", () => {
        reject(new Error("Failed to load Square SDK script."));
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SQUARE_SCRIPT[environment];
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.setAttribute(LOADED_ATTR, "true");
      waitForSquareGlobal().then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error("Failed to load Square SDK script."));
    document.head.appendChild(script);
  });
}
