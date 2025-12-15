# Queueflow

A simple, type-safe task queue library that gives you the developer-friendly API of Trigger.dev or Inngest, but built on top of BullMQ and Redis. No infrastructure to manage, no platform lock-in—just define your tasks and trigger them.

## Why Queueflow?

If you've ever used [Trigger.dev](https://trigger.dev) or [Inngest](https://inngest.com), you know how nice their APIs are. They're clean, type-safe, and make background jobs feel effortless. But what if you want that same experience while keeping control of your infrastructure?

That's where Queueflow comes in. I couldn't find an npm package that combined BullMQ's reliability with a Trigger.dev-like API, so I built one. It's perfect for when you want:

- ✅ A simple, type-safe API (like Trigger.dev/Inngest)
- ✅ Full control over your Redis/BullMQ infrastructure
- ✅ Zero boilerplate—just define and trigger
- ✅ TypeScript-first with full type safety

## Installation

```bash
bun add @benrobo/queueflow
```

Or with npm:

```bash
npm install @benrobo/queueflow
```

You'll also need Redis running (locally or remote). If you don't have it set up yet, you can run it with Docker:

```bash
docker run -d -p 6379:6379 redis:latest
```

## Quick Start

### 1. Define Your Task

```typescript
// tasks/email.ts
import { defineTask } from "@benrobo/queueflow";

export const sendWelcomeEmail = defineTask({
  id: "email.welcome",
  handler: async (payload: { userId: string; email: string }) => {
    console.log(`Sending welcome email to ${payload.email}`);
    // Your email sending logic here
  },
});
```

### 2. Configure Redis (Optional)

If you're using a local Redis instance on the default port, you can skip this step. Otherwise, configure it once at your app's entry point:

```typescript
// app.ts or index.ts
import { configure } from "@benrobo/queueflow";

configure({
  connection: process.env.REDIS_URL || "redis://localhost:6379",
  defaultQueue: "myapp",
});
```

You can use either a connection string or an object:

```typescript
configure({
  connection: {
    host: "localhost",
    port: 6379,
    password: "your-password",
    db: 0,
  },
});
```

### 3. Trigger Your Task

```typescript
import { sendWelcomeEmail } from "./tasks/email";

await sendWelcomeEmail.trigger({
  userId: "123",
  email: "user@example.com",
});
```

That's it! The worker automatically starts when you trigger your first task.

## How It Works

Queueflow uses a singleton worker pattern that automatically manages everything for you:

1. **Define tasks** with `defineTask()` - they register themselves automatically
2. **Trigger tasks** with `.trigger()` - the worker starts on first use
3. **That's it** - no worker setup, no queue configuration, no boilerplate

The worker listens to all your queues in the background and processes jobs as they come in. Tasks are organized by queue (defaults to the prefix of your task ID, like `email` from `email.welcome`).

## Features

### Type Safety

Queueflow is built with TypeScript from the ground up. Your payload types flow through from definition to trigger:

```typescript
const processOrder = defineTask({
  id: "orders.process",
  handler: async (payload: { orderId: string; amount: number }) => {
    // payload is fully typed here
    console.log(`Processing order ${payload.orderId}`);
  },
});

// TypeScript will catch this error:
await processOrder.trigger({
  orderId: "123",
  // amount: 100, // ❌ TypeScript error: missing 'amount'
});
```

### Delayed Jobs

Need to schedule a task for later? Pass options as the second parameter to `trigger`:

```typescript
await sendWelcomeEmail.trigger(
  { userId: "123", email: "user@example.com" },
  { delay: 5000 } // Send in 5 seconds
);
```

You can pass any BullMQ job options through the second parameter, including:

- `delay` - milliseconds to wait before processing
- `repeat` - cron pattern for recurring jobs
- `attempts` - number of retry attempts
- `backoff` - retry strategy

### Error Handling

Handle errors gracefully with the `onError` callback:

