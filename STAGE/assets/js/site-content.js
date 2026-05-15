/* Marie Borders — site content overlay (Phase 3)
 *
 * Loads editable page copy from Firestore `siteContent/{home|about|contact}`
 * and overlays it onto pre-rendered HTML elements marked with
 * `data-content="<fieldName>"`.
 *
 * Design intent:
 *   The hardcoded HTML on each page is the SOURCE OF TRUTH on day 1 — and
 *   forever, in the sense that if Firestore is unreachable, slow, or empty,
 *   the page still reads as a complete, valid website. The Firestore overlay
 *   is enhancement, not requirement. Search engines (post-cutover) and
 *   no-JS browsers see the real text.
 *
 * Field mapping:
 *
 *   siteContent/home {
 *     heroHeadline:  string  -> [data-content="heroHeadline"]
 *     heroSubhead:   string  -> [data-content="heroSubhead"]
 *     introHeading:  string  -> [data-content="introHeading"]
 *     introBody:     string  -> [data-content="introBody"]
 *   }
 *
 *   siteContent/about {
 *     pageHeading:   string  -> [data-content="pageHeading"]
 *     bioParagraphs: string[] -> [data-content="bioParagraphs"] container,
 *                                   rebuilt as <p> elements
 *     credentials:   string[] -> currently NOT auto-rendered on the public
 *                                   page (Phase 1 credentials are SVG-icon
 *                                   tiles; we expose the field for the CMS
 *                                   to capture intent, but the public layout
 *                                   stays static for now)
 *     headshotUrl:   string  -> [data-content="headshot"].src
 *   }
 *
 *   siteContent/contact {
 *     displayEmail:  string  -> [data-content="displayEmail"] text + href
 *     phone:         string  -> [data-content="phone"] text + tel href
 *     license:       string  -> [data-content="license"]
 *     brokerage:     string  -> [data-content="brokerage"] text + href
 *     brokerageUrl:  string  -> used as href on [data-content="brokerage"]
 *   }
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

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

  function loadDoc(docId) {
    return new Promise(function (resolve) {
      whenFirebaseReady(function () {
        var fb = window.MB.firebase;
        if (!fb || !fb.db || !fb.fs) { resolve(null); return; }
        var fs = fb.fs;
        try {
          fs.getDoc(fs.doc(fb.db, 'siteContent', docId)).then(function (snap) {
            if (!snap || !snap.exists || !snap.exists()) { resolve(null); return; }
            resolve(snap.data() || null);
          }).catch(function () { resolve(null); });
        } catch (e) {
          resolve(null);
        }
      });
    });
  }

  function setText(selectorAttr, value) {
    if (value == null || value === '') return;
    var el = document.querySelector('[data-content="' + selectorAttr + '"]');
    if (!el) return;
    el.textContent = value;
  }

  function applyHome() {
    loadDoc('home').then(function (data) {
      if (!data) return; // fallback HTML stays
      setText('heroHeadline', data.heroHeadline);
      setText('heroSubhead', data.heroSubhead);
      setText('introHeading', data.introHeading);
      setText('introBody', data.introBody);
    });
  }

  function applyAbout() {
    loadDoc('about').then(function (data) {
      if (!data) return; // fallback HTML stays

      setText('pageHeading', data.pageHeading);

      // bioParagraphs[] -> rebuild as <p> children of [data-content="bioParagraphs"]
      if (Array.isArray(data.bioParagraphs) && data.bioParagraphs.length) {
        var container = document.querySelector('[data-content="bioParagraphs"]');
        if (container) {
          // Preserve trailing siblings (e.g. the "Get in Touch" CTA paragraph)
          // by only replacing the <p> nodes that we ourselves manage. The
          // simplest contract: container holds bio <p>s + possibly a final
          // CTA <p>. We rebuild only the leading <p>s.
          var pTags = Array.prototype.slice.call(container.querySelectorAll('p'));
          // Heuristic: any <p> that contains a button or anchor with class "btn"
          // is treated as a CTA and preserved.
          var ctas = pTags.filter(function (p) { return !!p.querySelector('.btn'); });
          pTags.forEach(function (p) { if (ctas.indexOf(p) === -1) p.remove(); });
          var firstCta = ctas[0] || null;
          data.bioParagraphs.forEach(function (text) {
            if (!text) return;
            var p = document.createElement('p');
            p.textContent = text;
            container.insertBefore(p, firstCta);
          });
        }
      }

      // Headshot URL
      if (data.headshotUrl) {
        var img = document.querySelector('[data-content="headshot"]');
        if (img && img.tagName === 'IMG') {
          img.src = data.headshotUrl;
        }
      }
    });
  }

  function applyContact() {
    loadDoc('contact').then(function (data) {
      if (!data) return; // fallback HTML stays

      if (data.displayEmail) {
        document.querySelectorAll('[data-content="displayEmail"]').forEach(function (el) {
          if (el.tagName === 'A') {
            el.textContent = data.displayEmail;
            el.setAttribute('href', 'mailto:' + data.displayEmail);
          } else {
            el.textContent = data.displayEmail;
          }
        });
      }

      if (data.phone) {
        document.querySelectorAll('[data-content="phone"]').forEach(function (el) {
          if (el.tagName === 'A') {
            el.textContent = data.phone;
            // Strip non-digits for tel: href, preserve a leading +
            var digits = String(data.phone).replace(/[^\d+]/g, '');
            el.setAttribute('href', 'tel:' + digits);
          } else {
            el.textContent = data.phone;
          }
        });
      }

      if (data.license) {
        document.querySelectorAll('[data-content="license"]').forEach(function (el) {
          el.textContent = data.license;
        });
      }

      if (data.brokerage) {
        document.querySelectorAll('[data-content="brokerage"]').forEach(function (el) {
          if (el.tagName === 'A') {
            el.textContent = data.brokerage;
            if (data.brokerageUrl) el.setAttribute('href', data.brokerageUrl);
          } else {
            el.textContent = data.brokerage;
          }
        });
      }
    });
  }

  MB.content = {
    applyHome: applyHome,
    applyAbout: applyAbout,
    applyContact: applyContact,
    // Exposed for the CMS to load defaults into form fields
    loadDoc: loadDoc
  };
})();
