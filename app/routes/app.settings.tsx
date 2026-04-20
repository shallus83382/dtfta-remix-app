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
    borderRadius: 0,
    border: 'none',
    backgroundColor: 'transparent',
    padding: 0,
    boxShadow: 'none',
  } as const;

  const submitButtonStyle = {
    borderRadius: 8,
    border: '1px solid transparent',
    height: 42,
    padding: '0 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 180ms ease',
    background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    color: '#ffffff',
    boxShadow: '0 8px 18px rgba(29,78,216,0.28)',
    width: 'fit-content',
  } as const;

  const fieldLabelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
  } as const;

  const fieldInputStyle = {
    width: '100%',
    height: 40,
    borderRadius: 8,
    border: '1px solid #d1d5db',
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
              borderRadius: 12,
              background:
                'linear-gradient(135deg, rgba(30,41,59,0.96) 0%, rgba(37,99,235,0.9) 55%, rgba(14,116,144,0.88) 100%)',
              border: '1px solid rgba(148,163,184,0.28)',
              padding: 22,
            }}
          >
            <BlockStack gap="100">
              <Text as="h2" variant="headingLg" tone="text-inverse">
                Brand & Fulfillment Settings
              </Text>
              <Text as="p" tone="text-inverse">
                Configure your brand details for packing slips, return labels, and support contact.
              </Text>
            </BlockStack>
          </div>
        </Card>

      <InlineStack align="start" gap="400" blockAlign="start">
        <div style={{ flex: '1', minWidth: 0, maxWidth: 980 }}>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Complete your profile
              </Text>

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
                        <Text as="h3" variant="headingSm">
                          Brand Information
                        </Text>
                        <Text as="p" variant="bodyMd">
                          This information appears on white-label packing slips and shipping labels.
                        </Text>
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
                      </BlockStack>
                    </div>
                  </Card>

                  <Card>
                    <div style={panelStyle}>
                      <BlockStack gap="400">
                        <Text as="h3" variant="headingSm">
                          Return Address
                        </Text>
                        <Text as="p" variant="bodyMd">
                          Used on return labels and fulfillment documents.
                        </Text>
                        <BlockStack gap="400">
                          <div>
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
                            <div>
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
                            <div>
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
                            <div>
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
                          <div>
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
                        <Text as="h3" variant="headingSm">
                          Support Contact
                        </Text>
                        <Text as="p" variant="bodyMd">
                          Displayed on packing slips so customers can contact your brand directly.
                        </Text>
                        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                          <div>
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
                          <div>
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
                <InlineStack align="space-between" blockAlign="start">
                  <Text as="h2" variant="headingMd">
                    Profile status
                  </Text>
                  <Text
                    as="p"
                    variant="bodySm"
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      backgroundColor: completionPercent === 100 ? '#dcfce7' : '#fef3c7',
                      color: completionPercent === 100 ? '#166534' : '#92400e',
                      fontWeight: 600,
                    }}
                  >
                    {completionPercent}% complete
                  </Text>
                </InlineStack>

                <div
                  style={{
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#f8fafc',
                    padding: 12,
                  }}
                >
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm">
                      Brand name: {formData.brandName.trim() ? 'Done' : 'Missing'}
                    </Text>
                    <Text as="p" variant="bodySm">
                      Return address:{' '}
                      {formData.streetAddress.trim() && formData.city.trim() && formData.state.trim()
                        ? 'Done'
                        : 'Missing'}
                    </Text>
                    <Text as="p" variant="bodySm">
                      Postal details:{' '}
                      {formData.zipCode.trim() && formData.country.trim() ? 'Done' : 'Missing'}
                    </Text>
                    <Text as="p" variant="bodySm">
                      Support email: {formData.supportEmail.trim() ? 'Done' : 'Missing'}
                    </Text>
                  </BlockStack>
                </div>

                <Text as="p" tone="subdued">
                  Keep this information accurate so packing slips and return labels always match
                  your brand.
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