/**
 * AI with Purpose 2026 — Google Apps Script Web App
 *
 * SETUP (one-time, ~5 minutes):
 * ──────────────────────────────
 * 1. Go to https://sheets.google.com and create a new spreadsheet.
 *    Name it "AI with Purpose 2026 Registrations".
 *
 * 2. In the spreadsheet, go to Extensions > Apps Script.
 *
 * 3. Delete everything in the editor and paste this entire file.
 *
 * 4. Click Deploy > New Deployment.
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone   ← required so the registration form can POST
 *    Click Deploy, then Authorize when prompted.
 *    Grant the "Send email" permission when asked — this is required for confirmations.
 *
 * 5. Copy the Web App URL (https://script.google.com/macros/s/.../exec)
 *
 * 6. In index.html, set:
 *       const GAS_ENDPOINT = "https://script.google.com/macros/s/.../exec";
 *
 * 7. In admin.html, paste the same URL into the Google Sheets field and click Save.
 *
 * NOTE ON SENDER ADDRESS:
 *   Confirmation emails are sent FROM whichever Google account deploys this script.
 *   To send from mglavach@wcsmiami.org, log into Google with that account before
 *   deploying (it must be a Gmail or Google Workspace account).
 *   The reply-to is always set to mglavach@wcsmiami.org regardless.
 */

const SHEET_NAME    = "Registrations";
const REPLY_TO      = "mglavach@wcsmiami.org";
const CONFERENCE    = "Artificial Intelligence with Purpose 2026";
const CONF_DATE     = "August 5, 2026";
const CONF_LOCATION = "Westminster Christian School — HS Campus, 6855 SW 152nd Street, Palmetto Bay, FL 33157";

// ── POST: receive a registration, save to sheet, send confirmation email ──
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    sheet.appendRow([
      new Date(),
      data.sessionId,
      data.sessionTitle,
      data.category,
      data.name,
      data.email,
      new Date().toISOString(),
    ]);

    sendConfirmationEmail(data);

    return jsonResponse({ status: "ok" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// ── GET: return all registrations as JSON (used by admin.html) ──
function doGet(e) {
  if (e && e.parameter && e.parameter.action === "getAll") {
    try {
      const sheet = getOrCreateSheet();
      const rows  = sheet.getDataRange().getValues();
      const headers = rows[0];
      const registrations = {};

      rows.slice(1).forEach(row => {
        const sessionId = row[1];
        if (!registrations[sessionId]) registrations[sessionId] = [];
        registrations[sessionId].push({
          name:  row[4],
          email: row[5],
          ts:    new Date(row[6]).getTime() || new Date(row[0]).getTime(),
        });
      });

      return jsonResponse({ status: "ok", registrations });
    } catch (err) {
      return jsonResponse({ status: "error", message: err.message });
    }
  }

  return ContentService
    .createTextOutput("AI with Purpose 2026 registration endpoint is active.")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── EMAIL ──
function sendConfirmationEmail(data) {
  const subject = `Registration Confirmed — ${CONFERENCE}`;

  const htmlBody = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1e293b;">
      <div style="background:#2c5234;padding:28px 32px;border-radius:10px 10px 0 0;">
        <p style="color:#f0c060;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 6px;">Westminster Christian School</p>
        <h1 style="color:#ffffff;font-size:22px;margin:0;line-height:1.3;">Artificial Intelligence<br/>with Purpose</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:28px 32px;">
        <p style="font-size:16px;margin:0 0 16px;">Hi <strong>${data.name}</strong>,</p>
        <p style="margin:0 0 16px;">You are confirmed for the following breakout session:</p>

        <div style="background:#f1f5f1;border-left:4px solid #2c5234;border-radius:6px;padding:16px 20px;margin:0 0 20px;">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#2c5234;margin:0 0 4px;">${data.category} — Breakout Session</p>
          <p style="font-size:15px;font-weight:700;margin:0 0 6px;">${data.sessionTitle}</p>
          <p style="font-size:13px;color:#64748b;margin:0;">${data.speaker ? data.speaker + ' &bull; ' + data.org : ''}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
          <tr><td style="padding:6px 0;color:#64748b;width:90px;">Date</td><td style="padding:6px 0;font-weight:600;">${CONF_DATE}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Location</td><td style="padding:6px 0;font-weight:600;">${CONF_LOCATION}</td></tr>
        </table>

        <p style="font-size:13px;color:#64748b;margin:0 0 20px;">Room assignments will be posted at the registration desk on the day of the conference. Breakfast and lunch are provided for all registered attendees.</p>

        <p style="font-size:13px;margin:0;">Questions? Reply to this email or contact us at <a href="mailto:${REPLY_TO}" style="color:#2c5234;">${REPLY_TO}</a>.</p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:11px;color:#94a3b8;margin:0;">Westminster Christian School &bull; 6855 SW 152nd Street, Palmetto Bay, FL 33157</p>
      </div>
    </div>`;

  const plainBody =
    `Hi ${data.name},\n\n` +
    `You are confirmed for: ${data.sessionTitle}\n` +
    `Category: ${data.category}\n\n` +
    `Date: ${CONF_DATE}\n` +
    `Location: ${CONF_LOCATION}\n\n` +
    `Questions? Contact us at ${REPLY_TO}.\n\n` +
    `Westminster Christian School`;

  MailApp.sendEmail({
    to:       data.email,
    replyTo:  REPLY_TO,
    subject:  subject,
    body:     plainBody,
    htmlBody: htmlBody,
  });
}

// ── HELPERS ──
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Timestamp", "Session ID", "Session Title", "Category", "Name", "Email", "ISO Timestamp"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
  }
  return sheet;
}
