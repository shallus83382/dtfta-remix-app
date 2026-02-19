/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

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
        // add any other env keys you rely on
    }
}