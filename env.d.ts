/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

/** Injected by Vite `define` from `AWS_COULD_FRONT_URL` (see vite.config.ts). */
declare const __DTFTA_ASSET_BASE__: string;

// env.d.ts (add to it)
declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: "development" | "production" | "test";
        SHOPIFY_API_KEY: string;
        SHOPIFY_API_SECRET: string;
        SCOPES?: string;
        SHOPIFY_APP_URL?: string;
        SHOPIFY_API_VERSION?: string;
        EXTERNAL_API_BASE?: string;
        EXTERNAL_API_SECRET?: string;
        AWS_COULD_FRONT_URL?: string;
        // add any other env keys you rely on
    }
}