```typescript
const sendEmail = defineTask({
  id: "email.send",
  handler: async (payload: { email: string; subject: string }) => {
    await sendEmailToUser(payload.email, payload.subject);
  },
  onError: async (error, payload) => {
    console.error(`Failed to send email to ${payload.email}:`, error.message);
    await logErrorToService(error, payload);
  },
});
```

The `onError` callback receives both the error and the original payload, so you can handle failures appropriately (log to an error service, send notifications, etc.).

### Custom Queues

By default, tasks are grouped by the prefix of their ID (e.g., `email.welcome` goes to the `email` queue). You can override this:

```typescript
const heavyTask = defineTask({
  id: "processing.heavy",
  queue: "heavy-processing", // Custom queue name
  handler: async (payload) => {
    // This runs in the "heavy-processing" queue
  },
});
```

### Manual Worker Control

While the worker auto-starts, you can also start it manually if you prefer:

```typescript
import { startWorker } from "@benrobo/queueflow";

startWorker();
```

This is useful if you want to ensure the worker is running before your app starts accepting requests.

## Real-World Example

Here's a more complete example showing how you might structure tasks in a real app:

```typescript
// tasks/email.ts
import { defineTask } from "@benrobo/queueflow";

export const sendWelcomeEmail = defineTask({
  id: "email.welcome",
  handler: async (payload: { userId: string; email: string }) => {
    await sendEmail({
      to: payload.email,
      subject: "Welcome!",
      body: "Thanks for joining us!",
    });
  },
});

export const sendPasswordReset = defineTask({
  id: "email.password-reset",
  handler: async (payload: { email: string; token: string }) => {
    await sendEmail({
      to: payload.email,
      subject: "Reset your password",
      body: `Click here to reset: ${payload.token}`,
    });
  },
});
```

```typescript
// tasks/orders.ts
import { defineTask } from "@benrobo/queueflow";

export const processOrder = defineTask({
  id: "orders.process",
  handler: async (payload: { orderId: string; items: string[] }) => {
    // Process the order
    await chargePayment(payload.orderId);
    await updateInventory(payload.items);
    await sendConfirmation(payload.orderId);
  },
});
```

```typescript
// app.ts
import { configure } from "@benrobo/queueflow";
import "./tasks/email";
import "./tasks/orders";

configure({
  connection: process.env.REDIS_URL,
});

// Later in your API routes or wherever:
import { sendWelcomeEmail, processOrder } from "./tasks";

app.post("/signup", async (req, res) => {
  const user = await createUser(req.body);

  await sendWelcomeEmail.trigger({
    userId: user.id,
    email: user.email,
  });

  res.json({ success: true });
});
```

## API Reference

### `defineTask<T>(config)`

Creates a new task definition.

**Parameters:**

- `config.id` (string) - Unique identifier for the task (e.g., `"email.welcome"`)
- `config.queue` (string, optional) - Queue name (defaults to prefix of `id`)
- `config.handler` (function) - Async function that processes the task payload
- `config.onError` (function, optional) - Error handler callback `(error: Error, payload: T) => Promise<void> | void`

**Returns:** `Task<T>` instance

### `Task.trigger(payload, options?)`

Triggers a task to run. Options are optional and can be used for delayed jobs, retries, and more.

**Parameters:**

- `payload` (T) - The typed payload for the task
- `options` (JobsOptions, optional) - BullMQ job options (delay, repeat, attempts, etc.)

**Returns:** `Promise<void>`

### `configure(config)`

Configures the Redis connection and default settings.

**Parameters:**

- `config.connection` (string | object, optional) - Redis connection string or config object
- `config.defaultQueue` (string, optional) - Default queue name (defaults to `"default"`)

### `startWorker()`

Manually starts the global worker. Usually not needed as it auto-starts on first trigger.

## Requirements

- Node.js 18+ or Bun
- Redis (local or remote)
- TypeScript 5.0+ (for type safety)

## License

MIT

## Contributing

Contributions are welcome! This is a young project, so I'm open to ideas, bug reports, and pull requests.
