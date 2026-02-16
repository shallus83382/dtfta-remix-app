import shopify, { apiVersion } from "../shopify.server";

const SERVICE_NAME = "DTFTA Fulfillment";
const LOCATION_NAME = "DTFTA POD Location";

/**
 * Setup fulfillment service and location for a shop
 * Currently queries Shopify directly, but can be switched to Laravel API
 *
 * NOTE: For now we pass the access token in from authenticate.admin instead of
 * trying to reload the session by ID (which we don't have here).
 */
export async function setupFulfillmentService(shop: string, accessToken: string): Promise<{ success: boolean; fulfillmentServiceId: string | null; locationId: string | null }> {
  try {
    console.log(`Setting up fulfillment service for ${shop}`);
    // TODO: When Laravel backend is ready, uncomment this and remove Shopify queries below
    // if (process.env.USE_LARAVEL_API === 'true') {
    //   return await setupFulfillmentServiceViaLaravel(shop);
    // }

    // Helper function to make GraphQL requests
    const graphqlRequest = async (query: string, variables?: Record<string, any>) => {
      const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      return response.json();
    };

    // Check if fulfillment service already exists
    const checkServicesQuery = `
      query {
        fulfillmentServices(first: 10) {
          edges {
            node {
              id
              serviceName
            }
          }
        }
      }
    `;

    const servicesData = await graphqlRequest(checkServicesQuery);
    const existingService = servicesData.data?.fulfillmentServices?.edges?.find(
      (edge: any) => edge.node.serviceName === SERVICE_NAME
    );

    let fulfillmentServiceId = existingService?.node?.id;
    let locationId: string | null = null;

    // Create fulfillment service if it doesn't exist (Shopify will also create a location)
    if (!fulfillmentServiceId) {
      const fulfillmentServiceMutation = `
        mutation fulfillmentServiceCreate($name: String!, $callbackUrl: URL!) {
          fulfillmentServiceCreate(
            name: $name
            callbackUrl: $callbackUrl
            trackingSupport: true
            inventoryManagement: false
            fulfillmentOrdersOptIn: true
          ) {
            fulfillmentService {
              id
              serviceName
              location {
                id
                name
                address {
                  address1
                  city
                  province
                  zip
                  country
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const callbackUrl = `${process.env.SHOPIFY_APP_URL || 'https://example.com'}/webhooks/fulfillment_order_notification`;
      
      const serviceData = await graphqlRequest(fulfillmentServiceMutation, {
        name: SERVICE_NAME,
        callbackUrl,
      });

      const createResult = serviceData.data?.fulfillmentServiceCreate;

      if (createResult?.userErrors?.length) {
        // Check if error is "Name has already been taken" - this means service exists
        const nameTakenError = createResult.userErrors.find((error: any) => {
          const fieldIsName = Array.isArray(error.field) && error.field.includes("name");
          const messageIsNameTaken = typeof error.message === "string" && 
            error.message.toLowerCase().includes("has already been taken");
          return fieldIsName && messageIsNameTaken;
        });

        if (nameTakenError) {
          // Service already exists - query for it to get the ID
          console.log(`ℹ️ Fulfillment service "${SERVICE_NAME}" already exists. Fetching existing service...`);
          try {
            const refreshedServicesData = await graphqlRequest(checkServicesQuery);
            const refreshedService = refreshedServicesData.data?.fulfillmentServices?.edges?.find(
              (edge: any) => edge.node.serviceName === SERVICE_NAME
            );
            if (refreshedService) {
              fulfillmentServiceId = refreshedService.node.id;
              console.log(`✅ Found existing fulfillment service: ${fulfillmentServiceId}`);
            } else {
              console.log(`⚠️ Service name exists but could not find service ID`);
            }
          } catch (error) {
            console.error(`❌ Error fetching existing service:`, error);
          }
        } else {
          console.error(`Fulfillment service creation errors:`, createResult.userErrors);
        }
      } else {
        fulfillmentServiceId = createResult?.fulfillmentService?.id;
        locationId = createResult?.fulfillmentService?.location?.id || null;
        console.log(`✅ Fulfillment service created: ${fulfillmentServiceId}`);
        if (locationId) {
          console.log(`✅ DTFTA location created with fulfillment service: ${locationId}`);
        }
      }
    } else {
      console.log(`✅ Fulfillment service already exists: ${fulfillmentServiceId}`);
    }

    // Query for location separately if we have a service ID but no location ID
    // Shopify may create the location but not return it in the mutation response
    if (fulfillmentServiceId && !locationId) {
      console.log(`🔍 Querying for location associated with fulfillment service...`);
      
      try {
        // Query fulfillment service details to get location
        const serviceDetailsQuery = `
          query {
            fulfillmentServices(first: 10) {
              edges {
                node {
                  id
                  serviceName
                  location {
                    id
                    name
                  }
                }
              }
            }
          }
        `;
        
        const serviceDetailsData = await graphqlRequest(serviceDetailsQuery);
        const serviceWithLocation = serviceDetailsData.data?.fulfillmentServices?.edges?.find(
          (edge: any) => edge.node.id === fulfillmentServiceId
        );
        
        if (serviceWithLocation?.node?.location?.id) {
          locationId = serviceWithLocation.node.location.id;
          console.log(`✅ Found location associated with fulfillment service: ${locationId} (${serviceWithLocation.node.location.name})`);
        } else {
          // If still no location, query all locations and find one that might be associated
          // Shopify may create locations with auto-generated names
          console.log(`🔍 Location not found in service details. Querying all locations...`);
          const allLocationsQuery = `
            query {
              locations(first: 50) {
                edges {
                  node {
                    id
                    name
                    address {
                      country
                    }
                  }
                }
              }
            }
          `;
          
          const locationsData = await graphqlRequest(allLocationsQuery);
          // Look for a US location (as per requirement: "location: US")
          const usLocation = locationsData.data?.locations?.edges?.find(
            (edge: any) => edge.node.address?.country === "US"
          );
          
          if (usLocation) {
            locationId = usLocation.node.id;
            console.log(`✅ Found US location: ${locationId} (${usLocation.node.name})`);
          } else {
            console.log(`⚠️ Could not find location associated with fulfillment service. Location may need to be created separately.`);
          }
        }
      } catch (error) {
        console.error(`❌ Error querying for location:`, error);
      }
    }

    // Final status log
    if (fulfillmentServiceId) {
      console.log(`✅ Setup complete - Fulfillment Service: ${fulfillmentServiceId ? 'Connected' : 'Not Connected'}, Location: ${locationId ? 'Created' : 'Not Found'}`);
    } else {
      console.log(`⚠️ Setup incomplete - Fulfillment Service not found`);
    }

    return {
      success: !!fulfillmentServiceId,
      fulfillmentServiceId,
      locationId,
    };
  } catch (error) {
    console.error(`❌ Error setting up fulfillment service for ${shop}:`, error);
    // Don't throw - allow app to continue
    return {
      success: false,
      fulfillmentServiceId: null,
      locationId: null,
    };
  }
}

/**
 * Get fulfillment status for a shop
 * Currently queries Shopify directly, but can be switched to Laravel API
 */
export async function getFulfillmentStatus(shop: string) {
  try {
    // TODO: When Laravel backend is ready, uncomment this and remove Shopify queries below
    // if (process.env.USE_LARAVEL_API === 'true') {
    //   return await getFulfillmentStatusFromLaravel(shop);
    // }

    const session = await shopify.sessionStorage.loadSession(shop);
    if (!session || !session.accessToken) {
      return {
        fulfillmentServiceConnected: false,
        locationCreated: false,
        fulfillmentServiceId: null,
        locationId: null,
      };
    }

    // Helper function to make GraphQL requests
    const graphqlRequest = async (query: string, variables?: Record<string, any>) => {
      const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken || '',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      return response.json();
    };

    // Check fulfillment services
    const servicesQuery = `
      query {
        fulfillmentServices(first: 10) {
          edges {
            node {
              id
              serviceName
            }
          }
        }
      }
    `;

    const servicesData = await graphqlRequest(servicesQuery);
    const dtftaService = servicesData.data?.fulfillmentServices?.edges?.find(
      (edge: any) => edge.node.serviceName === SERVICE_NAME
    );

    // Check locations
    const locationsQuery = `
      query {
        locations(first: 10) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;

    const locationsData = await graphqlRequest(locationsQuery);
    const dtftaLocation = locationsData.data?.locations?.edges?.find(
      (edge: any) => edge.node.name === LOCATION_NAME
    );

    return {
      fulfillmentServiceConnected: !!dtftaService,
      locationCreated: !!dtftaLocation,
      fulfillmentServiceId: dtftaService?.node?.id || null,
      locationId: dtftaLocation?.node?.id || null,
    };
  } catch (error) {
    console.error(`Error checking fulfillment status for ${shop}:`, error);
    return {
      fulfillmentServiceConnected: false,
      locationCreated: false,
      fulfillmentServiceId: null,
      locationId: null,
    };
  }
}

// ============================================================================
// LARAVEL API INTEGRATION PLACEHOLDERS
// ============================================================================
// Uncomment and implement these functions when Laravel backend is ready
// ============================================================================

/**
 * Setup fulfillment service via Laravel API
 * TODO: Implement when Laravel backend is ready
 */
// async function setupFulfillmentServiceViaLaravel(shop: string) {
//   try {
//     const response = await fetch(`${process.env.LARAVEL_API_URL}/api/shop/${shop}/fulfillment-service/setup`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${process.env.LARAVEL_API_KEY}`,
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`Laravel API error: ${response.statusText}`);
//     }

//     const data = await response.json();
//     console.log(`✅ Fulfillment service setup via Laravel for ${shop}`);
//     return data;
//   } catch (error) {
//     console.error(`❌ Error setting up fulfillment service via Laravel for ${shop}:`, error);
//     throw error;
//   }
// }

/**
 * Save fulfillment service data to Laravel
 * TODO: Implement when Laravel backend is ready
 */
// async function saveFulfillmentServiceToLaravel(
//   shop: string,
//   fulfillmentServiceId: string | null,
//   locationId: string | null
// ) {
//   try {
//     const response = await fetch(`${process.env.LARAVEL_API_URL}/api/shop/${shop}/fulfillment-service`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${process.env.LARAVEL_API_KEY}`,
//       },
//       body: JSON.stringify({
//         shop,
//         fulfillmentServiceId,
//         locationId,
//         status: 'active',
//       }),
//     });

//     if (!response.ok) {
//       throw new Error(`Laravel API error: ${response.statusText}`);
//     }

//     console.log(`✅ Saved fulfillment service data to Laravel for ${shop}`);
//   } catch (error) {
//     console.error(`❌ Error saving to Laravel for ${shop}:`, error);
//     // Don't throw - allow app to continue even if Laravel save fails
//   }
// }

/**
 * Get fulfillment status from Laravel API
 * TODO: Implement when Laravel backend is ready
 */
// async function getFulfillmentStatusFromLaravel(shop: string) {
//   try {
//     const response = await fetch(`${process.env.LARAVEL_API_URL}/api/shop/${shop}/fulfillment-service`, {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${process.env.LARAVEL_API_KEY}`,
//       },
//     });

//     if (!response.ok) {
//       if (response.status === 404) {
//         // Not found means not set up yet
//         return {
//           fulfillmentServiceConnected: false,
//           locationCreated: false,
//           fulfillmentServiceId: null,
//           locationId: null,
//         };
//       }
//       throw new Error(`Laravel API error: ${response.statusText}`);
//     }

//     const data = await response.json();
//     return {
//       fulfillmentServiceConnected: !!data.fulfillmentServiceId,
//       locationCreated: !!data.locationId,
//       fulfillmentServiceId: data.fulfillmentServiceId || null,
//       locationId: data.locationId || null,
//     };
//   } catch (error) {
//     console.error(`Error getting fulfillment status from Laravel for ${shop}:`, error);
//     return {
//       fulfillmentServiceConnected: false,
//       locationCreated: false,
//       fulfillmentServiceId: null,
//       locationId: null,
//     };
//   }
// }

