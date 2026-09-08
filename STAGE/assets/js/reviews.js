/* Marie Borders — client reviews carousel (Phase 3)
 *
 * Reads typed-in client reviews from Firestore `reviews` and renders a
 * rotating quote carousel into any element on the page marked:
 *
 *   <section class="reviews" data-reviews-page="home" hidden></section>
 *
 * `data-reviews-page` is one of: home | about | forSale | contact, and is
 * matched against the review's own `pages` map so Marie can keep a given
 * review off a given page from the CMS.
 *
 * EMPTY STATE — the important one.
 *   The section ships in the HTML with the `hidden` attribute already set
 *   and NO children. If Firestore is unreachable, the collection is empty,
 *   or nothing is published for this page, we simply return: the section
 *   stays hidden and renders nothing at all. No heading, no gap, no
 *   "check back soon". The page reads exactly as it did before the feature
 *   existed. `hidden` is only removed once we have at least one review to
 *   put inside it.
 *
 * SINGLE REVIEW.
 *   One review means no arrows, no dots and no timer — the arrows/dots are
 *   never created in the first place rather than created and hidden.
 *
 * MOTION.
 *   Rotates every 6s, pauses while the pointer is over the carousel or
 *   while focus is inside it, and does not rotate at all when the visitor's
 *   system asks for reduced motion. Arrows and dots keep working in every
 *   case — reduced motion removes the automatic movement, not the control.
 *
 * Data shape (one document per review, collection `reviews`):
 *   clientName  string   "The Sample Family"  (invented)
 *   where       string   "Bought in Novato, 2026"     (may be empty)
 *   rating      number   5 | 4 | null                 (null = no stars)
 *   text        string   the review itself
 *   date        string   "YYYY-MM-DD"                 (CMS list only)
 *   source      string   direct|zillow|google|realtor (CMS records only —
 *                        deliberately never rendered on the public site)
 *   published   bool
 *   pages       map      { home, about, forSale, contact } of bool
 *   order       number   rotation order, ascending
 *
 * The query is `where('published','==',true)` rather than a full collection
 * read, so the security rules can withhold unpublished drafts from the
 * public if they are tightened to `resource.data.published == true`. Sorting
 * happens client-side on `order` — the collection is small (tens of docs at
 * most) and this avoids needing a composite index deploy.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  var ROTATE_MS = 6000;
  var EYEBROW = 'What Clients Say';

  /* Mirrors site-content.js — classic scripts can't await the module import,
     so poll the global handle the module publishes. */
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

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function starsHtml(rating) {
    var n = Number(rating);
    if (!n || !isFinite(n) || n < 1) return '';
    n = Math.max(1, Math.min(5, Math.round(n)));
    var glyphs = '';
    for (var i = 0; i < n; i += 1) glyphs += '★';
    return '<p class="reviews__stars" aria-label="' + n + ' out of 5 stars">' + glyphs + '</p>';
  }

  /* Load every published review. Any failure resolves to [] so the caller
     falls through to the empty state rather than throwing. */
  function load() {
    return new Promise(function (resolve) {
      whenFirebaseReady(function () {
        var fb = window.MB.firebase;
        if (!fb || !fb.db || !fb.fs) { resolve([]); return; }
        var fs = fb.fs;
        try {
          fs.getDocs(fs.query(fs.collection(fb.db, 'reviews'), fs.where('published', '==', true)))
            .then(function (snap) {
              var out = [];
              snap.forEach(function (d) {
                var data = d.data() || {};
                data.id = d.id;
                out.push(data);
              });
              resolve(out);
            })
            .catch(function (err) {
              console.warn('[reviews] load failed:', err && err.message);
              resolve([]);
            });
        } catch (e) {
          resolve([]);
        }
      });
    });
  }

  function forPage(all, page) {
    return all.filter(function (r) {
      if (!r || !r.text || !String(r.text).trim()) return false;
      if (!page) return true;
      var pages = r.pages || {};
      return pages[page] === true;
    }).sort(function (a, b) {
      var ao = typeof a.order === 'number' ? a.order : 9999;
      var bo = typeof b.order === 'number' ? b.order : 9999;
      return ao - bo;
    });
  }

  function slideHtml(r, idx) {
    var where = r.where && String(r.where).trim();
    return ''
      + '<article class="reviews__slide' + (idx === 0 ? ' is-on' : '') + '">'
      +   '<span class="reviews__mark" aria-hidden="true">“</span>'
      +   starsHtml(r.rating)
      +   '<blockquote class="reviews__quote">' + escapeHtml(r.text) + '</blockquote>'
      +   '<p class="reviews__who">' + escapeHtml(r.clientName || '') + '</p>'
      +   (where ? '<p class="reviews__where">' + escapeHtml(where) + '</p>' : '')
      + '</article>';
  }

  function render(section, items) {
    var multi = items.length > 1;

    section.innerHTML = ''
      + '<div class="wrap wrap--narrow">'
      +   '<div class="reviews__car">'
      +     '<p class="reviews__eyebrow">' + EYEBROW + '</p>'
      +     (multi
            ? '<button type="button" class="reviews__arrow reviews__arrow--prev" aria-label="Previous review">‹</button>'
              + '<button type="button" class="reviews__arrow reviews__arrow--next" aria-label="Next review">›</button>'
            : '')
      +     items.map(slideHtml).join('')
      +     (multi ? '<div class="reviews__dots"></div>' : '')
      +   '</div>'
      + '</div>';

    section.hidden = false;

    var car = section.querySelector('.reviews__car');
    var slides = Array.prototype.slice.call(section.querySelectorAll('.reviews__slide'));
    var dots = [];
    var current = 0;
    var timer = null;

    var reduceMotion = false;
    try {
      reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { /* older browsers — treat as motion allowed */ }

    function show(n) {
      current = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-on', i === current); });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-on', i === current);
        d.setAttribute('aria-current', i === current ? 'true' : 'false');
      });
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function start() {
      stop();
      if (reduceMotion) return;          // no automatic movement at all
      if (slides.length < 2) return;     // single review never rotates
      timer = setInterval(function () { show(current + 1); }, ROTATE_MS);
    }

    function go(step) { show(current + step); start(); }

    if (multi) {
      var dotWrap = section.querySelector('.reviews__dots');
      items.forEach(function (_, n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'reviews__dot' + (n === 0 ? ' is-on' : '');
        b.setAttribute('aria-label', 'Review ' + (n + 1) + ' of ' + items.length);
        b.setAttribute('aria-current', n === 0 ? 'true' : 'false');
        b.addEventListener('click', function () { show(n); start(); });
        dotWrap.appendChild(b);
      });
      dots = Array.prototype.slice.call(dotWrap.children);

      section.querySelector('.reviews__arrow--prev').addEventListener('click', function () { go(-1); });
      section.querySelector('.reviews__arrow--next').addEventListener('click', function () { go(1); });

      car.addEventListener('mouseenter', stop);
      car.addEventListener('mouseleave', start);
      car.addEventListener('focusin', stop);
      car.addEventListener('focusout', start);
    }

    start();
  }

  function mount(section) {
    var page = section.getAttribute('data-reviews-page') || '';
    load().then(function (all) {
      var items = forPage(all, page);
      // Zero reviews for this page: leave the section hidden and empty.
      if (!items.length) return;
      render(section, items);
    });
  }

  function init() {
    var sections = document.querySelectorAll('.reviews[data-reviews-page]');
    Array.prototype.forEach.call(sections, mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  MB.reviews = { init: init, load: load, forPage: forPage };
})();
