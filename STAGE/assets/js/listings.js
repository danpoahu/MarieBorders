/* Marie Borders — listings data layer
 * Phase 1: in-memory sample data.
 * PHASE-3: replace SAMPLE_LISTINGS with Firestore query (collection 'listings').
 *
 * Schema contract (DO NOT change field names without coordinating with Phase 3):
 *   id, status, listPrice, soldPrice, address{street,city,state,zip},
 *   beds, baths, halfBaths, sqft, lotSize, yearBuilt, mlsNumber,
 *   description, features[], photos[{url,caption,order,isPrimary}],
 *   listedAt (ISO), soldAt (ISO|null), openHouses[{date,startTime,endTime}],
 *   slug, featured
 *
 * Photo notes:
 *   For Phase 1 we use SVG placeholders generated inline so the page is
 *   credible at review without requiring large binary downloads. Daniel
 *   will swap these for real listing photos once Marie provides them.
 *   The first photo of each listing uses the approved hero.jpg as a
 *   warm "feature" stand-in.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  // ---------- SAMPLE DATA (Phase 1 only) ----------
  // PHASE-3: replace with Firestore query
  var SAMPLE_LISTINGS = [
    {
      id: 'mill-valley-victorian-1923',
      status: 'active',
      listPrice: 2895000,
      soldPrice: null,
      address: {
        street: '127 Lovell Avenue',
        city: 'Mill Valley',
        state: 'CA',
        zip: '94941'
      },
      beds: 4,
      baths: 3,
      halfBaths: 1,
      sqft: 2840,
      lotSize: '0.18 acre',
      yearBuilt: 1923,
      mlsNumber: 'MRN-22481',
      description: 'A beautifully restored Mill Valley Victorian moments from downtown and the Old Mill Park trailhead. Period millwork and original heart-pine floors are paired with a thoughtfully reimagined chef’s kitchen, sun-filled breakfast nook, and a private rear garden anchored by mature live oaks. The primary suite occupies its own upper level with a treetop reading alcove and spa-style bath.',
      features: [
        'Original heart-pine floors',
        'Chef’s kitchen with marble island',
        'Spa-style primary bath',
        'Detached studio / home office',
        'Mature garden with live oaks',
        'Two-car off-street parking',
        'EV-ready electrical service',
        'Walk-to-town location'
      ],
      photos: [
        { url: 'assets/images/hero.jpg', caption: 'Marin views', order: 0, isPrimary: true },
        { url: 'placeholder:Living Room', order: 1, isPrimary: false },
        { url: 'placeholder:Kitchen',     order: 2, isPrimary: false },
        { url: 'placeholder:Garden',      order: 3, isPrimary: false }
      ],
      listedAt: '2026-04-22T00:00:00.000Z',
      soldAt: null,
      openHouses: [
        { date: '2026-05-17', startTime: '1:00 PM', endTime: '4:00 PM' },
        { date: '2026-05-18', startTime: '1:00 PM', endTime: '4:00 PM' }
      ],
      slug: 'mill-valley-victorian-1923',
      featured: true
    },
    {
      id: 'tiburon-bay-view-contemporary',
      status: 'active',
      listPrice: 4650000,
      soldPrice: null,
      address: {
        street: '88 Paradise Drive',
        city: 'Tiburon',
        state: 'CA',
        zip: '94920'
      },
      beds: 5,
      baths: 4,
      halfBaths: 1,
      sqft: 4120,
      lotSize: '0.42 acre',
      yearBuilt: 2008,
      mlsNumber: 'MRN-22512',
      description: 'Sited on a rare south-facing knoll, this contemporary delivers panoramic Bay and San Francisco skyline views from nearly every principal room. Walls of glass open to a wraparound terrace and infinity-edge pool. The lower level offers a guest suite, media room, and a wine cellar appointed in walnut and limestone.',
      features: [
        'Panoramic Bay and skyline views',
        'Infinity-edge pool and spa',
        'Walls of glass to wraparound terrace',
        'Walnut and limestone wine cellar',
        'Lower-level guest suite',
        'Media room with acoustic treatment',
        'Three-car garage with EV charging',
        'Smart-home automation throughout'
      ],
      photos: [
        { url: 'placeholder:Bay View',   order: 0, isPrimary: true },
        { url: 'placeholder:Great Room', order: 1, isPrimary: false },
        { url: 'placeholder:Terrace',    order: 2, isPrimary: false },
        { url: 'placeholder:Pool',       order: 3, isPrimary: false }
      ],
      listedAt: '2026-05-01T00:00:00.000Z',
      soldAt: null,
      openHouses: [
        { date: '2026-05-18', startTime: '2:00 PM', endTime: '4:30 PM' }
      ],
      slug: 'tiburon-bay-view-contemporary',
      featured: true
    },
    {
      id: 'san-anselmo-craftsman-cottage',
      status: 'pending',
      listPrice: 1795000,
      soldPrice: null,
      address: {
        street: '42 Bolinas Avenue',
        city: 'San Anselmo',
        state: 'CA',
        zip: '94960'
      },
      beds: 3,
      baths: 2,
      halfBaths: null,
      sqft: 1680,
      lotSize: '0.12 acre',
      yearBuilt: 1916,
      mlsNumber: 'MRN-22443',
      description: 'Storybook Craftsman cottage just blocks from San Anselmo Avenue. Welcoming front porch, built-in cabinetry, and box-beam ceilings retain the period charm, while a sympathetic kitchen and bath remodel make daily life effortless. A level rear yard offers room for a dining patio, lawn, and raised beds.',
      features: [
        'Period Craftsman millwork',
        'Box-beam dining ceiling',
        'Updated kitchen with quartz counters',
        'Front porch with bench swing',
        'Level rear yard with patio',
        'Detached one-car garage',
        'Walk to San Anselmo Avenue'
      ],
      photos: [
        { url: 'placeholder:Front Elevation', order: 0, isPrimary: true },
        { url: 'placeholder:Living Room',     order: 1, isPrimary: false },
        { url: 'placeholder:Back Yard',       order: 2, isPrimary: false }
      ],
      listedAt: '2026-04-08T00:00:00.000Z',
      soldAt: null,
      openHouses: [],
      slug: 'san-anselmo-craftsman-cottage',
      featured: true
    }
  ];

  // ---------- Public API ----------
  MB.listings = {
    /**
     * Get all listings, optionally filtered by status.
     * filter: 'all' | 'active' | 'pending' | 'sold' (case-insensitive)
     */
    getAll: function (filter) {
      var data = SAMPLE_LISTINGS.slice();
      if (!filter || String(filter).toLowerCase() === 'all') return data;
      var f = String(filter).toLowerCase();
      return data.filter(function (l) { return l.status === f; });
    },

    /**
     * Get a single listing by id.
     */
    getById: function (id) {
      if (!id) return null;
      var found = SAMPLE_LISTINGS.filter(function (l) { return l.id === id; });
      return found.length ? found[0] : null;
    },

    /**
     * Get featured listings, optionally capped to `limit`.
     */
    getFeatured: function (limit) {
      var featured = SAMPLE_LISTINGS.filter(function (l) { return !!l.featured; });
      if (typeof limit === 'number' && limit > 0) featured = featured.slice(0, limit);
      return featured;
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
