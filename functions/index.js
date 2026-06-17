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
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { Resend } = require('resend');

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const ffmpegPath = require('ffmpeg-static');

const { render, renderText, stripHtml, escapeHtml } = require('./lib/template');
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
 * Write an audit row to the emailLog collection. Used by the CMS Email Log
 * tab so Marie/Daniel/Anne can see every email the site sent — admin notes,
 * visitor auto-replies, failures, skipped — without needing inbox access.
 *
 * Per feedback_email-log-sentat: the `sentAt` field name is canonical and
 * the CMS query orders by it. Don't rename.
 */
async function logEmail(entry) {
  try {
    const bodyHtml = entry.bodyHtml || '';
    // Firestore doc limit is 1MB; cap body to keep logs small.
    const cappedBody = bodyHtml.length > 200000 ? bodyHtml.slice(0, 200000) + '…[truncated]' : bodyHtml;
    await db.collection('emailLog').add({
      inquiryType: entry.inquiryType,
      inquiryId: entry.inquiryId || null,
      audience: entry.audience,              // 'admin' | 'visitor'
      recipient: entry.recipient || null,
      bcc: entry.bcc || null,
      replyTo: entry.replyTo || null,
      subject: entry.subject || '',
      bodyHtml: cappedBody,
      status: entry.status,                  // 'sent' | 'failed' | 'skipped'
      messageId: entry.messageId || null,
      error: entry.error || null,
      visitorName: entry.visitorName || null,
      visitorEmail: entry.visitorEmail || null,
      sentAt: FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.warn('[logEmail] failed to write log entry:', err && err.message);
  }
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

  const visitorName = vars.name || null;
  const visitorEmailForLog = vars.email || visitorEmail || null;
  const inquiryId = docRef.id;

  // ---- Admin notification ----
  if (adminTemplate) {
    const subject = renderText(adminTemplate.subject, vars);
    const html = render(adminTemplate.bodyHtml, vars);
    try {
      const id = await sendEmail(resend, {
        to: BRAND.adminTo,
        subject, html, replyTo,
        bcc: BRAND.adminBcc
      });
      status.adminSent = true;
      status.adminSentAt = FieldValue.serverTimestamp();
      status.adminMessageId = id;
      await logEmail({
        inquiryType, inquiryId, audience: 'admin',
        recipient: BRAND.adminTo, bcc: BRAND.adminBcc, replyTo,
        subject, bodyHtml: html,
        status: 'sent', messageId: id,
        visitorName, visitorEmail: visitorEmailForLog
      });
    } catch (err) {
      status.adminError = err && err.message ? err.message : String(err);
      console.error('[runPipeline] admin send failed', inquiryType, status.adminError);
      await logEmail({
        inquiryType, inquiryId, audience: 'admin',
        recipient: BRAND.adminTo, bcc: BRAND.adminBcc, replyTo,
        subject, bodyHtml: html,
        status: 'failed', error: status.adminError,
        visitorName, visitorEmail: visitorEmailForLog
      });
    }
  } else {
    status.adminError = 'admin template disabled';
    await logEmail({
      inquiryType, inquiryId, audience: 'admin',
      recipient: BRAND.adminTo,
      subject: '', bodyHtml: '',
      status: 'skipped', error: 'admin template disabled',
      visitorName, visitorEmail: visitorEmailForLog
    });
  }

  // ---- Visitor auto-reply ----
  if (visitorTemplate && visitorEmail) {
    const subject = renderText(visitorTemplate.subject, vars);
    const html = render(visitorTemplate.bodyHtml, vars);
    try {
      const id = await sendEmail(resend, {
        to: visitorEmail,
        subject, html,
        replyTo: BRAND.fromEmail
      });
      status.visitorSent = true;
      status.visitorSentAt = FieldValue.serverTimestamp();
      status.visitorMessageId = id;
      await logEmail({
        inquiryType, inquiryId, audience: 'visitor',
        recipient: visitorEmail, replyTo: BRAND.fromEmail,
        subject, bodyHtml: html,
        status: 'sent', messageId: id,
        visitorName, visitorEmail: visitorEmailForLog
      });
    } catch (err) {
      status.visitorError = err && err.message ? err.message : String(err);
      console.error('[runPipeline] visitor send failed', inquiryType, status.visitorError);
      await logEmail({
        inquiryType, inquiryId, audience: 'visitor',
        recipient: visitorEmail, replyTo: BRAND.fromEmail,
        subject, bodyHtml: html,
        status: 'failed', error: status.visitorError,
        visitorName, visitorEmail: visitorEmailForLog
      });
    }
  } else if (!visitorTemplate) {
    status.visitorError = 'visitor template disabled';
    await logEmail({
      inquiryType, inquiryId, audience: 'visitor',
      recipient: visitorEmail || null,
      subject: '', bodyHtml: '',
      status: 'skipped', error: 'visitor template disabled',
      visitorName, visitorEmail: visitorEmailForLog
    });
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
  // TODO before STAGE→live cutover: drop the "/STAGE" path segment from both
  // URLs. Until then the guides only exist at the STAGE location.
  buyer:  'https://marieborders.com/STAGE/assets/guides/marin-buyers-guide.html',
  seller: 'https://marieborders.com/STAGE/assets/guides/marin-sellers-guide.html'
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

    // Requested guides — `guides` is the full set the visitor asked for (the
    // one they clicked + optionally the other via the "want both?" checkbox).
    // Fall back to the single `guide` for older docs. Filter to known guides,
    // dedupe, preserve order.
    const requested = (Array.isArray(data.guides) && data.guides.length
      ? data.guides
      : [data.guide || 'buyer']).filter((g) => GUIDE_URLS[g]);
    const guides = [...new Set(requested)];
    if (!guides.length) guides.push('buyer');
    const primary = guides[0];

    const labels = guides.map((g) => GUIDE_LABELS[g] || 'Guide');
    const guideLabel = labels.length > 1
      ? labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1]
      : labels[0];

    // One styled button + paste-link per requested guide. Injected raw.
    const guideLinksHtml = guides.map((g) =>
      `<p style="text-align:center;margin:24px 0 4px;">`
      + `<a href="${GUIDE_URLS[g]}" style="display:inline-block;padding:14px 28px;background:#a8854c;color:#fff;text-decoration:none;font-family:Inter,sans-serif;letter-spacing:0.1em;text-transform:uppercase;font-size:13px;">Open the ${GUIDE_LABELS[g]}</a>`
      + `</p>`
      + `<p style="text-align:center;font-size:13px;margin:0 0 18px;color:#7a7e84;">or paste into your browser:<br><a href="${GUIDE_URLS[g]}">${GUIDE_URLS[g]}</a></p>`
    ).join('');

    const vars = {
      name: data.name || '',
      firstName: firstName(data.name),
      email: data.email || '',
      phone: nullToDash(data.phone),
      guide: primary,
      guideLabel,
      guideUrl: GUIDE_URLS[primary] || '#',
      guideLinksHtml,
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

// ============================================================
//  LISTING VIDEO AUTO-COMPRESS
// ============================================================
//
// The CMS uploads a raw MP4/MOV/WebM to `listing-video-raw/{scopeId}/{jobId}.{ext}`
// (with custom metadata jobId + scopeId) and writes a `videoJobs/{jobId}` doc
// with status:'processing'. This function:
//   1. transcodes to a web-friendly VP9/WebM (720p, two-pass, libopus audio),
//   2. guarantees the output stays under the site's 10 MB cap (stepping down
//      resolution / bitrate as needed),
//   3. uploads the result to `listing-photos/{scopeId}/video-{uuid}.webm`,
//   4. deletes the raw original,
//   5. reports back on the job doc (status:'done' with url+storagePath, or
//      status:'error' with a message).
//
// Only objects under `listing-video-raw/` are processed — everything else
// returns immediately (including our own `listing-photos/` output, so there's
// no retrigger loop). Idempotent: a job already marked 'done' is skipped.

const VIDEO_RAW_PREFIX = 'listing-video-raw/';
const VIDEO_SIZE_CAP = 10 * 1024 * 1024; // 10,485,760 bytes — hard ceiling

// Two-pass file size is governed by BITRATE, not resolution. So instead of a
// slow resolution-stepping ladder, derive the bitrate from the clip's actual
// duration to land under the cap in a SINGLE encode. Target ~9 MB for margin.
const VIDEO_TARGET_BYTES = 9.0 * 1024 * 1024;
const AUDIO_BITRATE_K = 96;

// Read duration (seconds) from the ffmpeg binary's stderr (ffmpeg-static ships
// no ffprobe). `ffmpeg -i <file>` with no output exits non-zero but prints
// "Duration: HH:MM:SS.ss" to stderr.
function getVideoDurationSec(inputPath) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-hide_banner', '-i', inputPath], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', () => resolve(0));
    proc.on('close', () => {
      const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      resolve(m ? (parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseFloat(m[3])) : 0);
    });
  });
}

