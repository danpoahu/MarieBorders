/* Marie Borders — Guide download handler
 *
 * Writes to Firestore `guideDownloads` and shows the visitor the download
 * link immediately. The onGuideDownloadCreate CF emails the link too, so
 * the visitor has a permanent record.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  // Keep in sync with functions/index.js GUIDE_URLS + GUIDE_LABELS.
  var GUIDES = {
    buyer:  { label: "Marin Buyer's Guide",  url: 'assets/guides/marin-buyers-guide.html'  },
    seller: { label: "Marin Seller's Guide", url: 'assets/guides/marin-sellers-guide.html' }
  };

  var currentGuide = null;
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

  function openModal(guide) {
    if (!GUIDES[guide]) return;
    currentGuide = guide;
    lastFocusedEl = document.activeElement;

    document.getElementById('gd-title').textContent = 'Get ' + GUIDES[guide].label;

    // Reset
    var form = document.getElementById('gd-form');
    form.reset();
    var errBox = document.getElementById('gd-error');
    errBox.classList.remove('is-visible');
    errBox.textContent = '';
    document.getElementById('gd-form-wrap').style.display = 'block';
    document.getElementById('gd-success-wrap').style.display = 'none';

    var backdrop = document.getElementById('gd-backdrop');
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(function () { document.getElementById('gd-name').focus(); }, 50);
  }

  function closeModal() {
    var backdrop = document.getElementById('gd-backdrop');
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      try { lastFocusedEl.focus(); } catch (e) { /* tolerate */ }
    }
  }

  function showError(msg) {
    var box = document.getElementById('gd-error');
    box.textContent = msg;
    box.classList.add('is-visible');
  }

  function readForm() {
    function val(id) { return (document.getElementById(id).value || '').trim(); }
    return {
      name:  val('gd-name'),
      email: val('gd-email'),
      phone: val('gd-phone') || null,
      marketingOptIn: !!document.getElementById('gd-marketingOptIn').checked
    };
  }

  function validate(data) {
    if (!data.name) return 'Please enter your name.';
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return 'Please enter a valid email address.';
    }
    return null;
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
          fs.addDoc(fs.collection(fb.db, 'guideDownloads'), payload).then(function (ref) {
            resolve({ ok: true, id: ref.id });
          }).catch(function (err) {
            console.warn('[guide-download] write failed:', err && err.message);
            resolve({ ok: false, error: "Couldn't send right now. Please email Marie at marie@marinsfinest.com." });
          });
        } catch (e) {
          resolve({ ok: false, error: "Couldn't send right now. Please email Marie at marie@marinsfinest.com." });
        }
      });
    });
  }

  function bindCardTriggers() {
    document.querySelectorAll('[data-guide]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-guide'));
      });
    });
  }

  function bindModalControls() {
    document.getElementById('gd-close-btn').addEventListener('click', closeModal);
    document.getElementById('gd-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('gd-backdrop').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var bd = document.getElementById('gd-backdrop');
        if (bd && bd.classList.contains('is-open')) closeModal();
      }
    });

    document.getElementById('gd-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var data = readForm();
      var err = validate(data);
      if (err) { showError(err); return; }
      if (!currentGuide) { showError('Missing guide context. Please close and try again.'); return; }

      var payload = Object.assign({}, data, {
        guide: currentGuide,
        source: 'website-guide-download'
      });

      var btn = document.getElementById('gd-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      submit(payload).then(function (result) {
        btn.disabled = false;
        btn.textContent = 'Send Me the Guide';
        if (result && result.ok) {
          // Show success with immediate download link
          var dl = document.getElementById('gd-download-link');
          dl.href = GUIDES[currentGuide].url;
          dl.textContent = 'Open ' + GUIDES[currentGuide].label;
          document.getElementById('gd-form-wrap').style.display = 'none';
          var s = document.getElementById('gd-success-wrap');
          s.style.display = 'block';
          s.focus();
        } else {
          showError((result && result.error) || 'Something went wrong. Please try again.');
        }
      });
    });
  }

  function init() {
    if (!document.getElementById('gd-backdrop')) return;
    bindCardTriggers();
    bindModalControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
