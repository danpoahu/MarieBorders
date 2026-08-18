/* Marie Borders — first-party site analytics (collection)
 * ---------------------------------------------------------------------------
 * Writes anonymous traffic counters to Firestore. Read back by the CMS
 * "Website Analytics" tab.
 *
 * WHAT IS AND IS NOT COLLECTED
 *   Collected: a page-view count, a per-session "visitor" count, which page,
 *   which referring site (hostname only), and mobile-vs-desktop.
 *   NOT collected: no IP address, no geolocation, no cookies, no device
 *   fingerprint, nothing that identifies a person.
 *
 *   That is deliberate. site.js logs IP + city for the STAGE preview, and its
 *   own comment says that feature "comes out at launch — no IP logging of real
 *   public visitors without a privacy policy". This file honours that: it is
 *   safe to run on the public site with no consent banner because it stores
 *   nothing personal.
 *
 * SHAPE — one aggregate document per day, not one document per view. Cheap to
 * write (a single merge) and cheap to read (one doc per day in the range).
 *
 *   siteStats/{YYYY-MM-DD} {
 *     date:      'YYYY-MM-DD'         // duplicated as a field so we can range-query
 *     views:     number
 *     visitors:  number               // sessions, not people
 *     pages:     { home: n, about: n, 'for-sale': n, ... }
 *     referrers: { direct: n, google: n, ... }
 *     devices:   { mobile: n, desktop: n }
 *     updatedAt: serverTimestamp
 *   }
 *   listingStats/{listingId} { views: number, lastViewedAt }
 *
 * ⚠ Map keys are slugified to [a-z0-9-]. Firestore field paths treat "." as a
 *   separator and reject "/", so a raw pathname or hostname cannot be a key.
 *
 * ⚠ STAGE writes to SEPARATE collections (siteStatsPreview / listingStatsPreview)
 *   so preview traffic never pollutes Marie's real numbers. The CMS picks the
 *   same pair by the same rule, so STAGE's CMS shows STAGE's figures.
 *
 * Days with no traffic write no document. Anything reading this MUST treat a
 * missing day as zero rather than as a gap — see the LDAH siteAnalytics notes.
 * ---------------------------------------------------------------------------
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  // Never log the CMS, the private visit viewer, or local development.
  var path = window.location.pathname;
  var host = window.location.hostname;
  if (/cms\.html|visitLog\.html|_probe\.html/i.test(path)) return;
  if (host === 'localhost' || host === '127.0.0.1' || host === '') return;

  var IS_STAGE   = path.indexOf('/STAGE/') !== -1;
  var STATS_COLL = IS_STAGE ? 'siteStatsPreview'    : 'siteStats';
  var LIST_COLL  = IS_STAGE ? 'listingStatsPreview' : 'listingStats';

  // ---------- day key ----------
  // Pinned to Marie's timezone, not the visitor's, so a Sydney visit at 9am
  // doesn't land on tomorrow's row and split a single day in two.
  function dayKey() {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
      if (/^\d{4}-\d{2}-\d{2}$/.test(parts)) return parts;
    } catch (e) { /* fall through */ }
    return new Date().toISOString().slice(0, 10);
  }

  // ---------- key slugs ----------
  function slug(s, fallback) {
    var out = String(s || '')
      .toLowerCase()
      .replace(/\.html?$/, '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return out || fallback;
  }

  function pageKey() {
    var p = path.replace('/STAGE/', '/');
    var k = slug(p, 'home');
    // "/" and "/index.html" are the same page — don't split the home count
    return (k === 'index') ? 'home' : k;
  }

  function referrerKey() {
    var ref = document.referrer;
    if (!ref) return 'direct';
    try {
      var h = new URL(ref).hostname.replace(/^www\./, '');
      if (h === host.replace(/^www\./, '')) return 'internal';
      // google.co.uk / google.com both read as "google"
      var base = h.split('.')[0];
      return slug(base, 'other');
    } catch (e) { return 'other'; }
  }

  function deviceKey() {
    return window.matchMedia && window.matchMedia('(max-width: 820px)').matches
      ? 'mobile' : 'desktop';
  }

  // A "visitor" is a browsing session, not a person — sessionStorage clears
  // when the tab closes. No cookie, nothing persistent.
  function isNewSession() {
    try {
      if (sessionStorage.getItem('mb-seen')) return false;
      sessionStorage.setItem('mb-seen', '1');
      return true;
    } catch (e) {
      return false; // private mode: count the view, skip the visitor
    }
  }

  // ---------- firebase ----------
  function whenReady(cb) {
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

  function record() {
    whenReady(function () {
      var fb = window.MB.firebase;
      if (!fb || !fb.db || !fb.fs || !fb.fs.increment) return;
      var fs = fb.fs;

      var payload = {
        date: dayKey(),
        views: fs.increment(1),
        visitors: fs.increment(isNewSession() ? 1 : 0),
        pages: {}, referrers: {}, devices: {},
        updatedAt: fs.serverTimestamp()
      };
      payload.pages[pageKey()]         = fs.increment(1);
      payload.referrers[referrerKey()] = fs.increment(1);
      payload.devices[deviceKey()]     = fs.increment(1);

      try {
        fs.setDoc(fs.doc(fb.db, STATS_COLL, dayKey()), payload, { merge: true });
      } catch (e) {
        if (window.console) console.warn('[MB.analytics]', e && e.message);
      }

      // Per-listing view count, for the CMS "most viewed" table.
      var id = new URLSearchParams(window.location.search).get('id');
      if (/listing\.html$/i.test(path) && id) {
        try {
          fs.setDoc(fs.doc(fb.db, LIST_COLL, id), {
            views: fs.increment(1),
            lastViewedAt: fs.serverTimestamp()
          }, { merge: true });
        } catch (e) { /* non-fatal */ }
      }
    });
  }

  // Public surface, in case a page wants the collection names.
  MB.analytics = { statsCollection: STATS_COLL, listingCollection: LIST_COLL, dayKey: dayKey };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    record();
  } else {
    document.addEventListener('DOMContentLoaded', record, { once: true });
  }
})();
