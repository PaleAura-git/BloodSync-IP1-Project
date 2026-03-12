import nodemailer, { Transporter } from 'nodemailer';
import { BloodType } from '../types/donor';

const TAG = '[emailService]';

// ─── Env validation ──────────────────────────────────────────────────────────

const REQUIRED_ENV = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'] as const;

function validateEnv(): string | null {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) return `Missing required env var: ${key}`;
  }
  return null;
}

function logConfig(): void {
  console.log(`${TAG} SMTP config:`, {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: Number(process.env.EMAIL_PORT) === 465,
    user: process.env.EMAIL_USER,
    from: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS ? `[set, ${process.env.EMAIL_PASS.length} chars]` : '[NOT SET]',
  });
}

// ─── Transporter ─────────────────────────────────────────────────────────────

function createTransporter(): Transporter {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Tests the SMTP connection. Call this on server startup or before a send batch.
 * Returns true if the connection succeeds, false otherwise.
 */
export async function verifyTransporter(): Promise<boolean> {
  const envError = validateEnv();
  if (envError) {
    console.error(`${TAG} [verify] Env check failed — ${envError}`);
    return false;
  }

  logConfig();
  const transporter = createTransporter();

  try {
    console.log(`${TAG} [verify] Testing SMTP connection to ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}…`);
    await transporter.verify();
    console.log(`${TAG} [verify] ✓ SMTP connection OK — ready to send`);
    return true;
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: string; responseCode?: number; response?: string };
    console.error(`${TAG} [verify] ✗ SMTP connection failed`);
    console.error(`${TAG} [verify]   code:         ${e.code ?? 'n/a'}`);
    console.error(`${TAG} [verify]   responseCode: ${e.responseCode ?? 'n/a'}`);
    console.error(`${TAG} [verify]   response:     ${e.response ?? 'n/a'}`);
    console.error(`${TAG} [verify]   message:      ${e.message}`);

    if (e.code === 'ECONNREFUSED') {
      console.error(`${TAG} [verify]   → Cannot reach ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}. Check EMAIL_HOST/PORT and firewall.`);
    } else if (e.responseCode === 535 || e.code === 'EAUTH') {
      console.error(`${TAG} [verify]   → Authentication failed. Check EMAIL_USER/PASS. For Gmail, use a 16-char App Password (not your account password).`);
    } else if (e.code === 'ESOCKET' || e.code === 'ETIMEDOUT') {
      console.error(`${TAG} [verify]   → Network/TLS error. Try EMAIL_PORT=465 with secure:true, or EMAIL_PORT=587 with secure:false.`);
    }

    return false;
  }
}

// ─── HTML template ───────────────────────────────────────────────────────────

interface DonationRequestEmailOptions {
  donorEmail: string;
  hospitalName: string;
  message: string;
  bloodType?: BloodType;
  isUrgent: boolean;
}

