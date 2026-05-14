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
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { createExternalApiHeaders } from '../lib/external-api.server';
import type { BrandSettings } from '../types';
import AppHeroBanner from '../common/AppHeroBanner';
import {
  brandColors,
  brandPrimaryButtonBg,
  brandPrimaryCtaShadow,
} from '../lib/brand-theme';

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
    border: '1px solid #dbe3ec',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    padding: 16,
    boxShadow: '0 10px 24px rgba(22,22,31,0.08)',
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
    background: brandPrimaryButtonBg,
    color: '#ffffff',
    boxShadow: brandPrimaryCtaShadow,
    width: 'fit-content',
  } as const;

  const fieldLabelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: brandColors.textMuted,
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
    color: brandColors.text,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  };

  const sidebarSurfaceStyle = {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderRadius: 16,
    border: '1px solid rgba(255, 106, 0, 0.28)',
    background: 'linear-gradient(145deg, #ffffff 0%, rgba(255, 106, 0, 0.08) 100%)',
    padding: 16,
    boxShadow: '0 14px 30px rgba(15,23,42,0.1)',
  };

  return (
    <Page fullWidth>
      <style>
        {`
          .settings-save-btn {
            position: relative;
            overflow: hidden;
          }
          .settings-save-btn::after {
            content: "";
            position: absolute;
            top: 0;
            left: -38%;
            width: 30%;
            height: 100%;
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 100%);
            transform: skewX(-18deg);
            transition: transform 520ms ease;
            pointer-events: none;
          }
          .settings-save-btn:hover {
            transform: translateY(-2px);
            filter: saturate(1.08) brightness(1.03);
          }
          .settings-save-btn:hover::after {
            transform: translateX(420%) skewX(-18deg);
          }
        `}
      </style>
      <div style={{ maxWidth: 1420, margin: '0 auto', width: '100%' }}>
      <BlockStack gap="500">
        <AppHeroBanner
          title="Brand & Fulfillment Settings"
          subtitle="Configure your brand details for packing slips, return labels, and support contact."
          minHeight={120}
        />

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

                  <div style={{ paddingBottom: 24 }}>
                    <button type="submit" className="settings-save-btn" style={submitButtonStyle}>
                      Save Settings
                    </button>
                  </div>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </div>

        <div style={{ minWidth: '320px', maxWidth: '360px', flexShrink: 0 }}>
            <div style={sidebarSurfaceStyle}>
              <div
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -22,
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255, 106, 0, 0.18) 0%, rgba(255, 106, 0, 0) 72%)',
                  pointerEvents: 'none',
                }}
              />
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start">
                  <Text as="h2" variant="headingMd">
                    Profile status
                  </Text>
                  <Badge
                    tone={completionPercent === 100 ? 'success' : 'attention'}
                  >
                    {`${completionPercent}% complete`}
                  </Badge>
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

                <div style={{ marginTop: 8 }}>
                  <Text as="p" tone="subdued">
                    Keep this information accurate so packing slips and return labels always match
                    your brand.
                  </Text>
                </div>
              </BlockStack>
            </div>
        </div>
      </InlineStack>
      <div style={{ marginBottom: 32 }} />
      </BlockStack>
      </div>
    </Page>
  );
}