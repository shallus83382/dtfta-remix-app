import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import {
  AppProvider as PolarisAppProvider,
  Page,
  Card,
  BlockStack,
  Text,
  TextField,
  Badge,
} from "@shopify/polaris";
import translations from "@shopify/polaris/locales/en.json";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";
import AppHeroBanner from "../../common/AppHeroBanner";
import {
  brandColors,
  brandPrimaryButtonBg,
  brandPrimaryCtaShadow,
} from "../../lib/brand-theme";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <PolarisAppProvider i18n={translations}>
        <Page title="Login" fullWidth>
          <BlockStack gap="500">
            <AppHeroBanner
              title="DTFTA Admin Access"
              subtitle="Log in with your Shopify store domain to access DTFTA operations."
              badges={<Badge tone="info">Secure Login</Badge>}
            />

            <Card>
              <div
                style={{
                  maxWidth: 560,
                  margin: "0 auto",
                  borderRadius: 14,
                  border: `1px solid ${brandColors.surfaceBorder}`,
                  background: brandColors.canvas,
                  padding: 16,
                  boxShadow: "0 4px 12px rgba(22,22,31,0.06)",
                }}
              >
                <Form method="post">
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">
                      Log in
                    </Text>

                    <TextField
                      name="shop"
                      label="Shop domain"
                      helpText="example.myshopify.com"
                      value={shop}
                      onChange={setShop}
                      autoComplete="on"
                      error={errors.shop}
                    />

                    <button
                      type="submit"
                      style={{
                        borderRadius: 10,
                        border: "1px solid transparent",
                        height: 40,
                        padding: "0 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 180ms ease",
                        background: brandPrimaryButtonBg,
                        color: "#ffffff",
                        boxShadow: brandPrimaryCtaShadow,
                        width: "fit-content",
                      }}
                    >
                      Log in
                    </button>
                  </BlockStack>
                </Form>
              </div>
            </Card>
          </BlockStack>
        </Page>
      </PolarisAppProvider>
    </AppProvider>
  );
}
