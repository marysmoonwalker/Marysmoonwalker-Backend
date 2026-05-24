/* ─────────────────────────────────────────────────────────────────────────
   Newsletter / Contact Templates — Mary's Moonwalker
   Table-based HTML for maximum email client compatibility
   (Gmail, Outlook, Apple Mail, iOS, Android)
   Design: #0A0A0A black · #FF8C00 orange · Georgia serif · Courier mono
───────────────────────────────────────────────────────────────────────── */

const ACCENT  = '#FF8C00';
const ACCENT2 = '#cc7000';
const CARD    = '#111111';
const BORDER  = '#222222';
const TEXT    = '#d4d4d4';
const MUTED   = '#666666';
const MONO    = "'Courier New', Courier, monospace";
const SERIF   = "Georgia, 'Times New Roman', serif";

const UNSUBSCRIBE_BASE = process.env.API_BASE_URL ?? 'https://api.marys-moonwalker.com';

/* ─── Base shell ─────────────────────────────────────────────────────────── */
const baseTemplate = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Mary's Moonwalker</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; background-color: #000000; }

    @media only screen and (max-width: 600px) {
      .email-card   { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .header-cell  { padding: 24px 20px !important; }
      .body-cell    { padding: 28px 20px !important; }
      .footer-cell  { padding: 20px !important; }
      .btn-link     { padding: 14px 24px !important; font-size: 12px !important; }
      .h1-text      { font-size: 22px !important; letter-spacing: 2px !important; }
      .h2-text      { font-size: 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#000000;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#000000;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" class="email-card" width="600" cellpadding="0" cellspacing="0" border="0"
               style="
                 max-width:600px;
                 width:100%;
                 background-color:${CARD};
                 border:1px solid ${BORDER};
                 border-radius:12px;
                 overflow:hidden;
               ">

          <!-- HEADER -->
          <tr>
            <td class="header-cell" align="center"
                style="
                  background:linear-gradient(135deg,#0a0a0a 0%,#181400 50%,#0a0a0a 100%);
                  border-bottom:2px solid ${ACCENT};
                  padding:36px 40px;
                ">
              <table role="presentation" width="40" cellpadding="0" cellspacing="0" border="0"
                     style="margin:0 auto 20px auto;">
                <tr>
                  <td height="3" style="background-color:${ACCENT};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <h1 class="h1-text" style="
                color:${ACCENT};
                font-family:${SERIF};
                font-size:28px;
                font-weight:bold;
                letter-spacing:4px;
                text-transform:uppercase;
                margin:0 0 6px 0;
                line-height:1.2;
              ">Mary's Moonwalker</h1>

              <p style="
                color:${MUTED};
                font-family:${MONO};
                font-size:10px;
                letter-spacing:4px;
                text-transform:uppercase;
                margin:0;
              ">The King of Pop Lives Forever</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="body-cell" style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="footer-cell" align="center"
                style="
                  background-color:#080808;
                  border-top:1px solid ${BORDER};
                  padding:24px 40px;
                ">
              <p style="
                color:${MUTED};
                font-family:${MONO};
                font-size:10px;
                letter-spacing:2px;
                text-transform:uppercase;
                margin:0 0 10px 0;
              ">© ${new Date().getFullYear()} Mary's Moonwalker · All rights reserved</p>

              <a href="https://marys-moonwalker.com"
                 style="
                   color:${ACCENT};
                   font-family:${MONO};
                   font-size:11px;
                   text-decoration:none;
                   letter-spacing:2px;
                 ">marys-moonwalker.com</a>

              <p style="
                color:#333333;
                font-family:${MONO};
                font-size:10px;
                margin:14px 0 0 0;
                letter-spacing:1px;
              ">You received this email because you subscribed on our website.</p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>
`;

/* ─── Reusable blocks ────────────────────────────────────────────────────── */

const heading = (text: string): string => `
  <h2 class="h2-text" style="
    color:#ffffff;
    font-family:${SERIF};
    font-size:22px;
    font-weight:bold;
    margin:0 0 20px 0;
    padding-bottom:14px;
    border-bottom:1px solid ${BORDER};
    line-height:1.3;
    letter-spacing:0.5px;
  ">${text}</h2>
`;

const paragraph = (text: string): string => `
  <p style="
    color:${TEXT};
    font-family:${SERIF};
    font-size:15px;
    line-height:1.85;
    margin:0 0 18px 0;
  ">${text}</p>
`;

const ctaButton = (label: string, href: string): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
         style="margin:32px auto;">
    <tr>
      <td align="center"
          style="
            background:linear-gradient(135deg,${ACCENT} 0%,${ACCENT2} 100%);
            border-radius:6px;
          ">
        <a class="btn-link" href="${href}"
           style="
             display:inline-block;
             color:#000000;
             font-family:${MONO};
             font-size:12px;
             font-weight:bold;
             letter-spacing:3px;
             text-transform:uppercase;
             text-decoration:none;
             padding:16px 44px;
             border-radius:6px;
             mso-padding-alt:0;
             white-space:nowrap;
           ">${label}</a>
      </td>
    </tr>
  </table>
`;

const infoBox = (text: string): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin:20px 0;">
    <tr>
      <td style="
        background-color:#0d0d0d;
        border-left:3px solid ${ACCENT};
        border-radius:0 6px 6px 0;
        padding:14px 18px;
      ">
        <p style="
          color:${MUTED};
          font-family:${MONO};
          font-size:11px;
          letter-spacing:1px;
          line-height:1.7;
          margin:0;
        ">${text}</p>
      </td>
    </tr>
  </table>
`;

const signature = (): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin:32px 0 0 0;border-top:1px solid ${BORDER};">
    <tr>
      <td style="padding-top:22px;">
        <p style="
          color:${MUTED};
          font-family:${SERIF};
          font-size:14px;
          font-style:italic;
          margin:0 0 6px 0;
          line-height:1.6;
        ">With love for the King,</p>
        <p style="
          color:${ACCENT};
          font-family:${MONO};
          font-size:12px;
          font-weight:bold;
          letter-spacing:2px;
          text-transform:uppercase;
          margin:0;
        ">The Mary's Moonwalker Team</p>
      </td>
    </tr>
  </table>
`;

const unsubscribeBlock = (url: string): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-top:32px;border-top:1px solid #1a1a1a;">
    <tr>
      <td align="center" style="padding-top:20px;">
        <p style="
          color:#3a3a3a;
          font-family:${MONO};
          font-size:10px;
          letter-spacing:1px;
          margin:0 0 8px 0;
        ">No longer wish to receive our updates?</p>
        <a href="${url}"
           style="
             color:#444444;
             font-family:${MONO};
             font-size:10px;
             letter-spacing:2px;
             text-transform:uppercase;
             text-decoration:underline;
           ">Unsubscribe</a>
      </td>
    </tr>
  </table>
`;

/* ─── Templates ──────────────────────────────────────────────────────────── */

/**
 * Sent to a new subscriber immediately after sign-up.
 * Includes an unsubscribe link backed by the subscriber's unique token.
 */
export const subscribeConfirmTemplate = (unsubscribeToken: string): string => {
    const unsubscribeUrl = `${UNSUBSCRIBE_BASE}/api/unsubscribe/${unsubscribeToken}`;

    return baseTemplate(`
        ${heading("You're In. Welcome to the Inner Circle.")}

        ${paragraph("You are now part of a community dedicated to preserving the legacy of the greatest entertainer who ever lived. Expect exclusive archival deep-dives, rare media drops, and stories that never made the headlines.")}

        ${paragraph("We only write when it matters — keep an eye on your inbox.")}

        ${ctaButton('Explore the Archive', 'https://marys-moonwalker.com')}

        ${infoBox('TIP &nbsp;·&nbsp; Add hello@marys-moonwalker.com to your contacts so our emails never land in spam.')}

        ${signature()}

        ${unsubscribeBlock(unsubscribeUrl)}
    `);
};

/**
 * Auto-reply sent to anyone who submits the contact form.
 * Confirms receipt and sets expectations on response time.
 */
export const contactAcknowledgementTemplate = (name: string): string =>
    baseTemplate(`
        ${heading(`We Received Your Message, ${name}.`)}

        ${paragraph("Thank you for reaching out to Mary's Moonwalker. Your message has been received and a member of our team will review it shortly.")}

        ${paragraph(`We typically respond within <span style="color:${ACCENT};font-weight:bold;">2–3 business days</span>. If your inquiry is urgent, you can also reach us directly at <a href="mailto:hello@marys-moonwalker.com" style="color:${ACCENT};text-decoration:none;">hello@marys-moonwalker.com</a>.`)}

        ${infoBox('Please do not reply to this email — it is sent from an unmonitored address. Use the contact form or email us directly.')}

        ${signature()}
    `);