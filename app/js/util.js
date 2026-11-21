/**
 * Tiny DOM + string helpers shared by every view.
 *
 * Views build nodes by hand rather than concatenating innerHTML, so these
 * helpers keep view code short while keeping trophy text safe by construction.
 */

/** Create a DOM element with an optional class name and text content. */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** Create an activatable button with an optional class, label and click handler. */
export function button(className, label, onClick) {
  const node = document.createElement('button');
  node.type = 'button';
  if (className) node.className = className;
  if (label != null) node.textContent = label;
  if (onClick) node.addEventListener('click', onClick);
  return node;
}

/** Append any number of children (skipping null/undefined) and return the parent. */
export function append(parent, ...children) {
  [...children].forEach((child) => {
    if (child == null) return;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return parent;
}

/** Escape a value for safe inline attribute use. */
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

/** Join class names, dropping falsy values. */
export function cls(...names) {
  return names.filter(Boolean).join(' ');
}

/** Clamp a number into [min, max]. */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Percent (0-100, rounded) of part out of total, safe when total is 0. */
export function percent(part, total) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

/** Remove all children of a node. */
export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}
