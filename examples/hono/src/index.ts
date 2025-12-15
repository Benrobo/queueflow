import { Hono } from "hono";
import { configure } from "@benrobo/queueflow";
import "./tasks/email";
import "./tasks/orders";
import { sendWelcomeEmail, sendPasswordReset } from "./tasks/email";
import { processOrder, sendOrderConfirmation } from "./tasks/orders";

configure({
  connection: process.env.REDIS_URL || "redis://localhost:6379",
  defaultQueue: "hono-example",
});

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    message: "Queueflow Hono.js Example",
    endpoints: {
      "POST /signup": "Create a user and send welcome email",
      "POST /reset-password": "Send password reset email",
      "POST /order": "Process an order",
      "GET /health": "Health check",
    },
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, name } = body;

    if (!email || !name) {
      return c.json({ error: "Email and name are required" }, 400);
    }

    const userId = `user_${Date.now()}`;

    await sendWelcomeEmail.trigger({
      userId,
      email,
      name,
    });

    return c.json({
      success: true,
      message: "User created, welcome email queued",
      userId,
    });
  } catch (error) {
    return c.json({ error: "Failed to process signup" }, 500);
  }
});

app.post("/reset-password", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const token = Math.random().toString(36).slice(2, 15);

    await sendPasswordReset.trigger({
      email,
      token,
    });

    return c.json({
      success: true,
      message: "Password reset email queued",
    });
  } catch (error) {
    return c.json({ error: "Failed to process password reset" }, 500);
  }
});

app.post("/order", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, items, total } = body;

    if (!userId || !items || !Array.isArray(items) || !total) {
      return c.json(
        { error: "userId, items (array), and total are required" },
        400
      );
    }

    const orderId = `order_${Date.now()}`;

    await processOrder.trigger({
      orderId,
      userId,
      items,
      total,
    });

    await sendOrderConfirmation.trigger(
      {
        orderId,
        email: `${userId}@example.com`,
        total,
      },
      {
        delay: 10000,
      }
    );

    return c.json({
      success: true,
      message: "Order queued for processing",
      orderId,
    });
  } catch (error) {
    return c.json({ error: "Failed to process order" }, 500);
  }
});

const port = process.env.PORT || 1960;

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📋 Make sure Redis is running on localhost:6379`);

export default {
  port,
  fetch: app.fetch,
};
