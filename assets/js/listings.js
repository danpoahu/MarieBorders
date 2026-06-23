/* Marie Borders — listings data layer (Phase 3)
 *
 * Phase 3 wires this to Firestore collection `listings`, ordered by listedAt desc.
 *
 * Public API (preserved from Phase 1 — DO NOT change signatures, multiple
 * pages consume these methods synchronously after `await MB.listings.ready`):
 *
 *   MB.listings.getAll(filter)       -> Listing[]
 *   MB.listings.getById(id)          -> Listing | null
 *   MB.listings.getFeatured(limit)   -> Listing[]
 *
 * New in Phase 3:
 *
 *   MB.listings.ready                -> Promise that resolves after the
 *                                       first Firestore snapshot lands.
 *                                       Pages should await this before
 *                                       reading the sync getters.
 *   MB.listings.subscribeAll(cb)     -> Live subscription. cb(items) fires
 *                                       on every snapshot. Returns an
 *                                       unsubscribe function. for-sale.html
 *                                       uses this so a new listing added
 *                                       in the CMS appears without refresh.
 *
 * If the collection is empty (day-1 state), the getters return [] and the
 * consuming pages render their empty states ("New listings coming soon").
 *
 * ---------------------------------------------------------------------------
 * SCHEMA REFERENCE — also enforced by firestore.rules at repo root.
 * Kept here for Marie's CMS author + future devs. The original Phase 1
 * SAMPLE_LISTINGS array (commented out below) is the canonical example of
 * field names, casing, and shape. Do NOT delete it without updating both
 * firestore.rules AND cms.html field bindings.
 *
 *   listings/{id} {
 *     status: 'active' | 'pending' | 'sold'
 *     listPrice: number
 *     soldPrice: number | null
 *     address: { street, city, state, zip }
 *     beds: number
 *     baths: number
 *     halfBaths: number | null
 *     sqft: number
 *     lotSize: string | null
 *     yearBuilt: number | null
 *     mlsNumber: string | null
 *     description: string
 *     features: string[]
 *     photos: [{ url, storagePath, caption?, order: number, isPrimary: boolean }]
 *     listedAt: Timestamp
 *     soldAt: Timestamp | null
 *     openHouses: [{ date: 'YYYY-MM-DD', startTime: string, endTime: string }]
 *     slug: string
 *     featured: boolean
 *   }
 * ---------------------------------------------------------------------------
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  // ---------- SCHEMA REFERENCE (Phase 1 sample data, kept for shape) ----------
  /*
  var SAMPLE_LISTINGS = [
    {
      id: 'mill-valley-victorian-1923',
      status: 'active',
      listPrice: 2895000,
      soldPrice: null,
      address: { street: '127 Lovell Avenue', city: 'Mill Valley', state: 'CA', zip: '94941' },
      beds: 4, baths: 3, halfBaths: 1,
      sqft: 2840, lotSize: '0.18 acre', yearBuilt: 1923,
      mlsNumber: 'MRN-22481',
      description: '...',
      features: ['Original heart-pine floors', '...'],
      photos: [
        { url: 'assets/images/hero.jpg', caption: 'Marin views', order: 0, isPrimary: true },
        { url: 'placeholder:Living Room', order: 1, isPrimary: false }
      ],
      listedAt: '2026-04-22T00:00:00.000Z',
      soldAt: null,
      openHouses: [{ date: '2026-05-17', startTime: '1:00 PM', endTime: '4:00 PM' }],
      slug: 'mill-valley-victorian-1923',
      featured: true
    }
    // ... see git history / Phase 1 listings.js for two more samples
  ];
  */

  // ---------- In-memory cache populated by Firestore ----------
  var CACHE = [];
  var readyResolve;
  var readyPromise = new Promise(function (res) { readyResolve = res; });
  var liveUnsub = null;
  var subscribers = [];
  var hasFirstSnapshot = false;

  // Normalize a Firestore doc into the Phase-1 listing shape consumers expect.
  function normalize(snap) {
    var d = snap.data() || {};
    // listedAt may arrive as a Firestore Timestamp; expose ISO for legacy code.
    var listedAtIso = null;
    if (d.listedAt && typeof d.listedAt.toDate === 'function') {
      listedAtIso = d.listedAt.toDate().toISOString();
    } else if (typeof d.listedAt === 'string') {
      listedAtIso = d.listedAt;
    }
    var soldAtIso = null;
    if (d.soldAt && typeof d.soldAt.toDate === 'function') {
      soldAtIso = d.soldAt.toDate().toISOString();
    } else if (typeof d.soldAt === 'string') {
      soldAtIso = d.soldAt;
    }
    return {
      id: snap.id,
      status: d.status || 'active',
      listPrice: typeof d.listPrice === 'number' ? d.listPrice : null,
      soldPrice: typeof d.soldPrice === 'number' ? d.soldPrice : null,
      address: d.address || { street: '', city: '', state: 'CA', zip: '' },
      beds: typeof d.beds === 'number' ? d.beds : 0,
      baths: typeof d.baths === 'number' ? d.baths : 0,
      halfBaths: typeof d.halfBaths === 'number' ? d.halfBaths : null,
      sqft: typeof d.sqft === 'number' ? d.sqft : 0,
      lotSize: d.lotSize || null,
      yearBuilt: typeof d.yearBuilt === 'number' ? d.yearBuilt : null,
      mlsNumber: d.mlsNumber || null,
      description: d.description || '',
      features: Array.isArray(d.features) ? d.features : [],
      photos: Array.isArray(d.photos) ? d.photos : [],
      video: (d.video && d.video.url) ? { url: d.video.url, storagePath: d.video.storagePath || null } : null,
      listedAt: listedAtIso,
      soldAt: soldAtIso,
      openHouses: Array.isArray(d.openHouses) ? d.openHouses : [],
      slug: d.slug || snap.id,
      featured: !!d.featured
    };
  }

  // Start a single live subscription against /listings ordered by listedAt desc.
  // All subscribers + the in-memory cache feed from this one stream.
  function startLiveSubscription() {
    if (liveUnsub) return;
    var fb = window.MB.firebase;
    if (!fb || !fb.db || !fb.fs) {
      // Firebase not loaded — likely a network failure or the firebase-init.js
      // module didn't run. Resolve ready with an empty list so consumers stop waiting.
      hasFirstSnapshot = true;
      readyResolve();
      return;
    }
    var fs = fb.fs;
    try {
      var q = fs.query(fs.collection(fb.db, 'listings'), fs.orderBy('listedAt', 'desc'));
      liveUnsub = fs.onSnapshot(q, function (snap) {
        CACHE = snap.docs.map(normalize);
        hasFirstSnapshot = true;
        readyResolve();
        // Fan out to all subscribers
        subscribers.slice().forEach(function (cb) {
          try { cb(CACHE.slice()); } catch (e) { /* swallow */ }
        });
      }, function (err) {
        // Permission denied, network failure, missing index, etc.
        // eslint-disable-next-line no-console
        console.warn('[MB.listings] Firestore subscription error:', err && err.message);
        hasFirstSnapshot = true;
        readyResolve();
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[MB.listings] Failed to start subscription:', e && e.message);
      hasFirstSnapshot = true;
      readyResolve();
    }
  }

  // Wait for window.MB.firebase to be present (firebase-init.js is a module
  // and may resolve a tick after this classic script parses). We listen for
  // the custom event AND fall back to a short poll.
  function whenFirebaseReady(cb) {
    if (window.MB.firebase && window.MB.firebase.db) { cb(); return; }
    var done = false;
    function finish() { if (done) return; done = true; cb(); }
    window.addEventListener('mb:firebase-ready', finish, { once: true });
    // Hard ceiling so we don't hang forever if firebase-init.js failed to load
    var tries = 0;
    var iv = setInterval(function () {
      tries += 1;
      if (window.MB.firebase && window.MB.firebase.db) {
        clearInterval(iv);
        finish();
      } else if (tries > 40) { // ~4 seconds
        clearInterval(iv);
        finish();
      }
    }, 100);
  }

  whenFirebaseReady(startLiveSubscription);

  // ---------- Public API ----------
  MB.listings = {
    ready: readyPromise,

    /**
     * Get all listings, optionally filtered by status.
     * filter: 'all' | 'active' | 'pending' | 'sold' (case-insensitive)
     * Sync — call after awaiting MB.listings.ready.
     */
    getAll: function (filter) {
      var data = CACHE.slice();
      if (!filter || String(filter).toLowerCase() === 'all') return data;
      var f = String(filter).toLowerCase();
      return data.filter(function (l) { return l.status === f; });
    },

    /**
     * Get a single listing by id.
     * Sync — call after awaiting MB.listings.ready.
     */
    getById: function (id) {
      if (!id) return null;
      var found = CACHE.filter(function (l) { return l.id === id; });
      return found.length ? found[0] : null;
    },

    /**
     * Get featured listings, optionally capped to `limit`.
     * Sync — call after awaiting MB.listings.ready.
     */
    getFeatured: function (limit) {
      var featured = CACHE.filter(function (l) { return !!l.featured; });
      if (typeof limit === 'number' && limit > 0) featured = featured.slice(0, limit);
      return featured;
    },

    /**
     * Live subscription. cb(items) is invoked on every snapshot, including
     * the first one. Returns an unsubscribe function.
     */
    subscribeAll: function (cb) {
      if (typeof cb !== 'function') return function () {};
      subscribers.push(cb);
      // Fire immediately if we already have data
      if (hasFirstSnapshot) {
        try { cb(CACHE.slice()); } catch (e) { /* swallow */ }
      }
      return function unsubscribe() {
        var i = subscribers.indexOf(cb);
        if (i >= 0) subscribers.splice(i, 1);
      };
    }
  };

  // ---------- Rendering helpers (shared by index + for-sale) ----------
  MB.renderListingCard = function (l) {
    var u = MB.util;
    var primary = (l.photos || []).filter(function (p) { return p.isPrimary; })[0] || (l.photos || [])[0];
    var media = MB.renderPhoto(primary, l.address.street + ', ' + l.address.city);
    var statusLabel = l.status === 'active' ? 'For Sale'
                    : l.status === 'pending' ? 'Pending'
                    : 'Sold';
    var price = l.status === 'sold' && l.soldPrice
      ? u.formatPrice(l.soldPrice)
      : u.formatPrice(l.listPrice);

    var beds = (l.beds || 0) + (l.beds === 1 ? ' Bed' : ' Beds');
    var baths = (l.baths || 0) + (l.halfBaths ? '½' : '') + ((l.baths === 1 && !l.halfBaths) ? ' Bath' : ' Baths');
    var sqft = l.sqft ? u.formatNumber(l.sqft) + ' sq ft' : '';

    return ''
      + '<article class="card">'
      +   '<a class="card__media" href="listing.html?id=' + encodeURIComponent(l.id) + '" aria-label="View ' + u.escapeHtml(l.address.street) + '">'
      +     media
      +     '<span class="card__status card__status--' + l.status + '">' + statusLabel + '</span>'
      +   '</a>'
      +   '<div class="card__body">'
      +     '<div class="card__price">' + price + '</div>'
      +     '<div class="card__address">'
      +       '<strong>' + u.escapeHtml(l.address.street) + '</strong>'
      +       u.escapeHtml(l.address.city) + ', ' + u.escapeHtml(l.address.state) + ' ' + u.escapeHtml(l.address.zip)
      +     '</div>'
      +     '<div class="card__stats" aria-label="Property statistics">'
      +       '<span>' + bedIcon() + beds + '</span>'
      +       '<span>' + bathIcon() + baths + '</span>'
      +       (sqft ? '<span>' + sqftIcon() + sqft + '</span>' : '')
      +     '</div>'
      +     '<a class="card__link" href="listing.html?id=' + encodeURIComponent(l.id) + '">View details</a>'
      +   '</div>'
      + '</article>';
  };

  // Render a photo (or SVG placeholder if url starts with "placeholder:")
  MB.renderPhoto = function (photo, altText) {
    if (!photo) return MB.placeholderSvg('Photos coming soon');
    if (typeof photo.url === 'string' && photo.url.indexOf('placeholder:') === 0) {
      var label = photo.url.slice('placeholder:'.length);
      return MB.placeholderSvg(label);
    }
    var alt = MB.util.escapeHtml(photo.caption || altText || '');
    return '<img src="' + MB.util.escapeHtml(photo.url) + '" alt="' + alt + '" loading="lazy">';
  };

  // Inline SVG placeholder — warm cream w/ ink text + subtle frame
  MB.placeholderSvg = function (label) {
    var safe = MB.util.escapeHtml(label || 'Photo');
    return ''
      + '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + safe + ' photo placeholder" preserveAspectRatio="xMidYMid slice">'
      +   '<rect width="800" height="600" fill="#f1ece2"/>'
      +   '<rect x="24" y="24" width="752" height="552" fill="none" stroke="#a8854c" stroke-width="1" stroke-dasharray="4 6"/>'
      +   '<text x="400" y="290" font-family="Cormorant Garamond, Georgia, serif" font-size="36" fill="#1a1f24" text-anchor="middle">' + safe + '</text>'
      +   '<text x="400" y="335" font-family="Inter, sans-serif" font-size="14" letter-spacing="3" fill="#7a7e84" text-anchor="middle">PHOTOS COMING SOON</text>'
      + '</svg>';
  };

  // ---- icons (no FontAwesome, no emoji) ----
  function bedIcon()  { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 18V8h7a4 4 0 0 1 4 4h7v6"/><path d="M3 18v3"/><path d="M21 18v3"/></svg>'; }
  function bathIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12V6a2 2 0 0 1 4 0"/><path d="M2 12h20v3a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-3z"/><path d="M6 19v2M18 19v2"/></svg>'; }
  function sqftIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 3v18"/></svg>'; }
})();
