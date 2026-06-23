/* Marie Borders — Wish List multi-step form handler
 *
 * 5-step flow writing to Firestore `wishListSubmissions`. The
 * onWishListSubmissionCreate Cloud Function picks it up and sends two
 * emails via Resend (admin notification + visitor auto-reply).
 *
 * Features:
 *   - Tile/pill selection with native checkbox/radio state (a11y preserved)
 *   - Back / Continue navigation with progress dots
 *   - LocalStorage persistence — visitor can leave and resume
 *   - "Other" free-text inputs merge into the array fields on submit
 *   - Final step shows Send button instead of Continue
 *
 * No required fields until step 5 — we don't want to gate exploration.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  var STORAGE_KEY = 'mb.wishlist.v1';
  var TOTAL_STEPS = 5;
  var currentStep = 1;

  // ---- Tile / pill click handling (toggles native input + .is-selected) ----
  function bindTileToggles(rootSelector) {
    var tiles = document.querySelectorAll(rootSelector + ' .wl-tile, ' + rootSelector + ' .wl-pill');
    tiles.forEach(function (tile) {
      var input = tile.querySelector('input');
      if (!input) return;

      // Init from input state (in case of restore)
      if (input.checked) tile.classList.add('is-selected');

      input.addEventListener('change', function () {
        if (input.type === 'radio') {
          // Clear all other tiles in this group
          var groupName = input.name;
          document.querySelectorAll('input[name="' + groupName + '"]').forEach(function (other) {
            var otherTile = other.closest('.wl-tile, .wl-pill');
            if (otherTile) otherTile.classList.toggle('is-selected', other.checked);
          });
        } else {
          tile.classList.toggle('is-selected', input.checked);
        }
        persist();
      });
    });
  }

  function bindStandaloneCheckboxes(ids) {
    ids.forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var label = input.closest('.wl-pill');
      if (input.checked && label) label.classList.add('is-selected');
      input.addEventListener('change', function () {
        if (label) label.classList.toggle('is-selected', input.checked);
        persist();
      });
    });
  }

  // ---- Persistence ----
  function readForm() {
    var form = document.getElementById('wl-form');
    if (!form) return {};
    return {
      neighborhoods: Array.from(form.querySelectorAll('input[name="neighborhoods"]:checked')).map(function (i) { return i.value; }),
      neighborhoodsOther: (document.getElementById('wl-neighborhoods-other').value || '').trim(),
      bedsMin: (form.querySelector('input[name="bedsMin"]:checked') || {}).value || '',
      bathsMin: (form.querySelector('input[name="bathsMin"]:checked') || {}).value || '',
      budgetMin: (document.getElementById('wl-budgetMin').value || '').trim(),
      budgetMax: (document.getElementById('wl-budgetMax').value || '').trim(),
      mustHaves: Array.from(form.querySelectorAll('input[name="mustHaves"]:checked')).map(function (i) { return i.value; }),
      mustHavesOther: (document.getElementById('wl-mustHaves-other').value || '').trim(),
      niceToHaves: Array.from(form.querySelectorAll('input[name="niceToHaves"]:checked')).map(function (i) { return i.value; }),
      niceToHavesOther: (document.getElementById('wl-niceToHaves-other').value || '').trim(),
      timeline: (form.querySelector('input[name="timeline"]:checked') || {}).value || '',
      householdSize: (document.getElementById('wl-householdSize').value || '').trim(),
      schoolDistrict: (document.getElementById('wl-schoolDistrict').value || '').trim(),
      kidsAtHome: !!document.getElementById('wl-kidsAtHome').checked,
      petsAtHome: !!document.getElementById('wl-petsAtHome').checked,
      name: (document.getElementById('wl-name').value || '').trim(),
      email: (document.getElementById('wl-email').value || '').trim(),
      phone: (document.getElementById('wl-phone').value || '').trim(),
      notes: (document.getElementById('wl-notes').value || '').trim()
    };
  }

  function persist() {
    try {
      var data = readForm();
      data._step = currentStep;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* tolerate quota errors */ }
  }

  function restore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;

      // Apply array checkboxes
      ['neighborhoods', 'mustHaves', 'niceToHaves'].forEach(function (name) {
        var vals = Array.isArray(data[name]) ? data[name] : [];
        document.querySelectorAll('input[name="' + name + '"]').forEach(function (input) {
          input.checked = vals.indexOf(input.value) !== -1;
        });
      });

      // Radio groups
      ['bedsMin', 'bathsMin', 'timeline'].forEach(function (name) {
        if (data[name]) {
          var input = document.querySelector('input[name="' + name + '"][value="' + data[name] + '"]');
          if (input) input.checked = true;
        }
      });

      // Simple text fields
      var textMap = {
        'wl-neighborhoods-other': 'neighborhoodsOther',
        'wl-budgetMin': 'budgetMin',
        'wl-budgetMax': 'budgetMax',
        'wl-mustHaves-other': 'mustHavesOther',
        'wl-niceToHaves-other': 'niceToHavesOther',
        'wl-householdSize': 'householdSize',
        'wl-schoolDistrict': 'schoolDistrict',
        'wl-name': 'name',
        'wl-email': 'email',
        'wl-phone': 'phone',
        'wl-notes': 'notes'
      };
      Object.keys(textMap).forEach(function (elId) {
        var input = document.getElementById(elId);
        if (input && data[textMap[elId]] != null) input.value = data[textMap[elId]];
      });

      // Standalone checkboxes
      if (data.kidsAtHome) document.getElementById('wl-kidsAtHome').checked = true;
      if (data.petsAtHome) document.getElementById('wl-petsAtHome').checked = true;

      // Resume on the step they were on (cap to last reachable)
      if (typeof data._step === 'number' && data._step >= 1 && data._step <= TOTAL_STEPS) {
        currentStep = data._step;
      }
    } catch (e) {
      console.warn('[wish-list] restore failed:', e && e.message);
    }
  }

  function clearStorage() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* tolerate */ }
  }

  // ---- Step navigation ----
  function goToStep(n) {
    if (n < 1) n = 1;
    if (n > TOTAL_STEPS) n = TOTAL_STEPS;
    currentStep = n;

    document.querySelectorAll('.wl-step').forEach(function (s) {
      s.classList.toggle('is-active', Number(s.getAttribute('data-step')) === n);
    });

    document.querySelectorAll('.wl-progress__dot').forEach(function (d) {
      var step = Number(d.getAttribute('data-step'));
      d.classList.toggle('is-active', step === n);
      d.classList.toggle('is-complete', step < n);
    });
    document.getElementById('wl-progress').setAttribute('aria-valuenow', String(n));

    // Back button visibility
    document.getElementById('wl-back-btn').style.visibility = n === 1 ? 'hidden' : 'visible';

    // Continue vs Submit
    var continueBtn = document.getElementById('wl-continue-btn');
    var submitBtn = document.getElementById('wl-submit-btn');
    if (n === TOTAL_STEPS) {
      continueBtn.style.display = 'none';
      submitBtn.style.display = 'inline-flex';
    } else {
      continueBtn.style.display = 'inline-flex';
      submitBtn.style.display = 'none';
    }

    // Scroll to top of active step
    window.scrollTo({ top: 0, behavior: 'smooth' });

    persist();
  }

  // ---- Validation per step ----
  function validateStep(n) {
    if (n === 5) {
      var name = (document.getElementById('wl-name').value || '').trim();
      var email = (document.getElementById('wl-email').value || '').trim();
      if (!name) return 'Please enter your name.';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Please enter a valid email address.';
      }
    }
    return null;
  }

  function showStepError(msg) {
    var errBox = document.getElementById('wl-error');
    if (!errBox) return;
    errBox.textContent = msg;
    errBox.classList.add('is-visible');
  }

  function clearStepError() {
    var errBox = document.getElementById('wl-error');
    if (errBox) {
      errBox.classList.remove('is-visible');
      errBox.textContent = '';
    }
  }

  // ---- Budget input: live $-format on blur ----
  function bindBudgetFormatting() {
    ['wl-budgetMin', 'wl-budgetMax'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('blur', function () {
        var n = parseInt(String(el.value).replace(/[^\d]/g, ''), 10);
        el.value = isFinite(n) && n > 0 ? '$' + n.toLocaleString('en-US') : '';
        persist();
      });
    });
  }

  function parseMoneyToNumber(s) {
    if (s == null || s === '') return null;
    var n = parseInt(String(s).replace(/[^\d]/g, ''), 10);
    return isFinite(n) ? n : null;
  }

  // ---- Submission ----
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

  function buildSubmission() {
    var d = readForm();
    var neighborhoods = d.neighborhoods.slice();
    if (d.neighborhoodsOther) neighborhoods.push(d.neighborhoodsOther);

    var mustHaves = d.mustHaves.slice();
    if (d.mustHavesOther) mustHaves.push(d.mustHavesOther);

    var niceToHaves = d.niceToHaves.slice();
    if (d.niceToHavesOther) niceToHaves.push(d.niceToHavesOther);

    var householdSize = null;
    if (d.householdSize) {
      var hn = parseInt(d.householdSize, 10);
      if (isFinite(hn) && hn > 0) householdSize = hn;
    }

    return {
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      neighborhoods: neighborhoods,
      mustHaves: mustHaves,
      niceToHaves: niceToHaves,
      bedsMin: d.bedsMin ? Number(d.bedsMin) : null,
      bathsMin: d.bathsMin ? Number(d.bathsMin) : null,
      budgetMin: parseMoneyToNumber(d.budgetMin),
      budgetMax: parseMoneyToNumber(d.budgetMax),
      timeline: d.timeline || null,
      householdSize: householdSize,
      schoolDistrict: d.schoolDistrict || null,
      kidsAtHome: d.kidsAtHome,
      petsAtHome: d.petsAtHome,
      notes: d.notes || null,
      source: 'website-wish-list'
    };
  }

  function submitWishList() {
    return new Promise(function (resolve) {
      whenFirebaseReady(function () {
        var fb = window.MB.firebase;
        if (!fb || !fb.db || !fb.fs) {
          resolve({ ok: false, error: 'Connection unavailable. Please try again or email Marie at marie@marinsfinest.com.' });
          return;
        }
        var fs = fb.fs;
        var payload = buildSubmission();
        payload.createdAt = fs.serverTimestamp();
        try {
          fs.addDoc(fs.collection(fb.db, 'wishListSubmissions'), payload).then(function (ref) {
            resolve({ ok: true, id: ref.id, name: payload.name });
          }).catch(function (err) {
            console.warn('[wish-list] write failed:', err && err.message);
            resolve({ ok: false, error: "Couldn't send right now. Please email Marie at marie@marinsfinest.com." });
          });
        } catch (e) {
          resolve({ ok: false, error: "Couldn't send right now. Please email Marie at marie@marinsfinest.com." });
        }
      });
    });
  }

  function showSuccess(name) {
    document.getElementById('wl-form').style.display = 'none';
    document.querySelector('.wl-progress').style.display = 'none';
    var firstName = (name || '').trim().split(/\s+/)[0] || 'friend';
    document.getElementById('wl-success-name').textContent = firstName;
    var success = document.getElementById('wl-success');
    success.style.display = 'block';
    success.focus();
    window.scrollTo({
      top: success.getBoundingClientRect().top + window.scrollY - 100,
      behavior: 'smooth'
    });
    clearStorage();
  }

  // ---- Init ----
  function init() {
    if (!document.getElementById('wl-form')) return;

    restore();
    bindTileToggles('#wl-neighborhoods');
    bindTileToggles('#wl-bedsMin');
    bindTileToggles('#wl-bathsMin');
    bindTileToggles('#wl-mustHaves');
    bindTileToggles('#wl-niceToHaves');
    bindTileToggles('#wl-timeline');
    bindStandaloneCheckboxes(['wl-kidsAtHome', 'wl-petsAtHome']);
    bindBudgetFormatting();

    // Persist on every text input change
    document.querySelectorAll('#wl-form input[type="text"], #wl-form input[type="tel"], #wl-form input[type="email"], #wl-form input[type="number"], #wl-form textarea').forEach(function (el) {
      el.addEventListener('input', persist);
    });

    document.getElementById('wl-back-btn').addEventListener('click', function () {
      clearStepError();
      goToStep(currentStep - 1);
    });

    document.getElementById('wl-continue-btn').addEventListener('click', function () {
      var err = validateStep(currentStep);
      if (err) { showStepError(err); return; }
      clearStepError();
      goToStep(currentStep + 1);
    });

    document.getElementById('wl-submit-btn').addEventListener('click', function () {
      var err = validateStep(currentStep);
      if (err) { showStepError(err); return; }
      clearStepError();

      var btn = document.getElementById('wl-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      submitWishList().then(function (result) {
        if (result && result.ok) {
          showSuccess(result.name);
        } else {
          btn.disabled = false;
          btn.textContent = 'Send Wish List';
          showStepError((result && result.error) || 'Something went wrong. Please try again.');
        }
      });
    });

    // Render the step the user was on
    goToStep(currentStep);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
