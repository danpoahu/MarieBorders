/* Marie Borders — contact form handler
 *
 * BACKEND ROUTING (Phase 3 will wire this up to a Cloud Function):
 *   Primary recipient: mariebordershometeam@gmail.com  (Anne, team coordinator)
 *   CC:                marie@marinsfinest.com
 *
 * For Phase 1 this stub:
 *   - validates required fields
 *   - simulates a network delay
 *   - shows a friendly thank-you state
 *   - console.logs the payload so Daniel can see what would be sent
 *
 * PHASE-3: replace the body of sendContact() with
 *   firebase.functions().httpsCallable('sendContactMessage')(payload)
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  /**
   * sendContact(payload) -> Promise resolving when delivery is acknowledged.
   * payload shape:
   *   {
   *     name, email, phone, subject, message,
   *     listingId?, listingAddress?
   *   }
   */
  MB.sendContact = function (payload) {
    return new Promise(function (resolve) {
      // Simulate a brief network round-trip so the success state feels real
      // PHASE-3: replace with httpsCallable('sendContactMessage')(payload)
      // eslint-disable-next-line no-console
      console.log('[MB.sendContact] would deliver:', payload);
      setTimeout(function () { resolve({ ok: true }); }, 700);
    });
  };

  // Wire up the contact form when present
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

    // If we came from a listing, show a friendly context banner + pre-fill subject + message
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

      // Validation
      if (!data.name) return showError('Please enter your name.');
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return showError('Please enter a valid email address.');
      }
      if (!data.message) return showError('Please include a brief message.');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      MB.sendContact(data).then(function () {
        form.style.display = 'none';
        successBox.style.display = 'block';
        successBox.focus();
        window.scrollTo({ top: successBox.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
      }).catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
        showError('Something went wrong. Please try again or email marie@marinsfinest.com directly.');
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
