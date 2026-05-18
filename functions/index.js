/**
 * Marie Borders — Cloud Functions
 *
 * Five Firestore-triggered functions, one per lead collection. Each:
 *   1. Reads the freshly-created lead doc
 *   2. Builds a typed `vars` payload for template substitution
 *   3. Loads the admin + visitor email templates from Firestore
 *      (falling back to defaults from lib/defaultTemplates.js)
 *   4. Renders subject + HTML body
 *   5. Sends both emails via Resend
 *   6. Writes emailStatus back onto the lead doc
 *
 * Triggers (collection -> function):
 *   contactInquiries     -> onContactInquiryCreate
 *   wishListSubmissions  -> onWishListSubmissionCreate
 *   homeValuationLeads   -> onHomeValuationLeadCreate
 *   openHouseRSVPs       -> onOpenHouseRSVPCreate
 *   guideDownloads       -> onGuideDownloadCreate
 *
 * Deployment:
 *   1. Blaze plan must be enabled on Firebase project mbreal-83286
 *   2. firebase functions:secrets:set RESEND_API_KEY
 *   3. firebase deploy --only functions
 *
 * Backend routing constants (FROM / admin TO / CC) live in BRAND below.
 * They are intentionally NOT editable from the CMS — only email TEMPLATES
 * (subject + body) are CMS-editable. To change routing addresses, edit
 * BRAND and redeploy.
 */

'use strict';

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { Resend } = require('resend');

const { render, stripHtml, escapeHtml } = require('./lib/template');
const fmt = require('./lib/formatters');
const { defaultTemplates } = require('./lib/defaultTemplates');

initializeApp();
const db = getFirestore();

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10
});

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// ---- BRAND / ROUTING CONFIG (edit + redeploy to change) ----
const BRAND = {
  // From address visitors and Marie see. Must be a verified Resend sender on
  // the marieborders.com domain. Friendly name is bracketed so Gmail shows
  // "Marie Borders <marie@marieborders.com>" rather than just the raw email.
  fromName: 'Marie Borders',
  fromEmail: 'marie@marieborders.com',
  // Admin notification recipient — Anne (team coordinator). She auto-forwards
  // to Marie via a Gmail filter (free Resend tier supports only one TO).
  adminTo: 'mariebordershometeam@gmail.com',
  // BCC the brokerage address so Marie has a copy regardless of forwarding.
  adminBcc: 'marie@marinsfinest.com'
};

// ---- HELPERS ----

function firstName(fullName) {
  if (!fullName) return 'there';
  const trimmed = String(fullName).trim();
  return trimmed.split(/\s+/)[0] || 'there';
}

function nullToDash(v) {
  if (v == null || v === '') return 'Not provided';
  return String(v);
}

function yesNo(v) {
  if (v == null) return 'Not specified';
  return v ? 'Yes' : 'No';
}

function htmlNewlines(text) {
  if (text == null || text === '') return '';
  return escapeHtml(String(text)).replace(/\r?\n/g, '<br>');
}

async function loadTemplate(templateId) {
  try {
    const snap = await db.collection('emailTemplates').doc(templateId).get();
    if (snap.exists) {
      const data = snap.data() || {};
      if (data.enabled === false) return null;
      if (data.subject || data.bodyHtml) {
        return {
          subject: data.subject || defaultTemplates[templateId].subject,
          bodyHtml: data.bodyHtml || defaultTemplates[templateId].bodyHtml
        };
      }
    }
  } catch (err) {
    console.warn('[loadTemplate] read failed for', templateId, err && err.message);
  }
  // Fall back to defaults
  const def = defaultTemplates[templateId];
  if (!def || def.enabled === false) return null;
  return { subject: def.subject, bodyHtml: def.bodyHtml };
}

async function sendEmail(resend, { to, subject, html, replyTo, bcc }) {
  const payload = {
    from: `${BRAND.fromName} <${BRAND.fromEmail}>`,
    to: [to],
    subject,
    html,
    text: stripHtml(html)
  };
  if (replyTo) payload.replyTo = replyTo;
  if (bcc) payload.bcc = [bcc];
  const result = await resend.emails.send(payload);
  if (result && result.error) {
    throw new Error(result.error.message || JSON.stringify(result.error));
  }
  return result && result.data ? result.data.id : null;
}

