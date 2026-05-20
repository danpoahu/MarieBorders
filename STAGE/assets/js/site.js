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

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setupStickyHeader();
      setupNavToggle();
      setupActiveNav();
      setupYearStamp();
    });
  } else {
    setupStickyHeader();
    setupNavToggle();
    setupActiveNav();
    setupYearStamp();
  }
})();
