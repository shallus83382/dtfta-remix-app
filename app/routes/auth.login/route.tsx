import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  Text,
  TextField,
  Badge,
  InlineStack,
} from "@shopify/polaris";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

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
          <Card>
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(30,41,59,0.96) 0%, rgba(37,99,235,0.9) 55%, rgba(14,116,144,0.88) 100%)",
                borderRadius: 12,
                padding: 24,
                color: "#ffffff",
              }}
            >
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="start">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingLg" tone="text-inverse">
                      DTFTA Admin Access
                    </Text>
                    <Text as="p" tone="text-inverse">
                      Log in with your Shopify store domain to access DTFTA operations.
                    </Text>
                  </BlockStack>
                  <Badge tone="info">Secure Login</Badge>
                </InlineStack>
              </BlockStack>
            </div>
          </Card>

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
