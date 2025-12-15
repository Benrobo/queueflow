# Queueflow Hono.js Example

This example demonstrates how to use Queueflow with Hono.js to handle background tasks in a web API.

## Setup

1. Make sure Redis is running:

```bash
docker run -d -p 6379:6379 redis:latest
```

2. Install dependencies:

```bash
bun install
```

3. Run the server:

```bash
bun run dev
```

The server will start on `http://localhost:1960`.

## API Endpoints

All endpoints use GET requests with query parameters, making them easy to test in your browser!

### `GET /`

Returns information about available endpoints.

### `GET /signup`

Queues a welcome email task.

**Query Parameters:**

- `email` (optional) - Email address (defaults to "user@example.com")
- `name` (optional) - User name (defaults to "User")

**Example:**

```
http://localhost:1960/signup?email=test@example.com&name=John%20Doe
```

**Response:**

```json
{
  "success": true,
  "message": "Welcome email queued"
}
```

### `GET /reset-password`

Queues a password reset email task.

**Query Parameters:**

- `email` (optional) - Email address (defaults to "user@example.com")

**Example:**

```
http://localhost:1960/reset-password?email=test@example.com
```

**Response:**

```json
{
  "success": true,
  "message": "Password reset email queued"
}
```

### `GET /order`

Processes an order and sends a confirmation email (delayed by 3 seconds).

**Query Parameters:**

- `userId` (optional) - User ID (defaults to "user_123")
- `items` (optional) - Comma-separated list of items (defaults to "item1,item2")
- `total` (optional) - Order total (defaults to 99.99)

**Example:**

```
http://localhost:1960/order?userId=user_456&items=item1,item2,item3&total=149.99
```

**Response:**

```json
{
  "success": true,
  "message": "Order queued",
  "orderId": "order_1234567890"
}
```

### `GET /order-with-on-error`

Demonstrates error handling with the `onError` callback. This task intentionally fails to show how error handlers work.

**Query Parameters:**

- `userId` (optional) - User ID (defaults to "user_123")
- `items` (optional) - Comma-separated list of items (defaults to "item1,item2")
- `total` (optional) - Order total (defaults to 99.99)

**Example:**

```
http://localhost:1960/order-with-on-error?userId=user_789&total=199.99
```

**Response:**

```json
{
  "success": true,
  "message": "Order queued with on error",
  "orderId": "order_1234567890"
}
```

Watch the console to see the error handler being called!

## Testing

You can test the endpoints directly in your browser or using curl:

```bash
curl http://localhost:1960/

curl "http://localhost:1960/signup?email=test@example.com&name=Test%20User"

curl "http://localhost:1960/reset-password?email=test@example.com"

curl "http://localhost:1960/order?userId=user_123&items=item1,item2&total=99.99"

curl "http://localhost:1960/order-with-on-error?userId=user_123&total=199.99"
```

Or simply open the URLs in your browser!

## Project Structure

```
src/
  ├── index.ts          # Hono.js app with API routes
  └── tasks/
      ├── email.ts      # Email-related tasks
      └── orders.ts     # Order processing tasks with error handling examples
```

## How It Works

1. Tasks are defined in the `tasks/` directory using `defineTask()`
2. Tasks are imported in `index.ts` to register them with the worker
3. Redis is configured once at app startup
4. API routes trigger tasks using `.trigger()`
5. The worker automatically processes tasks in the background
6. Error handlers (if defined) are called when tasks fail

Watch the console output to see tasks being processed and error handlers in action!
