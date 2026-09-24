"""Second harvesting method: find which data fields each lesson passes to its
speak function(s), then run every such value from the lesson's own data arrays
through that same function (with speech stubbed), recording the exact text."""
import re, json, sys, os
from playwright.sync_api import sync_playwright
import harvest

def analyse(src):
    names = set(re.findall(r'function\s+(\w*[Ss]peak\w*)\s*\(', src))
    fields, loopvars = set(), set()
    for n in names:
        for arg in re.findall(re.escape(n) + r'\(([^;]{0,160}?)\)\s*[;"`\'}]', src):
            fields |= set(re.findall(r'\.([A-Za-z_]\w*)\b(?!\()', arg))
            m = re.match(r"\s*['`]?\$\{(?:safeQ\w*\()?([A-Za-z_]\w*)\b", arg) or re.match(r'\s*\$\{safeQ\w*\(([A-Za-z_]\w*)\b', arg)
            if m: loopvars.add(m.group(1))
    # e.g. c.exs.map(e => ... speak(e) ...): collect "exs"
    for f, v in re.findall(r'\.([A-Za-z_]\w*)\.map\(\s*\(?\s*([A-Za-z_]\w*)', src):
        if v in loopvars: fields.add(f)
    fields -= {'replace','map','join','length','p','i','g','s','value','innerText','textContent','dataset','classList','style'} - set()
    consts = re.findall(r'(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=\s*[\[{]', src)
    return sorted(names), sorted(fields), consts

RUN = r"""
([fns, fields, consts]) => {
  const fn = fns.map(n => { try { return eval(n); } catch (e) { return null; } }).find(f => typeof f === 'function');
  if (!fn) return 0;
  const F = new Set(fields); const strip = s => String(s).replace(/<[^>]+>/g, '');
  let n = 0; const seenObj = new Set();
  const walk = (x, d) => {
    if (!x || typeof x !== 'object' || d > 5 || seenObj.has(x)) return; seenObj.add(x);
    if (Array.isArray(x)) { x.forEach(v => walk(v, d + 1)); return; }
    for (const [k, v] of Object.entries(x)) {
      if (F.has(k)) {
        if (typeof v === 'string' && v.trim()) { try { fn(strip(v)); n++; } catch (e) {} }
        else if (Array.isArray(v)) v.forEach(s => { if (typeof s === 'string' && s.trim()) { try { fn(strip(s)); n++; } catch (e) {} } });
      }
      if (typeof v === 'object') walk(v, d + 1);
    }
  };
  for (const c of consts) { let v; try { v = eval(c); } catch (e) { continue; } walk(v, 0); }
  return n;
}
"""

if __name__ == '__main__':
    base, root = sys.argv[1], sys.argv[2]; files = sys.argv[3:]
    HERE = os.path.dirname(os.path.abspath(__file__))
    old = json.load(open(os.path.join(HERE, 'harvest.json')))
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for f in files:
            src = open(root + f, encoding='utf-8').read()
            fns, fields, consts = analyse(src)
            ctx = b.new_context(); ctx.add_init_script(harvest.INIT); pg = ctx.new_page()
            pg.goto(base + f); pg.wait_for_timeout(600)
            calls = pg.evaluate(RUN, [fns, fields, consts]) if fns else 0
            pg.wait_for_timeout(100)
            got = {re.sub(r'\s+', ' ', s['text'] or '').strip() for s in pg.evaluate('window.__spoken')} - {''}
            merged = sorted(set(old.get(f, [])) | got)
            out[f] = merged
            print(f"{f:44s} crawl={len(old.get(f, [])):4d} data={len(got):4d} union={len(merged):4d}  fields={fields}")
            ctx.close()
        b.close()
    # keep the other lessons' texts when only some lessons were re-collected
    tpath = os.path.join(HERE, 'texts.json')
    existing = json.load(open(tpath, encoding='utf-8')) if os.path.exists(tpath) else {}
    existing.update({k: [t for t in v if re.search(r'[A-Za-z]', t) and not re.fullmatch(r'\S*_\S*', t)] for k, v in out.items()})
    out = existing
    json.dump(out, open(tpath, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    allt = {t for v in out.values() for t in v}
    print('TOTAL unique texts:', len(allt), ' characters:', sum(len(t) for t in allt))