// Pick bitrate (to hit the byte budget for this duration) and resolution
// (720p only when we can afford ~450k+, else 540p — fewer pixels look better
// when bits are scarce, e.g. a long tour).
function computeEncodeParams(durationSec) {
  const dur = durationSec > 0 ? durationSec : 150;
  const totalKbps = (VIDEO_TARGET_BYTES * 8) / dur / 1000;
  let vbr = Math.floor(totalKbps - AUDIO_BITRATE_K);
  vbr = Math.max(180, Math.min(vbr, 1500));
  return { scaleHeight: vbr >= 450 ? 720 : 540, videoBitrate: vbr + 'k' };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => {
      // Keep only the tail — ffmpeg is chatty and stderr can be large.
      stderr = (stderr + d.toString()).slice(-4000);
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('ffmpeg exited with code ' + code + (stderr ? ': ' + stderr.trim() : '')));
    });
  });
}

/**
 * Two-pass VP9/WebM transcode. Pass 1 analyses (discards output to null,
 * audio dropped); pass 2 writes the real file. Both share a passlogfile.
 */
async function transcodeToWebm(inputPath, outputPath, passLogPrefix, opts) {
  const { scaleHeight, videoBitrate } = opts;
  const vf = 'scale=-2:' + scaleHeight;
  const common = [
    '-hide_banner', '-y',
    '-i', inputPath,
    '-c:v', 'libvpx-vp9',
    '-b:v', videoBitrate,
    '-vf', vf,
    '-row-mt', '1',
    '-tile-columns', '3',
    '-threads', '8',
    '-deadline', 'good',
    '-cpu-used', '4',
    '-passlogfile', passLogPrefix
  ];

  // Pass 1 — analyse only, no audio, discard output.
  await runFfmpeg([
    ...common,
    '-pass', '1',
    '-an',
    '-f', 'null',
    os.platform() === 'win32' ? 'NUL' : '/dev/null'
  ]);

  // Pass 2 — real encode with Opus audio.
  await runFfmpeg([
    ...common,
    '-pass', '2',
    '-c:a', 'libopus',
    '-b:a', '96k',
    '-f', 'webm',
    outputPath
  ]);
}

