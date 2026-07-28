import { Resend } from "resend";

const RESEND_FROM_EMAIL = "onboarding@resend.dev";
const ADMIN_LOGIN_URL = "https://admin-theta-rouge-89.vercel.app/sign-in";

export type EmailSendResult = {
  sent: boolean;
  skipped: boolean;
  errorMessage: string | null;
  messageId: string | null;
};

let resendClient: Resend | null | undefined;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not configured. Email delivery is disabled.");
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

async function sendEmail(to: string, subject: string, text: string): Promise<EmailSendResult> {
  const client = getResendClient();
  if (!client) {
    return {
      sent: false,
      skipped: true,
      errorMessage: "RESEND_API_KEY is not configured.",
      messageId: null
    };
  }

  try {
    const { data, error } = await client.emails.send({
      from: RESEND_FROM_EMAIL,
      to,
      subject,
      text
    });

    if (error) {
      console.error("Resend email send failed.", error);
      return {
        sent: false,
        skipped: false,
        errorMessage: error.message,
        messageId: null
      };
    }

    return {
      sent: true,
      skipped: false,
      errorMessage: null,
      messageId: data?.id ?? null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Resend error.";
    console.error("Resend email send threw an error.", error);
    return {
      sent: false,
      skipped: false,
      errorMessage,
      messageId: null
    };
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  username: string,
  password: string
) {
  return sendEmail(
    to,
    "Welcome to CIS Kenya Admin - Your Account Details",
    [
      `Hello ${name},`,
      "",
      "Welcome to CIS Kenya Admin. Your staff account has been created.",
      "",
      `Username: ${username}`,
      `Temporary password: ${password}`,
      `Login URL: ${ADMIN_LOGIN_URL}`,
      "",
      "Please sign in and update your password if prompted.",
      "",
      "CIS Kenya Admin"
    ].join("\n")
  );
}

export async function sendPasswordResetEmail(to: string, name: string, newPassword: string) {
  return sendEmail(
    to,
    "CIS Kenya Admin - Your Password Has Been Reset",
    [
      `Hello ${name},`,
      "",
      "Your CIS Kenya Admin password has been reset by a Super Admin.",
      "",
      `Temporary password: ${newPassword}`,
      `Login URL: ${ADMIN_LOGIN_URL}`,
      "",
      "Please sign in with this password and update it as soon as possible.",
      "",
      "CIS Kenya Admin"
    ].join("\n")
  );
}

export async function sendCommunicationEmail(to: string, subject: string, body: string) {
  return sendEmail(to, subject, body);
}
