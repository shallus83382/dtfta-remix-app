import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
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
import {
  brandColors,
  brandOrange,
  brandPrimaryButtonBg,
  brandPrimaryCtaShadow,
} from '../lib/brand-theme';

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
  const brandSectionRef = useRef<HTMLDivElement | null>(null);
  const addressSectionRef = useRef<HTMLDivElement | null>(null);
  const supportSectionRef = useRef<HTMLDivElement | null>(null);
  const submitSectionRef = useRef<HTMLDivElement | null>(null);
  const guideStepCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [selectedGuideStep, setSelectedGuideStep] = useState(0);
  const [isGuidePopupOpen, setIsGuidePopupOpen] = useState(true);
  const [guidePopupPosition, setGuidePopupPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [activeStepRect, setActiveStepRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

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
  const isBrandComplete = Boolean(formData.brandName.trim());
  const isAddressComplete = Boolean(
    formData.streetAddress.trim() &&
      formData.city.trim() &&
      formData.state.trim() &&
      formData.zipCode.trim() &&
      formData.country.trim(),
  );
  const isSupportComplete = Boolean(formData.supportEmail.trim());
  const isPublishReady = isFormValid;
  const stepItems = [
    {
      title: 'Business profile setup',
      detail: 'Add your brand name and identity details.',
      done: isBrandComplete,
      cta: 'Go to Brand Information',
    },
    {
      title: 'Return address configuration',
      detail: 'Set your return address for operations.',
      done: isAddressComplete,
      cta: 'Go to Return Address',
    },
    {
      title: 'Support contact setup',
      detail: 'Add support email for customer communications.',
      done: isSupportComplete,
      cta: 'Go to Support Contact',
    },
    {
      title: 'Publish-ready check',
      detail: 'Review and save to complete onboarding.',
      done: isPublishReady,
      cta: 'Go to Final Review',
    },
  ] as const;

  const formSectionStyle = {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderRadius: 14,
    border: '1px solid #dbe3ec',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    padding: 16,
    boxShadow: '0 10px 24px rgba(22,22,31,0.08)',
  } as const;

  const formSectionAccentBar = {
    height: 3,
    marginTop: -16,
    marginLeft: -16,
    marginRight: -16,
    marginBottom: 13,
    borderRadius: '14px 14px 0 0',
    background: brandOrange,
  } as const;

  const sidebarSurfaceStyle = {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderRadius: 16,
    border: '1px solid rgba(255, 106, 0, 0.28)',
    background: 'linear-gradient(145deg, #ffffff 0%, rgba(255, 106, 0, 0.08) 100%)',
    padding: 16,
    boxShadow: '0 14px 30px rgba(22,22,31,0.1)',
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

  const focusStepSection = (step: number) => {
    const refs = [brandSectionRef, addressSectionRef, supportSectionRef, submitSectionRef] as const;
    const targetRef = refs[step]?.current;
    if (targetRef) {
      const topOffset = 96;
      const targetTop = targetRef.getBoundingClientRect().top + window.scrollY - topOffset;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  };
  useLayoutEffect(() => {
    if (!isGuidePopupOpen) return;
    let frameId = 0;
    const updateGuidePopupPosition = () => {
      const activeCard = guideStepCardRefs.current[selectedGuideStep];
      if (!activeCard) return;
      const rect = activeCard.getBoundingClientRect();
      setActiveStepRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      const popupWidth = Math.min(520, window.innerWidth - 32);
      const left = Math.max(
        16,
        Math.min(rect.left + rect.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - 16),
      );
      const popupEstimatedHeight = 190;
      const popupGap = 20;
      const minTop = 24;
      const aboveTop = rect.top - popupEstimatedHeight - popupGap;
      const top = aboveTop < minTop ? rect.bottom + popupGap : aboveTop;
      setGuidePopupPosition({ top, left });
    };
    frameId = window.requestAnimationFrame(updateGuidePopupPosition);
    window.addEventListener('resize', updateGuidePopupPosition);
    window.addEventListener('scroll', updateGuidePopupPosition, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateGuidePopupPosition);
      window.removeEventListener('scroll', updateGuidePopupPosition, true);
    };
  }, [isGuidePopupOpen, selectedGuideStep]);

  const ctaDisabled = !isFormValid || isSubmitting;
  const submitButtonStyle: CSSProperties = {
    borderRadius: 10,
    border: '1px solid transparent',
    height: 36,
    padding: '0 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: ctaDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 200ms ease',
    transform: 'translateY(0)',
    background: ctaDisabled ? '#cbd5e1' : brandPrimaryButtonBg,
    color: '#ffffff',
    boxShadow: ctaDisabled ? 'none' : brandPrimaryCtaShadow,
    width: 'fit-content',
  };

  return (
    <Page fullWidth>
      <style>
        {`
          .dtfta-onboarding-cta {
            position: relative;
            overflow: hidden;
            appearance: none;
            -webkit-appearance: none;
          }
          .dtfta-onboarding-cta::after {
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
          .dtfta-onboarding-cta:hover:not(:disabled) {
            transform: translateY(-2px);
            filter: saturate(1.08) brightness(1.03);
          }
          .dtfta-onboarding-cta:hover:not(:disabled)::after {
            transform: translateX(420%) skewX(-18deg);
          }
          .dtfta-onboarding-cta:disabled {
            transform: none;
            filter: none;
          }
          .dtfta-onboarding-cta:disabled::after {
            display: none;
          }
        `}
      </style>
      <div style={{ maxWidth: 1420, margin: '0 auto', width: '100%' }}>
      <BlockStack gap="500">
        <AppHeroBanner
          title="Welcome to DTFTA Onboarding"
          subtitle="Set up your white-label profile so orders can be fulfilled with your brand identity from day one."
          badges={
            <>
              <Badge tone="info">New Setup</Badge>
              <Badge tone={completionPercent === 100 ? 'success' : 'warning'}>
                {`${completionPercent}% Complete`}
              </Badge>
              {hasExistingBranding ? <Badge tone="info">Existing profile detected</Badge> : null}
            </>
          }
        />

        <Card>
          <div
            style={{
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
              padding: 22,
              boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
            }}
          >
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Onboarding Step Guide
                  </Text>
                  <Badge tone="info">Interactive</Badge>
                </InlineStack>
                <Badge tone={completionPercent === 100 ? 'success' : 'attention'}>
                  {`Active step: ${selectedGuideStep + 1}/4`}
                </Badge>
              </InlineStack>
              <div
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 999,
                  background: '#e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${completionPercent}%`,
                    height: '100%',
                    background: brandOrange,
                    borderRadius: 999,
                    transition: 'width 260ms ease',
                  }}
                />
              </div>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="info">New users</Badge>
                <Badge tone="success">Getting started</Badge>
              </InlineStack>
              <BlockStack gap="100">
                <Text as="h2" variant="heading2xl">
                  Launch your print store in 4 simple steps
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Complete each onboarding step to unlock a fully configured white-label workflow.
                </Text>
              </BlockStack>
              <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                {stepItems.map((step, index) => {
                  const isActive = selectedGuideStep === index;
                  return (
                    <button
                      key={step.title}
                      ref={(node) => {
                        guideStepCardRefs.current[index] = node;
                      }}
                      type="button"
                      onClick={() => {
                        if (isGuidePopupOpen) return;
                        setSelectedGuideStep(index);
                        setIsGuidePopupOpen(true);
                      }}
                      style={{
                        position: 'relative',
                        zIndex: isGuidePopupOpen && isActive ? 1302 : 1,
                        borderRadius: 12,
                        border: isGuidePopupOpen && isActive
                          ? '2px solid rgba(255,255,255,0.98)'
                          : isActive
                            ? '1px solid rgba(255, 106, 0, 0.45)'
                            : '1px solid #dbe4f0',
                        background: isActive
                          ? 'linear-gradient(180deg, #fff7fb 0%, #ffffff 48%, #fffaf5 100%)'
                          : 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
                        padding: 14,
                        cursor: isGuidePopupOpen ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        boxShadow: isGuidePopupOpen && isActive
                          ? '0 0 0 4px rgba(255,255,255,0.25), 0 16px 36px rgba(2,6,23,0.45)'
                          : isActive
                            ? '0 12px 26px rgba(255, 106, 0, 0.22)'
                            : '0 8px 20px rgba(15,23,42,0.07)',
                        transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                        transition: 'all 180ms ease',
                        outline: 'none',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: isActive
                            ? brandOrange
                            : 'linear-gradient(90deg, #cbd5e1 0%, #e2e8f0 100%)',
                          opacity: isActive ? 1 : 0.7,
                        }}
                      />
                      <InlineStack gap="150" blockAlign="start">
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 999,
                            background: step.done ? brandColors.text : brandOrange,
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: 1,
                            boxShadow: step.done
                              ? '0 8px 18px rgba(22,22,31,0.22)'
                              : brandPrimaryCtaShadow,
                          }}
                        >
                          {step.done ? '✓' : `0${index + 1}`}
                        </div>
                        <BlockStack gap="050">
                          <Text as="p" variant="bodySm" tone="subdued">
                            {`Step ${index + 1} of ${stepItems.length}`}
                          </Text>
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            {step.title}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {step.detail}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </button>
                  );
                })}
              </InlineGrid>
            </BlockStack>
          </div>
        </Card>

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
                <Text as="p" variant="bodyMd" tone="subdued">
                  Add your brand and contact details so packing slips, returns, and customer support stay on-brand.
                </Text>

                <Form method="post">
                  <BlockStack gap="500">
                    <div ref={brandSectionRef}>
                      <div style={formSectionStyle}>
                        <div style={formSectionAccentBar} aria-hidden />
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="h3" variant="headingSm">Brand Information</Text>
                            <Badge tone="info">Required</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodyMd">
                            This information appears on white-label packing slips and shipping labels.
                          </Text>
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
                    </div>

                    <div ref={addressSectionRef}>
                      <div style={formSectionStyle}>
                        <div style={formSectionAccentBar} aria-hidden />
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="h3" variant="headingSm">Return Address</Text>
                            <Badge tone="warning">Operations</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodyMd">
                            Used on return labels and fulfillment documents.
                          </Text>
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
                    </div>

                    <div ref={supportSectionRef}>
                      <div style={formSectionStyle}>
                        <div style={formSectionAccentBar} aria-hidden />
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="h3" variant="headingSm">Support Contact</Text>
                            <Badge tone="success">Customer-facing</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodyMd">
                            Shown to customers when they need help with their orders.
                          </Text>
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
                                  borderColor: !formData.supportEmail ? '#fca5a5' : '#d1d5db',
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
                    </div>

                    <div ref={submitSectionRef} style={{ paddingBottom: 24 }}>
                      <button
                        type="submit"
                        className="dtfta-onboarding-cta"
                        disabled={ctaDisabled}
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

          <div style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0 }}>
            <div style={sidebarSurfaceStyle}>
              <div
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -22,
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(71,176,161,0.21) 0%, rgba(71,176,161,0) 72%)',
                  pointerEvents: 'none',
                }}
              />
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">How it works</Text>
                  <Badge tone="info">Overview</Badge>
                </InlineStack>

                <div
                  style={{
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#f8fafc',
                    padding: 12,
                  }}
                >
                  <BlockStack gap="300">
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

                <Text as="p" variant="bodySm" tone="subdued">
                  Finish onboarding so packing slips, returns, and support details always match your store.
                </Text>
              </BlockStack>
            </div>
          </div>
        </InlineStack>
        <div style={{ marginBottom: 32 }} />
      </BlockStack>
      </div>
      {isGuidePopupOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.72)',
            zIndex: 1200,
          }}
        />
      ) : null}
      {isGuidePopupOpen && activeStepRect ? (
        <div
          style={{
            position: 'fixed',
            top: activeStepRect.top,
            left: activeStepRect.left,
            width: activeStepRect.width,
            height: activeStepRect.height,
            borderRadius: 12,
            border: '2px solid rgba(255,255,255,0.98)',
            background: 'linear-gradient(180deg, #fff7f8 0%, #ffffff 100%)',
            boxShadow: '0 0 0 4px rgba(255,255,255,0.24), 0 18px 44px rgba(2,6,23,0.42)',
            zIndex: 1550,
            pointerEvents: 'none',
            padding: 12,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <InlineStack gap="150" blockAlign="start">
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background: stepItems[selectedGuideStep].done
                  ? brandColors.text
                  : brandOrange,
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {stepItems[selectedGuideStep].done ? '✓' : `0${selectedGuideStep + 1}`}
            </div>
            <BlockStack gap="050">
              <Text as="p" variant="bodySm" tone="subdued">
                {`Step ${selectedGuideStep + 1} of ${stepItems.length}`}
              </Text>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                {stepItems[selectedGuideStep].title}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {stepItems[selectedGuideStep].detail}
              </Text>
            </BlockStack>
          </InlineStack>
        </div>
      ) : null}
      {isGuidePopupOpen && guidePopupPosition ? (
        <div
          style={{
            position: 'fixed',
            top: guidePopupPosition.top,
            left: guidePopupPosition.left,
            width: 'min(520px, calc(100vw - 32px))',
            zIndex: 1600,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            padding: 12,
            boxShadow: '0 22px 54px rgba(2,6,23,0.38), 0 0 0 2px rgba(255,255,255,0.9)',
          }}
        >
          <BlockStack gap="200">
            <InlineStack align="start" blockAlign="center">
              <Text as="h3" variant="headingMd">
                Current step guide
              </Text>
            </InlineStack>
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              {stepItems[selectedGuideStep].title}
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              {stepItems[selectedGuideStep].detail}
            </Text>
            <Badge tone={stepItems[selectedGuideStep].done ? 'success' : 'attention'}>
              {`Step ${selectedGuideStep + 1} of ${stepItems.length}`}
            </Badge>
            <InlineStack align="space-between" blockAlign="center">
              <button
                type="button"
                onClick={() => setSelectedGuideStep((prev) => Math.max(0, prev - 1))}
                disabled={selectedGuideStep === 0}
                style={{
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  height: 34,
                  padding: '0 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: selectedGuideStep === 0 ? 'not-allowed' : 'pointer',
                  background: '#ffffff',
                  color: brandColors.text,
                  opacity: selectedGuideStep === 0 ? 0.6 : 1,
                }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedGuideStep === stepItems.length - 1) {
                    setIsGuidePopupOpen(false);
                    window.requestAnimationFrame(() => {
                      focusStepSection(0);
                    });
                    return;
                  }
                  setSelectedGuideStep((prev) => Math.min(prev + 1, stepItems.length - 1));
                }}
                style={{
                  borderRadius: 8,
                  border: '1px solid transparent',
                  height: 34,
                  padding: '0 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: brandPrimaryButtonBg,
                  color: '#ffffff',
                  boxShadow: brandPrimaryCtaShadow,
                }}
              >
                {selectedGuideStep === stepItems.length - 1 ? 'Finish' : 'Next'}
              </button>
            </InlineStack>
          </BlockStack>
        </div>
      ) : null}
    </Page>
  );
}