import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import {
  Form,
  useActionData,
  useNavigate,
  useNavigation,
  useLoaderData,
} from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  List,
  Badge,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { createExternalApiHeaders } from '../lib/external-api.server';
import type { BrandSettings } from '../types';
import AppHeroBanner from '../common/AppHeroBanner';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const API_BASE = process.env.EXTERNAL_API_BASE || '/api';
  const headers = createExternalApiHeaders('', { 'X-Shop': session.shop });

  try {
    const res = await fetch(
      `${API_BASE}/brand-settings?shop=${encodeURIComponent(session.shop)}`,
      {
        method: 'GET',
        headers,
      },
    );

    if (!res.ok) {
      return { brandSettings: null };
    }

    const data = await res.json();

    return {
      brandSettings: data?.data || data || null,
    };
  } catch {
    return { brandSettings: null };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const brandSettings = {
    brandName: (formData.get('brandName') as string) || '',
    returnAddress: {
      street: (formData.get('streetAddress') as string) || '',
      city: (formData.get('city') as string) || '',
      state: (formData.get('state') as string) || '',
      zipCode: (formData.get('zipCode') as string) || '',
      country: (formData.get('country') as string) || '',
    },
    supportContact: {
      email: (formData.get('supportEmail') as string) || '',
      phone: ((formData.get('supportPhone') as string) || '').trim() || undefined,
    },
  };

  const API_BASE = process.env.EXTERNAL_API_BASE || '/api';
  const headers = {
    ...createExternalApiHeaders('', { 'X-Shop': session.shop }),
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(
      `${API_BASE}/brand-settings?shop=${encodeURIComponent(session.shop)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(brandSettings),
      },
    );

    console.error(brandSettings);

    if (!res.ok) {
      console.error(`Laravel API returned ${res.status}`);

      return { success: false, error: `Laravel API returned ${res.status}` };
    }

    const data = await res.json();

    return {
      success: true,
      brandSettings: data?.data || data,
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
};

export default function Onboarding() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const navigation = useNavigation();

  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(
    loaderData?.brandSettings || null,
  );

  const [formData, setFormData] = useState({
    brandName: loaderData?.brandSettings?.brandName || '',
    streetAddress: loaderData?.brandSettings?.returnAddress?.street || '',
    city: loaderData?.brandSettings?.returnAddress?.city || '',
    state: loaderData?.brandSettings?.returnAddress?.state || '',
    zipCode: loaderData?.brandSettings?.returnAddress?.zipCode || '',
    country: loaderData?.brandSettings?.returnAddress?.country || 'US',
    supportEmail: loaderData?.brandSettings?.supportContact?.email || '',
    supportPhone: loaderData?.brandSettings?.supportContact?.phone || '',
  });

  useEffect(() => {
    if (actionData?.success && actionData.brandSettings) {
      setBrandSettings(actionData.brandSettings);
      navigate('/app/dashboard');
    }
  }, [actionData, navigate]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid = Boolean(
    formData.brandName.trim() &&
      formData.streetAddress.trim() &&
      formData.city.trim() &&
      formData.state.trim() &&
      formData.zipCode.trim() &&
      formData.supportEmail.trim(),
  );

  const isSubmitting = navigation.state === 'submitting';
  const hasExistingBranding = Boolean(brandSettings);
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
  };

  const submitButtonStyle = {
    borderRadius: 10,
    border: '1px solid transparent',
    height: 40,
    padding: '0 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 180ms ease',
    background: !isFormValid || isSubmitting
      ? '#cbd5e1'
      : 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    color: '#ffffff',
    boxShadow: !isFormValid || isSubmitting
      ? 'none'
      : '0 8px 18px rgba(29,78,216,0.28)',
    width: 'fit-content',
  } as const;

  return (
    <Page fullWidth>
      <div style={{ maxWidth: 1420, margin: '0 auto', width: '100%' }}>
      <BlockStack gap="500">
        <AppHeroBanner
          title="Welcome to DTFTA Onboarding"
          subtitle="Set up your white-label profile so orders can be fulfilled with your brand identity from day one."
          badges={
            <>
              <Badge tone="info">New Setup</Badge>
              <Badge tone={completionPercent === 100 ? 'success' : 'warning'}>
                {completionPercent}% Complete
              </Badge>
              {hasExistingBranding ? <Badge tone="info">Existing profile detected</Badge> : null}
            </>
          }
        />

        {actionData?.error ? (
          <Card>
            <div style={{ borderRadius: 10, border: '1px solid #fecaca', backgroundColor: '#fff1f2', padding: 12 }}>
              <Text as="p" tone="critical">{actionData.error}</Text>
            </div>
          </Card>
        ) : null}

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

                <Form method="post">
                  <BlockStack gap="500">
                    <Card>
                      <div style={panelStyle}>
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="h3" variant="headingSm">Brand Information</Text>
                            <Badge tone="info">Required</Badge>
                          </InlineStack>
                          <div>
                            <label style={fieldLabelStyle} htmlFor="brandName">Brand Name *</label>
                            <input
                              id="brandName"
                              name="brandName"
                              value={formData.brandName}
                              onChange={(e) => handleChange('brandName', e.target.value)}
                              autoComplete="organization"
                              placeholder="Your Brand Name"
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
                            <Text as="h3" variant="headingSm">Return Address</Text>
                            <Badge tone="warning">Operations</Badge>
                          </InlineStack>
                          <div>
                            <label style={fieldLabelStyle} htmlFor="streetAddress">Street Address</label>
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
                              <label style={fieldLabelStyle} htmlFor="city">City</label>
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
                              <label style={fieldLabelStyle} htmlFor="state">State</label>
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
                              <label style={fieldLabelStyle} htmlFor="zipCode">ZIP Code</label>
                              <input
                                id="zipCode"
                                name="zipCode"
                                value={formData.zipCode}
                                onChange={(e) => handleChange('zipCode', e.target.value)}
                                autoComplete="postal-code"
                                style={fieldInputStyle}
                              />
                            </div>
                          </InlineGrid>
                          <div>
                            <label style={fieldLabelStyle} htmlFor="country">Country</label>
                            <input
                              id="country"
                              name="country"
                              value={formData.country}
                              onChange={(e) => handleChange('country', e.target.value)}
                              autoComplete="country-name"
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
                            <Text as="h3" variant="headingSm">Support Contact</Text>
                            <Badge tone="success">Customer-facing</Badge>
                          </InlineStack>
                          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                            <div>
                              <label style={fieldLabelStyle} htmlFor="supportEmail">Support Email</label>
                              <input
                                id="supportEmail"
                                name="supportEmail"
                                type="email"
                                value={formData.supportEmail}
                                onChange={(e) => handleChange('supportEmail', e.target.value)}
                                autoComplete="email"
                                style={{
                                  ...fieldInputStyle,
                                  borderColor: !formData.supportEmail ? '#fca5a5' : '#d6deea',
                                  backgroundColor: !formData.supportEmail ? '#fff7f7' : '#ffffff',
                                }}
                              />
                            </div>
                            <div>
                              <label style={fieldLabelStyle} htmlFor="supportPhone">Support Phone (Optional)</label>
                              <input
                                id="supportPhone"
                                name="supportPhone"
                                type="tel"
                                value={formData.supportPhone}
                                onChange={(e) => handleChange('supportPhone', e.target.value)}
                                autoComplete="tel"
                                style={fieldInputStyle}
                              />
                            </div>
                          </InlineGrid>
                        </BlockStack>
                      </div>
                    </Card>

                    <div style={{ paddingBottom: 24 }}>
                      <button
                        type="submit"
                        disabled={!isFormValid || isSubmitting}
                        style={submitButtonStyle}
                      >
                        {isSubmitting
                          ? 'Submitting...'
                          : hasExistingBranding
                            ? 'Update Setup'
                            : 'Complete Setup'}
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
                    <Text as="h2" variant="headingMd">How it works</Text>
                    <Badge tone="info">Overview</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodyMd">
                    DTFTA handles production and shipping while your customer sees only your brand.
                  </Text>
                  <List type="bullet">
                    <List.Item>Add DTFTA products to your Shopify store</List.Item>
                    <List.Item>Customize products with your designs</List.Item>
                    <List.Item>Orders are printed and shipped automatically</List.Item>
                    <List.Item>Packaging remains fully white-label</List.Item>
                  </List>
                </BlockStack>
              </div>
            </Card>
          </div>
        </InlineStack>
        <div style={{ marginBottom: 32 }} />
      </BlockStack>
      </div>
    </Page>
  );
}