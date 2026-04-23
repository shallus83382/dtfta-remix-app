import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  TextField,
  Badge,
} from "@shopify/polaris";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";
import AppHeroBanner from "../../common/AppHeroBanner";

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
                border: "1px solid #eef2f7",
                background: "#fcfdff",
                padding: 16,
                boxShadow: "0 4px 12px rgba(15,23,42,0.03)",
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
                      background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
                      color: "#ffffff",
                      boxShadow: "0 8px 18px rgba(29,78,216,0.28)",
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
    </AppProvider>
  );
}
