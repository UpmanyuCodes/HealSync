// HealSync Appointment System - Shared helpers
// Base URL: adjust if backend runs elsewhere
const APPT_BASE = 'http://localhost:8080/v1/healsync/book';

function toIsoFromInput(el) {
  const val = typeof el === 'string' ? document.getElementById(el).value : el.value;
  if (!val) return '';
  const d = new Date(val);
  // slice to 'YYYY-MM-DDTHH:mm:ss'
  return d.toISOString().slice(0, 19);
}

function setAlert(msg, type = 'info') {
  const box = document.getElementById('alert');
  if (!box) return;
  box.className = `alert alert-${type}`;
  box.textContent = msg;
  box.style.display = 'block';
}

function clearAlert() {
  const box = document.getElementById('alert');
  if (box) box.style.display = 'none';
}

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  });
  return el;
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return iso; }
}

function statusBadge(status) {
  const cls = `status-badge status-${String(status).toLowerCase()}`;
  return h('span', { class: cls }, status);
}
