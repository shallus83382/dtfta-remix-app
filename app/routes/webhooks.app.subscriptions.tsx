import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { syncShopifyTopicToLaravel } from "../lib/shopify-lifecycle.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await syncShopifyTopicToLaravel(topic, shop, payload as Record<string, unknown>);

  return new Response();
};
