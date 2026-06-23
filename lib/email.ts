/**
 * Email utility — replace the provider below with your chosen service.
 * 
 * OPTION 1: Resend (recommended — modern, easy)
 *   yarn add resend
 *   Set RESEND_API_KEY in .env
 * 
 * OPTION 2: SendGrid
 *   yarn add @sendgrid/mail
 *   Set SENDGRID_API_KEY in .env
 * 
 * OPTION 3: Nodemailer (free, any SMTP)
 *   yarn add nodemailer
 *   Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
 */

// ─── Using Resend (uncomment after: yarn add resend) ───────────────
// import { Resend } from 'resend';
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; error?: any }> {
  const sender = from || process.env.EMAIL_FROM || 'noreply@yourdomain.com';

  try {
    // ─── RESEND IMPLEMENTATION (recommended) ─────────────────
    // const { data, error } = await resend.emails.send({
    //   from: `PASS Mentoring <${sender}>`,
    //   to,
    //   subject,
    //   html,
    // });
    // if (error) throw error;
    // return { success: true };

    // ─── PLACEHOLDER — remove this once you pick a provider ──
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    console.log('[EMAIL] Body preview:', html.substring(0, 200));
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}
