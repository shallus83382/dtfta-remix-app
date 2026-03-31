import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { Form, useActionData, useLoaderData } from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  List,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { createExternalApiHeaders } from '../lib/external-api.server';
import type { BrandSettings } from '../types';

type LoaderData = {
  success: boolean;
  brandSettings: BrandSettings | null;
  error?: string;
};

type ActionData = {
  success: boolean;
  brandSettings?: BrandSettings;
  error?: string;
};

const getInitialFormData = (brandSettings: BrandSettings | null) => ({
  brandName: brandSettings?.brandName || '',
  streetAddress: brandSettings?.returnAddress?.street || '',
  city: brandSettings?.returnAddress?.city || '',
  state: brandSettings?.returnAddress?.state || '',
  zipCode: brandSettings?.returnAddress?.zipCode || '',
  country: brandSettings?.returnAddress?.country || 'US',
  supportEmail: brandSettings?.supportContact?.email || '',
  supportPhone: brandSettings?.supportContact?.phone || '',
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const API_BASE = process.env.EXTERNAL_API_BASE || '/api';

  try {
    const res = await fetch(
      `${API_BASE}/brand-settings?shop=${encodeURIComponent(session.shop)}`,
      {
        method: 'GET',
        headers: createExternalApiHeaders(undefined, { 'X-Shop': session.shop }),
      },
    );

    if (res.status === 404) {
      return {
        success: true,
        brandSettings: null,
      } satisfies LoaderData;
    }

    if (!res.ok) {
      return {
        success: false,
        brandSettings: null,
        error: `Laravel API returned ${res.status}`,
      } satisfies LoaderData;
    }

    const data = await res.json();

    return {
      success: true,
      brandSettings: data ?? null,
    } satisfies LoaderData;
  } catch (e) {
    return {
      success: false,
      brandSettings: null,
      error: String(e),
    } satisfies LoaderData;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const brandSettings: BrandSettings = {
    brandName: (formData.get('brandName') as string) || '',
    returnAddress: {
      street: (formData.get('streetAddress') as string) || '',
      city: (formData.get('city') as string) || '',
      state: (formData.get('state') as string) || '',
      zipCode: (formData.get('zipCode') as string) || '',
      country: (formData.get('country') as string) || 'US',
    },
    supportContact: {
      email: (formData.get('supportEmail') as string) || '',
      phone: ((formData.get('supportPhone') as string) || '').trim() || undefined,
    },
  };

  const API_BASE = process.env.EXTERNAL_API_BASE || '/api';
  const headers = createExternalApiHeaders(brandSettings, { 'X-Shop': session.shop });

  try {
    const res = await fetch(
      `${API_BASE}/brand-settings?shop=${encodeURIComponent(session.shop)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(brandSettings),
      },
    );

    if (!res.ok) {
      return {
        success: false,
        error: `Laravel API returned ${res.status}`,
      } satisfies ActionData;
    }

    const data = await res.json();

    return {
      success: true,
      brandSettings: data,
    } satisfies ActionData;
  } catch (e) {
    return {
      success: false,
      error: String(e),
    } satisfies ActionData;
  }
};

export default function Settings() {
  const loaderData = useLoaderData<typeof loader>() as LoaderData;
  const actionData = useActionData<typeof action>() as ActionData | undefined;

  const latestBrandSettings =
    actionData?.success && actionData.brandSettings
      ? actionData.brandSettings
      : loaderData.brandSettings;

  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(
    latestBrandSettings ?? null,
  );

  const [formData, setFormData] = useState(() =>
    getInitialFormData(latestBrandSettings ?? null),
  );

  const updateSetupStatus = (_status: Partial<any>) => {
    // placeholder: in the new flow setup status should be handled by your API
  };

  useEffect(() => {
    setBrandSettings(latestBrandSettings ?? null);
    setFormData(getInitialFormData(latestBrandSettings ?? null));
  }, [actionData?.success, loaderData.brandSettings]);

  useEffect(() => {
    if (actionData?.success && actionData.brandSettings) {
      updateSetupStatus({
        fulfillmentServiceConnected: true,
        locationCreated: true,
      });
    }
  }, [actionData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Page title="Settings">
      <InlineStack align="start" gap="500" blockAlign="start">
        <div style={{ flex: '1', minWidth: 0 }}>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Welcome to DTFTA - Complete Your Setup
              </Text>

              {!loaderData.success && loaderData.error ? (
                <Text as="p" tone="critical">
                  {loaderData.error}
                </Text>
              ) : null}

              {actionData?.success ? (
                <Text as="p" tone="success">
                  Settings saved successfully.
                </Text>
              ) : null}

              {actionData?.success === false && actionData.error ? (
                <Text as="p" tone="critical">
                  {actionData.error}
                </Text>
              ) : null}

              <Form method="post">
                <BlockStack gap="500">
                  <Card>
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingSm">
                        Brand Information
                      </Text>
                      <Text as="p" variant="bodyMd">
                        To get started with DTFTA fulfillment services, please provide
                        your brand information. This will be used for white-label packing
                        slips and shipping labels.
                      </Text>
                      <TextField
                        name="brandName"
                        label="Brand Name *"
                        value={formData.brandName}
                        onChange={(value) => handleChange('brandName', value)}
                        placeholder="Your Brand Name"
                        autoComplete="on"
                      />
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingSm">
                        Return Address
                      </Text>
                      <Text as="p" variant="bodyMd">
                        This address will appear on packing slips and return labels.
                      </Text>
                      <BlockStack gap="400">
                        <TextField
                          name="streetAddress"
                          label="Street Address"
                          value={formData.streetAddress}
                          onChange={(value) => handleChange('streetAddress', value)}
                          autoComplete="on"
                        />
                        <InlineStack gap="400">
                          <div style={{ flex: 1 }}>
                            <TextField
                              name="city"
                              label="City"
                              value={formData.city}
                              onChange={(value) => handleChange('city', value)}
                              autoComplete="on"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              name="state"
                              label="State"
                              value={formData.state}
                              onChange={(value) => handleChange('state', value)}
                              autoComplete="on"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              name="zipCode"
                              label="ZIP Code"
                              autoComplete="on"
                              value={formData.zipCode}
                              onChange={(value) => handleChange('zipCode', value)}
                            />
                          </div>
                        </InlineStack>
                        <TextField
                          name="country"
                          label="Country"
                          autoComplete="off"
                          value={formData.country}
                          onChange={(value) => handleChange('country', value)}
                        />
                      </BlockStack>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingSm">
                        Support Contact
                      </Text>
                      <Text as="p" variant="bodyMd">
                        Customer support contact information that will appear on packing
                        slips.
                      </Text>
                      <BlockStack gap="400">
                        <TextField
                          name="supportEmail"
                          label="Support Email"
                          type="email"
                          autoComplete="on"
                          value={formData.supportEmail}
                          onChange={(value) => handleChange('supportEmail', value)}
                          error={
                            !formData.supportEmail ? 'Support email is required' : undefined
                          }
                        />
                        <TextField
                          name="supportPhone"
                          label="Support Phone (Optional)"
                          type="tel"
                          autoComplete="on"
                          value={formData.supportPhone}
                          onChange={(value) => handleChange('supportPhone', value)}
                        />
                      </BlockStack>
                    </BlockStack>
                  </Card>

                  <Button submit variant="primary">
                    Save Settings
                  </Button>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </div>

        <div style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0 }}>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Why we need this
              </Text>
              <Text as="p" variant="bodyMd">
                DTFTA operates as a white-label fulfillment partner. The information you
                provide will be used to:
              </Text>
              <List type="bullet">
                <List.Item>Generate packing slips with your brand name</List.Item>
                <List.Item>Create return labels with your return address</List.Item>
                <List.Item>Display your support contact information to customers</List.Item>
              </List>
              <Text as="p" variant="bodyMd">
                Your customers will never see DTFTA branding - everything will appear as
                if it comes directly from your brand.
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>
    </Page>
  );
}