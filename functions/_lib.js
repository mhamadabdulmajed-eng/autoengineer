// Shared helpers for the public part pages and the sitemap (Cloudflare Pages Functions).
export const SITE = 'https://autoengineeriq.com';
const SB = 'https://qkrjvbpdhaqukzbhpeqg.supabase.co';
const KEY = 'sb_publishable_ZpCOArZh0pjeJY3l8LBAkw_rG4fHlDa'; // public key, same as config.js

export async function rpc(name, args) {
  const r = await fetch(`${SB}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(args || {}),
    cf: { cacheTtl: 300, cacheEverything: false },
  });
  if (!r.ok) throw new Error(`${name}: ${r.status}`);
  return r.json();
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// owner's rule: remove leading T, dash after the 5th character
export function fmtPartNo(raw) {
  let s = decodeURIComponent(String(raw || '')).trim().toUpperCase().replace(/\s+/g, '');
  if (!s.includes('-')) { if (/^T[0-9A-Z]{9,}$/.test(s)) s = s.slice(1); if (s.length > 5) s = s.slice(0, 5) + '-' + s.slice(5); }
  return s;
}
export const money = n => (n == null || n === '' ? null : Number(n).toLocaleString('en-US') + ' IQD');
