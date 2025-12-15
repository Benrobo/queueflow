import { defineTask } from "@benrobo/queueflow";

export const processOrder = defineTask({
  id: "orders.process",
  handler: async (payload: {
    orderId: string;
    userId: string;
    items: string[];
    total: number;
  }) => {
    console.log(
      `🛒 Processing order ${payload.orderId} for user ${payload.userId}`
    );
    console.log(`📦 Items: ${payload.items.join(", ")}`);
    console.log(`💰 Total: $${payload.total}`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(`✅ Order ${payload.orderId} processed successfully`);
  },
  onError: async (error, payload) => {
    console.error(
      `❌ Failed to process order ${payload.orderId}:`,
      error.message
    );
  },
});

export const sendOrderConfirmation = defineTask({
  id: "orders.send-confirmation",
  handler: async (payload: {
    orderId: string;
    email: string;
    total: number;
  }) => {
    console.log(`📧 Sending order confirmation to ${payload.email}`);
    console.log(`📋 Order ID: ${payload.orderId}, Total: $${payload.total}`);
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log(`✅ Order confirmation sent to ${payload.email}`);
  },
});
