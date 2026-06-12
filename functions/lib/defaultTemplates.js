/**
 * Default email template bodies — used by the CMS to seed Firestore on
 * first load, and by the CF as a fallback if a template document is
 * missing or empty.
 *
 * 10 templates total: 5 inquiry types × 2 audiences (admin notification +
 * visitor auto-reply).
 *
 * Template IDs follow the convention `<inquiryType>_<audience>`:
 *   contactInquiry_admin / contactInquiry_visitor
 *   wishList_admin       / wishList_visitor
 *   homeValuation_admin  / homeValuation_visitor
 *   openHouseRSVP_admin  / openHouseRSVP_visitor
 *   guideDownload_admin  / guideDownload_visitor
 *
 * Variables available per template are documented in templateMeta below
 * (also rendered in the CMS as a sidebar reference).
 *
 * The HTML is intentionally minimal — no inline CSS gymnastics. Resend
 * delivers it to whatever client; we let the client style. Marie can
 * fancy it up in the CMS editor with whatever HTML she wants.
 */

'use strict';

const BRAND_FOOTER = `
<p style="margin-top:32px;padding-top:16px;border-top:1px solid #e8e2d4;font-size:13px;color:#7a7e84;">
  Marie Borders &middot; Marin County Real Estate<br>
  DRE #01256719 &middot; Marin's Finest<br>
  <a href="mailto:marie@marinsfinest.com">marie@marinsfinest.com</a> &middot;
  <a href="tel:+14156011715">(415) 601-1715</a>
</p>`;

// ---- CONTACT INQUIRY ----

const contactInquiry_admin = {
  enabled: true,
  subject: 'New inquiry from {{name}} via marieborders.com',
  bodyHtml: `<p>You have a new message from the website contact form.</p>
<p>
  <strong>Name:</strong> {{name}}<br>
  <strong>Email:</strong> {{email}}<br>
  <strong>Phone:</strong> {{phone}}<br>
  <strong>Subject:</strong> {{subject}}
</p>
{{listingContextHtml|raw}}
<p><strong>Message:</strong></p>
<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #a8854c;background:#faf8f4;">
  {{messageHtml|raw}}
</blockquote>
<p style="margin-top:24px;">Reply directly to this email to respond to {{name}}.</p>` + BRAND_FOOTER
};

const contactInquiry_visitor = {
  enabled: true,
  subject: 'Thank you for reaching out — Marie Borders',
  bodyHtml: `<p>Hi {{firstName}},</p>
<p>Thank you for your message. I've received your note and will be in touch within one business day — often much sooner.</p>
<p>If your question is time-sensitive, please feel free to call or text me directly at <a href="tel:+14156011715">(415) 601-1715</a>.</p>
<p>Warmly,<br>Marie Borders</p>` + BRAND_FOOTER
};

// ---- WISH LIST ----

const wishList_admin = {
  enabled: true,
  subject: 'New Marin wish list from {{name}}',
  bodyHtml: `<p>{{name}} just shared a wish list through marieborders.com. Highlights below — full details in the CMS.</p>
<p>
  <strong>Contact:</strong> {{email}} &middot; {{phone}}<br>
  <strong>Timeline:</strong> {{timelineLabel}}<br>
  <strong>Budget:</strong> {{budgetRange}}<br>
  <strong>Beds/Baths (min):</strong> {{bedsMin}} bed / {{bathsMin}} bath
</p>
<p><strong>Neighborhoods:</strong><br>{{list:neighborhoods}}</p>
<p><strong>Must-haves:</strong></p>
{{ul:mustHaves}}
<p><strong>Nice-to-haves:</strong></p>
{{ul:niceToHaves}}
<p><strong>Notes from {{firstName}}:</strong></p>
<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #a8854c;background:#faf8f4;">
  {{notesHtml|raw}}
</blockquote>` + BRAND_FOOTER
};

