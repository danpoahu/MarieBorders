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

  // --- Stamp the current year into footer ---
  function setupYearStamp() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
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

    // Resolve approximate IP + geo. Cached in sessionStorage so we hit a geo
    // API only ONCE per browsing session — clicking through several pages no
    // longer makes repeated calls (which is what caused rate-limiting). Two
    // free no-key providers: ipapi.co, then ipwho.is as a fallback.
    function getGeo() {
      var GEO_KEY = 'mb-stage-geo';
      try {
        var cached = JSON.parse(sessionStorage.getItem(GEO_KEY) || 'null');
        if (cached && cached.ip) return Promise.resolve(cached);
      } catch (e) { /* tolerate */ }

      function fromIpapi() {
        return fetch('https://ipapi.co/json/')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            if (d && d.ip) return { ip: d.ip, city: d.city || null, region: d.region || null, country: d.country_name || null };
            return null;
          })
          .catch(function () { return null; });
      }
      function fromIpwho() {
        return fetch('https://ipwho.is/')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            if (d && d.success !== false && d.ip) return { ip: d.ip, city: d.city || null, region: d.region || null, country: d.country || null };
            return null;
          })
          .catch(function () { return null; });
      }

      return fromIpapi()
        .then(function (g) { return g || fromIpwho(); })
        .then(function (g) {
          var result = g || { ip: null, city: null, region: null, country: null };
          if (result.ip) {
            try { sessionStorage.setItem(GEO_KEY, JSON.stringify(result)); } catch (e) {}
          }
          return result;
        });
    }

    getGeo().then(function (geo) {
      whenFirebaseReady(function () {
        var fb = window.MB.firebase;
        if (!fb || !fb.db || !fb.fs) return;
        try {
          fb.fs.addDoc(fb.fs.collection(fb.db, 'stageVisits'), {
            page: window.location.pathname,
            ip: geo.ip,
            city: geo.city,
            region: geo.region,
            country: geo.country,
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