/**
 * Core send pipeline shared by all inquiry types.
 *
 * @param {object} ctx
 *   - inquiryType: 'contactInquiry' | 'wishList' | 'homeValuation' | 'openHouseRSVP' | 'guideDownload'
 *   - docRef: Firestore DocumentReference of the lead doc
 *   - vars: variable bag used for template substitution
 *   - visitorEmail: visitor email address (for visitor auto-reply)
 *   - replyTo: address for admin reply-to header (defaults to visitorEmail)
 */
async function runPipeline(ctx) {
  const { inquiryType, docRef, vars, visitorEmail } = ctx;
  const replyTo = ctx.replyTo || visitorEmail;
  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) {
    console.error('[runPipeline] RESEND_API_KEY secret is not set');
    await docRef.update({
      emailStatus: {
        adminSent: false, adminSentAt: null, adminError: 'RESEND_API_KEY not configured',
        visitorSent: false, visitorSentAt: null, visitorError: 'RESEND_API_KEY not configured'
      }
    });
    return;
  }
  const resend = new Resend(apiKey);

  const adminTemplate = await loadTemplate(`${inquiryType}_admin`);
  const visitorTemplate = await loadTemplate(`${inquiryType}_visitor`);

  const status = {
    adminSent: false, adminSentAt: null, adminError: null, adminMessageId: null,
    visitorSent: false, visitorSentAt: null, visitorError: null, visitorMessageId: null
  };

  // ---- Admin notification ----
  if (adminTemplate) {
    try {
      const id = await sendEmail(resend, {
        to: BRAND.adminTo,
        subject: render(adminTemplate.subject, vars),
        html: render(adminTemplate.bodyHtml, vars),
        replyTo,
        bcc: BRAND.adminBcc
      });
      status.adminSent = true;
      status.adminSentAt = FieldValue.serverTimestamp();
      status.adminMessageId = id;
    } catch (err) {
      status.adminError = err && err.message ? err.message : String(err);
      console.error('[runPipeline] admin send failed', inquiryType, status.adminError);
    }
  } else {
    status.adminError = 'admin template disabled';
  }

  // ---- Visitor auto-reply ----
  if (visitorTemplate && visitorEmail) {
    try {
      const id = await sendEmail(resend, {
        to: visitorEmail,
        subject: render(visitorTemplate.subject, vars),
        html: render(visitorTemplate.bodyHtml, vars),
        replyTo: BRAND.fromEmail
      });
      status.visitorSent = true;
      status.visitorSentAt = FieldValue.serverTimestamp();
      status.visitorMessageId = id;
    } catch (err) {
      status.visitorError = err && err.message ? err.message : String(err);
      console.error('[runPipeline] visitor send failed', inquiryType, status.visitorError);
    }
  } else if (!visitorTemplate) {
    status.visitorError = 'visitor template disabled';
  }

  await docRef.update({ emailStatus: status });
}

// ============================================================
//  CONTACT INQUIRY
// ============================================================
exports.onContactInquiryCreate = onDocumentCreated(
  { document: 'contactInquiries/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() || {};

    const listingContextHtml = data.listingAddress
      ? `<p style="padding:12px 16px;background:#faf8f4;border-left:3px solid #a8854c;"><strong>Inquiring about:</strong> ${escapeHtml(data.listingAddress)}${data.listingId ? ` <span style="color:#7a7e84;">(ID: ${escapeHtml(data.listingId)})</span>` : ''}</p>`
      : '';

    const vars = {
      name: data.name || '',
      firstName: firstName(data.name),
      email: data.email || '',
      phone: nullToDash(data.phone),
      subject: data.subject || 'General inquiry',
      message: data.message || '',
      messageHtml: htmlNewlines(data.message),
      listingId: data.listingId || '',
      listingAddress: data.listingAddress || '',
      listingContextHtml
    };

    await runPipeline({
      inquiryType: 'contactInquiry',
      docRef: snap.ref,
      vars,
      visitorEmail: data.email
    });
  }
);

