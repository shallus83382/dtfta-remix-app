import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { Form, useActionData, useLoaderData } from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Badge,
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

  const completedItems = [
    Boolean(formData.brandName.trim()),
    Boolean(formData.streetAddress.trim() && formData.city.trim() && formData.state.trim()),
    Boolean(formData.zipCode.trim() && formData.country.trim()),
    Boolean(formData.supportEmail.trim()),
  ].filter(Boolean).length;
  const completionPercent = Math.round((completedItems / 4) * 100);

  const panelStyle = {
    borderRadius: 14,
    border: '1px solid #eef2f7',
    background: '#fcfdff',
    padding: 14,
    boxShadow: '0 4px 12px rgba(15,23,42,0.03)',
  } as const;

  const submitButtonStyle = {
    borderRadius: 10,
    border: '1px solid transparent',
    height: 40,
    padding: '0 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 180ms ease',
    background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    color: '#ffffff',
    boxShadow: '0 8px 18px rgba(29,78,216,0.28)',
    width: 'fit-content',
  } as const;

  const fieldShellStyle = {
    borderRadius: 10,
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    padding: 0,
  } as const;

  const fieldLabelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 6,
  } as const;

  const fieldInputStyle = {
    width: '100%',
    height: 42,
    borderRadius: 10,
    border: '1px solid #d6deea',
    backgroundColor: '#ffffff',
    padding: '0 12px',
    fontSize: 14,
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  };

  return (
    <Page title="Settings" fullWidth>
      <BlockStack gap="500">
        <Card>
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(30,41,59,0.96) 0%, rgba(37,99,235,0.9) 55%, rgba(14,116,144,0.88) 100%)',
              borderRadius: 12,
              padding: 24,
              color: '#ffffff',
            }}
          >
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="start">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingLg" tone="text-inverse">
                    Brand & Fulfillment Settings
                  </Text>
                  <Text as="p" tone="text-inverse">
                    Configure white-label profile details used for packing slips, return labels,
                    and support communication.
                  </Text>
                </BlockStack>
                <Badge tone="info">Advanced Setup</Badge>
              </InlineStack>

              <InlineStack gap="200">
                <Badge tone={completionPercent === 100 ? 'success' : 'warning'}>
                  {completionPercent}% Complete
                </Badge>
                <Badge tone="info">Shop profile active</Badge>
              </InlineStack>
            </BlockStack>
          </div>
        </Card>

      <InlineStack align="start" gap="500" blockAlign="start">
        <div style={{ flex: '1', minWidth: 0, maxWidth: 980 }}>
          <Card>
            <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Complete Your Setup
                  </Text>
                  <Badge tone="info">Profile</Badge>
                </InlineStack>
              </InlineStack>

              {!loaderData.success && loaderData.error ? (
                <div
                  style={{
                    borderRadius: 10,
                    border: '1px solid #fecaca',
                    backgroundColor: '#fff1f2',
                    padding: 12,
                  }}
                >
                  <Text as="p" tone="critical">
                    {loaderData.error}
                  </Text>
                </div>
              ) : null}

              {actionData?.success ? (
                <div
                  style={{
                    borderRadius: 10,
                    border: '1px solid #bbf7d0',
                    backgroundColor: '#ecfdf5',
                    padding: 12,
                  }}
                >
                  <Text as="p" tone="success">
                    Settings saved successfully.
                  </Text>
                </div>
              ) : null}

              {actionData?.success === false && actionData.error ? (
                <div
                  style={{
                    borderRadius: 10,
                    border: '1px solid #fecaca',
                    backgroundColor: '#fff1f2',
                    padding: 12,
                  }}
                >
                  <Text as="p" tone="critical">
                    {actionData.error}
                  </Text>
                </div>
              ) : null}

              <Form method="post">
                <BlockStack gap="500">
                  <Card>
                    <div style={panelStyle}>
                      <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h3" variant="headingSm">
                            Brand Information
                          </Text>
                          <Badge tone="info">Required</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          This information appears on white-label packing slips and shipping labels.
                        </Text>
                        <div style={fieldShellStyle}>
                          <label style={fieldLabelStyle} htmlFor="brandName">
                            Brand Name *
                          </label>
                          <input
                            id="brandName"
                            name="brandName"
                            value={formData.brandName}
                            onChange={(e) => handleChange('brandName', e.target.value)}
                            placeholder="Your Brand Name"
                            autoComplete="organization"
                            style={fieldInputStyle}
                          />
                        </div>
                      </BlockStack>
                    </div>
                  </Card>

                  <Card>
                    <div style={panelStyle}>
                      <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h3" variant="headingSm">
                            Return Address
                          </Text>
                          <Badge tone="warning">Operations</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          Used on return labels and fulfillment documents.
                        </Text>
                        <BlockStack gap="400">
                          <div style={fieldShellStyle}>
                            <label style={fieldLabelStyle} htmlFor="streetAddress">
                              Street Address
                            </label>
                            <input
                              id="streetAddress"
                              name="streetAddress"
                              value={formData.streetAddress}
                              onChange={(e) => handleChange('streetAddress', e.target.value)}
                              autoComplete="street-address"
                              style={fieldInputStyle}
                            />
                          </div>
                          <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
                            <div style={fieldShellStyle}>
                              <label style={fieldLabelStyle} htmlFor="city">
                                City
                              </label>
                              <input
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={(e) => handleChange('city', e.target.value)}
                                autoComplete="address-level2"
                                style={fieldInputStyle}
                              />
                            </div>
                            <div style={fieldShellStyle}>
                              <label style={fieldLabelStyle} htmlFor="state">
                                State
                              </label>
                              <input
                                id="state"
                                name="state"
                                value={formData.state}
                                onChange={(e) => handleChange('state', e.target.value)}
                                autoComplete="address-level1"
                                style={fieldInputStyle}
                              />
                            </div>
                            <div style={fieldShellStyle}>
                              <label style={fieldLabelStyle} htmlFor="zipCode">
                                ZIP Code
                              </label>
                              <input
                                id="zipCode"
                                name="zipCode"
                                autoComplete="postal-code"
                                value={formData.zipCode}
                                onChange={(e) => handleChange('zipCode', e.target.value)}
                                style={fieldInputStyle}
                              />
                            </div>
                          </InlineGrid>
                          <div style={fieldShellStyle}>
                            <label style={fieldLabelStyle} htmlFor="country">
                              Country
                            </label>
                            <input
                              id="country"
                              name="country"
                              autoComplete="country-name"
                              value={formData.country}
                              onChange={(e) => handleChange('country', e.target.value)}
                              style={fieldInputStyle}
                            />
                          </div>
                        </BlockStack>
                      </BlockStack>
                    </div>
                  </Card>

                  <Card>
                    <div style={panelStyle}>
                      <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h3" variant="headingSm">
                            Support Contact
                          </Text>
                          <Badge tone="success">Customer-facing</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          Displayed on packing slips so customers can contact your brand directly.
                        </Text>
                        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                          <div style={fieldShellStyle}>
                            <label style={fieldLabelStyle} htmlFor="supportEmail">
                              Support Email
                            </label>
                            <input
                              id="supportEmail"
                              name="supportEmail"
                              type="email"
                              autoComplete="email"
                              value={formData.supportEmail}
                              onChange={(e) => handleChange('supportEmail', e.target.value)}
                              style={{
                                ...fieldInputStyle,
                                borderColor: !formData.supportEmail ? '#fca5a5' : '#d6deea',
                                backgroundColor: !formData.supportEmail ? '#fff7f7' : '#ffffff',
                              }}
                            />
                            {!formData.supportEmail ? (
                              <Text as="p" variant="bodySm" tone="critical">
                                Support email is required
                              </Text>
                            ) : null}
                          </div>
                          <div style={fieldShellStyle}>
                            <label style={fieldLabelStyle} htmlFor="supportPhone">
                              Support Phone (Optional)
                            </label>
                            <input
                              id="supportPhone"
                              name="supportPhone"
                              type="tel"
                              autoComplete="tel"
                              value={formData.supportPhone}
                              onChange={(e) => handleChange('supportPhone', e.target.value)}
                              style={fieldInputStyle}
                            />
                          </div>
                        </InlineGrid>
                      </BlockStack>
                    </div>
                  </Card>

                  <div style={{ paddingBottom: 24 }}>
                    <button type="submit" style={submitButtonStyle}>
                      Save Settings
                    </button>
                  </div>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </div>

        <div style={{ minWidth: '320px', maxWidth: '360px', flexShrink: 0 }}>
          <Card>
            <div style={panelStyle}>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Why this matters
                  </Text>
                  <Badge tone="info">White-label</Badge>
                </InlineStack>

                <Text as="p" variant="bodyMd">
                  DTFTA acts as your fulfillment partner behind the scenes. These settings ensure
                  every customer touchpoint reflects your brand identity.
                </Text>
                <List type="bullet">
                  <List.Item>Generate packing slips with your brand name</List.Item>
                  <List.Item>Create return labels with your return address</List.Item>
                  <List.Item>Display your support contact information to customers</List.Item>
                </List>
                <Text as="p" variant="bodyMd">
                  Customers only see your brand, while DTFTA handles operational fulfillment.
                </Text>
              </BlockStack>
            </div>
          </Card>
        </div>
      </InlineStack>
      <div style={{ marginBottom: 32 }} />
      </BlockStack>
    </Page>
  );
}