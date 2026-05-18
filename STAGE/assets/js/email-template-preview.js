/* Marie Borders — email template defaults + browser-side renderer
 *
 * Two responsibilities:
 *   1. Expose the 10 default templates so the CMS can seed the editor when
 *      a template doc doesn't yet exist in Firestore.
 *   2. Mirror the Cloud Function's {{var}} renderer so the CMS live-preview
 *      pane shows exactly what an email recipient would see.
 *
 * KEEP IN SYNC with `functions/lib/defaultTemplates.js` (default bodies +
 * variable metadata) and `functions/lib/template.js` (renderer semantics).
 *
 * Browser-only — exposes as window.MB.emailTemplates.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  // ---------- BRAND FOOTER (matches functions/lib/defaultTemplates.js) ----------
  var BRAND_FOOTER = [
    '<p style="margin-top:32px;padding-top:16px;border-top:1px solid #e8e2d4;font-size:13px;color:#7a7e84;">',
    "  Marie Borders &middot; Marin County Real Estate<br>",
    "  DRE #01256719 &middot; Marin's Finest<br>",
    '  <a href="mailto:marie@marinsfinest.com">marie@marinsfinest.com</a> &middot;',
    '  <a href="tel:+14156011715">(415) 601-1715</a>',
    '</p>'
  ].join('\n');

  // ---------- DEFAULT TEMPLATES ----------
  var defaults = {
    contactInquiry_admin: {
      enabled: true,
      subject: 'New inquiry from {{name}} via marieborders.com',
      bodyHtml:
        '<p>You have a new message from the website contact form.</p>\n' +
        '<p>\n  <strong>Name:</strong> {{name}}<br>\n  <strong>Email:</strong> {{email}}<br>\n  <strong>Phone:</strong> {{phone}}<br>\n  <strong>Subject:</strong> {{subject}}\n</p>\n' +
        '{{listingContextHtml|raw}}\n' +
        '<p><strong>Message:</strong></p>\n' +
        '<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #a8854c;background:#faf8f4;">\n  {{messageHtml|raw}}\n</blockquote>\n' +
        '<p style="margin-top:24px;">Reply directly to this email to respond to {{name}}.</p>' + BRAND_FOOTER
    },
    contactInquiry_visitor: {
      enabled: true,
      subject: 'Thank you for reaching out — Marie Borders',
      bodyHtml:
        '<p>Hi {{firstName}},</p>\n' +
        "<p>Thank you for your message. I've received your note and will be in touch within one business day — often much sooner.</p>\n" +
        '<p>If your question is time-sensitive, please feel free to call or text me directly at <a href="tel:+14156011715">(415) 601-1715</a>.</p>\n' +
        '<p>Warmly,<br>Marie Borders</p>' + BRAND_FOOTER
    },
    wishList_admin: {
      enabled: true,
      subject: 'New Marin wish list from {{name}}',
      bodyHtml:
        '<p>{{name}} just shared a wish list through marieborders.com. Highlights below — full details in the CMS.</p>\n' +
        '<p>\n  <strong>Contact:</strong> {{email}} &middot; {{phone}}<br>\n  <strong>Timeline:</strong> {{timelineLabel}}<br>\n  <strong>Budget:</strong> {{budgetRange}}<br>\n  <strong>Beds/Baths (min):</strong> {{bedsMin}} bed / {{bathsMin}} bath\n</p>\n' +
        '<p><strong>Neighborhoods:</strong><br>{{list:neighborhoods}}</p>\n' +
        '<p><strong>Must-haves:</strong></p>\n{{ul:mustHaves}}\n' +
        '<p><strong>Nice-to-haves:</strong></p>\n{{ul:niceToHaves}}\n' +
        '<p><strong>Notes from {{firstName}}:</strong></p>\n' +
        '<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #a8854c;background:#faf8f4;">\n  {{notesHtml|raw}}\n</blockquote>' + BRAND_FOOTER
    },
    wishList_visitor: {
      enabled: true,
      subject: 'Your Marin wish list — Marie Borders',
      bodyHtml:
        '<p>Hi {{firstName}},</p>\n' +
        "<p>Thank you for sharing your Marin wish list. I'll review the details carefully and reach out personally within one business day to talk through what you're looking for.</p>\n" +
        "<p><strong>Here's what you shared with me:</strong></p>\n" +
        '<p>\n  <strong>Timeline:</strong> {{timelineLabel}}<br>\n  <strong>Budget:</strong> {{budgetRange}}<br>\n  <strong>Neighborhoods of interest:</strong> {{list:neighborhoods}}<br>\n  <strong>Beds/Baths (min):</strong> {{bedsMin}} bed / {{bathsMin}} bath\n</p>\n' +
        "<p>If anything's missing or you'd like to adjust, just reply to this email — I read every one personally.</p>\n" +
        '<p>Warmly,<br>Marie Borders</p>' + BRAND_FOOTER
    },
    homeValuation_admin: {
      enabled: true,
      subject: 'New home valuation request from {{name}}',
      bodyHtml:
        '<p>{{name}} requested a home valuation through marieborders.com.</p>\n' +
        '<p>\n  <strong>Contact:</strong> {{email}} &middot; {{phone}}<br>\n  <strong>Property:</strong> {{addressFormatted}}<br>\n  <strong>Beds/Baths:</strong> {{beds}} bed / {{baths}} bath<br>\n  <strong>Square Feet:</strong> {{sqft}}<br>\n  <strong>Year Built:</strong> {{yearBuilt}}<br>\n  <strong>Condition:</strong> {{conditionLabel}}<br>\n  <strong>Timeline:</strong> {{timelineLabel}}\n</p>\n' +
        '<p><strong>Notes from {{firstName}}:</strong></p>\n' +
        '<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #a8854c;background:#faf8f4;">\n  {{notesHtml|raw}}\n</blockquote>' + BRAND_FOOTER
    },
    homeValuation_visitor: {
      enabled: true,
      subject: 'Your Marin home valuation request — Marie Borders',
      bodyHtml:
        '<p>Hi {{firstName}},</p>\n' +
        "<p>Thank you for the chance to look at <strong>{{addressFormatted}}</strong>. I'll pull recent comparable sales and active listings in your neighborhood and put together a thoughtful valuation for you — not an algorithmic Zestimate.</p>\n" +
        "<p>You'll hear from me within one business day. If there are any unique features about the property I should know about (recent improvements, special view, lot layout), feel free to reply with details.</p>\n" +
        '<p>Warmly,<br>Marie Borders</p>' + BRAND_FOOTER
    },
    openHouseRSVP_admin: {
      enabled: true,
      subject: 'Open House RSVP — {{listingAddress}} ({{name}})',
      bodyHtml:
        "<p>{{name}} RSVP'd for the open house at <strong>{{listingAddress}}</strong>.</p>\n" +
        '<p>\n  <strong>Date:</strong> {{openHouseDate}} {{openHouseTime}}<br>\n  <strong>Contact:</strong> {{email}} &middot; {{phone}}<br>\n  <strong>Party of:</strong> {{guests}}<br>\n  <strong>Already working with an agent:</strong> {{workingWithAgentLabel}}<br>\n  <strong>Pre-approved:</strong> {{preApprovedLabel}}\n</p>\n' +
        '<p><strong>Notes:</strong></p>\n' +
        '<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #a8854c;background:#faf8f4;">\n  {{notesHtml|raw}}\n</blockquote>' + BRAND_FOOTER
    },
    openHouseRSVP_visitor: {
      enabled: true,
      subject: "You're on the list — {{listingAddress}}",
      bodyHtml:
        '<p>Hi {{firstName}},</p>\n' +
        "<p>Thank you for letting me know you'll be stopping by the open house.</p>\n" +
        '<p>\n  <strong>Property:</strong> {{listingAddress}}<br>\n  <strong>Date:</strong> {{openHouseDate}}<br>\n  <strong>Time:</strong> {{openHouseTime}}\n</p>\n' +
        "<p>I'll have everything ready for your visit. If your plans change or you have a specific question about the property before you arrive, feel free to reply to this email or text me at <a href=\"tel:+14156011715\">(415) 601-1715</a>.</p>\n" +
        '<p>Looking forward to meeting you.</p>\n' +
        '<p>Warmly,<br>Marie Borders</p>' + BRAND_FOOTER
    },
    guideDownload_admin: {
      enabled: true,
      subject: 'Guide download — {{guideLabel}} ({{name}})',
      bodyHtml:
        '<p>{{name}} downloaded the <strong>{{guideLabel}}</strong> from marieborders.com.</p>\n' +
        '<p>\n  <strong>Contact:</strong> {{email}} &middot; {{phone}}<br>\n  <strong>Marketing opt-in:</strong> {{marketingOptInLabel}}\n</p>\n' +
        '<p>Consider a personal follow-up in 2–3 days if no further engagement.</p>' + BRAND_FOOTER
    },
    guideDownload_visitor: {
      enabled: true,
      subject: 'Your {{guideLabel}} — Marie Borders',
      bodyHtml:
        '<p>Hi {{firstName}},</p>\n' +
        "<p>Thank you for downloading <strong>{{guideLabel}}</strong>. Here's your copy:</p>\n" +
        '<p style="text-align:center;margin:32px 0;">\n  <a href="{{guideUrl}}" style="display:inline-block;padding:14px 28px;background:#a8854c;color:#fff;text-decoration:none;font-family:Inter,sans-serif;letter-spacing:0.1em;text-transform:uppercase;font-size:13px;">Download the Guide</a>\n</p>\n' +
        "<p>If the button doesn't work, copy and paste this link into your browser:<br>\n" +
        '<a href="{{guideUrl}}">{{guideUrl}}</a></p>\n' +
        "<p>I hope it's useful. If you have questions as you read through it, I'd be glad to talk anytime — just reply to this email or call me at <a href=\"tel:+14156011715\">(415) 601-1715</a>.</p>\n" +
        '<p>Warmly,<br>Marie Borders</p>' + BRAND_FOOTER
    }
  };

  // ---------- METADATA (label + variables for the editor sidebar) ----------
  var meta = {
    contactInquiry_admin:   { label: 'Contact Inquiry — Notification to Marie',     audience: 'admin',   inquiryType: 'contactInquiry',  description: 'Sent to Marie when a visitor submits the contact form.' },
    contactInquiry_visitor: { label: 'Contact Inquiry — Auto-Reply to Visitor',     audience: 'visitor', inquiryType: 'contactInquiry',  description: 'Sent automatically to visitors confirming Marie got their message.' },
    wishList_admin:         { label: 'Marin Wish List — Notification to Marie',    audience: 'admin',   inquiryType: 'wishList',        description: 'Sent to Marie with a structured summary of the wish list.' },
    wishList_visitor:       { label: 'Marin Wish List — Auto-Reply to Visitor',     audience: 'visitor', inquiryType: 'wishList',        description: 'Sent automatically confirming the wish list was received.' },
    homeValuation_admin:    { label: 'Home Valuation — Notification to Marie',      audience: 'admin',   inquiryType: 'homeValuation',   description: 'Sent to Marie when someone requests a home valuation.' },
    homeValuation_visitor:  { label: 'Home Valuation — Auto-Reply to Visitor',      audience: 'visitor', inquiryType: 'homeValuation',   description: 'Sent automatically confirming the valuation request.' },
    openHouseRSVP_admin:    { label: 'Open House RSVP — Notification to Marie',     audience: 'admin',   inquiryType: 'openHouseRSVP',   description: 'Sent to Marie when someone RSVPs to an open house.' },
    openHouseRSVP_visitor:  { label: 'Open House RSVP — Auto-Reply to Visitor',     audience: 'visitor', inquiryType: 'openHouseRSVP',   description: 'Confirms the RSVP and reminds the visitor of date and time.' },
    guideDownload_admin:    { label: 'Guide Download — Notification to Marie',      audience: 'admin',   inquiryType: 'guideDownload',   description: 'Sent to Marie when someone downloads a guide.' },
    guideDownload_visitor:  { label: 'Guide Download — Delivery to Visitor',        audience: 'visitor', inquiryType: 'guideDownload',   description: 'Delivers the PDF link to the visitor.' }
  };

  // Variable reference per inquiry type
  var inquiryVars = {
    contactInquiry: [
      { key: 'name',                   desc: 'Visitor full name' },
      { key: 'firstName',              desc: 'Visitor first name' },
      { key: 'email',                  desc: 'Visitor email' },
      { key: 'phone',                  desc: 'Visitor phone (or "Not provided")' },
      { key: 'subject',                desc: 'Inquiry subject category' },
      { key: 'message',                desc: 'Visitor message (plain text)' },
      { key: 'messageHtml|raw',        desc: 'Visitor message with line breaks preserved' },
      { key: 'listingAddress',         desc: 'Listing address (if inquiry came from a listing page)' },
      { key: 'listingContextHtml|raw', desc: 'Pre-formatted "Inquiring about…" block' }
    ],
    wishList: [
      { key: 'name / firstName / email / phone', desc: 'Visitor contact info' },
      { key: 'timelineLabel',                    desc: 'Human-readable timeline (e.g., "Within 3 months")' },
      { key: 'budgetRange',                      desc: 'Formatted budget (e.g., "$1.5M – $2.5M")' },
      { key: 'bedsMin / bathsMin',               desc: 'Minimum beds / baths' },
      { key: 'list:neighborhoods',               desc: 'Comma-separated list of selected Marin towns' },
      { key: 'ul:mustHaves',                     desc: 'Must-haves rendered as bullet list' },
      { key: 'ul:niceToHaves',                   desc: 'Nice-to-haves rendered as bullet list' },
      { key: 'notesHtml|raw',                    desc: 'Visitor notes with line breaks' }
    ],
    homeValuation: [
      { key: 'name / firstName / email / phone',     desc: 'Visitor contact info' },
      { key: 'addressFormatted',                     desc: 'Property address on one line' },
      { key: 'beds / baths / sqft / yearBuilt',      desc: 'Property details' },
      { key: 'conditionLabel / timelineLabel',       desc: 'Human-readable condition and timeline' },
      { key: 'notesHtml|raw',                        desc: 'Visitor notes' }
    ],
    openHouseRSVP: [
      { key: 'name / firstName / email / phone',     desc: 'Visitor contact info' },
      { key: 'listingAddress',                       desc: 'Property address' },
      { key: 'openHouseDate / openHouseTime',        desc: 'Event date and time window' },
      { key: 'guests',                               desc: 'Number of people attending' },
      { key: 'workingWithAgentLabel',                desc: 'Already working with an agent? ("Yes" / "No")' },
      { key: 'preApprovedLabel',                     desc: 'Pre-approved for a mortgage?' },
      { key: 'notesHtml|raw',                        desc: 'Visitor notes' }
    ],
    guideDownload: [
      { key: 'name / firstName / email / phone', desc: 'Visitor contact info' },
      { key: 'guideLabel',                       desc: "Buyer's Guide or Seller's Guide" },
      { key: 'guideUrl',                         desc: 'Public URL to the gated PDF' },
      { key: 'marketingOptInLabel',              desc: 'Did they opt in to future emails?' }
    ]
  };

  // Sample vars for live preview (filled-in dummy data — looks like a real email)
  var sampleVars = {
    contactInquiry: {
      name: 'Jordan Sample',
      firstName: 'Jordan',
      email: 'jordan@example.com',
      phone: '(415) 555-0142',
      subject: 'About a listing',
      message: 'Hi Marie, I would love more information about the Mill Valley Victorian. We are moving to Marin in late summer and the layout looks like exactly what we have been hoping to find.',
      messageHtml: 'Hi Marie, I would love more information about the Mill Valley Victorian.<br>We are moving to Marin in late summer and the layout looks like exactly what we have been hoping to find.',
      listingId: 'mill-valley-victorian-1923',
      listingAddress: '127 Lovell Avenue, Mill Valley',
      listingContextHtml: '<p style="padding:12px 16px;background:#faf8f4;border-left:3px solid #a8854c;"><strong>Inquiring about:</strong> 127 Lovell Avenue, Mill Valley</p>'
    },
    wishList: {
      name: 'Avery Sample',
      firstName: 'Avery',
      email: 'avery@example.com',
      phone: '(415) 555-0188',
      neighborhoods: ['Mill Valley', 'Tiburon', 'Larkspur'],
      mustHaves: ['Yard for kids', 'Walk to downtown', 'Off-street parking'],
      niceToHaves: ['Bay view', 'Detached office or ADU', 'Wood-burning fireplace'],
      bedsMin: '3',
      bathsMin: '2',
      budgetRange: '$1,800,000 – $2,400,000',
      timelineLabel: '3 to 6 months',
      notes: 'We are open to a fixer if the layout works. Schools matter — Tam Union district preferred.',
      notesHtml: 'We are open to a fixer if the layout works.<br>Schools matter — Tam Union district preferred.'
    },
    homeValuation: {
      name: 'Casey Sample',
      firstName: 'Casey',
      email: 'casey@example.com',
      phone: '(415) 555-0123',
      addressFormatted: '212 Loring Avenue, Mill Valley, CA 94941',
      beds: '4',
      baths: '2.5',
      sqft: '2,150',
      yearBuilt: '1958',
      conditionLabel: 'Good — minor updates',
      timelineLabel: '3 to 6 months',
      notes: 'We renovated the kitchen in 2022 and refinished the floors last spring.',
      notesHtml: 'We renovated the kitchen in 2022 and refinished the floors last spring.'
    },
    openHouseRSVP: {
      name: 'Riley Sample',
      firstName: 'Riley',
      email: 'riley@example.com',
      phone: '(415) 555-0167',
      listingId: 'mill-valley-victorian-1923',
      listingAddress: '127 Lovell Avenue, Mill Valley',
      openHouseDate: 'Saturday, May 24',
      openHouseTime: '1:00 PM – 4:00 PM',
      guests: '2',
      workingWithAgentLabel: 'No',
      preApprovedLabel: 'Yes',
      notes: 'Will bring my parents — they are helping with the decision.',
      notesHtml: 'Will bring my parents — they are helping with the decision.'
    },
    guideDownload: {
      name: 'Morgan Sample',
      firstName: 'Morgan',
      email: 'morgan@example.com',
      phone: '(415) 555-0199',
      guide: 'buyer',
      guideLabel: "Marin Buyer's Guide",
      guideUrl: 'https://marieborders.com/assets/guides/marin-buyers-guide.html',
      marketingOptInLabel: 'Yes'
    }
  };

  // ---------- RENDERER (mirror of functions/lib/template.js) ----------
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getNested(obj, path) {
    if (obj == null) return undefined;
    var parts = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function renderValue(raw, mode) {
    if (raw == null) return '';
    if (mode === 'raw') return String(raw);
    if (mode === 'list') {
      if (!Array.isArray(raw)) return escapeHtml(String(raw));
      return raw.filter(function (v) { return v != null && v !== ''; }).map(escapeHtml).join(', ');
    }
    if (mode === 'ul') {
      if (!Array.isArray(raw) || !raw.length) return '';
      var items = raw.filter(function (v) { return v != null && v !== ''; })
        .map(function (v) { return '<li>' + escapeHtml(String(v)) + '</li>'; }).join('');
      return '<ul>' + items + '</ul>';
    }
    return escapeHtml(String(raw));
  }

  function render(template, vars) {
    if (template == null) return '';
    return String(template).replace(/\{\{\s*([a-zA-Z]+:)?([a-zA-Z0-9_.]+)(?:\s*\|\s*(raw))?\s*\}\}/g,
      function (match, prefix, key, modifier) {
        var mode = modifier || null;
        if (prefix) mode = prefix.slice(0, -1);
        var value = getNested(vars, key);
        return renderValue(value, mode);
      });
  }

  // ---------- PUBLIC ----------
  MB.emailTemplates = {
    defaults: defaults,
    meta: meta,
    inquiryVars: inquiryVars,
    sampleVars: sampleVars,
    render: render,
    escapeHtml: escapeHtml,
    /**
     * Returns the variable reference list for a template id.
     */
    variablesFor: function (templateId) {
      var m = meta[templateId];
      if (!m) return [];
      return inquiryVars[m.inquiryType] || [];
    },
    /**
     * Returns sample vars for the template's inquiry type, suitable for the
     * live preview pane.
     */
    sampleVarsFor: function (templateId) {
      var m = meta[templateId];
      if (!m) return {};
      return sampleVars[m.inquiryType] || {};
    }
  };
})();
