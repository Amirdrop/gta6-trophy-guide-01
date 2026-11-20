/**
 * Shared DOM + string helpers used by the views and app shell.
 */

/** Create a DOM element with an optional class name and text content. */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** HTML-escape a value for safe insertion into innerHTML / text nodes. */
export function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Case-insensitive substring check on any value coerced to string. */
export function includesCI(haystack, needle) {
  return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
}