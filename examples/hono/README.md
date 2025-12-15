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

The server will start on `http://localhost:3000`.

## API Endpoints

### `GET /`

Returns information about available endpoints.

### `GET /health`

Health check endpoint.

### `POST /signup`

Creates a user and queues a welcome email.

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created, welcome email queued",
  "userId": "user_1234567890"
}
```

### `POST /reset-password`

Queues a password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email queued"
}
```

### `POST /order`

Processes an order and sends a confirmation email (delayed by 3 seconds).

**Request:**
```json
{
  "userId": "user_123",
  "items": ["item1", "item2"],
  "total": 99.99
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order queued for processing",
  "orderId": "order_1234567890"
}
```

## Testing

You can test the endpoints using curl:

```bash
curl http://localhost:3000/

curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

curl -X POST http://localhost:3000/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

curl -X POST http://localhost:3000/order \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_123","items":["item1","item2"],"total":99.99}'
```

## Project Structure

```
src/
  ├── index.ts          # Hono.js app with API routes
  └── tasks/
      ├── email.ts      # Email-related tasks
      └── orders.ts     # Order processing tasks
```

## How It Works

1. Tasks are defined in the `tasks/` directory using `defineTask()`
2. Tasks are imported in `index.ts` to register them with the worker
3. Redis is configured once at app startup
4. API routes trigger tasks using `.trigger()`
5. The worker automatically processes tasks in the background

Watch the console output to see tasks being processed!