exports.onListingVideoUploaded = onObjectFinalized(
  // Must match the Storage bucket's region (us-west1) — a Storage-triggered
  // function cannot listen to a bucket in a different region. (The existing
  // Firestore triggers stay in us-central1; that constraint is Storage-only.)
  // 8 vCPU + cpu-used 4 + 8-way tiling so libvpx VP9 (inherently slow) finishes
  // a ~3-min tour in ~1.5-2.5 min, well inside the 540s timeout. 1 vCPU/cpu-used 1
  // was 5-6+ min and timed out. Cost is still negligible at ~2 transcodes/month.
  { memory: '8GiB', cpu: 8, timeoutSeconds: 540, region: 'us-west1' },
  async (event) => {
    const object = event.data;
    const name = object && object.name;

    // Guard: only raw listing-video uploads. Ignore everything else (incl. our
    // own compressed output) so we never retrigger ourselves.
    if (!name || !name.startsWith(VIDEO_RAW_PREFIX)) return;

    // Resolve jobId / scopeId — prefer custom metadata, fall back to the path
    // (listing-video-raw/{scopeId}/{jobId}.{ext}).
    const meta = (object.metadata && object.metadata) || {};
    const rel = name.slice(VIDEO_RAW_PREFIX.length);          // {scopeId}/{jobId}.{ext}
    const firstSlash = rel.indexOf('/');
    const pathScopeId = firstSlash >= 0 ? rel.slice(0, firstSlash) : '';
    const fileName = firstSlash >= 0 ? rel.slice(firstSlash + 1) : rel;
    const pathJobId = fileName.replace(/\.[^.]+$/, '');

    const scopeId = meta.scopeId || pathScopeId;
    const jobId = meta.jobId || pathJobId;

    const bucket = getStorage().bucket(object.bucket);
    const rawFile = bucket.file(name);
    const jobRef = jobId ? db.collection('videoJobs').doc(jobId) : null;

    if (!jobRef) {
      console.error('[onListingVideoUploaded] could not resolve jobId for', name);
      await rawFile.delete({ ignoreNotFound: true }).catch(() => {});
      return;
    }

    // Idempotency: a re-fire on the same object no-ops if already done.
    try {
      const jobSnap = await jobRef.get();
      if (jobSnap.exists && jobSnap.data() && jobSnap.data().status === 'done') {
        console.log('[onListingVideoUploaded] job already done, skipping', jobId);
        return;
      }
    } catch (err) {
      console.warn('[onListingVideoUploaded] job read failed', jobId, err && err.message);
    }

    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'lvid-'));
    const inputPath = path.join(tmpDir, 'input');
    const outputPath = path.join(tmpDir, 'output.webm');
    const passLogPrefix = path.join(tmpDir, 'ffpass');

    async function cleanupTmp() {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }

    try {
      // 1. Download the raw original.
      await rawFile.download({ destination: inputPath });

      // 2. One encode at a duration-derived bitrate. Verify, and only if the
      //    estimate overshot (rare) shave 20% and retry once.
      const durationSec = await getVideoDurationSec(inputPath);
      let params = computeEncodeParams(durationSec);
      console.log('[onListingVideoUploaded] duration ' + Math.round(durationSec) + 's -> ' + params.scaleHeight + 'p/' + params.videoBitrate);
      await transcodeToWebm(inputPath, outputPath, passLogPrefix, params);
      let chosenSize = (await fsp.stat(outputPath)).size;
      if (chosenSize >= VIDEO_SIZE_CAP) {
        const fbVbr = Math.max(150, Math.floor(parseInt(params.videoBitrate, 10) * 0.8));
        console.warn('[onListingVideoUploaded] ' + chosenSize + ' bytes over cap at ' + params.videoBitrate + ', retrying once at 540p/' + fbVbr + 'k');
        params = { scaleHeight: 540, videoBitrate: fbVbr + 'k' };
        await transcodeToWebm(inputPath, outputPath, passLogPrefix, params);
        chosenSize = (await fsp.stat(outputPath)).size;
      }
      if (chosenSize >= VIDEO_SIZE_CAP) {
        throw new Error('Could not compress under 10 MB. Please trim the video and try again.');
      }

      // 3. Upload the compressed result. Mint a Firebase download token so the
      //    public URL matches what the CMS client's getDownloadURL() produces.
      const outId = crypto.randomUUID();
      const destPath = 'listing-photos/' + scopeId + '/video-' + outId + '.webm';
      const token = crypto.randomUUID();
      await bucket.upload(outputPath, {
        destination: destPath,
        metadata: {
          contentType: 'video/webm',
          metadata: { firebaseStorageDownloadTokens: token }
        }
      });

      const url =
        'https://firebasestorage.googleapis.com/v0/b/' + bucket.name +
        '/o/' + encodeURIComponent(destPath) +
        '?alt=media&token=' + token;

      // 4. Delete the raw original.
      await rawFile.delete({ ignoreNotFound: true }).catch((e) => {
        console.warn('[onListingVideoUploaded] raw delete failed', e && e.message);
      });

      // 5. Report success.
      await jobRef.set({
        status: 'done',
        url,
        storagePath: destPath,
        finishedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('[onListingVideoUploaded] done', jobId, chosenSize, 'bytes ->', destPath);
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      console.error('[onListingVideoUploaded] failed', jobId, message);
      // On any failure: still delete the raw original and mark the job errored.
      await rawFile.delete({ ignoreNotFound: true }).catch(() => {});
      try {
        await jobRef.set({ status: 'error', message }, { merge: true });
      } catch (e) {
        console.error('[onListingVideoUploaded] could not write error status', e && e.message);
      }
    } finally {
      await cleanupTmp();
    }
  }
);
