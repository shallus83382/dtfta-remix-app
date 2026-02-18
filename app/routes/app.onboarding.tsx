import { useEffect, useState, useCallback } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { Form, useActionData, useNavigate } from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  List,
  Banner,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { createExternalApiHeaders } from '../lib/external-api.server';
import type { BrandSettings, SetupStatus } from '../types';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Just ensure the admin session is valid; fulfillment setup is handled on index.
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const brandSettings = {
    brandName: formData.get('brandName') as string,
    returnAddress: {
      street: formData.get('streetAddress') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      country: formData.get('country') as string,
    },
    supportContact: {
      email: formData.get('supportEmail') as string,
      phone: formData.get('supportPhone') as string | undefined,
    },
  };

  const API_BASE = process.env.EXTERNAL_API_BASE || '/api';
  const headers = createExternalApiHeaders(brandSettings, { "X-Shop": session.shop });

  try {
    const res = await fetch(`${API_BASE}/brand-settings?shop=${encodeURIComponent(session.shop)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(brandSettings),
    });

    if (!res.ok) {
      return { success: false, error: `Laravel API returned ${res.status}` };
    }

    const data = await res.json();
    return { success: true, brandSettings: data };
  } catch (e) {
    return { success: false, error: String(e) };
  }
};

export default function Onboarding() {
  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    fulfillmentServiceConnected: false,
    locationCreated: false,
  });
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  const isBrandSettingsComplete = useCallback(() => {
    if (!brandSettings) return false;
    return !!(
      brandSettings.brandName &&
      brandSettings.returnAddress.street &&
      brandSettings.returnAddress.city &&
      brandSettings.returnAddress.state &&
      brandSettings.returnAddress.zipCode &&
      brandSettings.supportContact.email
    );
  }, [brandSettings]);
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    brandName: brandSettings?.brandName || '',
    streetAddress: brandSettings?.returnAddress?.street || '',
    city: brandSettings?.returnAddress?.city || '',
    state: brandSettings?.returnAddress?.state || '',
    zipCode: brandSettings?.returnAddress?.zipCode || '',
    country: brandSettings?.returnAddress?.country || 'US',
    supportEmail: brandSettings?.supportContact?.email || '',
    supportPhone: brandSettings?.supportContact?.phone || '',
  });

  // Update form data when brandSettings change (from store)
  useEffect(() => {
    if (brandSettings) {
      setFormData({
        brandName: brandSettings.brandName || '',
        streetAddress: brandSettings.returnAddress.street || '',
        city: brandSettings.returnAddress.city || '',
        state: brandSettings.returnAddress.state || '',
        zipCode: brandSettings.returnAddress.zipCode || '',
        country: brandSettings.returnAddress.country || 'US',
        supportEmail: brandSettings.supportContact.email || '',
        supportPhone: brandSettings.supportContact.phone || '',
      });
    }
  }, [brandSettings]);

  useEffect(() => {
    if (actionData?.success && actionData.brandSettings) {
      setBrandSettings(actionData.brandSettings);
      // Mark fulfillment service and location as connected (mock for now)
      setSetupStatus({
        fulfillmentServiceConnected: true,
        locationCreated: true,
      });
      setIsOnboardingComplete(true);
      // Redirect to dashboard after onboarding
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 1000);
    }
  }, [actionData, navigate]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid = formData.brandName && 
    formData.streetAddress && 
    formData.city && 
    formData.state && 
    formData.zipCode && 
    formData.supportEmail;

  return (
    <Page title="Welcome to DTFTA" fullWidth>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <BlockStack gap="500">
          {/* Welcome Section */}
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
                <List.Item>All packages use your branding - customers never see DTFTA</List.Item>
              </List>
            </BlockStack>
          </Card>

          {/* Brand Setup Form */}
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
                  {/* Brand Information */}
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

                  {/* Return Address */}
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

                  {/* Support Contact */}
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
                        <TextField autoComplete="off"
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

                  <Button 
                    submit
                    variant="primary"
                    disabled={!isFormValid}
                  >
                    Complete Setup
                  </Button>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>

          {/* Info Sidebar */}
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
                <List.Item>
                  Generate packing slips with your brand name
                </List.Item>
                <List.Item>
                  Create return labels with your return address
                </List.Item>
                <List.Item>
                  Display your support contact information to customers
                </List.Item>
              </List>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Your customers will never see DTFTA branding - everything 
                will appear as if it comes directly from your brand.
              </Text>
            </BlockStack>
          </Card>
        </BlockStack>
      </div>
    </Page>
  );
}

