// Partamo: send old and www addresses to https://partamoiq.com (same page, same search).
// The #part of a link (invoices, shop pages) is kept by the browser after the redirect.
const MAIN = 'partamoiq.com';
const OLD = new Set(['autoengineeriq.com', 'www.autoengineeriq.com', 'www.partamoiq.com']);

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (OLD.has(url.hostname)) {
    url.hostname = MAIN;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
