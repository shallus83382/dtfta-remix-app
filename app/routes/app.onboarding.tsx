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
  Text,
  TextField,
  List,
  Banner,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { createExternalApiHeaders } from '../lib/external-api.server';
import type { BrandSettings } from '../types';

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

  return (
    <Page title="Welcome to DTFTA" fullWidth>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <BlockStack gap="500">
          {actionData?.error ? (
            <Banner tone="critical">
              <p>{actionData.error}</p>
            </Banner>
          ) : null}

          {actionData?.success ? (
            <Banner tone="success">
              <p>Setup completed successfully. Redirecting to dashboard...</p>
            </Banner>
          ) : null}

          {hasExistingBranding ? (
            <Banner tone="info">
              <p>We found your existing branding settings. You can review and update them below.</p>
            </Banner>
          ) : null}

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Welcome to DTFTA - Your Print-on-Demand Fulfillment Partner
              </Text>
              <Text as="p" variant="bodyMd">
                DTF Transfer Authority (DTFTA) is your white-label fulfillment partner for
                print-on-demand apparel. We handle printing, packaging, and shipping so you can
                focus on growing your business.
              </Text>

              <Text as="p" variant="bodyMd" fontWeight="semibold">
                How it works:
              </Text>
              <List type="bullet">
                <List.Item>Add DTFTA products to your Shopify store</List.Item>
                <List.Item>Customize products with your designs</List.Item>
                <List.Item>When customers order, we print and ship automatically</List.Item>
                <List.Item>
                  All packages use your branding - customers never see DTFTA
                </List.Item>
              </List>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Complete Your Setup
              </Text>
              <Text as="p" variant="bodyMd">
                To get started, please provide your brand information. This will be used for
                white-label packing slips and shipping labels. Your customers will never see
                DTFTA branding.
              </Text>

              <Form method="post">
                <BlockStack gap="500">
                  <Card>
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingSm">
                        Brand Information
                      </Text>
                      <TextField
                        name="brandName"
                        label="Brand Name *"
                        value={formData.brandName}
                        onChange={(value) => handleChange('brandName', value)}
                        placeholder="Your Brand Name"
                        autoComplete="off"
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
                          placeholder="123 Main Street"
                          autoComplete="off"
                        />
                        <InlineStack gap="400">
                          <div style={{ flex: 1 }}>
                            <TextField
                              name="city"
                              label="City"
                              value={formData.city}
                              onChange={(value) => handleChange('city', value)}
                              placeholder="New York"
                              autoComplete="off"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              name="state"
                              label="State"
                              value={formData.state}
                              onChange={(value) => handleChange('state', value)}
                              placeholder="NY"
                              autoComplete="off"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              name="zipCode"
                              label="ZIP Code"
                              value={formData.zipCode}
                              onChange={(value) => handleChange('zipCode', value)}
                              placeholder="10001"
                              autoComplete="off"
                            />
                          </div>
                        </InlineStack>
                        <TextField
                          name="country"
                          label="Country"
                          value={formData.country}
                          onChange={(value) => handleChange('country', value)}
                          autoComplete="country-name"
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
                        Customer support contact information that will appear on packing slips.
                      </Text>
                      <BlockStack gap="400">
                        <TextField
                          name="supportEmail"
                          label="Support Email"
                          type="email"
                          value={formData.supportEmail}
                          onChange={(value) => handleChange('supportEmail', value)}
                          placeholder="support@yourbrand.com"
                          autoComplete="off"
                        />
                        <TextField
                          autoComplete="off"
                          name="supportPhone"
                          label="Support Phone (Optional)"
                          type="tel"
                          value={formData.supportPhone}
                          onChange={(value) => handleChange('supportPhone', value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </BlockStack>
                    </BlockStack>
                  </Card>

                  <div>
                    <button
                      type="submit"
                      disabled={!isFormValid || isSubmitting}
                      style={{
                        background: !isFormValid || isSubmitting ? '#c9cccf' : '#000',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        cursor: !isFormValid || isSubmitting ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
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

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Why we need this
              </Text>
              <Text as="p" variant="bodyMd">
                DTFTA operates as a white-label fulfillment partner. The information you provide
                will be used to:
              </Text>
              <List type="bullet">
                <List.Item>Generate packing slips with your brand name</List.Item>
                <List.Item>Create return labels with your return address</List.Item>
                <List.Item>Display your support contact information to customers</List.Item>
              </List>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Your customers will never see DTFTA branding - everything will appear as if it
                comes directly from your brand.
              </Text>
            </BlockStack>
          </Card>
        </BlockStack>
      </div>
    </Page>
  );
}