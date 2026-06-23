/* Marie Borders — home valuation request handler
 *
 * Writes to Firestore `homeValuationLeads`. The onHomeValuationLeadCreate
 * Cloud Function picks it up and sends admin + visitor emails via Resend.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

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

  // ---- Pill toggle (same pattern as wish-list) ----
  function bindPillToggles() {
    document.querySelectorAll('.hv-pill').forEach(function (pill) {
      var input = pill.querySelector('input');
      if (!input) return;
      if (input.checked) pill.classList.add('is-selected');
      input.addEventListener('change', function () {
        if (input.type === 'radio') {
          var groupName = input.name;
          document.querySelectorAll('input[name="' + groupName + '"]').forEach(function (other) {
            var otherPill = other.closest('.hv-pill');
            if (otherPill) otherPill.classList.toggle('is-selected', other.checked);
          });
        } else {
          pill.classList.toggle('is-selected', input.checked);
        }
      });
    });
  }

  function readForm() {
    var form = document.getElementById('hv-form');
    function val(id) { return (document.getElementById(id).value || '').trim(); }
    function num(id) {
      var n = parseInt(val(id), 10);
      return isFinite(n) && n > 0 ? n : null;
    }
    function fnum(id) {
      var s = val(id);
      if (!s) return null;
      var n = parseFloat(s);
      return isFinite(n) ? n : null;
    }

    return {
      address: {
        street: val('hv-street'),
        city:   val('hv-city'),
        state:  val('hv-state') || 'CA',
        zip:    val('hv-zip')
      },
      beds: num('hv-beds'),
      baths: fnum('hv-baths'),
      sqft: num('hv-sqft'),
      yearBuilt: num('hv-yearBuilt'),
      condition: (form.querySelector('input[name="condition"]:checked') || {}).value || null,
      timeline:  (form.querySelector('input[name="timeline"]:checked')  || {}).value || null,
      notes: val('hv-notes') || null,
      name: val('hv-name'),
      email: val('hv-email'),
      phone: val('hv-phone') || null,
      source: 'website-home-value'
    };
  }

  function validate(data) {
    if (!data.address.street) return 'Please enter the property address.';
    if (!data.name) return 'Please enter your name.';
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return 'Please enter a valid email address.';
    }
    return null;
  }

  function showError(msg) {
    var box = document.getElementById('hv-error');
    box.textContent = msg;
    box.classList.add('is-visible');
  }
  function clearError() {
    var box = document.getElementById('hv-error');
    box.classList.remove('is-visible');
    box.textContent = '';
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
          fs.addDoc(fs.collection(fb.db, 'homeValuationLeads'), payload).then(function (ref) {
            resolve({ ok: true, id: ref.id });
          }).catch(function (err) {
            console.warn('[home-value] write failed:', err && err.message);
            resolve({ ok: false, error: "Couldn't send right now. Please email Marie at marie@marinsfinest.com." });
          });
        } catch (e) {
          resolve({ ok: false, error: "Couldn't send right now. Please email Marie at marie@marinsfinest.com." });
        }
      });
    });
  }

  function showSuccess(name) {
    document.getElementById('hv-form').style.display = 'none';
    var firstName = (name || '').trim().split(/\s+/)[0] || 'friend';
    document.getElementById('hv-success-name').textContent = firstName;
    var success = document.getElementById('hv-success');
    success.style.display = 'block';
    success.focus();
    window.scrollTo({
      top: success.getBoundingClientRect().top + window.scrollY - 100,
      behavior: 'smooth'
    });
  }

  function init() {
    var form = document.getElementById('hv-form');
    if (!form) return;

    bindPillToggles();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();
      var data = readForm();
      var err = validate(data);
      if (err) { showError(err); return; }

      var btn = document.getElementById('hv-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      submit(data).then(function (result) {
        if (result && result.ok) {
          showSuccess(data.name);
        } else {
          btn.disabled = false;
          btn.textContent = 'Send My Request';
          showError((result && result.error) || 'Something went wrong. Please try again.');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
