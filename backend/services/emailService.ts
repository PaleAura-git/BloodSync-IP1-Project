import nodemailer from 'nodemailer';
import { BloodType } from '../types/donor';

interface DonationRequestEmailOptions {
  donorEmail: string;
  hospitalName: string;
  message: string;
  bloodType?: BloodType;
  isUrgent: boolean;
}

function createTransporter() {
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

function buildEmailHtml(opts: DonationRequestEmailOptions): string {
  const { hospitalName, message, bloodType, isUrgent } = opts;

  const accentColor = isUrgent ? '#c0392b' : '#e74c3c';
  const badgeText = isUrgent ? '🚨 URGENT REQUEST' : '🩸 DONATION REQUEST';
  const badgeBg = isUrgent ? '#c0392b' : '#e74c3c';

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

  <!-- Wrapper -->
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

              <!-- Hospital info -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fdf2f2;border-left:4px solid ${accentColor};
                              border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
                    <p style="margin:0;font-size:12px;color:#999;
                               text-transform:uppercase;letter-spacing:1px;">From</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:700;
                               color:#2c3e50;">${hospitalName}</p>
                  </td>
                </tr>
              </table>

              ${bloodTypeBlock}

              <!-- Message -->
              <div style="margin:28px 0;">
                <p style="margin:0 0 10px;font-size:12px;color:#999;
                           text-transform:uppercase;letter-spacing:1px;">Message</p>
                <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;
                           background:#f9f9f9;border-radius:8px;padding:18px 20px;">
                  ${message}
                </p>
              </div>

              <!-- CTA -->
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

export async function sendDonationRequestEmail(
  opts: DonationRequestEmailOptions
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    const subject = opts.isUrgent
      ? `🚨 Urgent Blood Donation Request from ${opts.hospitalName}`
      : `🩸 Donation Request from ${opts.hospitalName}`;

    await transporter.sendMail({
      from: `"BloodSync" <${process.env.EMAIL_FROM}>`,
      to: opts.donorEmail,
      subject,
      html: buildEmailHtml(opts),
    });

    return true;
  } catch (err) {
    console.error(`[emailService] Failed to send to ${opts.donorEmail}:`, err);
    return false;
  }
}
