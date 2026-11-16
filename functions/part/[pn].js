// autoengineeriq.com/part/<part number> : one page per part, readable by Google.
import { SITE, rpc, esc, fmtPartNo, money } from '../_lib.js';

const CATS = { Engine: ['محرك', 'بزوێنەر'], Brakes: ['فرامل', 'برێک'], Suspension: ['عفشة', 'ئەمۆرتیسەر'], Filters: ['فلاتر', 'فلتەر'],
  Electrical: ['كهربائيات', 'کارەبا'], Cooling: ['تبريد', 'ساردکەرەوە'], Transmission: ['ناقل حركة', 'گێڕ'], Body: ['هيكل', 'بۆدی'],
  Lighting: ['إنارة', 'ڕووناکی'], 'Oils & Fluids': ['زيوت وسوائل', 'زەیت و شلە'] };

export async function onRequestGet({ params }) {
  const wanted = fmtPartNo(params.pn);
  let p = null;
  try { p = await rpc('part_page', { p_no: wanted }); } catch (e) { return page500(); }
  if (!p) return notFound(wanted);
  if (params.pn !== p.partNo) return Response.redirect(`${SITE}/part/${encodeURIComponent(p.partNo)}`, 301);

  let related = [];
  try { related = await rpc('related_parts', { p_no: p.partNo, nm: p.name, lim: 8 }); } catch (e) {}

  const url = `${SITE}/part/${encodeURIComponent(p.partNo)}`;
  const price = money(p.retailPrice);
  const cat = CATS[p.category] || ['', ''];
  const shop = `${SITE}/?q=${encodeURIComponent(p.partNo)}`;
  const title = `${p.partNo} ${p.name} — Genuine Toyota | Auto Engineer`;
  const desc = `${p.partNo} ${p.name} (${p.nameAr || ''} · ${p.nameKu || ''}). Genuine Toyota part${price ? ', ' + price : ''}. Order online from Auto Engineer, Iraq.`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: `${p.name} — Toyota ${p.partNo}`, sku: p.partNo, mpn: p.partNo,
    brand: { '@type': 'Brand', name: 'Toyota' }, category: p.category || 'Auto parts',
    description: `Genuine Toyota ${p.name}, part number ${p.partNo}. ${p.nameAr || ''} · ${p.nameKu || ''}`,
    image: `${SITE}/img/og.png`, url,
    offers: p.retailPrice ? { '@type': 'Offer', url, priceCurrency: 'IQD', price: String(p.retailPrice),
      itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', name: 'Auto Engineer' },
      areaServed: 'IQ' } : undefined,
  };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Auto Engineer', item: SITE + '/' },
    { '@type': 'ListItem', position: 2, name: p.category || 'Parts', item: `${SITE}/#shop` },
    { '@type': 'ListItem', position: 3, name: p.partNo, item: url } ] };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(p.partNo + ' ' + p.name + ' — Auto Engineer')}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE}/img/og.png">
