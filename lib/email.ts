/**
 * Email utility using Resend.
 * Set RESEND_API_KEY in your environment variables.
 * Set EMAIL_FROM to your verified sender domain (e.g., noreply@yourdomain.com)
 */

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
  const apiKey = process.env.RESEND_API_KEY;
  const sender = from || process.env.EMAIL_FROM || 'PASS Mentoring <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(`[EMAIL-STUB] To: ${to} | Subject: ${subject}`);
    console.log('[EMAIL-STUB] No RESEND_API_KEY set, skipping email send');
    return { success: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('Resend API error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

/**
 * Send notification email when user profile is changed by admin
 */
export async function sendProfileChangeNotification({
  userEmail,
  userName,
  changes,
  adminEmail,
}: {
  userEmail: string;
  userName: string;
  changes: string;
  adminEmail: string;
}) {
  return sendEmail({
    to: userEmail,
    subject: 'PASS Mentoring - Profile Update Notification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #08172E 0%, #0D47A1 100%); padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">PASS Mentoring System</h1>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hello ${userName || 'User'},</p>
          <p>Your profile has been updated by an administrator.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #333;">Changes Made:</h3>
            <p style="margin: 0; color: #555;">${changes}</p>
          </div>
          <p style="color: #666; font-size: 13px;">Changed by: ${adminEmail}</p>
          <p style="color: #666; font-size: 13px;">If you did not expect this change, please contact your HR administrator.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Prime Atlantic Group of Companies - Mentoring Matching System</p>
        </div>
      </div>
    `,
  });
}

/**
 * Send notification email when a new account is created
 */
export async function sendAccountCreatedNotification({
  userEmail,
  userName,
  role,
  temporaryPassword,
}: {
  userEmail: string;
  userName: string;
  role: string;
  temporaryPassword?: string;
}) {
  return sendEmail({
    to: userEmail,
    subject: 'PASS Mentoring - Your Account Has Been Created',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #08172E 0%, #0D47A1 100%); padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">PASS Mentoring System</h1>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hello ${userName},</p>
          <p>Your account has been created on the PASS Mentoring Matching System.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Role:</strong> ${role}</p>
            <p style="margin: 4px 0;"><strong>Email:</strong> ${userEmail}</p>
            ${temporaryPassword ? `<p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>` : ''}
          </div>
          <p>Please log in and complete your profile as soon as possible.</p>
          ${temporaryPassword ? '<p style="color: #d32f2f;"><strong>Important:</strong> Please change your password after your first login.</p>' : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Prime Atlantic Group of Companies - Mentoring Matching System</p>
        </div>
      </div>
    `,
  });
}
