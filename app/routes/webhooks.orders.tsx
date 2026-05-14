import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { syncShopifyTopicToLaravel } from "../lib/shopify-lifecycle.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "orders/create":
    case "ORDERS_CREATE":
        console.log("New order created");
      break;
    case "orders/updated":
    case "ORDERS_UPDATED":
          console.log("Order updated");
      break;
    case "orders/delete":
      console.log("Order deleted");
      break;
    default:
      break;
  }

  await syncShopifyTopicToLaravel(topic, shop, payload as Record<string, unknown>);

  return new Response();
};