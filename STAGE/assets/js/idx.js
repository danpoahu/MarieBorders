/* Marie Borders — IDX data layer + renderers (RESO Web API)
 * ---------------------------------------------------------------------------
 * This is "option 3" from the BAREIS letter: raw RESO listing data pulled into
 * marieborders.com and rendered as our own branded pages, rather than an
 * iframe of someone else's site.
 *
 * SOURCES
 *   'sample' — MB.idxSampleData (idx-data.js). Fictional records in real RESO
 *              field names. Used while we wait on a Bridge access token.
 *   'live'   — a Cloud Function proxy that holds the token server-side and
 *              forwards to the RESO Property resource. Currently the Bridge
 *              'test' dataset: 10,000 synthetic listings in real RESO fields.
 *              Append ?source=live to any IDX page to use it.
 *
 * WHY A PROXY AND NOT A DIRECT BROWSER FETCH
 *   The Bridge endpoint sends permissive CORS (it reflects our Origin and
 *   allows the Authorization header), so a direct browser call WOULD work.
 *   We deliberately don't: danpoahu/MarieBorders is a public repo, so a token
 *   in static JS is a published token. The proxy also gives us one place to
 *   cache, to enforce the MLS display rules, and to swap the reference feed
 *   for a real BAREIS feed later without touching the front end.
 *
 * SWITCHING TO LIVE DATA
 *   Registration is done; the server token lives in Secret Manager as
 *   BRIDGE_ACCESS_TOKEN (and in the Mac Keychain as "Bridge API server token").
 *   To make live the default for everyone, set SOURCE to 'live' below.
 *   Nothing else in this file or the pages changes.
 * ---------------------------------------------------------------------------
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  var CONFIG = {
    // 'sample' | 'live'
    //
    // Stays 'sample' so the page Daniel shows Marie always renders the Marin
    // preview records. Append ?source=live to any IDX page to exercise the real
    // feed through the proxy without changing what anyone else sees. The
    // override is read below and is deliberately one-way (you can turn live ON
    // via the URL, never force sample off for someone who has it configured).
    SOURCE: 'sample',

    // Cloud Function proxy (deployed alongside the existing mbreal-83286
    // functions). Only used when SOURCE === 'live'.
    PROXY_URL: 'https://us-central1-mbreal-83286.cloudfunctions.net/idxSearch',

    // Results per page.
    PAGE_SIZE: 6,

    // Required by the MLS display rules. The real text comes from BAREIS on
    // licensing; this is the standard IDX form and is a placeholder until they
    // supply theirs.
    DISCLAIMER: 'Listing data is provided for consumers’ personal, non-commercial use and may not be used for any purpose other than to identify prospective properties consumers may be interested in purchasing. Information is deemed reliable but is not guaranteed accurate.'
  };

  // ---------- Status mapping (RESO StandardStatus -> our card vocabulary) ----------
  // RESO uses Active / Active Under Contract / Pending / Closed / Canceled...
  // The site's card CSS only knows active | pending | sold.
  function statusSlug(reso) {
    var s = String(reso.StandardStatus || reso.MlsStatus || '').toLowerCase();
    if (s === 'closed') return 'sold';
    if (s === 'pending' || s === 'active under contract') return 'pending';
    return 'active';
  }

  function statusLabel(slug) {
    return slug === 'active' ? 'For Sale' : slug === 'pending' ? 'Pending' : 'Sold';
  }

  // ---------- Formatting ----------
  function money(n) {
    if (typeof n !== 'number' || !isFinite(n)) return 'Price on request';
    return '$' + n.toLocaleString('en-US');
  }

  function num(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    return n.toLocaleString('en-US');
  }

  // RESO dates arrive as ISO (YYYY-MM-DD or full timestamp). Render them the
  // way a listing sheet would. Parsed by regex, not new Date(), so the string
  // is not shifted a day by the browser's timezone.
  function prettyDate(iso) {
    if (!iso) return null;
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso);
    var months = ['January','February','March','April','May','June','July',
                  'August','September','October','November','December'];
    return months[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1];
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Baths: RESO gives full + half separately. Render the way agents write them.
  function bathLabel(reso) {
    var full = typeof reso.BathroomsFull === 'number' ? reso.BathroomsFull : 0;
    var half = typeof reso.BathroomsHalf === 'number' ? reso.BathroomsHalf : 0;
    if (!full && !half) return '';
    var txt = String(full) + (half ? '½' : '');
    return txt + (full === 1 && !half ? ' Bath' : ' Baths');
  }

  function streetLine(reso) {
    if (reso.StreetNumber || reso.StreetName) {
      return String(reso.StreetNumber || '') + ' ' + String(reso.StreetName || '');
    }
    // Fall back to splitting UnparsedAddress at the first comma.
    var ua = String(reso.UnparsedAddress || '');
    return ua.indexOf(',') > 0 ? ua.slice(0, ua.indexOf(',')) : ua;
  }

  function cityLine(reso) {
    return [reso.City, reso.StateOrProvince].filter(Boolean).join(', ')
         + (reso.PostalCode ? ' ' + reso.PostalCode : '');
  }

  function primaryMedia(reso) {
    var media = Array.isArray(reso.Media) ? reso.Media.slice() : [];
    media.sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });
    return media[0] || null;
  }

  // ---------- Themed photo placeholder ----------
  // Same cream/gold language as MB.placeholderSvg, with a per-listing wash so a
  // grid of them doesn't read as one flat block.
  function placeholderSvg(label, seed) {
    var safe = esc(label || 'Photo');
    var washes = ['#f1ece2', '#efe9de', '#f3eee5', '#ece7dc', '#f2ece0'];
    var wash = washes[Math.abs(hash(String(seed || label))) % washes.length];
    return ''
      + '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + safe + '" preserveAspectRatio="xMidYMid slice">'
      +   '<rect width="800" height="600" fill="' + wash + '"/>'
      +   '<rect x="24" y="24" width="752" height="552" fill="none" stroke="#a8854c" stroke-width="1" stroke-dasharray="4 6"/>'
      +   '<text x="400" y="300" font-family="Cormorant Garamond, Georgia, serif" font-size="34" fill="#1a1f24" text-anchor="middle">' + safe + '</text>'
      +   '<text x="400" y="344" font-family="Inter, sans-serif" font-size="13" letter-spacing="3" fill="#7a7e84" text-anchor="middle">MLS PHOTO</text>'
      + '</svg>';
  }

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return h;
  }

  function renderMedia(media, altText, seed) {
    if (!media || !media.MediaURL) return placeholderSvg('Photos pending', seed);
    var url = String(media.MediaURL);
    if (url.indexOf('placeholder:') === 0) {
      return placeholderSvg(url.slice('placeholder:'.length), seed);
    }
    // A dead photo URL must degrade to the themed placeholder, not leave a
    // broken image with alt text sprawled across the card. Real MLS feeds do
    // ship dead photo links, and the Bridge sandbox's CDN 403s every request.
    return '<img src="' + esc(url) + '" alt="' + esc(altText || '') + '" loading="lazy"'
         + ' data-ph="' + esc(altText || 'Photo') + '" data-seed="' + esc(seed || '') + '"'
         + ' onerror="MB.idx.mediaFallback(this)">';
  }

  // ---------- OData query builder (used by the live path) ----------
  // Kept exercised by tests below in spirit: this is the real filter syntax the
  // Bridge/RESO Property resource expects, so flipping SOURCE actually works.
  function buildODataParams(p, skip) {
    var filters = [];

    if (p.status && p.status !== 'all') {
      if (p.status === 'active')  filters.push("StandardStatus eq 'Active'");
      if (p.status === 'pending') filters.push("(StandardStatus eq 'Pending' or StandardStatus eq 'Active Under Contract')");
      if (p.status === 'sold')    filters.push("StandardStatus eq 'Closed'");
    }
    if (p.city)     filters.push("City eq '" + String(p.city).replace(/'/g, "''") + "'");
    if (p.minPrice) filters.push('ListPrice ge ' + Number(p.minPrice));
    if (p.maxPrice) filters.push('ListPrice le ' + Number(p.maxPrice));
    if (p.beds)     filters.push('BedroomsTotal ge ' + Number(p.beds));
    if (p.baths)    filters.push('BathroomsTotalInteger ge ' + Number(p.baths));
    if (p.type)     filters.push("PropertySubType eq '" + String(p.type).replace(/'/g, "''") + "'");

    var order = p.sort === 'price-asc'  ? 'ListPrice asc'
              : p.sort === 'price-desc' ? 'ListPrice desc'
              : p.sort === 'beds-desc'  ? 'BedroomsTotal desc'
              : 'OnMarketDate desc';

    return {
      '$filter': filters.join(' and '),
      '$orderby': order,
      '$top': CONFIG.PAGE_SIZE,
      '$skip': skip || 0,
      '$count': 'true'
    };
  }

  // ---------- Sample-source filtering (mirrors the OData semantics above) ----------
  function querySample(p, skip) {
    var items = (MB.idxSampleData || []).slice();

    if (p.status && p.status !== 'all') {
      items = items.filter(function (r) { return statusSlug(r) === p.status; });
    }
    if (p.city)     items = items.filter(function (r) { return r.City === p.city; });
    if (p.minPrice) items = items.filter(function (r) { return (r.ListPrice || 0) >= Number(p.minPrice); });
    if (p.maxPrice) items = items.filter(function (r) { return (r.ListPrice || 0) <= Number(p.maxPrice); });
    if (p.beds)     items = items.filter(function (r) { return (r.BedroomsTotal || 0) >= Number(p.beds); });
    if (p.baths)    items = items.filter(function (r) { return (r.BathroomsTotalInteger || 0) >= Number(p.baths); });
    if (p.type)     items = items.filter(function (r) { return r.PropertySubType === p.type; });

    items.sort(function (a, b) {
      if (p.sort === 'price-asc')  return (a.ListPrice || 0) - (b.ListPrice || 0);
      if (p.sort === 'price-desc') return (b.ListPrice || 0) - (a.ListPrice || 0);
      if (p.sort === 'beds-desc')  return (b.BedroomsTotal || 0) - (a.BedroomsTotal || 0);
      return String(b.OnMarketDate || '').localeCompare(String(a.OnMarketDate || ''));
    });

    var total = items.length;
    var start = skip || 0;
    return Promise.resolve({
      items: items.slice(start, start + CONFIG.PAGE_SIZE),
      total: total,
      hasMore: start + CONFIG.PAGE_SIZE < total
    });
  }

  function queryLive(p, skip) {
    var qs = buildODataParams(p, skip);
    var url = CONFIG.PROXY_URL + '?' + Object.keys(qs)
      .filter(function (k) { return qs[k] !== '' && qs[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(qs[k]); })
      .join('&');

    return fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('IDX proxy returned ' + res.status);
        return res.json();
      })
      .then(function (json) {
        var items = json.value || [];
        var total = typeof json['@odata.count'] === 'number' ? json['@odata.count'] : items.length;
        return { items: items, total: total, hasMore: (skip || 0) + items.length < total };
      });
  }

  // URL override: ?source=live exercises the proxy against the real feed.
  try {
    if (typeof window !== 'undefined' && window.location &&
        /[?&]source=live\b/.test(window.location.search)) {
      CONFIG.SOURCE = 'live';
    }
  } catch (e) { /* non-browser context (node smoke tests) */ }

  // ---------- Public API ----------
  MB.idx = {
    config: CONFIG,
    isSample: function () { return CONFIG.SOURCE === 'sample'; },
    statusSlug: statusSlug,
    money: money,

    /** Cities present in the current dataset, for the city dropdown. */
    cities: function () {
      var seen = {};
      (MB.idxSampleData || []).forEach(function (r) { if (r.City) seen[r.City] = true; });
      return Object.keys(seen).sort();
    },

    /** Property subtypes present in the current dataset. */
    types: function () {
      var seen = {};
      (MB.idxSampleData || []).forEach(function (r) { if (r.PropertySubType) seen[r.PropertySubType] = true; });
      return Object.keys(seen).sort();
    },

    /**
     * Run a search.
     * p: { status, city, minPrice, maxPrice, beds, baths, type, sort }
     * Returns Promise<{ items, total, hasMore }>
     */
    query: function (p, skip) {
      p = p || {};
      return CONFIG.SOURCE === 'live' ? queryLive(p, skip) : querySample(p, skip);
    },

    /** Fetch one record by its RESO ListingKey. */
    getByKey: function (key) {
      if (CONFIG.SOURCE === 'live') {
        return fetch(CONFIG.PROXY_URL + '?key=' + encodeURIComponent(key))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { return j && (j.value ? j.value[0] : j) || null; });
      }
      var found = (MB.idxSampleData || []).filter(function (r) { return r.ListingKey === key; });
      return Promise.resolve(found.length ? found[0] : null);
    },

    /**
     * Swap a failed <img> for the themed placeholder. Referenced from an
     * inline onerror, because cards are written with innerHTML and a listener
     * attached afterwards would miss images that fail before it is bound.
     */
    mediaFallback: function (img) {
      if (!img || img.getAttribute('data-fallen') === '1') return;
      img.setAttribute('data-fallen', '1');
      var label = img.getAttribute('data-ph') || 'Photo';
      var seed  = img.getAttribute('data-seed') || label;
      try { img.outerHTML = placeholderSvg(label, seed); } catch (e) { img.style.display = 'none'; }
    },

    /** Card markup — deliberately the same classes as MB.renderListingCard. */
    renderCard: function (reso) {
      var slug = statusSlug(reso);
      var street = streetLine(reso);
      var price = slug === 'sold' && reso.ClosePrice ? money(reso.ClosePrice) : money(reso.ListPrice);
      var beds = (reso.BedroomsTotal || 0) + (reso.BedroomsTotal === 1 ? ' Bed' : ' Beds');
      var baths = bathLabel(reso);
      var sqft = reso.LivingArea ? num(reso.LivingArea) + ' sq ft' : '';
      var href = 'idx-listing.html?key=' + encodeURIComponent(reso.ListingKey);

      return ''
        + '<article class="card">'
        +   '<a class="card__media" href="' + href + '" aria-label="View ' + esc(street) + '">'
        +     renderMedia(primaryMedia(reso), street + ', ' + (reso.City || ''), reso.ListingKey)
        +     '<span class="card__status card__status--' + slug + '">' + statusLabel(slug) + '</span>'
        +   '</a>'
        +   '<div class="card__body">'
        +     '<div class="card__price">' + price + '</div>'
        +     '<div class="card__address">'
        +       '<strong>' + esc(street) + '</strong>'
        +       esc(cityLine(reso))
        +     '</div>'
        +     '<div class="card__stats" aria-label="Property statistics">'
        +       '<span>' + bedIcon() + beds + '</span>'
        +       (baths ? '<span>' + bathIcon() + baths + '</span>' : '')
        +       (sqft ? '<span>' + sqftIcon() + sqft + '</span>' : '')
        +     '</div>'
        +     '<div class="idx-card__mls">MLS# ' + esc(reso.ListingId || reso.ListingKey)
        +       (reso.ListOfficeName ? ' · Courtesy of ' + esc(reso.ListOfficeName) : '')
        +     '</div>'
        +     '<a class="card__link" href="' + href + '">View details</a>'
        +   '</div>'
        + '</article>';
    },

    // Exposed so idx-listing.html can reuse the exact same helpers.
    helpers: {
      esc: esc, money: money, num: num, bathLabel: bathLabel,
      streetLine: streetLine, cityLine: cityLine,
      statusLabel: statusLabel, renderMedia: renderMedia, prettyDate: prettyDate,
      primaryMedia: primaryMedia, placeholderSvg: placeholderSvg,
      bedIcon: bedIcon, bathIcon: bathIcon, sqftIcon: sqftIcon
    },

    _buildODataParams: buildODataParams
  };

  // ---- icons (match listings.js exactly — no FontAwesome, no emoji) ----
  function bedIcon()  { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 18V8h7a4 4 0 0 1 4 4h7v6"/><path d="M3 18v3"/><path d="M21 18v3"/></svg>'; }
  function bathIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12V6a2 2 0 0 1 4 0"/><path d="M2 12h20v3a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-3z"/><path d="M6 19v2M18 19v2"/></svg>'; }
  function sqftIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 3v18"/></svg>'; }
})();
