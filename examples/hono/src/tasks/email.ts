import { defineTask } from "@benrobo/queueflow";

export const sendWelcomeEmail = defineTask({
  id: "email.welcome",
  handler: async (payload: { userId: string; email: string; name: string }) => {
    console.log(
      `📧 Sending welcome email to ${payload.email} (${payload.name})`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`✅ Welcome email sent to ${payload.email}`);
  },
  onError: async (error, payload) => {
    console.error(`❌ Failed to send welcome email to ${payload.email}:`, error.message);
  },
});

export const sendPasswordReset = defineTask({
  id: "email.password-reset",
  handler: async (payload: { email: string; token: string }) => {
    console.log(`📧 Sending password reset email to ${payload.email}`);
    console.log(`🔗 Reset token: ${payload.token}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`✅ Password reset email sent to ${payload.email}`);
  },
});
