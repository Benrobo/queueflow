import { Hono } from "hono";
import { configure } from "@benrobo/queueflow";
import "./tasks/email";
import "./tasks/orders";
import { sendWelcomeEmail, sendPasswordReset } from "./tasks/email";
import {
  processOrder,
  sendOrderConfirmation,
  sendOrderConfirmationWithOnError,
} from "./tasks/orders";

configure({
  connection: process.env.REDIS_URL || "redis://localhost:6379",
  defaultQueue: "hono-example",
});

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    message: "Queueflow Hono.js Example",
    endpoints: ["GET /signup", "GET /reset-password", "GET /order"],
  });
});

app.get("/signup", async (c) => {
  const email = c.req.query("email") || "user@example.com";
  const name = c.req.query("name") || "User";

  await sendWelcomeEmail.trigger({
    userId: `user_${Date.now()}`,
    email,
    name,
  });

  return c.json({ success: true, message: "Welcome email queued" });
});

app.get("/reset-password", async (c) => {
  const email = c.req.query("email") || "user@example.com";

  await sendPasswordReset.trigger({
    email,
    token: Math.random().toString(36).slice(2, 15),
  });

  return c.json({ success: true, message: "Password reset email queued" });
});

app.get("/order", async (c) => {
  const userId = c.req.query("userId") || "user_123";
  const items = c.req.query("items")?.split(",") || ["item1", "item2"];
  const total = Number(c.req.query("total")) || 99.99;

  const orderId = `order_${Date.now()}`;

  await processOrder.trigger({ orderId, userId, items, total });
  await sendOrderConfirmation.trigger(
    { orderId, email: `${userId}@example.com`, total },
    { delay: 3000 }
  );

  return c.json({ success: true, message: "Order queued", orderId });
});

app.get("/order-with-on-error", async (c) => {
  const userId = c.req.query("userId") || "user_123";
  const items = c.req.query("items")?.split(",") || ["item1", "item2"];
  const total = Number(c.req.query("total")) || 99.99;

  const orderId = `order_${Date.now()}`;

  await sendOrderConfirmationWithOnError.trigger({
    orderId,
    email: `${userId}@example.com`,
    total,
  });
  return c.json({
    success: true,
    message: "Order queued with on error",
    orderId,
  });
});

const port = process.env.PORT || 1960;

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📋 Make sure Redis is running on localhost:6379`);

export default {
  port,
  fetch: app.fetch,
};
