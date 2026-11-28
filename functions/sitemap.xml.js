// partamoiq.com/sitemap.xml : the home page plus one entry per part page.
import { SITE, rpc } from './_lib.js';
export async function onRequestGet() {
  let list = '';
  try { list = (await rpc('part_numbers')) || ''; } catch (e) {}
  const today = new Date().toISOString().slice(0, 10);
  const urls = [`<url><loc>${SITE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`]
    .concat(String(list).split('\n').filter(Boolean).map(pn => `<url><loc>${SITE}/part/${encodeURIComponent(pn)}</loc><lastmod>${today}</lastmod></url>`));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=21600' } });
}