// ============================================================
//  WISH LIST
// ============================================================
exports.onWishListSubmissionCreate = onDocumentCreated(
  { document: 'wishListSubmissions/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() || {};

    const vars = {
      name: data.name || '',
      firstName: firstName(data.name),
      email: data.email || '',
      phone: nullToDash(data.phone),
      neighborhoods: data.neighborhoods || [],
      mustHaves: data.mustHaves || [],
      niceToHaves: data.niceToHaves || [],
      bedsMin: data.bedsMin != null ? String(data.bedsMin) : 'Any',
      bathsMin: data.bathsMin != null ? String(data.bathsMin) : 'Any',
      budgetRange: fmt.formatPriceRange(data.budgetMin, data.budgetMax),
      timeline: data.timeline || '',
      timelineLabel: fmt.formatTimeline(data.timeline),
      householdSize: nullToDash(data.householdSize),
      kidsAtHome: yesNo(data.kidsAtHome),
      petsAtHome: yesNo(data.petsAtHome),
      schoolDistrict: nullToDash(data.schoolDistrict),
      notes: data.notes || '',
      notesHtml: htmlNewlines(data.notes)
    };

    await runPipeline({
      inquiryType: 'wishList',
      docRef: snap.ref,
      vars,
      visitorEmail: data.email
    });
  }
);

// ============================================================
//  HOME VALUATION
// ============================================================
exports.onHomeValuationLeadCreate = onDocumentCreated(
  { document: 'homeValuationLeads/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() || {};

    const vars = {
      name: data.name || '',
      firstName: firstName(data.name),
      email: data.email || '',
      phone: nullToDash(data.phone),
      address: data.address || {},
      addressFormatted: fmt.formatAddress(data.address),
      beds: nullToDash(data.beds),
      baths: nullToDash(data.baths),
      sqft: data.sqft != null ? Number(data.sqft).toLocaleString('en-US') : 'Not provided',
      yearBuilt: nullToDash(data.yearBuilt),
      condition: data.condition || '',
      conditionLabel: fmt.formatCondition(data.condition),
      timeline: data.timeline || '',
      timelineLabel: fmt.formatTimeline(data.timeline),
      notes: data.notes || '',
      notesHtml: htmlNewlines(data.notes)
    };

    await runPipeline({
      inquiryType: 'homeValuation',
      docRef: snap.ref,
      vars,
      visitorEmail: data.email
    });
  }
);

// ============================================================
//  OPEN HOUSE RSVP
// ============================================================
exports.onOpenHouseRSVPCreate = onDocumentCreated(
  { document: 'openHouseRSVPs/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() || {};

    const vars = {
      name: data.name || '',
      firstName: firstName(data.name),
      email: data.email || '',
      phone: nullToDash(data.phone),
      listingId: data.listingId || '',
      listingAddress: data.listingAddress || '',
      openHouseDate: data.openHouseDate || '',
      openHouseTime: data.openHouseTime || '',
      guests: data.guests != null ? String(data.guests) : '1',
      workingWithAgent: yesNo(data.workingWithAgent),
      workingWithAgentLabel: yesNo(data.workingWithAgent),
      preApproved: yesNo(data.preApproved),
      preApprovedLabel: yesNo(data.preApproved),
      notes: data.notes || '',
      notesHtml: htmlNewlines(data.notes)
    };

    await runPipeline({
      inquiryType: 'openHouseRSVP',
      docRef: snap.ref,
      vars,
      visitorEmail: data.email
    });
  }
);

// ============================================================
//  GUIDE DOWNLOAD
// ============================================================
const GUIDE_URLS = {
  // Phase D ships HTML guides instead of PDFs — the printable HTML pages are
  // hosted alongside the rest of the site, so visitors can read in-browser or
  // Save-as-PDF themselves. Marie can swap in true PDFs later by updating
  // these URLs and uploading PDF files to assets/guides/.
  //
  // STAGE serves these from /STAGE/assets/guides/ — once we copy to live,
  // these absolute URLs (root path) will resolve correctly.
  buyer: 'https://marieborders.com/assets/guides/marin-buyers-guide.html',
  seller: 'https://marieborders.com/assets/guides/marin-sellers-guide.html'
};
const GUIDE_LABELS = {
  buyer: "Marin Buyer's Guide",
  seller: "Marin Seller's Guide"
};

exports.onGuideDownloadCreate = onDocumentCreated(
  { document: 'guideDownloads/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() || {};

    const guide = data.guide || 'buyer';
    const vars = {
      name: data.name || '',
      firstName: firstName(data.name),
      email: data.email || '',
      phone: nullToDash(data.phone),
      guide,
      guideLabel: GUIDE_LABELS[guide] || 'Guide',
      guideUrl: GUIDE_URLS[guide] || '#',
      marketingOptIn: yesNo(data.marketingOptIn),
      marketingOptInLabel: yesNo(data.marketingOptIn)
    };

    await runPipeline({
      inquiryType: 'guideDownload',
      docRef: snap.ref,
      vars,
      visitorEmail: data.email
    });
  }
);