const wishList_visitor = {
  enabled: true,
  subject: 'Your Marin wish list — Marie Borders',
  bodyHtml: `<p>Hi {{firstName}},</p>
<p>Thank you for sharing your Marin wish list. I'll review the details carefully and reach out personally within one business day to talk through what you're looking for.</p>
<p><strong>Here's what you shared with me:</strong></p>
<p>
  <strong>Timeline:</strong> {{timelineLabel}}<br>
  <strong>Budget:</strong> {{budgetRange}}<br>
  <strong>Neighborhoods of interest:</strong> {{list:neighborhoods}}<br>
  <strong>Beds/Baths (min):</strong> {{bedsMin}} bed / {{bathsMin}} bath
</p>
<p>If anything's missing or you'd like to adjust, just reply to this email — I read every one personally.</p>
<p>Warmly,<br>Marie Borders</p>` + BRAND_FOOTER
};

// ---- HOME VALUATION ----

const homeValuation_admin = {
  enabled: true,
  subject: 'New home valuation request from {{name}}',
  bodyHtml: `<p>{{name}} requested a home valuation through marieborders.com.</p>
<p>
  <strong>Contact:</strong> {{email}} &middot; {{phone}}<br>
  <strong>Property:</strong> {{addressFormatted}}<br>
  <strong>Beds/Baths:</strong> {{beds}} bed / {{baths}} bath<br>
  <strong>Square Feet:</strong> {{sqft}}<br>
  <strong>Year Built:</strong> {{yearBuilt}}<br>
  <strong>Condition:</strong> {{conditionLabel}}<br>
  <strong>Timeline:</strong> {{timelineLabel}}
</p>
<p><strong>Notes from {{firstName}}:</strong></p>
<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #a8854c;background:#faf8f4;">
  {{notesHtml|raw}}
</blockquote>` + BRAND_FOOTER
};

const homeValuation_visitor = {
  enabled: true,
  subject: 'Your Marin home valuation request — Marie Borders',
  bodyHtml: `<p>Hi {{firstName}},</p>
<p>Thank you for the chance to look at <strong>{{addressFormatted}}</strong>. I'll pull recent comparable sales and active listings in your neighborhood and put together a thoughtful valuation for you — not an algorithmic Zestimate.</p>
<p>You'll hear from me within one business day. If there are any unique features about the property I should know about (recent improvements, special view, lot layout), feel free to reply with details.</p>
<p>Warmly,<br>Marie Borders</p>` + BRAND_FOOTER
};

// ---- OPEN HOUSE RSVP ----

const openHouseRSVP_admin = {
  enabled: true,
  subject: 'Open House RSVP — {{listingAddress}} ({{name}})',
  bodyHtml: `<p>{{name}} RSVP'd for the open house at <strong>{{listingAddress}}</strong>.</p>
<p>
  <strong>Date:</strong> {{openHouseDate}} {{openHouseTime}}<br>
  <strong>Contact:</strong> {{email}} &middot; {{phone}}<br>
  <strong>Party of:</strong> {{guests}}<br>
  <strong>Already working with an agent:</strong> {{workingWithAgentLabel}}<br>
  <strong>Pre-approved:</strong> {{preApprovedLabel}}
</p>
<p><strong>Notes:</strong></p>
<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #a8854c;background:#faf8f4;">
  {{notesHtml|raw}}
</blockquote>` + BRAND_FOOTER
};

const openHouseRSVP_visitor = {
  enabled: true,
  subject: 'You\'re on the list — {{listingAddress}}',
  bodyHtml: `<p>Hi {{firstName}},</p>
<p>Thank you for letting me know you'll be stopping by the open house.</p>
<p>
  <strong>Property:</strong> {{listingAddress}}<br>
  <strong>Date:</strong> {{openHouseDate}}<br>
  <strong>Time:</strong> {{openHouseTime}}
</p>
<p>I'll have everything ready for your visit. If your plans change or you have a specific question about the property before you arrive, feel free to reply to this email or text me at <a href="tel:+14156011715">(415) 601-1715</a>.</p>
<p>Looking forward to meeting you.</p>
<p>Warmly,<br>Marie Borders</p>` + BRAND_FOOTER
};

