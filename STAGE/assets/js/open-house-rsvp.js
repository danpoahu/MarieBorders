/* Marie Borders — Open House RSVP modal handler
 *
 * Wires up [data-rsvp-listing] buttons on the listing detail page. Opens a
 * modal pre-populated with the listing context, captures the visitor's
 * details, writes to Firestore `openHouseRSVPs`, and the CF emails both
 * Marie and the visitor.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  var modalContext = null; // { listingId, listingAddress, openHouseDate, openHouseTime }
  var lastFocusedEl = null;

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

  // ---- Pill binding (radio groups) ----
  function bindPills() {
    document.querySelectorAll('.rsvp-pill').forEach(function (pill) {
      var input = pill.querySelector('input');
      if (!input) return;
      input.addEventListener('change', function () {
        if (input.type === 'radio') {
          var groupName = input.name;
          document.querySelectorAll('input[name="' + groupName + '"]').forEach(function (other) {
            var otherPill = other.closest('.rsvp-pill');
            if (otherPill) otherPill.classList.toggle('is-selected', other.checked);
          });
        }
      });
    });
  }

  function openModal(ctx) {
    modalContext = ctx;
    lastFocusedEl = document.activeElement;

    document.getElementById('rsvp-context').innerHTML =
      '<strong>' + MB.util.escapeHtml(ctx.listingAddress) + '</strong><br>'
      + MB.util.escapeHtml(ctx.openHouseDateLabel) + ' &middot; ' + MB.util.escapeHtml(ctx.openHouseTime);

    // Reset form state
    var form = document.getElementById('rsvp-form');
    form.reset();
    document.querySelectorAll('.rsvp-pill.is-selected').forEach(function (p) { p.classList.remove('is-selected'); });
    document.getElementById('rsvp-guests').value = '1';
    var errBox = document.getElementById('rsvp-error');
    errBox.classList.remove('is-visible');
    errBox.textContent = '';

    // Reset to form view (in case it was on success)
    document.getElementById('rsvp-form-wrap').style.display = 'block';
    document.getElementById('rsvp-success-wrap').style.display = 'none';

    var backdrop = document.getElementById('rsvp-backdrop');
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(function () { document.getElementById('rsvp-name').focus(); }, 50);
  }

  function closeModal() {
    var backdrop = document.getElementById('rsvp-backdrop');
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      try { lastFocusedEl.focus(); } catch (e) { /* tolerate */ }
    }
  }

  function readForm() {
    function val(id) { return (document.getElementById(id).value || '').trim(); }
    function pillValue(name) {
      var checked = document.querySelector('input[name="' + name + '"]:checked');
      return checked ? checked.value : null;
    }
    var guests = parseInt(val('rsvp-guests'), 10);
    return {
      name: val('rsvp-name'),
      email: val('rsvp-email'),
      phone: val('rsvp-phone') || null,
      guests: isFinite(guests) && guests > 0 ? guests : 1,
      workingWithAgent: pillValue('workingWithAgent') === 'yes' ? true
                      : pillValue('workingWithAgent') === 'no'  ? false
                      : null,
      preApproved: pillValue('preApproved') === 'yes' ? true
                 : pillValue('preApproved') === 'no'  ? false
                 : pillValue('preApproved') === 'n-a' ? null
                 : null,
      notes: val('rsvp-notes') || null
    };
  }

  function validate(data) {
    if (!data.name) return 'Please enter your name.';
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return 'Please enter a valid email address.';
    }
    return null;
  }

  function showError(msg) {
    var box = document.getElementById('rsvp-error');
    box.textContent = msg;
    box.classList.add('is-visible');
  }

  function submit(payload) {
    return new Promise(function (resolve) {
      whenFirebaseReady(function () {
        var fb = window.MB.firebase;
        if (!fb || !fb.db || !fb.fs) {
          resolve({ ok: false, error: 'Connection unavailable. Please email Marie at marie@marinsfinest.com.' });
          return;
        }
        var fs = fb.fs;
        payload.createdAt = fs.serverTimestamp();
        try {
          fs.addDoc(fs.collection(fb.db, 'openHouseRSVPs'), payload).then(function (ref) {
            resolve({ ok: true, id: ref.id });
          }).catch(function (err) {
            console.warn('[rsvp] write failed:', err && err.message);
            resolve({ ok: false, error: "Couldn't send right now. Please email Marie at marie@marinsfinest.com." });
          });
        } catch (e) {
          resolve({ ok: false, error: "Couldn't send right now. Please email Marie at marie@marinsfinest.com." });
        }
      });
    });
  }

  // ---- Wire up RSVP button delegation ----
  function bindTriggers() {
    // RSVP buttons render dynamically after the listing loads — use delegation.
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-rsvp-listing]');
      if (!btn) return;
      e.preventDefault();
      openModal({
        listingId:       btn.getAttribute('data-rsvp-listing') || '',
        listingAddress:  btn.getAttribute('data-rsvp-address') || '',
        openHouseDate:   btn.getAttribute('data-rsvp-date') || '',
        openHouseDateLabel: btn.getAttribute('data-rsvp-date-label') || '',
        openHouseTime:   btn.getAttribute('data-rsvp-time') || ''
      });
    });
  }

  function bindModalControls() {
    document.getElementById('rsvp-close-btn').addEventListener('click', closeModal);
    document.getElementById('rsvp-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('rsvp-done-btn').addEventListener('click', closeModal);
    document.getElementById('rsvp-backdrop').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var bd = document.getElementById('rsvp-backdrop');
        if (bd && bd.classList.contains('is-open')) closeModal();
      }
    });
    document.getElementById('rsvp-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var data = readForm();
      var err = validate(data);
      if (err) { showError(err); return; }
      if (!modalContext) { showError('Missing open-house context. Please close and try again.'); return; }

      var payload = Object.assign({}, data, {
        listingId: modalContext.listingId,
        listingAddress: modalContext.listingAddress,
        openHouseDate: modalContext.openHouseDate,
        openHouseTime: modalContext.openHouseTime,
        source: 'website-open-house-rsvp'
      });

      var btn = document.getElementById('rsvp-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      submit(payload).then(function (result) {
        btn.disabled = false;
        btn.textContent = 'Send RSVP';
        if (result && result.ok) {
          document.getElementById('rsvp-form-wrap').style.display = 'none';
          var s = document.getElementById('rsvp-success-wrap');
          s.style.display = 'block';
          s.focus();
        } else {
          showError((result && result.error) || 'Something went wrong. Please try again.');
        }
      });
    });
  }

  function init() {
    if (!document.getElementById('rsvp-backdrop')) return;
    bindPills();
    bindTriggers();
    bindModalControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