function buildEmailHtml(opts: DonationRequestEmailOptions): string {
  const { hospitalName, message, bloodType, isUrgent } = opts;
  const accentColor = isUrgent ? '#c0392b' : '#e74c3c';
  const badgeText = isUrgent ? '🚨 URGENT REQUEST' : '🩸 DONATION REQUEST';

  const bloodTypeBlock = bloodType
    ? `<div style="text-align:center;margin:28px 0;">
        <span style="display:inline-block;background:#fff5f5;border:2px solid ${accentColor};
          border-radius:12px;padding:14px 32px;font-size:32px;font-weight:700;
          color:${accentColor};letter-spacing:2px;">${bloodType}</span>
        <p style="margin:8px 0 0;color:#888;font-size:13px;">Blood Type Needed</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>BloodSync — Donation Request</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;background:#ffffff;border-radius:16px;
                 overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${accentColor} 0%,#922b21 100%);
                       padding:36px 40px;text-align:center;">
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;
                         letter-spacing:3px;text-transform:uppercase;">BloodSync</p>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;
                          line-height:1.3;">Donation Request</h1>
              <span style="display:inline-block;margin-top:14px;background:rgba(255,255,255,0.2);
                            border:1px solid rgba(255,255,255,0.4);border-radius:20px;
                            padding:5px 18px;color:#fff;font-size:12px;font-weight:600;
                            letter-spacing:1px;">${badgeText}</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fdf2f2;border-left:4px solid ${accentColor};
                              border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0;font-size:12px;color:#999;
                               text-transform:uppercase;letter-spacing:1px;">From</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:700;
                               color:#2c3e50;">${hospitalName}</p>
                  </td>
                </tr>
              </table>

              ${bloodTypeBlock}

              <div style="margin:28px 0;">
                <p style="margin:0 0 10px;font-size:12px;color:#999;
                           text-transform:uppercase;letter-spacing:1px;">Message</p>
                <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;
                           background:#f9f9f9;border-radius:8px;padding:18px 20px;">
                  ${message}
                </p>
              </div>

              <div style="text-align:center;margin:36px 0 20px;">
                <p style="margin:0 0 16px;font-size:14px;color:#666;">
                  Your donation can save up to <strong style="color:${accentColor};">3 lives</strong>.
                  Please respond as soon as possible.
                </p>
                <a href="#"
                   style="display:inline-block;background:${accentColor};color:#ffffff;
                          text-decoration:none;padding:14px 40px;border-radius:8px;
                          font-size:15px;font-weight:700;letter-spacing:0.5px;">
                  Respond to Request
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:24px 40px;border-top:1px solid #eee;
                       text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#aaa;">
                You received this because you are registered as a donor on BloodSync.
              </p>
              <p style="margin:0;font-size:11px;color:#bbb;">
                © ${new Date().getFullYear()} BloodSync · Muscat, Oman
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Main send function ───────────────────────────────────────────────────────

export async function sendDonationRequestEmail(
  opts: DonationRequestEmailOptions
): Promise<boolean> {
  const { donorEmail, hospitalName, isUrgent } = opts;

  // 1. Validate env
  const envError = validateEnv();
  if (envError) {
    console.error(`${TAG} [send] Aborting — ${envError}`);
    return false;
  }

  const subject = isUrgent
    ? `🚨 Urgent Blood Donation Request from ${hospitalName}`
    : `🩸 Donation Request from ${hospitalName}`;

  console.log(`${TAG} [send] Preparing email → ${donorEmail} | subject: "${subject}"`);
  logConfig();

  const transporter = createTransporter();

  // 2. Verify connection before sending
  try {
    console.log(`${TAG} [send] Verifying SMTP connection…`);
    await transporter.verify();
    console.log(`${TAG} [send] ✓ SMTP connection verified`);
  } catch (verifyErr) {
    const e = verifyErr as NodeJS.ErrnoException & { code?: string; responseCode?: number; response?: string };
    console.error(`${TAG} [send] ✗ SMTP verify failed before send`);
    console.error(`${TAG} [send]   code: ${e.code ?? 'n/a'} | responseCode: ${e.responseCode ?? 'n/a'}`);
    console.error(`${TAG} [send]   response: ${e.response ?? e.message}`);
    return false;
  }

  // 3. Send
  try {
    console.log(`${TAG} [send] Sending to ${donorEmail}…`);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,   // already formatted: "BloodSync <bloodsync.test@gmail.com>"
      to: donorEmail,
      subject,
      html: buildEmailHtml(opts),
    });

    console.log(`${TAG} [send] ✓ Sent successfully`);
    console.log(`${TAG} [send]   messageId: ${info.messageId}`);
    console.log(`${TAG} [send]   response:  ${info.response}`);
    console.log(`${TAG} [send]   accepted:  ${info.accepted?.join(', ')}`);
    console.log(`${TAG} [send]   rejected:  ${info.rejected?.join(', ') || 'none'}`);

    return true;
  } catch (sendErr) {
    const e = sendErr as NodeJS.ErrnoException & { code?: string; responseCode?: number; response?: string };
    console.error(`${TAG} [send] ✗ sendMail failed to ${donorEmail}`);
    console.error(`${TAG} [send]   code:         ${e.code ?? 'n/a'}`);
    console.error(`${TAG} [send]   responseCode: ${e.responseCode ?? 'n/a'}`);
    console.error(`${TAG} [send]   response:     ${e.response ?? 'n/a'}`);
    console.error(`${TAG} [send]   message:      ${e.message}`);
    return false;
  }
}
