'use strict';
// Formatting, toasts and banners.
// ---------- helpers ----------
const fmt = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
const starsFor = (d) => d === 0 ? 3 : d <= 4 ? 2 : 1;
const starHTML = (n) => [1, 2, 3].map((i) => '<span class="star' + (i <= n ? ' on' : '') + '">★</span>').join('');
let toastTimer = 0, bannerTimer = 0;
function toast(msg, ms) {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms || 3200);
}
function banner(a, n) {
  const b = $('banner'); $('bannerAct').textContent = a; $('bannerName').textContent = n;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), 2500);
}
