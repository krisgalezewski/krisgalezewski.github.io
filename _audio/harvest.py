"""Collect every text the /lessons/ pages can speak, by running each lesson in a
headless browser, recording speechSynthesis.speak() calls, and clicking through
everything clickable (tabs, cards, flashcard decks, audio buttons)."""
import json, sys, re, hashlib, os
from playwright.sync_api import sync_playwright

INIT = r"""
(() => {
  window.__spoken = [];
  const ss = window.speechSynthesis;
  ss.speak = (u) => {
    window.__spoken.push({text: u.text, rate: u.rate});
    setTimeout(() => { try { u.dispatchEvent(new Event('start')); u.dispatchEvent(new Event('end')); } catch (e) {} }, 0);
  };
  ss.cancel = () => {};
  window.alert = () => {}; window.confirm = () => true; window.prompt = () => '';
  window.open = () => null;
  window.print = () => {};
  // never leave the page
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a) { const h = a.getAttribute('href') || ''; if (!h.startsWith('#') && !h.startsWith('javascript')) e.preventDefault(); }
  }, true);
  document.addEventListener('submit', e => e.preventDefault(), true);
})();
"""

CLICK_ROUND_OLD = r"""
(seen) => {
  seen = new Set(seen);
  const NAV = /\b(next|continue|forward|shuffle|another|new|random|flip|reveal|show|more)\b|→|›|»/i;
  const els = [...document.querySelectorAll('[onclick], button, [role="button"], a[href^="#"], .card, .chip, .tab, [data-tab], summary, label, li, td, span.word, .flip, [class*="audio"], [class*="speak"], [class*="card"], [class*="tab"], [class*="chip"], [class*="btn"], [class*="pill"], [class*="item"], [class*="row"]')];
  let clicked = 0; const newSeen = [];
  for (const el of els) {
    const sig = (el.tagName + '|' + (el.getAttribute('onclick') || '') + '|' + (el.className || '') + '|' + (el.textContent || '').trim().slice(0, 80));
    const isNav = NAV.test((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.getAttribute('onclick') || ''));
    if (seen.has(sig) && !isNav) continue;
    if (!seen.has(sig)) newSeen.push(sig);
    seen.add(sig);
    try { el.click(); clicked++; } catch (e) {}
  }
  return {clicked, newSeen};
}
"""

CLICK_ROUND = r"""
(seen) => {
  seen = new Set(seen);
  const AUDIO = /speak|audio|🔊|volume|hear|listen|pronoun/i;
  const NAV = /\b(next|continue|forward|shuffle|another|new|random|flip|reveal|show|more|start|begin|try)\b|→|›|»/i;
  const isAudio = el => AUDIO.test((el.getAttribute('onclick') || '') + ' ' + (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '') + ' ' + (el.textContent || '').slice(0, 40) + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || ''));
  const visible = el => !!(el.offsetParent || el.getClientRects().length);
  const q = 'button, [onclick], [role="button"], a[href^="#"], summary, label, li, td, [class*="card"], [class*="tab"], [class*="chip"], [class*="btn"], [class*="pill"], [class*="item"], [class*="row"], [class*="word"], [class*="tile"], [class*="opt"]';
  const pressAudio = (onlyVisible) => { for (const a of document.querySelectorAll(q)) { if (isAudio(a) && (!onlyVisible || visible(a))) { try { a.click(); } catch (e) {} } } };
  pressAudio(false);                         // every audio button, hidden or not
  let clicked = 0; const newSeen = [];
  for (const el of [...document.querySelectorAll(q)]) {
    if (isAudio(el)) continue;
    const sig = el.tagName + '|' + (el.getAttribute('onclick') || '') + '|' + (typeof el.className === 'string' ? el.className : '') + '|' + (el.textContent || '').trim().slice(0, 80);
    const isNav = NAV.test((el.textContent || '').slice(0, 60) + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('onclick') || ''));
    if (seen.has(sig) && !isNav) continue;
    if (!seen.has(sig)) { newSeen.push(sig); seen.add(sig); }
    try { el.click(); clicked++; } catch (e) {}
    pressAudio(true);                        // e.g. a pop-up that just opened
    document.querySelectorAll('.modal, [class*="modal"], [role="dialog"]').forEach(m => { if (visible(m)) { const c = m.querySelector('[class*="close"], [aria-label*="lose"]'); } });
  }
  return {clicked, newSeen};
}
"""

def harvest(page, url, rounds=40):
    page.goto(url); page.wait_for_timeout(700)
    seen = []
    last = -1; stable = 0
    for r in range(rounds):
        res = page.evaluate(CLICK_ROUND, seen)
        seen += res['newSeen']
        page.wait_for_timeout(60)
        n = page.evaluate("new Set(window.__spoken.map(s=>s.text)).size")
        if n == last and not res['newSeen']:
            stable += 1
            if stable >= 3: break
        else:
            stable = 0
        last = n
    return page.evaluate("window.__spoken")

if __name__ == '__main__':
    base = sys.argv[1]; files = sys.argv[2:]
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for f in files:
            ctx = b.new_context(); ctx.add_init_script(INIT); pg = ctx.new_page()
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
            spoken = harvest(pg, base + f)
            texts = {}
            for s in spoken:
                t = re.sub(r'\s+', ' ', (s['text'] or '')).strip()
                if t: texts.setdefault(t, set()).add(round(s['rate'] or 1, 2))
            out[f] = sorted(texts)
            print(f"{f:44s} {len(texts):5d} texts  rates={sorted({r for v in texts.values() for r in v})}  errors={len(errs)}", flush=True)
            ctx.close()
        b.close()
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'harvest.json'), 'w'), indent=1, ensure_ascii=False)
