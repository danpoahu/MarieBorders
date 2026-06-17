/* Marie Borders — site-wide utilities
 * Phase 1: nav toggle, sticky header behavior, active-link highlight, year stamp
 */

(function () {
  'use strict';

  window.MB = window.MB || {};

  // --- Sticky header: opaque on scroll OR when not on a hero-led page ---
  function setupStickyHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var hasHero = !!document.querySelector('.hero');
    if (!hasHero) {
      header.classList.add('is-solid');
      return;
    }

    function onScroll() {
      if (window.scrollY > 40) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --- Mobile hamburger ---
  function setupNavToggle() {
    var btn = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.nav');
    if (!btn || !nav) return;

    function closeNav() {
      nav.classList.remove('is-open');
      btn.classList.remove('is-active');
      document.body.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.classList.toggle('is-active', open);
      document.body.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close menu when a nav link is tapped
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });

    // Tablet drawer: clicking the dimmed backdrop (anywhere outside the
    // drawer panel and not on the toggle) closes the menu.
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('nav-open')) return;
      if (e.target.closest('.nav') || e.target.closest('.nav-toggle')) return;
      closeNav();
    });

    // Escape key closes the menu.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) closeNav();
    });
  }

  // --- Highlight active nav link based on current page ---
  function setupActiveNav() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    if (path === '') path = 'index.html';
    document.querySelectorAll('.nav__link').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      var target = href.split('/').pop();
      if (target === path) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // --- Stamp the current year + build version into the footer ---
  // Bump SITE_VERSION on every deploy AND the ?v= on site.css/site.js in the
  // HTML so a fresh load is guaranteed; the footer number tells you what you're
  // actually seeing.
  var SITE_VERSION = 'v2.3';
  function setupYearStamp() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
    document.querySelectorAll('.site-footer__strip').forEach(function (el) {
      if (el.querySelector('.site-version')) return;
      var v = document.createElement('span');
      v.className = 'site-version';
      v.style.cssText = 'margin-left:10px;opacity:0.55;font-size:0.85em;';
      v.textContent = SITE_VERSION;
      el.appendChild(v);
    });
  }

  // --- Utilities exposed for other modules ---
  MB.util = {
    formatPrice: function (n) {
      if (n == null || isNaN(n)) return '';
      return '$' + Number(n).toLocaleString('en-US');
    },
    formatNumber: function (n) {
      if (n == null || isNaN(n)) return '';
      return Number(n).toLocaleString('en-US');
    },
    getQueryParam: function (name) {
      var params = new URLSearchParams(window.location.search);
      return params.get(name);
    },
    escapeHtml: function (str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  // --- STAGE visit logging ---
  // Logs each page view on the STAGE preview site (timestamp, page, approx
  // IP/geo, device) to Firestore `stageVisits` so Daniel can see who's been
  // reviewing the site. STAGE-ONLY — never runs on the public root domain.
  // TODO at launch: this whole feature comes out (no IP logging of real
  // public visitors without a privacy policy).
  function logStageVisit() {
    if (window.location.pathname.indexOf('/STAGE/') === -1) return; // STAGE only

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

    // Capture the visitor's IP AND approximate location in a single call to
    // ipinfo.io (a no-key service, ~50k/month free, CORS-enabled). Resolving
    // geo here — at log time, on the live https STAGE site — keeps the data on
    // each record so the local file:// viewer just displays it.
    //
    // NOTE: this used to call ipwho.is, but in June 2026 ipwho.is dropped CORS
    // on its free plan. Browser requests began returning HTTP 403 with
    // {"success":false,"message":"CORS is not supported on the Free plan"}, so
    // every visit silently logged a null IP/location. ipinfo.io returns
    // ip + city/region/country with Access-Control-Allow-Origin:*, so it works
    // from the browser. Cached for the browsing session so each visitor
    // triggers just one call, not one per page.
    function getVisitorInfo() {
      var INFO_KEY = 'mb-stage-visitor';
      try {
        var cached = sessionStorage.getItem(INFO_KEY);
        if (cached) return Promise.resolve(JSON.parse(cached));
      } catch (e) { /* tolerate */ }
      return fetch('https://ipinfo.io/json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.ip) return {};
          var info = {
            ip: d.ip || null,
            city: d.city || null,
            region: d.region || null,
            country: d.country || null
          };
          try { sessionStorage.setItem(INFO_KEY, JSON.stringify(info)); } catch (e) {}
          return info;
        })
        .catch(function () { return {}; });
    }

    getVisitorInfo().then(function (info) {
      info = info || {};
      whenFirebaseReady(function () {
        var fb = window.MB.firebase;
        if (!fb || !fb.db || !fb.fs) return;
        try {
          fb.fs.addDoc(fb.fs.collection(fb.db, 'stageVisits'), {
            page: window.location.pathname,
            ip: info.ip || null,
            city: info.city || null,
            region: info.region || null,
            country: info.country || null,
            userAgent: navigator.userAgent || null,
            referrer: document.referrer || null,
            visitedAt: fb.fs.serverTimestamp()
          });
        } catch (e) { /* tolerate */ }
      });
    });
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setupStickyHeader();
      setupNavToggle();
      setupActiveNav();
      setupYearStamp();
      logStageVisit();
    });
  } else {
    setupStickyHeader();
    setupNavToggle();
    setupActiveNav();
    setupYearStamp();
    logStageVisit();
  }
})();
