/* ===========================================================
   WEBSITE ANALYTICS PANEL
   Reads the first-party counters written by assets/js/analytics.js,
   plus the existing lead collections (which already carry history).

   ⚠ STAGE reads the *Preview collections so preview traffic and Marie's
     real numbers never mix — same rule analytics.js uses to write.
   ⚠ Days with no traffic write NO document. Missing days are zero, not
     gaps: the range is built from the calendar, then filled from Firestore.
   =========================================================== */
(function () {
  'use strict';

  var IS_STAGE   = window.location.pathname.indexOf('/STAGE/') !== -1;
  var STATS_COLL = IS_STAGE ? 'siteStatsPreview'    : 'siteStats';
  var LIST_COLL  = IS_STAGE ? 'listingStatsPreview' : 'listingStats';

  var anInitialized = false;
  var anRange = 30;

  var elKpis   = document.getElementById('an-kpis');
  var elChart  = document.getElementById('an-chart');
  var elTip    = document.getElementById('an-tip');
  var elPages  = document.getElementById('an-pages');
  var elRefs   = document.getElementById('an-refs');
  var elLists  = document.getElementById('an-listings');
  var elStatus = document.getElementById('an-status');
  var elSub    = document.getElementById('an-chart-sub');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function num(n) { return (n || 0).toLocaleString('en-US'); }

  // Marie's timezone, matching analytics.js — otherwise "today" disagrees.
  function dayKeyFor(d) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit'
      }).format(d);
    } catch (e) { return d.toISOString().slice(0,10); }
  }
  function dayList(n) {
    var out = [], now = Date.now();
    for (var i = n - 1; i >= 0; i--) out.push(dayKeyFor(new Date(now - i * 86400000)));
    return out;
  }
  function prettyDay(key) {
    var p = key.split('-');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[Number(p[1]) - 1] + ' ' + Number(p[2]);
  }
  var PAGE_LABELS = {
    home:'Home', about:'About', 'for-sale':'For Sale', listing:'Listing detail',
    'wish-list':'Wish List', 'home-value':'Home Value', guides:'Guides',
    contact:'Contact', '404':'Page not found'
  };
  function pageLabel(k) { return PAGE_LABELS[k] || k; }
  function refLabel(k) {
    if (k === 'direct') return 'Direct / typed in';
    if (k === 'internal') return 'Within the site';
    return k.charAt(0).toUpperCase() + k.slice(1);
  }

  function rankTable(obj, labeller, emptyMsg) {
    var rows = Object.keys(obj || {})
      .map(function (k) { return { k: k, n: obj[k] || 0 }; })
      .filter(function (r) { return r.n > 0; })
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, 8);
    if (!rows.length) return '<p class="an-empty">' + esc(emptyMsg) + '</p>';
    var max = rows[0].n;
    return '<table class="an-table"><thead><tr><th>' + '' + '</th><th>Views</th></tr></thead><tbody>'
      + rows.map(function (r) {
          var pct = max ? Math.round((r.n / max) * 100) : 0;
          return '<tr><td class="an-bar-cell" style="--w:' + pct + '%"><span>'
               + esc(labeller(r.k)) + '</span></td><td>' + num(r.n) + '</td></tr>';
        }).join('')
      + '</tbody></table>';
  }

  // ---- single-series bar chart, inline SVG, no libraries ----
  function drawChart(days, values) {
    var W = 760, H = 220, PAD_L = 34, PAD_R = 8, PAD_T = 12, PAD_B = 26;
    var plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
    var max = Math.max.apply(null, values.concat([1]));
    // round the axis top to something friendly
    var step = Math.pow(10, Math.floor(Math.log10(max)));
    var top = Math.ceil(max / step) * step || 1;

    var slot = plotW / days.length;
    var gap  = Math.min(2, slot * 0.18);          // 2px surface gap between bars
    var bw   = Math.max(1, slot - gap);
    var r    = Math.min(4, bw / 2);               // 4px rounded data-end

    var bars = values.map(function (v, i) {
      var h = top ? (v / top) * plotH : 0;
      var x = PAD_L + i * slot + gap / 2;
      var y = PAD_T + plotH - h;
      if (h <= 0) return '';
      var rr = Math.min(r, h);
      return '<path d="M' + x + ' ' + (y + h)
           + 'L' + x + ' ' + (y + rr)
           + 'Q' + x + ' ' + y + ' ' + (x + rr) + ' ' + y
           + 'L' + (x + bw - rr) + ' ' + y
           + 'Q' + (x + bw) + ' ' + y + ' ' + (x + bw) + ' ' + (y + rr)
           + 'L' + (x + bw) + ' ' + (y + h) + 'Z" fill="#a8854c"></path>';
    }).join('');

    // hit targets are full-height, so hovering never requires precision
    var hits = days.map(function (d, i) {
      var x = PAD_L + i * slot;
      return '<rect class="an-hit" data-i="' + i + '" x="' + x + '" y="' + PAD_T
           + '" width="' + slot + '" height="' + plotH + '" fill="transparent"></rect>';
    }).join('');

    var gridVals = [0, top / 2, top];
    var grid = gridVals.map(function (g) {
      var y = PAD_T + plotH - (top ? (g / top) * plotH : 0);
      return '<line x1="' + PAD_L + '" y1="' + y + '" x2="' + (W - PAD_R) + '" y2="' + y
           + '" stroke="#e8e2d4" stroke-width="1"></line>'
           + '<text x="' + (PAD_L - 6) + '" y="' + (y + 3.5)
           + '" text-anchor="end" font-family="Inter,sans-serif" font-size="9" fill="#7a7e84">'
           + Math.round(g) + '</text>';
    }).join('');

    // label roughly six dates, never every one
    var every = Math.max(1, Math.round(days.length / 6));
    var xlabels = days.map(function (d, i) {
      if (i % every !== 0 && i !== days.length - 1) return '';
      var x = PAD_L + i * slot + slot / 2;
      return '<text x="' + x + '" y="' + (H - 8) + '" text-anchor="middle" '
           + 'font-family="Inter,sans-serif" font-size="9" fill="#7a7e84">'
           + esc(prettyDay(d)) + '</text>';
    }).join('');

    elChart.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" '
      + 'aria-label="Page views per day for the last ' + days.length + ' days">'
      + grid + bars + xlabels + hits + '</svg>'
      + '<div class="an-tip" id="an-tip"></div>';

    var tip = document.getElementById('an-tip');
    var svg = elChart.querySelector('svg');
    elChart.querySelectorAll('.an-hit').forEach(function (h) {
      h.addEventListener('mouseenter', function () {
        var i = Number(h.getAttribute('data-i'));
        var box = svg.getBoundingClientRect();
        var scale = box.width / W;
        tip.textContent = prettyDay(days[i]) + ' · ' + num(values[i])
          + (values[i] === 1 ? ' view' : ' views');
        tip.style.left = ((PAD_L + i * slot + slot / 2) * scale) + 'px';
        tip.style.top  = (PAD_T * scale) + 'px';
        tip.classList.add('is-on');
      });
      h.addEventListener('mouseleave', function () { tip.classList.remove('is-on'); });
    });
  }

  function kpi(value, label, sub) {
    return '<div class="an-kpi"><div class="an-kpi__value">' + value + '</div>'
         + '<div class="an-kpi__label">' + esc(label) + '</div>'
         + (sub ? '<div class="an-kpi__sub">' + esc(sub) + '</div>' : '') + '</div>';
  }

  function anLoad() {
    var fb = window.MB && window.MB.firebase;
    if (!fb || !fb.db || !fb.fs) { elStatus.textContent = 'Not connected.'; return; }
    var fs = fb.db ? fb.fs : null;
    elStatus.textContent = 'Loading…';

    var days = dayList(anRange);
    var from = days[0];
    var fromDate = new Date(Date.now() - (anRange - 1) * 86400000);
    fromDate.setHours(0, 0, 0, 0);

    // traffic
    var qStats = fs.query(fs.collection(fb.db, STATS_COLL),
                          fs.where('date', '>=', from), fs.orderBy('date'));

    // leads — these collections already hold history, so these numbers are
    // real from day one rather than starting at zero like the traffic counters
    var leadCols = ['guideDownloads','contactInquiries','homeValuationLeads',
                    'wishListSubmissions','openHouseRSVPs'];
    var ts = fs.Timestamp.fromDate(fromDate);

    Promise.all([
      fs.getDocs(qStats),
      fs.getDocs(fs.collection(fb.db, LIST_COLL))
    ].concat(leadCols.map(function (c) {
      return fs.getDocs(fs.query(fs.collection(fb.db, c), fs.where('createdAt', '>=', ts)))
        .catch(function () { return { size: 0, forEach: function () {} }; });
    })))
    .then(function (res) {
      var statsSnap = res[0], listSnap = res[1];
      var leadCounts = {};
      leadCols.forEach(function (c, i) { leadCounts[c] = res[2 + i].size || 0; });

      var byDay = {}, pages = {}, refs = {}, devices = {}, views = 0, visitors = 0;
      statsSnap.forEach(function (d) {
        var v = d.data() || {};
        byDay[v.date || d.id] = v.views || 0;
        views    += v.views    || 0;
        visitors += v.visitors || 0;
        ['pages','referrers','devices'].forEach(function (k) {
          var src = v[k] || {}, dst = k === 'pages' ? pages : (k === 'referrers' ? refs : devices);
          Object.keys(src).forEach(function (kk) { dst[kk] = (dst[kk] || 0) + (src[kk] || 0); });
        });
      });

      // calendar-driven so a quiet day is a zero bar, not a missing one
      var values = days.map(function (d) { return byDay[d] || 0; });

      var enquiries = leadCounts.contactInquiries + leadCounts.homeValuationLeads
                    + leadCounts.wishListSubmissions + leadCounts.openHouseRSVPs;
      var mobilePct = (devices.mobile || devices.desktop)
        ? Math.round((devices.mobile || 0) / ((devices.mobile || 0) + (devices.desktop || 0)) * 100)
        : null;

      elKpis.innerHTML =
          kpi(num(visitors), 'Visitors', 'browsing sessions')
        + kpi(num(views), 'Page views', mobilePct != null ? mobilePct + '% on a phone' : '')
        + kpi(num(leadCounts.guideDownloads), 'Guide downloads', 'buyer + seller guides')
        + kpi(num(enquiries), 'New enquiries', 'contact, wish list, valuations, RSVPs');

      elSub.textContent = views
        ? prettyDay(days[0]) + ' – ' + prettyDay(days[days.length - 1])
        : 'No traffic recorded in this period yet';
      drawChart(days, values);

      elPages.innerHTML = rankTable(pages, pageLabel, 'No page views recorded yet.');
      elRefs.innerHTML  = rankTable(refs, refLabel, 'No referrers recorded yet.');

      var lrows = [];
      listSnap.forEach(function (d) { lrows.push({ id: d.id, n: (d.data() || {}).views || 0 }); });
      lrows.sort(function (a, b) { return b.n - a.n; });
      lrows = lrows.slice(0, 8);
      if (!lrows.length) {
        elLists.innerHTML = '<p class="an-empty">No listing views recorded yet.</p>';
      } else {
        var max = lrows[0].n;
        elLists.innerHTML = '<table class="an-table"><thead><tr><th>Listing</th><th>Views</th></tr></thead><tbody>'
          + lrows.map(function (r) {
              var label = r.id;
              try {
                if (window.MB && MB.listings && MB.listings.getById) {
                  var l = MB.listings.getById(r.id);
                  if (l && l.address) label = l.address.street + ', ' + l.address.city;
                }
              } catch (e) {}
              var pct = max ? Math.round((r.n / max) * 100) : 0;
              return '<tr><td class="an-bar-cell" style="--w:' + pct + '%"><span>'
                   + esc(label) + '</span></td><td>' + num(r.n) + '</td></tr>';
            }).join('')
          + '</tbody></table>';
      }

      elStatus.textContent = IS_STAGE
        ? 'Showing STAGE preview traffic'
        : 'Updated ' + new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
    })
    .catch(function (err) {
      elStatus.textContent = 'Could not load analytics.';
      if (window.console) console.warn('[analytics panel]', err && err.message);
    });
  }

  document.querySelectorAll('[data-an-range]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('[data-an-range]').forEach(function (x) {
        x.classList.toggle('is-active', x === b);
      });
      anRange = Number(b.getAttribute('data-an-range')) || 30;
      anLoad();
    });
  });
  var anRefresh = document.getElementById('an-refresh');
  if (anRefresh) anRefresh.addEventListener('click', anLoad);

  document.querySelectorAll('.cms-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (tab.getAttribute('data-tab') === 'analytics' && !anInitialized) {
        anInitialized = true;
        anLoad();
      }
    });
  });
})();
