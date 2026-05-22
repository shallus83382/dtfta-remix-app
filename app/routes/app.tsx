import type {
  HeadersFunction,
  LoaderFunctionArgs,
  LinksFunction,
} from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  AppProvider,
} from "@shopify/shopify-app-react-router/react";

import { AppProvider as PolarisAppProvider, Frame } from "@shopify/polaris";
import translations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import appBrandShell from "../styles/app-brand-shell.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: appBrandShell },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={translations}>
        <div className="appBrandShell">
          <s-app-nav>
            <s-link href="/app/get-started">Get Started</s-link>
            <s-link href="/app/dashboard">Dashboard</s-link>
            <s-link href="/app/products">Products</s-link>
            <s-link href="/app/orders">Orders</s-link>
            <s-link href="/app/wallet">Wallet</s-link>
            <s-link href="/app/settings">Settings</s-link>
          </s-app-nav>
          <Outlet />
        </div>
      </PolarisAppProvider>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};