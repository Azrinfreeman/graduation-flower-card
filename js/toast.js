/**
 * A small on-page message (instead of blocking alert()/prompt() pop-ups).
 * The element has role="status", so screen readers announce the text politely.
 */
let hideTimer = null;

export function showToast(text, duration = 4500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text; // textContent: the text is never treated as HTML
  toast.hidden = false;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => { toast.hidden = true; }, duration);
}
