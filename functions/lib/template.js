/**
 * Minimal {{variable}} substitution for email templates.
 *
 * Supports:
 *   {{name}}             -> value, HTML-escaped
 *   {{name|raw}}         -> value, NOT escaped (use only for HTML you control)
 *   {{address.street}}   -> nested access on plain objects
 *   {{list:items}}       -> array rendered as comma-separated list, escaped
 *   {{ul:items}}         -> array rendered as <ul><li>…</li></ul>, escaped
 *
 * Missing keys render as empty string. We do NOT throw — Marie may type
 * a variable name we don't pass in, and we'd rather silently drop than
 * crash an email send.
 *
 * NOTE: a sibling copy of this lives in
 *   STAGE/assets/js/email-template-preview.js
 * for the CMS live preview pane. If you change semantics here, mirror there.
 */

'use strict';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getNested(obj, path) {
  if (obj == null) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function renderValue(raw, mode) {
  if (raw == null) return '';
  if (mode === 'raw') return String(raw);
  if (mode === 'list') {
    if (!Array.isArray(raw)) return escapeHtml(String(raw));
    return raw.filter(v => v != null && v !== '').map(escapeHtml).join(', ');
  }
  if (mode === 'ul') {
    if (!Array.isArray(raw) || !raw.length) return '';
    const items = raw.filter(v => v != null && v !== '')
      .map(v => '<li>' + escapeHtml(String(v)) + '</li>').join('');
    return '<ul>' + items + '</ul>';
  }
  return escapeHtml(String(raw));
}

function render(template, vars) {
  if (template == null) return '';
  return String(template).replace(/\{\{\s*([a-zA-Z]+:)?([a-zA-Z0-9_.]+)(?:\s*\|\s*(raw))?\s*\}\}/g,
    (match, prefix, key, modifier) => {
      let mode = modifier || null;
      if (prefix) mode = prefix.slice(0, -1); // strip trailing :
      const value = getNested(vars, key);
      return renderValue(value, mode);
    });
}

function stripHtml(html) {
  if (html == null) return '';
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { render, stripHtml, escapeHtml };
