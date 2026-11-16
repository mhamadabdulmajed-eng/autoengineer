import json, re, math, collections, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from parts_dict import W, P, CAT
import openpyxl

ws = openpyxl.load_workbook('/home/claude/m1/M1.xlsx', read_only=True)['M1']
raw = list(ws.iter_rows(min_row=2, values_only=True))

# ---- dedupe: one row per part number, keep the higher price when rows disagree
best = {}
conflicts = 0
for pn, desc, price in raw:
    pn = str(pn).strip(); desc = str(desc or '').strip()
    if pn in best and best[pn] != (desc, price):
        conflicts += 1
        if (price or 0) > (best[pn][1] or 0): best[pn] = (desc, price)
    else:
        best.setdefault(pn, (desc, price))

def fmt_pn(pn):
    # rule: remove the leading T, then a dash after the 5th character (04465-0K290, 04465-0K290S, 11701-3105002)
    s = (pn[1:] if pn.upper().startswith('T') else pn).upper()
    return s[:5] + '-' + s[5:] if len(s) > 5 else s

def part_id(no): return 'p_' + re.sub(r'[^A-Z0-9_.-]', '_', no.upper())[:80]

PHR = sorted([(k.replace(',', ' ').split(), v) for k, v in P], key=lambda x: -len(x[0]))
EN_ABBR = {'FR':'Front','RR':'Rear','LH':'Left','RH':'Right','UPR':'Upper','LWR':'Lower','CTR':'Center','ASSY':'','SUB-ASSY':'','S/A':'','W/WASHER':'with Washer','STRG':'Steering','BRG':'Bearing','QTR':'Quarter','INSTR':'Instrument','SUSP':'Suspension','HTR':'Heater','INJ':'Injector'}
FEM_ADJ = {'أمامي','خلفي','جانبي','علوي','سفلي','داخلي','خارجي','وسطي','رئيسي','كهربائي','عادي','أصلي','مخروطي','شعاعي','حلزوني','مغناطيسي'}
unknown = collections.Counter()

def tokens(desc):
    groups = [g.strip() for g in re.split(r',', desc.upper()) if g.strip()]
    out = []
    for gi, g in enumerate(groups):
        for t in g.split():
            t = t.strip(' .')
            if t and not (t in W and W[t][2] == 'x'): out.append((t, gi))
    return out, len(groups)

def translate(desc):
    toks, ng = tokens(desc)
    words = [t for t, _ in toks]
    items = []  # (ar, ku, kind, group)
    i = 0
    while i < len(toks):
        hit = None
        for ph, tr in PHR:
            L = len(ph)
            if words[i:i+L] == ph:
                hit = (L, tr); break
        if hit:
            L, tr = hit
            items.append((tr[0], tr[1], 'P', toks[i][1])); i += L; continue
        t, g = toks[i]; i += 1
        if t in W:
            ar, ku, k = W[t]
            if k != 'x': items.append((ar, ku, k, g))
        elif re.fullmatch(r'[0-9A-Z./+-]*[0-9][0-9A-Z./+-]*', t):   # specs: 5W30, 208L, 12V
            items.append((t, t, 'a', g))
        else:
            unknown[t] += 1
    if not items: return None, None
    # Toyota order "HEAD, MOD1, MOD2" -> natural order: groups reversed
    groups = collections.defaultdict(list)
    for it in items: groups[it[3]].append(it)
    nat = []
    for gi in sorted(groups, reverse=True): nat += groups[gi]
    phrases = [x for x in nat if x[2] == 'P']
    nouns = [x for x in nat if x[2] == 'n']
    adjs = [x for x in nat if x[2] == 'a']
    # a phrase is already a full noun phrase: it becomes the head
    ordered = phrases + list(reversed(nouns)) if phrases else list(reversed(nouns))
    if not ordered: ordered = []
    ar_words = [x[0] for x in ordered]; ku_words = [x[1] for x in ordered]
    # de-duplicate repeated words (e.g. phrase + same noun)
    def dedupe(ws):
        seen = set(); out = []
        for w in ws:
            parts = [p for p in w.split() if p not in seen]
            seen.update(w.split())
            if parts: out.append(' '.join(parts))
        return out
    ar_words = dedupe(ar_words); ku_words = dedupe(ku_words)
    fem = bool(ar_words) and ar_words[0].split()[0].endswith('ة')
    ar_adj = [(a + 'ة') if (fem and a in FEM_ADJ) else a for a, _, _, _ in adjs]
    ku_adj = [k for _, k, _, _ in adjs]
    ar = ' '.join(dedupe(ar_words + ar_adj))
    kuw = dedupe(ku_words + ku_adj)
    ku = ' '.join(w + ('ی' if j < len(kuw) - 1 and not w.endswith('ی') else '') for j, w in enumerate(kuw))
    return ar.strip() or None, ku.strip() or None