// ---- GUIDE DOWNLOAD ----

const guideDownload_admin = {
  enabled: true,
  subject: 'Guide download — {{guideLabel}} ({{name}})',
  bodyHtml: `<p>{{name}} downloaded the <strong>{{guideLabel}}</strong> from marieborders.com.</p>
<p>
  <strong>Contact:</strong> {{email}} &middot; {{phone}}<br>
  <strong>Marketing opt-in:</strong> {{marketingOptInLabel}}
</p>
<p>Consider a personal follow-up in 2–3 days if no further engagement.</p>` + BRAND_FOOTER
};

const guideDownload_visitor = {
  enabled: true,
  subject: 'Your {{guideLabel}} — Marie Borders',
  bodyHtml: `<p>Hi {{firstName}},</p>
<p>Thank you for requesting <strong>{{guideLabel}}</strong>. Here's your copy:</p>
{{guideLinksHtml|raw}}
<p>I hope it's useful. If you have questions as you read through it, I'd be glad to talk anytime — just reply to this email or call me at <a href="tel:+14156011715">(415) 601-1715</a>.</p>
<p>Warmly,<br>Marie Borders</p>` + BRAND_FOOTER
};

// ---- TEMPLATE METADATA (variable reference for the CMS editor) ----

const templateMeta = {
  contactInquiry_admin: {
    label: 'Contact Inquiry — Notification to Marie',
    audience: 'admin',
    inquiryType: 'contactInquiry',
    description: 'Sent to Marie when a visitor submits the contact form.',
    variables: [
      { key: 'name', desc: 'Visitor full name' },
      { key: 'firstName', desc: 'Visitor first name' },
      { key: 'email', desc: 'Visitor email' },
      { key: 'phone', desc: 'Visitor phone (or "Not provided")' },
      { key: 'subject', desc: 'Inquiry subject category' },
      { key: 'message', desc: 'Visitor message (plain text)' },
      { key: 'messageHtml|raw', desc: 'Visitor message with line breaks preserved (HTML)' },
      { key: 'listingAddress', desc: 'Listing address (if inquiry came from a listing page)' },
      { key: 'listingContextHtml|raw', desc: 'Pre-formatted "Inquiring about…" block, empty if no listing' }
    ]
  },
  contactInquiry_visitor: {
    label: 'Contact Inquiry — Auto-Reply to Visitor',
    audience: 'visitor',
    inquiryType: 'contactInquiry',
    description: 'Sent automatically to visitors confirming Marie got their message.',
    variables: [
      { key: 'firstName', desc: 'Visitor first name' },
      { key: 'name', desc: 'Visitor full name' }
    ]
  },
  wishList_admin: {
    label: 'Marin Wish List — Notification to Marie',
    audience: 'admin',
    inquiryType: 'wishList',
    description: 'Sent to Marie with a structured summary of the wish list.',
    variables: [
      { key: 'name / firstName / email / phone', desc: 'Visitor contact info' },
      { key: 'timelineLabel', desc: 'Human-readable timeline (e.g., "Within 3 months")' },
      { key: 'budgetRange', desc: 'Formatted budget (e.g., "$1.5M – $2.5M")' },
      { key: 'bedsMin / bathsMin', desc: 'Minimum beds / baths' },
      { key: 'list:neighborhoods', desc: 'Comma-separated list of selected Marin towns' },
      { key: 'ul:mustHaves', desc: 'Must-haves rendered as bullet list' },
      { key: 'ul:niceToHaves', desc: 'Nice-to-haves rendered as bullet list' },
      { key: 'notesHtml|raw', desc: 'Visitor notes with line breaks preserved' }
    ]
  },
  wishList_visitor: {
    label: 'Marin Wish List — Auto-Reply to Visitor',
    audience: 'visitor',
    inquiryType: 'wishList',
    description: 'Sent automatically confirming the wish list was received.',
    variables: [
      { key: 'firstName / name', desc: 'Visitor name' },
      { key: 'timelineLabel / budgetRange / bedsMin / bathsMin', desc: 'Their selections, formatted' },
      { key: 'list:neighborhoods', desc: 'Selected Marin towns' }
    ]
  },
  homeValuation_admin: {
    label: 'Home Valuation Request — Notification to Marie',
    audience: 'admin',
    inquiryType: 'homeValuation',
    description: 'Sent to Marie when someone requests a home valuation.',
    variables: [
      { key: 'name / firstName / email / phone', desc: 'Visitor contact info' },
      { key: 'addressFormatted', desc: 'Property address formatted on one line' },
      { key: 'beds / baths / sqft / yearBuilt', desc: 'Property details' },
      { key: 'conditionLabel / timelineLabel', desc: 'Human-readable condition and timeline' },
      { key: 'notesHtml|raw', desc: 'Visitor notes' }
    ]
  },
  homeValuation_visitor: {
    label: 'Home Valuation Request — Auto-Reply to Visitor',
    audience: 'visitor',
    inquiryType: 'homeValuation',
    description: 'Sent automatically confirming the valuation request.',
    variables: [
      { key: 'firstName / name', desc: 'Visitor name' },
      { key: 'addressFormatted', desc: 'Property address' }
    ]
  },
  openHouseRSVP_admin: {
    label: 'Open House RSVP — Notification to Marie',
    audience: 'admin',
    inquiryType: 'openHouseRSVP',
    description: 'Sent to Marie when someone RSVPs to an open house.',
    variables: [
      { key: 'name / firstName / email / phone', desc: 'Visitor contact info' },
      { key: 'listingAddress', desc: 'Property address' },
      { key: 'openHouseDate / openHouseTime', desc: 'Event date and time window' },
      { key: 'guests', desc: 'Number of people attending' },
      { key: 'workingWithAgentLabel', desc: 'Already working with an agent? ("Yes" / "No")' },
      { key: 'preApprovedLabel', desc: 'Pre-approved for a mortgage?' },
      { key: 'notesHtml|raw', desc: 'Visitor notes' }
    ]
  },
  openHouseRSVP_visitor: {
    label: 'Open House RSVP — Auto-Reply to Visitor',
    audience: 'visitor',
    inquiryType: 'openHouseRSVP',
    description: 'Confirms the RSVP and reminds the visitor of date and time.',
    variables: [
      { key: 'firstName / name', desc: 'Visitor name' },
      { key: 'listingAddress / openHouseDate / openHouseTime', desc: 'Event details' }
    ]
  },
  guideDownload_admin: {
    label: 'Guide Download — Notification to Marie',
    audience: 'admin',
    inquiryType: 'guideDownload',
    description: 'Sent to Marie when someone downloads a guide.',
    variables: [
      { key: 'name / firstName / email / phone', desc: 'Visitor contact info' },
      { key: 'guideLabel', desc: 'Buyer\'s Guide or Seller\'s Guide' },
      { key: 'marketingOptInLabel', desc: 'Did they opt in to future emails?' }
    ]
  },
  guideDownload_visitor: {
    label: 'Guide Download — Delivery to Visitor',
    audience: 'visitor',
    inquiryType: 'guideDownload',
    description: 'Delivers the PDF link to the visitor.',
    variables: [
      { key: 'firstName / name', desc: 'Visitor name' },
      { key: 'guideLabel', desc: 'Guide name(s) requested — combined if they asked for both' },
      { key: 'guideLinksHtml | raw', desc: 'Ready-made link button(s), one per requested guide' },
      { key: 'guideUrl', desc: 'URL of the primary guide (legacy single-link fallback)' }
    ]
  }
};

const defaultTemplates = {
  contactInquiry_admin,
  contactInquiry_visitor,
  wishList_admin,
  wishList_visitor,
  homeValuation_admin,
  homeValuation_visitor,
  openHouseRSVP_admin,
  openHouseRSVP_visitor,
  guideDownload_admin,
  guideDownload_visitor
};

module.exports = { defaultTemplates, templateMeta };
