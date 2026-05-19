/* Marie Borders — guide renderer
 *
 * Renders a guide data object (matching the schema in guide-defaults.js)
 * into a target container. Step cards are auto-numbered in document order
 * as the renderer encounters them.
 *
 * Public guide pages call MB.guideRenderer.load(type, targetSelector) which:
 *   1. Tries to fetch Firestore `guides/{type}` (if Firebase is loaded)
 *   2. Falls back to MB.guideDefaults[type] if Firestore is empty or down
 *   3. Renders into the target container + updates the page title/cover
 *
 * Inline formatting in text: **bold** -> <strong>, *italic* -> <em>.
 * HTML in text fields is escaped first, so users can't inject tags.
 *
 * Exposed as window.MB.guideRenderer.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Inline formatting — applied AFTER escapeHtml so users can't inject HTML.
  // Order matters: **bold** before *italic* so the doubled stars don't get
  // partially consumed as italic.
  function inlineFormat(text) {
    if (!text) return '';
    var s = escapeHtml(text);
    s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
    return s;
  }

  function renderSection(section, ctx) {
    if (!section || !section.type) return '';
    switch (section.type) {
      case 'h2':
        return '<h2>' + escapeHtml(section.text) + '</h2>';
      case 'h3':
        return '<h3>' + escapeHtml(section.text) + '</h3>';
      case 'p':
        return '<p>' + inlineFormat(section.text) + '</p>';
      case 'quote':
        return '<blockquote>' + inlineFormat(section.text) + '</blockquote>';
      case 'ol': {
        var items = Array.isArray(section.items) ? section.items : [];
        return '<ol>' + items.map(function (i) {
          return '<li>' + inlineFormat(i) + '</li>';
        }).join('') + '</ol>';
      }
      case 'ul': {
        var items2 = Array.isArray(section.items) ? section.items : [];
        return '<ul>' + items2.map(function (i) {
          return '<li>' + inlineFormat(i) + '</li>';
        }).join('') + '</ul>';
      }
      case 'step': {
        ctx.stepCount = (ctx.stepCount || 0) + 1;
        return ''
          + '<div class="step-card">'
          +   '<h3><span class="step-card__num">' + ctx.stepCount + '</span>' + escapeHtml(section.title || '') + '</h3>'
          +   '<p>' + inlineFormat(section.body || '') + '</p>'
          + '</div>';
      }
      default:
        return '';
    }
  }

  /**
   * Render a guide data object into HTML strings for cover + body + closing.
   * Returns { coverEyebrow, coverTitle, coverLede, bodyHtml, closingTitle, closingBody }.
   * The caller decides where to inject each piece (so the cover + closing
   * card structure is locked in the HTML shell — not editable).
   */
  function renderGuide(data) {
    if (!data) data = {};
    var sections = Array.isArray(data.sections) ? data.sections : [];
    var ctx = { stepCount: 0 };
    // Reset step counter at each new "h2" so steps under one section don't
    // continue numbering across the next section. (E.g., the buyer's guide
    // step list is under one h2; the seller's similarly.)
    var bodyHtml = sections.map(function (sec) {
      if (sec && sec.type === 'h2') ctx.stepCount = 0;
      return renderSection(sec, ctx);
    }).join('\n');

    return {
      coverEyebrow:  escapeHtml(data.eyebrow || ''),
      coverTitle:    escapeHtml(data.title || ''),
      coverLede:     escapeHtml(data.coverLede || ''),
      bodyHtml:      bodyHtml,
      closingTitle:  escapeHtml(data.closingTitle || ''),
      closingBody:   inlineFormat(data.closingBody || '')
    };
  }

  /**
   * Apply rendered guide into the page's known slots. Expects the page
   * shell to contain elements with these ids:
   *   #guide-eyebrow, #guide-title, #guide-lede,
   *   #guide-body, #guide-closing-title, #guide-closing-body
   * Any slot that's missing is just skipped (safe).
   */
  function applyToPage(rendered) {
    function set(id, html) {
      var el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = html;
    }
    set('guide-eyebrow', rendered.coverEyebrow);
    set('guide-title',   rendered.coverTitle);
    set('guide-lede',    rendered.coverLede);
    set('guide-body',    rendered.bodyHtml);
    set('guide-closing-title', rendered.closingTitle);
    set('guide-closing-body',  rendered.closingBody);
    if (rendered.coverTitle) {
      try { document.title = rendered.coverTitle.replace(/<[^>]+>/g, '') + ' | Marie Borders'; }
      catch (e) { /* tolerate */ }
    }
  }

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

  /**
   * Load + render a guide. Renders defaults first (so the page paints
   * immediately) then overlays Firestore data once it arrives.
   */
  function load(type) {
    var defaults = (MB.guideDefaults && MB.guideDefaults[type]) || null;
    if (defaults) applyToPage(renderGuide(defaults));

    whenFirebaseReady(function () {
      var fb = window.MB.firebase;
      if (!fb || !fb.db || !fb.fs) return; // defaults stay
      try {
        fb.fs.getDoc(fb.fs.doc(fb.db, 'guides', type)).then(function (snap) {
          if (!snap || !snap.exists || !snap.exists()) return; // defaults stay
          var data = snap.data() || {};
          // Only overlay if the doc actually has the expected shape
          if (!data.sections && !data.title && !data.coverLede) return;
          applyToPage(renderGuide(data));
        }).catch(function (err) {
          console.warn('[guide] firestore load failed:', err && err.message);
        });
      } catch (e) {
        console.warn('[guide] load error:', e && e.message);
      }
    });
  }

  MB.guideRenderer = {
    renderGuide: renderGuide,
    applyToPage: applyToPage,
    inlineFormat: inlineFormat,
    escapeHtml: escapeHtml,
    load: load
  };
})();
