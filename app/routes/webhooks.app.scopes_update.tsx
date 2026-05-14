import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { syncShopifyTopicToLaravel } from "../lib/shopify-lifecycle.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const currentScopes = Array.isArray(payload.current) ? payload.current : [];

  if (session) {
    await db.session.updateMany({
      where: { id: session.id },
      data: {
        scope: currentScopes.join(","),
      },
    });
  }

  await syncShopifyTopicToLaravel(topic, shop, payload as Record<string, unknown>);

  return new Response();
};