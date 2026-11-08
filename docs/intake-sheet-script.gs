// The Rad Pad: New Member Intake -> Google Sheet
//
// Paste this into the sheet "The Rad Pad - New Member Intake Log":
//   Extensions > Apps Script > replace the default code with this file > Save.
//
// Then set a shared secret and deploy it:
//   1. Project Settings (gear icon) > Script Properties > Add property
//        Name:  SECRET
//        Value: a long random string (keep it; you'll paste the same value into Vercel)
//   2. Deploy > New deployment > type: Web app
//        Execute as: Me
//        Who has access: Anyone
//      Copy the Web app URL. It ends in /exec.
//   3. In Vercel (project rad-pad, Production):
//        INTAKE_SHEET_WEBHOOK_URL = that /exec URL
//        INTAKE_SHEET_SECRET      = the same SECRET value
//      Then redeploy.
//
// The sheet's columns are A-R in this order:
//   First Name, Last Name, Business Name, Website/Portfolio, Location, Referred By,
//   Years in Business, Annual Revenue, Best Project Link, Business Description,
//   Going Well / Challenges, What They Want From Community, Key Strengths,
//   Additional Notes, Email Address, Submission ID, Status, Reviewer Notes

const SHEET_NAME = 'Form responses';

function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty('SECRET');
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply({ ok: false, error: 'bad-json' });
  }
  if (!expected || body.secret !== expected) {
    return reply({ ok: false, error: 'bad-secret' });
  }

  const r = body.row || {};
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return reply({ ok: false, error: 'no-sheet' });

  sheet.appendRow([
    r.first_name, r.last_name, r.business_name, r.website, r.location, r.referred_by,
    r.years_in_business, r.annual_revenue, r.best_project_link, r.about_business,
    r.going_well_challenge, r.hoping_to_get, r.strengths, r.anything_else,
    r.email, r.id, 'New', '',
  ].map(safe));

  return reply({ ok: true });
}

// Stops a cell from being read as a formula (=, +, -, @ at the start).
function safe(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
