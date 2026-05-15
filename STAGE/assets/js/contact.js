/* Marie Borders — contact form handler (Phase 3)
 *
 * DELIVERY: mailto: composition (v1 decision — skip Formspree/Resend for now).
 *
 *   Primary recipient: mariebordershometeam@gmail.com  (Anne, team coordinator)
 *   CC:                marie@marinsfinest.com
 *
 * --- mailto LIMITATIONS / CAVEATS ----------------------------------------
 *   1. Requires a configured mail handler on the visitor's device/browser.
 *      Desktop: macOS Mail / Outlook / Thunderbird must be set as default;
 *      Windows: same. Most users have *something* configured.
 *   2. Some mobile users (especially those who only use Gmail web with NO
 *      default mail handler) will see literally nothing happen. We render a
 *      fallback clickable mailto with no params after submit, which covers
 *      most of these cases — they can copy the address and email manually.
 *   3. The email is sent FROM the visitor's address, not via a server
 *      relay. That means Marie's inbox sees the real sender (good), but
 *      we can't audit/log inbound messages server-side (acceptable for v1).
 *   4. mailto body parameters have practical length limits (~2000 chars in
 *      some clients). Our subject + body together stay well under this.
 *   5. encodeURIComponent does NOT escape apostrophes — for the mailto body
 *      that's harmless (RFC 6068 allows ' verbatim). Memo feedback_attr-js-arg
 *      flags apostrophes only matter when injecting into a JS string literal
 *      inside an HTML attribute — N/A here.
 *
 * PHASE 3.5 CANDIDATE: revisit with a Cloud Function (Resend or SendGrid)
 *   if mailto friction becomes a measurable drop-off. Needs Blaze.
 * -------------------------------------------------------------------------
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  var DELIVERY_TO  = 'mariebordershometeam@gmail.com';
  var DELIVERY_CC  = 'marie@marinsfinest.com';
  var FALLBACK_TO  = 'marie@marinsfinest.com';

  /**
   * Build a mailto: URL from a payload.
   * payload: { name, email, phone, subject, message, listingId?, listingAddress? }
   */
  function buildMailto(payload) {
    var subjectPrefix = '[marieborders.com] ';
    var subject = subjectPrefix
      + (payload.subject || 'Inquiry')
      + (payload.name ? ' — ' + payload.name : '');

    var bodyLines = [];
    if (payload.name)    bodyLines.push('Name: '    + payload.name);
    if (payload.email)   bodyLines.push('Email: '   + payload.email);
    if (payload.phone)   bodyLines.push('Phone: '   + payload.phone);
    if (payload.subject) bodyLines.push('Subject: ' + payload.subject);

    if (payload.listingAddress) {
      bodyLines.push('');
      bodyLines.push('Regarding listing: ' + payload.listingAddress);
      if (payload.listingId) {
        bodyLines.push('Listing ID: ' + payload.listingId);
      }
    }

    bodyLines.push('');
    bodyLines.push('Message:');
    bodyLines.push(payload.message || '');

    var body = bodyLines.join('\r\n');

    var url = 'mailto:' + encodeURIComponent(DELIVERY_TO)
      + '?cc='      + encodeURIComponent(DELIVERY_CC)
      + '&subject=' + encodeURIComponent(subject)
      + '&body='    + encodeURIComponent(body);
    return url;
  }

  /**
   * Open the visitor's mail client with a pre-composed draft.
   *
   * We use a transient <a> click rather than `window.location.href = ...`
   * because the latter, on iOS Safari and a couple of corporate-locked
   * Windows installs, has been observed to leave the user on a blank
   * about:blank page if no handler intercepts. Anchor-click stays on the
   * current page across every browser tested.
   */
  function openMailDraft(url) {
    var a = document.createElement('a');
    a.href = url;
    // Some browsers respect target=_self for mailto; others ignore it.
    // Either way, the user stays on the contact page.
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); }, 0);
  }

  /**
   * sendContact(payload) -> Promise resolving when the mail draft has been opened.
   * Always resolves — there is no way to know server-side whether the user
   * actually sent the message.
   */
  MB.sendContact = function (payload) {
    return new Promise(function (resolve) {
      var url = buildMailto(payload);
      openMailDraft(url);
      // Resolve immediately — no simulated delay (the user perceives this
      // as instantaneous because their mail client is now opening).
      resolve({ ok: true, url: url });
    });
  };

  function bindContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var successBox = document.getElementById('contact-success');
    var errorBox = document.getElementById('contact-error');
    var submitBtn = form.querySelector('button[type="submit"]');

    // Pre-fill hidden fields from query string (?listing=<id>&address=<encoded>)
    var listingId = MB.util.getQueryParam('listing');
    var listingAddress = MB.util.getQueryParam('address');
    if (listingId) form.elements['listingId'].value = listingId;
    if (listingAddress) form.elements['listingAddress'].value = listingAddress;

    var banner = document.getElementById('listing-context');
    if (banner && listingAddress) {
      banner.innerHTML = 'Inquiring about <strong>' + MB.util.escapeHtml(listingAddress) + '</strong>';
      banner.style.display = 'block';
      if (form.elements['subject']) form.elements['subject'].value = 'About a listing';
      if (form.elements['message'] && !form.elements['message'].value) {
        form.elements['message'].value = 'Hi Marie, I would like more information about ' + listingAddress + '.';
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorBox.style.display = 'none';
      errorBox.textContent = '';

      var data = {
        name:    (form.elements['name'].value || '').trim(),
        email:   (form.elements['email'].value || '').trim(),
        phone:   (form.elements['phone'].value || '').trim(),
        subject: (form.elements['subject'].value || '').trim(),
        message: (form.elements['message'].value || '').trim(),
        listingId:      (form.elements['listingId'].value || '').trim() || null,
        listingAddress: (form.elements['listingAddress'].value || '').trim() || null
      };

      if (!data.name) return showError('Please enter your name.');
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return showError('Please enter a valid email address.');
      }
      if (!data.message) return showError('Please include a brief message.');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Opening…';

      MB.sendContact(data).then(function () {
        // Swap the success message to set the right expectation for mailto.
        if (successBox) {
          successBox.innerHTML = ''
            + '<h2 style="margin-bottom:0.5rem;">Almost There</h2>'
            + '<p>Your email client should be opening with a draft. If nothing happens, please email Marie directly at <a href="mailto:' + FALLBACK_TO + '">' + FALLBACK_TO + '</a>.</p>';
        }
        form.style.display = 'none';
        if (successBox) {
          successBox.style.display = 'block';
          successBox.focus();
          window.scrollTo({
            top: successBox.getBoundingClientRect().top + window.scrollY - 100,
            behavior: 'smooth'
          });
        }
      }).catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
        showError('Something went wrong. Please email Marie directly at ' + FALLBACK_TO + '.');
      });

      function showError(msg) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindContactForm);
  } else {
    bindContactForm();
  }
})();
