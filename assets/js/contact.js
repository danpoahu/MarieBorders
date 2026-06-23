/* Marie Borders — contact form handler (Phase A — Resend pipeline)
 *
 * Replaces the v1 mailto: composition with a Firestore write to
 * `contactInquiries`. The `onContactInquiryCreate` Cloud Function picks
 * it up and sends two emails via Resend:
 *
 *   - Admin notification to Marie's team
 *   - Auto-reply confirmation to the visitor
 *
 * Why this is better than mailto:
 *   1. Works on every device — no dependency on a configured mail client.
 *      Visitors on web-only Gmail / mobile see real success, not nothing.
 *   2. We get a server-side audit trail (every submission is in Firestore).
 *   3. The visitor gets an automatic acknowledgement, not silence.
 *   4. Marie's reply lands in the same email thread because the admin email
 *      is sent with Reply-To set to the visitor's address.
 *
 * Failure handling:
 *   If Firestore is unreachable (offline, CF outage, etc.), we surface a
 *   clear error AND offer the direct email + phone fallback. We do NOT
 *   silently retry-to-mailto — that would reintroduce the "nothing happens
 *   on no-mail-client" failure mode.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  var FALLBACK_EMAIL = 'marie@marinsfinest.com';
  var FALLBACK_PHONE = '(415) 601-1715';

  function whenFirebaseReady(cb) {
    if (window.MB.firebase && window.MB.firebase.db) { cb(); return; }
    var done = false;
    function finish() { if (done) return; done = true; cb(); }
    window.addEventListener('mb:firebase-ready', finish, { once: true });
    var tries = 0;
    var iv = setInterval(function () {
      tries += 1;
      if (window.MB.firebase && window.MB.firebase.db) { clearInterval(iv); finish(); }
      else if (tries > 40) { clearInterval(iv); finish(); }
    }, 100);
  }

  /**
   * sendContact(payload) -> Promise<{ ok: boolean, id?: string, error?: string }>
   * Writes to contactInquiries collection. The CF handles the email send.
   */
  MB.sendContact = function (payload) {
    return new Promise(function (resolve) {
      whenFirebaseReady(function () {
        var fb = window.MB.firebase;
        if (!fb || !fb.db || !fb.fs) {
          resolve({ ok: false, error: 'Connection unavailable. Please try again or email Marie directly.' });
          return;
        }
        var fs = fb.fs;
        var data = {
          name: payload.name,
          email: payload.email,
          phone: payload.phone || null,
          subject: payload.subject || 'General inquiry',
          message: payload.message,
          listingId: payload.listingId || null,
          listingAddress: payload.listingAddress || null,
          createdAt: fs.serverTimestamp(),
          source: 'website-contact-form'
        };
        try {
          fs.addDoc(fs.collection(fb.db, 'contactInquiries'), data).then(function (ref) {
            resolve({ ok: true, id: ref.id });
          }).catch(function (err) {
            console.warn('[contact] Firestore write failed:', err && err.message);
            resolve({ ok: false, error: 'Could not submit your message right now.' });
          });
        } catch (e) {
          console.warn('[contact] write error:', e && e.message);
          resolve({ ok: false, error: 'Could not submit your message right now.' });
        }
      });
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
      submitBtn.textContent = 'Sending…';

      MB.sendContact(data).then(function (result) {
        if (result && result.ok) {
          if (successBox) {
            successBox.innerHTML = ''
              + '<h2 style="margin-bottom:0.5rem;">Thank You</h2>'
              + '<p>Your message has been received. Marie will be in touch within one business day. You should see a confirmation email shortly — check spam if it doesn’t arrive.</p>';
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
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
          showError((result && result.error) || 'Something went wrong. Please email Marie at ' + FALLBACK_EMAIL + ' or call ' + FALLBACK_PHONE + '.');
        }
      }).catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
        showError('Something went wrong. Please email Marie at ' + FALLBACK_EMAIL + ' or call ' + FALLBACK_PHONE + '.');
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
