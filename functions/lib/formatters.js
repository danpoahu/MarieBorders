/**
 * Human-friendly formatters used to build the `vars` payload passed to
 * email template rendering. Centralized so all templates render numbers,
 * lists, and timelines consistently.
 */

'use strict';

function formatPrice(n) {
  if (n == null || isNaN(Number(n))) return '';
  return '$' + Number(n).toLocaleString('en-US');
}

function formatPriceRange(min, max) {
  const minStr = min != null && !isNaN(Number(min)) ? formatPrice(min) : '';
  const maxStr = max != null && !isNaN(Number(max)) ? formatPrice(max) : '';
  if (minStr && maxStr) return minStr + ' – ' + maxStr;
  if (minStr) return minStr + '+';
  if (maxStr) return 'up to ' + maxStr;
  return 'Not specified';
}

function formatTimeline(code) {
  const map = {
    '0-3mo': 'Within 3 months',
    '3-6mo': '3 to 6 months',
    '6-12mo': '6 to 12 months',
    '12+mo': 'More than a year out',
    'just-looking': 'Just exploring for now',
    'just-curious': 'Just curious about value'
  };
  return map[code] || code || 'Not specified';
}

function formatCondition(code) {
  const map = {
    'excellent': 'Excellent — move-in ready',
    'good': 'Good — minor updates',
    'fair': 'Fair — some work needed',
    'needs-work': 'Needs work — significant updates'
  };
  return map[code] || code || 'Not specified';
}

function formatList(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr.filter(v => v != null && v !== '').join(', ');
}

function formatAddress(addr) {
  if (!addr || typeof addr !== 'object') return '';
  const parts = [];
  if (addr.street) parts.push(addr.street);
  const cityLine = [addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
  if (cityLine) parts.push(cityLine);
  return parts.join(', ');
}

function pluralize(n, singular, plural) {
  if (n === 1) return '1 ' + singular;
  return (n != null ? n : 0) + ' ' + (plural || (singular + 's'));
}

module.exports = {
  formatPrice,
  formatPriceRange,
  formatTimeline,
  formatCondition,
  formatList,
  formatAddress,
  pluralize
};