<meta name="theme-color" content="#0A0C0F">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,700..900&family=Inter:wght@400;600&family=Noto+Kufi+Arabic:wght@600;800&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script type="application/ld+json">${JSON.stringify(crumbs).replace(/</g, '\\u003c')}</script>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,'Noto Kufi Arabic',sans-serif;background:#F3F2EE;color:#101318}
a{color:inherit}
header{background:#0A0C0F;color:#fff}
.bar{max-width:1100px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-family:Archivo,sans-serif;font-weight:900;font-stretch:115%;font-size:20px;letter-spacing:-.3px}
.brand img{width:34px;height:34px}.brand b{color:#FF3B1F}
.search{display:flex;background:#fff;border-radius:12px;padding:4px;max-width:420px;flex:1}
.search input{flex:1;border:0;outline:0;padding:10px 12px;font-size:15px;min-width:0;color:#101318}
.search button{border:0;background:#FF3B1F;color:#fff;border-radius:9px;padding:0 16px;font-weight:600;cursor:pointer}
main{max-width:1100px;margin:0 auto;padding:28px 20px 60px}
.crumbs{font-size:13px;color:#69717C;margin-bottom:14px}.crumbs a{text-decoration:none}
.card{background:#fff;border-radius:18px;padding:28px;box-shadow:0 8px 24px rgba(16,19,24,.07);display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:32px}
@media(max-width:760px){.card{grid-template-columns:1fr}.bar{flex-wrap:wrap}}
.pno{font-family:Archivo,sans-serif;font-weight:800;font-size:15px;letter-spacing:1px;color:#FF3B1F}
h1{font-family:Archivo,sans-serif;font-weight:900;font-stretch:105%;font-size:clamp(28px,4vw,40px);line-height:1.05;margin:6px 0 14px}
.names p{margin:4px 0;font-family:'Noto Kufi Arabic',sans-serif;font-size:20px;font-weight:800}.names p+p{font-weight:600;color:#4A525C;font-size:18px}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.tags span{background:#F3F2EE;border-radius:99px;padding:5px 12px;font-size:13px}
.buy{background:#0A0C0F;color:#fff;border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:12px;align-self:start}
.price{font-family:Archivo,sans-serif;font-weight:900;font-size:32px}.req{font-size:20px}
.btn{display:block;text-align:center;text-decoration:none;border-radius:12px;padding:14px;font-weight:700}
.btn.red{background:#FF3B1F;color:#fff}.btn.ghost{border:1px solid rgba(255,255,255,.25);color:#fff}
.small{font-size:13px;color:#B9C0C8;line-height:1.5}
h2{font-family:Archivo,sans-serif;font-size:20px;margin:36px 0 12px}
.rel{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.rel a{background:#fff;border-radius:12px;padding:14px;text-decoration:none;display:flex;flex-direction:column;gap:4px}
.rel b{font-size:14px}.rel span{font-size:13px;color:#4A525C}
.about{color:#4A525C;line-height:1.7;font-size:15px}
footer{text-align:center;color:#69717C;font-size:13px;padding:30px}
</style>
</head>
<body>
<header><div class="bar">
<a class="brand" href="/"><img src="/img/logo-mark.svg" alt="">AUTO <b>ENGINEER</b></a>
<form class="search" action="/" method="get"><input name="q" placeholder="Part number or name…" aria-label="Search parts"><button>Search</button></form>
</div></header>
<main>
<nav class="crumbs"><a href="/">Auto Engineer</a> › <a href="/#shop">${esc(p.category || 'Parts')}</a> › ${esc(p.partNo)}</nav>
<article class="card">
<div>
<div class="pno">TOYOTA ${esc(p.partNo)}</div>
<h1>${esc(p.name)}</h1>
<div class="names"><p lang="ar" dir="rtl">${esc(p.nameAr || '')}</p><p lang="ckb" dir="rtl">${esc(p.nameKu || '')}</p></div>
<div class="tags"><span>Genuine Toyota</span><span>${esc(p.category || '')}${cat[0] ? ' · ' + cat[0] + ' · ' + cat[1] : ''}</span><span>${esc(p.model ? p.model : 'Toyota')}</span></div>
<p class="about">Genuine Toyota part number <b>${esc(p.partNo)}</b> — ${esc(p.name)}. Order online from Auto Engineer with delivery across Iraq. Not sure it fits your car? Send us your VIN and we will check it for you.</p>
<p class="about" lang="ar" dir="rtl">قطعة تويوتا أصلية رقم <b dir="ltr"><bdi>${esc(p.partNo)}</bdi></b> — ${esc(p.nameAr || p.name)}. اطلبها أونلاين من أوتو إنجنير مع التوصيل لكل العراق.</p>
<p class="about" lang="ckb" dir="rtl">پارچەی ئەسڵی تۆیۆتا ژمارە <b dir="ltr"><bdi>${esc(p.partNo)}</bdi></b> — ${esc(p.nameKu || p.name)}. بە ئۆنلاین داوای بکە لە ئۆتۆ ئەندازیار، گەیاندن بۆ هەموو عێراق.</p>
</div>
<aside class="buy">
${price ? `<div class="price">${esc(price)}</div>` : `<div class="price req">Price on request</div>`}
<a class="btn red" href="${esc(shop)}">Order this part</a>
<a class="btn ghost" href="${SITE}/#find">Check it fits my car</a>
<p class="small">Genuine Toyota · Delivery across Iraq<br>English · العربية · کوردی</p>
</aside>
</article>
${related.length ? `<h2>Same part, other versions</h2><div class="rel">${related.map(r => `<a href="/part/${encodeURIComponent(r.partNo)}"><b>${esc(r.partNo)}</b><span>${esc(r.name)} · <span dir="rtl">${esc(r.nameAr || '')}</span></span><span>${esc(money(r.retailPrice) || 'Price on request')}</span></a>`).join('')}</div>` : ''}
</main>
<footer>© Auto Engineer · Genuine Toyota spare parts · <a href="/">autoengineeriq.com</a></footer>
</body>
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600, s-maxage=3600' } });
}

function notFound(pn) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Part not found — Auto Engineer</title></head>
<body style="font-family:system-ui;padding:40px;text-align:center"><h1>Part ${esc(pn)} not found</h1><p>Search the catalog or send us a request and we will find it for you.</p>
<p><a href="/?q=${encodeURIComponent(pn)}">Search ${esc(pn)}</a> · <a href="/#find">Find my part</a></p></body></html>`;
  return new Response(html, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
}
function page500() { return new Response('Temporarily unavailable, please try again.', { status: 503, headers: { 'retry-after': '60' } }); }
