/* Marie Borders — listing detail page logic
 * Reads ?id=<listingId>, renders gallery + content, wires up inquire CTAs.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function renderGallery(photos) {
    var mainEl = document.getElementById('gallery-main');
    var thumbsEl = document.getElementById('gallery-thumbs');
    if (!mainEl) return;

    if (!photos || !photos.length) {
      mainEl.innerHTML = MB.placeholderSvg('Photos coming soon');
      if (thumbsEl) thumbsEl.style.display = 'none';
      return;
    }

    // Sort: primary first, then by order
    var sorted = photos.slice().sort(function (a, b) {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.order || 0) - (b.order || 0);
    });

    var current = 0;
    var multi = sorted.length > 1;

    function counterHtml(idx) {
      return multi
        ? '<div class="gallery__counter">' + (idx + 1) + ' / ' + sorted.length + '</div>'
        : '';
    }

    function show(idx) {
      current = (idx + sorted.length) % sorted.length;
      mainEl.innerHTML = MB.renderPhoto(sorted[current], 'Listing photo ' + (current + 1)) + counterHtml(current);
      if (thumbsEl) {
        thumbsEl.querySelectorAll('.gallery__thumb').forEach(function (btn, i) {
          btn.classList.toggle('is-active', i === current);
          btn.setAttribute('aria-pressed', i === current ? 'true' : 'false');
        });
      }
    }

    // Initial main + counter
    mainEl.innerHTML = MB.renderPhoto(sorted[0], 'Listing photo 1') + counterHtml(0);

    // Click-to-advance (left half = prev, right half = next).
    // Only meaningful when there's more than one photo; otherwise the click
    // would be a no-op and we shouldn't suggest interactivity with a pointer.
    if (multi) {
      mainEl.classList.add('is-clickable');
      mainEl.setAttribute('aria-label', 'Click left side for previous photo, right side for next');
      mainEl.addEventListener('click', function (e) {
        var rect = mainEl.getBoundingClientRect();
        var x = e.clientX - rect.left;
        if (x < rect.width / 2) {
          show(current - 1);
        } else {
          show(current + 1);
        }
      });
      // Cursor hint — west-resize / east-resize render as ←/→ on most platforms.
      mainEl.addEventListener('mousemove', function (e) {
        var rect = mainEl.getBoundingClientRect();
        var x = e.clientX - rect.left;
        mainEl.style.cursor = (x < rect.width / 2) ? 'w-resize' : 'e-resize';
      });
      mainEl.addEventListener('mouseleave', function () {
        mainEl.style.cursor = '';
      });
    }

    // Thumbnails (hide if only one)
    if (!thumbsEl) return;
    if (!multi) { thumbsEl.style.display = 'none'; return; }

    thumbsEl.innerHTML = sorted.map(function (p, i) {
      return '<button class="gallery__thumb' + (i === 0 ? ' is-active' : '') + '" type="button" data-idx="' + i + '" aria-label="Show photo ' + (i + 1) + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">'
           + MB.renderPhoto(p, 'Photo ' + (i + 1))
           + '</button>';
    }).join('');

    thumbsEl.querySelectorAll('.gallery__thumb').forEach(function (btn) {
      btn.addEventListener('click', function () {
        show(parseInt(btn.getAttribute('data-idx'), 10));
      });
    });

    // Keyboard navigation when focus is within the gallery area
    var galleryRoot = document.getElementById('gallery-root');
    if (galleryRoot) {
      galleryRoot.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { show(current + 1); e.preventDefault(); }
        else if (e.key === 'ArrowLeft') { show(current - 1); e.preventDefault(); }
      });
    }
  }

  function render(listing) {
    var u = MB.util;
    document.title = listing.address.street + ', ' + listing.address.city + ' | Marie Borders';

    // Gallery
    renderGallery(listing.photos || []);

    // Head
    document.getElementById('detail-street').textContent = listing.address.street;
    document.getElementById('detail-citystate').textContent =
      listing.address.city + ', ' + listing.address.state + ' ' + listing.address.zip;

    var statusLabel = listing.status === 'active' ? 'For Sale'
                    : listing.status === 'pending' ? 'Pending'
                    : 'Sold';
    var pill = document.getElementById('detail-status');
    pill.textContent = statusLabel;
    pill.className = 'pill pill--' + listing.status;

    // CTA copy adapts to status: sold listings can't be bought, so the inquire
    // box pivots to "find a home like this" instead of "schedule a showing".
    var inquireTitle = document.getElementById('inquire-title');
    var inquireBody  = document.getElementById('inquire-body');
    var inquireCta   = document.getElementById('inquire-cta');
    var mobileCta    = document.getElementById('inquire-bar-mobile-cta');
    if (inquireTitle && inquireBody && inquireCta) {
      if (listing.status === 'sold') {
        inquireTitle.textContent = 'Interested in a home similar to this one?';
        inquireBody.textContent  = "This one's sold, but Marie can help you find another like it. Tell her what you're looking for and she'll send matching listings as they come up.";
        inquireCta.textContent   = 'Find a Home Like This';
        if (mobileCta) mobileCta.textContent = 'Find a Home Like This';
      } else if (listing.status === 'pending') {
        inquireTitle.textContent = 'Interested in this home?';
        inquireBody.textContent  = "It's currently in contract, but backup offers are welcome — and Marie can flag it if it comes back on market.";
        inquireCta.textContent   = 'Inquire Now';
        if (mobileCta) mobileCta.textContent = 'Inquire About This Property';
      }
      // active uses the static HTML defaults — no override needed
    }

    var price = listing.status === 'sold' && listing.soldPrice
      ? u.formatPrice(listing.soldPrice)
      : u.formatPrice(listing.listPrice);
    document.getElementById('detail-price').textContent = price;

    var mlsEl = document.getElementById('detail-mls');
    if (listing.mlsNumber) {
      mlsEl.textContent = 'MLS #' + listing.mlsNumber;
    } else {
      mlsEl.style.display = 'none';
    }

    // Stats
    var stats = document.getElementById('detail-stats');
    var items = [];
    if (listing.beds)      items.push({ num: listing.beds, label: listing.beds === 1 ? 'Bed' : 'Beds' });
    if (listing.baths)     items.push({ num: listing.baths + (listing.halfBaths ? '½' : ''), label: (listing.baths === 1 && !listing.halfBaths) ? 'Bath' : 'Baths' });
    if (listing.sqft)      items.push({ num: u.formatNumber(listing.sqft), label: 'Sq Ft' });
    if (listing.lotSize)   items.push({ num: listing.lotSize, label: 'Lot' });
    if (listing.yearBuilt) items.push({ num: listing.yearBuilt, label: 'Built' });
    stats.innerHTML = items.map(function (it) {
      return '<div class="detail-stats__item">'
           +   '<span class="detail-stats__num">' + u.escapeHtml(String(it.num)) + '</span>'
           +   '<span class="detail-stats__label">' + u.escapeHtml(it.label) + '</span>'
           + '</div>';
    }).join('');

    // Description
    var descEl = document.getElementById('detail-description');
    if (listing.description) {
      descEl.textContent = listing.description;
    } else {
      descEl.closest('.detail-section').style.display = 'none';
    }

    // Features
    var featSection = document.getElementById('detail-features-section');
    if (listing.features && listing.features.length) {
      var ul = document.getElementById('detail-features');
      ul.innerHTML = listing.features.map(function (f) {
        return '<li>' + u.escapeHtml(f) + '</li>';
      }).join('');
    } else {
      featSection.style.display = 'none';
    }

    // Open houses
    var ohSection = document.getElementById('detail-openhouses-section');
    if (listing.openHouses && listing.openHouses.length) {
      var oh = document.getElementById('detail-openhouses');
      var listingAddr = listing.address.street + ', ' + listing.address.city;
      oh.innerHTML = listing.openHouses.map(function (e) {
        var dateLabel = fmtDate(e.date);
        var timeLabel = e.startTime + ' – ' + e.endTime;
        return '<li><time datetime="' + u.escapeHtml(e.date) + '">' + u.escapeHtml(dateLabel) + '</time>'
             + '<span>' + u.escapeHtml(timeLabel) + '</span>'
             + '<button type="button" class="oh-rsvp-btn" data-rsvp-listing="' + u.escapeHtml(listing.id) + '"'
             + ' data-rsvp-address="' + u.escapeHtml(listingAddr) + '"'
             + ' data-rsvp-date="' + u.escapeHtml(e.date) + '"'
             + ' data-rsvp-date-label="' + u.escapeHtml(dateLabel) + '"'
             + ' data-rsvp-time="' + u.escapeHtml(timeLabel) + '">RSVP</button>'
             + '</li>';
      }).join('');
    } else {
      ohSection.style.display = 'none';
    }

    // Inquire CTAs — both sticky sidebar and mobile bottom bar
    var addrFull = listing.address.street + ', ' + listing.address.city + ', ' + listing.address.state + ' ' + listing.address.zip;
    var qs = '?listing=' + encodeURIComponent(listing.id) + '&address=' + encodeURIComponent(addrFull);
    document.querySelectorAll('[data-inquire-link]').forEach(function (a) {
      a.setAttribute('href', 'contact.html' + qs);
    });
    document.body.classList.add('has-mobile-bar');
  }

  function renderNotFound() {
    document.title = 'Listing not found | Marie Borders';
    var root = document.getElementById('listing-root');
    if (!root) return;
    root.innerHTML = ''
      + '<div class="notfound" style="min-height:50vh;">'
      +   '<h1>Listing not found</h1>'
      +   '<p>We couldn’t find the listing you were looking for. It may have closed escrow or been removed.</p>'
      +   '<a class="btn" href="for-sale.html">View current listings</a>'
      + '</div>';
  }

  function init() {
    var id = MB.util.getQueryParam('id');
    if (!id) { renderNotFound(); return; }
    // Wait for the first Firestore snapshot before looking up by id.
    MB.listings.ready.then(function () {
      var listing = MB.listings.getById(id);
      if (!listing) { renderNotFound(); return; }
      render(listing);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
