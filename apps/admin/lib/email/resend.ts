import { Resend, type CreateEmailOptions } from "resend";

const RESEND_FROM_EMAIL = "onboarding@resend.dev";
const ADMIN_LOGIN_URL = "https://admin-theta-rouge-89.vercel.app/sign-in";

export type EmailSendResult = {
  sent: boolean;
  skipped: boolean;
  errorMessage: string | null;
  messageId: string | null;
};

type SendEmailOptions = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
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

async function sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<EmailSendResult> {
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
    const emailPayloadBase = {
      from: RESEND_FROM_EMAIL,
      to,
      subject
    };

    const emailPayload: CreateEmailOptions =
      html && text
        ? { ...emailPayloadBase, text, html }
        : html
          ? { ...emailPayloadBase, html }
          : { ...emailPayloadBase, text: text ?? " " };

    const { data, error } = await client.emails.send(emailPayload);

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
    {
      to,
      subject: "Welcome to CIS Kenya Admin - Your Account Details",
      text: [
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
    }
  );
}

export async function sendPasswordResetEmail(to: string, name: string, newPassword: string) {
  return sendEmail(
    {
      to,
      subject: "CIS Kenya Admin - Your Password Has Been Reset",
      text: [
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
    }
  );
}

export async function sendCommunicationEmail(to: string, subject: string, body: string) {
  return sendEmail({ to, subject, text: body });
}

export async function sendPreRegistrationVerificationEmail(
  to: string,
  firstName: string,
  verificationUrl: string
) {
  const subject = "Welcome to Capital International School Kenya - Action Required";
  const textBody = [
    `Dear ${firstName},`,
    "",
    "Thank you for your interest in Capital International School Kenya.",
    "We are excited to support your child through the Cambridge International Curriculum.",
    "",
    "Please verify your pre-registration using the link below:",
    verificationUrl,
    "",
    "If you did not request this pre-registration, you can ignore this email.",
    "",
    "Capital International School Kenya",
    "Phone: +254 700 000 000",
    "Email: info@ciskenya.ac.ke"
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:24px;text-align:center;">
          <h1 style="margin:0;color:#f8d16a;font-size:24px;">Capital International School Kenya</h1>
          <p style="margin:8px 0 0;color:#e2e8f0;font-size:14px;">Cambridge International Curriculum</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:16px;">Dear ${firstName},</p>
          <p style="margin:0 0 14px;color:#334155;line-height:1.6;">
            Thank you for your interest in Capital International School Kenya. We are delighted that
            you are considering our Cambridge International Curriculum for your child.
          </p>
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">
            Please confirm your email address to complete your pre-registration request.
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a
              href="${verificationUrl}"
              style="display:inline-block;background:#0f172a;color:#f8d16a;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;"
            >
              Verify My Pre-Registration
            </a>
          </div>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
            If the button does not work, copy this link into your browser:
            <br />
            <a href="${verificationUrl}" style="color:#0f172a;">${verificationUrl}</a>
          </p>
        </div>
        <div style="background:#f1f5f9;padding:18px 24px;color:#475569;font-size:12px;line-height:1.6;">
          <strong style="color:#0f172a;">Capital International School Kenya</strong><br />
          Email: info@ciskenya.ac.ke · Phone: +254 700 000 000<br />
          This is an automated verification message for your pre-registration request.
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    text: textBody,
    html: htmlBody
  });
}

export async function sendApplicationReceivedEmail(
  to: string,
  firstName: string,
  applicationRef: string
) {
  const subject = `Application Received — Capital International School Kenya (${applicationRef})`;
  const textBody = [
    `Dear ${firstName},`,
    "",
    "Thank you for submitting your application to Capital International School Kenya.",
    `Your application reference number is: ${applicationRef}`,
    "",
    "Our admissions team will review your submission and contact you within 24–48 hours.",
    "",
    "Capital International School Kenya",
    "Phone: +254 700 000 000",
    "Email: info@ciskenya.ac.ke"
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:24px;text-align:center;">
          <h1 style="margin:0;color:#f8d16a;font-size:24px;">Capital International School Kenya</h1>
          <p style="margin:8px 0 0;color:#e2e8f0;font-size:14px;">Application Received</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:16px;">Dear ${firstName},</p>
          <p style="margin:0 0 14px;color:#334155;line-height:1.6;">
            Thank you for submitting your application to Capital International School Kenya.
          </p>
          <p style="margin:0 0 10px;color:#334155;line-height:1.6;">
            Your application reference number is:
          </p>
          <p style="margin:0 0 18px;color:#0f172a;font-weight:700;font-size:18px;">${applicationRef}</p>
          <p style="margin:0;color:#334155;line-height:1.6;">
            Our admissions team will review your submission and contact you within
            <strong> 24–48 hours</strong>.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    text: textBody,
    html: htmlBody
  });
}

export async function sendRegistrationApprovedEmail(
  to: string,
  firstName: string,
  studentCode: string,
  uploadLink: string
) {
  const subject = "Welcome to CIS Kenya — Registration Approved!";
  const textBody = [
    `Dear ${firstName},`,
    "",
    "Congratulations! Your registration has been approved by Capital International School Kenya.",
    `Student ID: ${studentCode}`,
    "",
    "Please upload the required documents using the secure link below:",
    uploadLink,
    "",
    "This link expires in 7 days.",
    "",
    "Capital International School Kenya",
    "Phone: +254 700 000 000",
    "Email: info@ciskenya.ac.ke"
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:24px;text-align:center;">
          <h1 style="margin:0;color:#f8d16a;font-size:24px;">Welcome to CIS Kenya</h1>
          <p style="margin:8px 0 0;color:#e2e8f0;font-size:14px;">Registration Approved</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:16px;">Dear ${firstName},</p>
          <p style="margin:0 0 14px;color:#334155;line-height:1.6;">
            Congratulations! Your registration has been approved by Capital International School Kenya.
          </p>
          <p style="margin:0 0 20px;color:#0f172a;font-weight:700;">Student ID: ${studentCode}</p>
          <div style="text-align:center;margin:0 0 20px;">
            <a
              href="${uploadLink}"
              style="display:inline-block;background:#0f172a;color:#f8d16a;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;"
            >
              Upload Required Documents
            </a>
          </div>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
            If the button does not work, open this link:
            <br />
            <a href="${uploadLink}" style="color:#0f172a;">${uploadLink}</a>
            <br />
            This secure link expires in 7 days.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    text: textBody,
    html: htmlBody
  });
}