def pad_fix(ar, ku):
    # brake pads are "فحمات" / "پاتی", not "لبادة" / "پاد" (a rubber pad)
    import re as _re
    if ar and _re.search('(لبادة بريك|طقم لبادة ديسك|تآكل لبادة|ساند لبادة)', ar):
        for a, b in (('لبادة بريك', 'فحمات بريك'), ('طقم لبادة ديسك', 'طقم فحمات ديسك'), ('تآكل لبادة', 'تآكل فحمات'), ('ساند لبادة', 'ساند فحمات')):
            ar = ar.replace(a, b)
        ku = _re.sub('پاد(ی?)', r'پات\1', ku or '')
    return ar, ku

def english(desc):
    toks, _ = tokens(desc)
    groups = collections.defaultdict(list)
    for t, g in toks: groups[g].append(t)
    nat = []
    for gi in sorted(groups, reverse=True): nat += groups[gi]
    out = []
    for t in nat:
        e = EN_ABBR.get(t, t)
        if e: out.append(e if e != t else (t.capitalize() if t.isalpha() else t))
    out = [w for w in out if not w.startswith('with ')] + [w for w in out if w.startswith('with ')]
    s = ' '.join(out)
    return s or desc.title()

SYN = {'ماي':'ماء مياه','دهن':'زيت','دبل':'ممتص صدمات مساعد','فحمات':'فرامل تيل','دعامية':'صدام','بنيد':'كبوت غطاء محرك','مكينة':'محرك ماكينة','راديتر':'رديتر مشع',
       'جامة':'زجاج','مراية':'مرآة','بلك':'بواجي شمعات','سلف':'ستارتر','دينمو':'دينامو','ماطور':'مضخة','بانزين':'بنزين وقود','كلج':'كلتش','بلبرينك':'رولمان بلي',
       'كاوجوك':'قاعدة مكينة','ستيرن':'سكان مقود','كير':'قير ناقل','رفرف':'جناح','كريل':'شبك','ضوء':'لايت مصباح','كلوب':'لمبة','صوندة':'خرطوم','كاسكيت':'جوان',
       'مساحة':'ماسحة','عكس':'عكوس','تايرود':'ذراع توجيه','بخاخ':'انجكتور','حساس':'سنسر','مكيف':'تكييف','اكزوز':'عادم','دەبڵ':'مەساعید','پاتی':'فەحمە'}
def keywords(ar, ku, desc):
    extra = []
    for w in (ar or '').split() + (ku or '').split():
        if w in SYN: extra.append(SYN[w])
    return ' '.join([desc] + extra)

def category(desc):
    u = desc.upper()
    head = u.split(',')[0]
    for txt in (head, u):
        for cat, kws in CAT:
            for k in kws:
                if re.search(r'(?<![A-Z])' + re.escape(k) + r'(?![A-Z])', txt): return cat
    return 'Engine'

MARGIN = 1.20   # owner's rule: website retail price = list price + 20%, rounded up to 250 IQD
def price(p):
    if not isinstance(p, (int, float)) or p <= 0 or p > 50_000_000: return None
    return int(math.ceil(math.ceil(p / 250.0) * 250 * MARGIN / 250.0) * 250)

out = []; nop = []; seen_ids = {}
for pn, (desc, pr) in best.items():
    no = fmt_pn(pn)
    if no.startswith('0400'): continue   # owner's rule: part numbers starting with 0400 are not sold online
    if no.endswith('S'): continue        # owner's rule: part numbers ending with S carry wholesale prices (added later)
    if desc.upper().strip() == pn.upper() or not desc: desc = ''
    ar, ku = translate(desc) if desc else (None, None)
    ar, ku = pad_fix(ar, ku)
    name = english(desc) if desc else no
    pid = part_id(no)
    if pid in seen_ids: continue
    seen_ids[pid] = 1
    rp = price(pr)
    if rp is None: nop.append((no, desc, pr))
    out.append({'id': pid, 'data': {
        'partNo': no, 'name': name, 'nameAr': ar or name, 'nameKu': ku or name,
        'desc': keywords(ar, ku, desc), 'category': category(desc) if desc else 'Engine',
        'make': 'Toyota', 'model': '', 'modelId': '', 'condition': 'Genuine', 'stock': 'Ask',
        'retailPrice': rp, 'wholesalePrice': None, 'yearFrom': None, 'yearTo': None}})

if __name__ == '__main__':
    print('rows', len(raw), 'unique parts', len(out), 'conflicting duplicates', conflicts, 'no price', len(nop), nop[:5])
    print('categories', collections.Counter(o['data']['category'] for o in out).most_common())
    print('untranslated words', sum(unknown.values()), unknown.most_common(60))
    json.dump(out, open('/home/claude/m1/parts.json', 'w'), ensure_ascii=False)
