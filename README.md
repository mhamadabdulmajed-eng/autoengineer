# Auto Engineer website — files for autoengineer.iq

| File | What it is |
|---|---|
| `index.html`, `css/`, `js/` | The website. Upload this whole folder to Cloudflare Pages. |
| `config.js` | Paste your Supabase URL and anon key here before uploading. |
| `js/i18n.js` | All Arabic and Kurdish text. Edit the right-hand side to correct any wording. |
| `supabase/schema.sql` | Run once in Supabase → SQL Editor. Creates the database and security rules. |

Full step-by-step setup is in the "Auto Engineer — Go-live guide" document.

Parts import columns (Excel/CSV):
`PartNo, Name, NameAr, NameKu, Brand, Make, Model, YearFrom, YearTo, Category, Condition, RetailPrice, WholesalePrice, Stock`

Categories: Engine, Brakes, Suspension, Filters, Electrical, Cooling, Transmission, Body, Lighting, Oils & Fluids
Condition: Genuine, Aftermarket, Used · Stock: In stock, On order, Ask, Out of stock
