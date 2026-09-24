#!/usr/bin/env python3
"""
English Voiced — SEO tags, analytics and sitemap for every repo on englishvoiced.com.

Run from anywhere:   python3 _seo/seo.py            (writes changes)
                     python3 _seo/seo.py --dry-run  (only reports)

What it does, per HTML page (repos are listed in _seo/pages.json):
  * public pages in pages.json -> title, description, canonical, Open Graph/Twitter
                                  share tags, and the analytics script
  * "noindex" pages            -> <meta name="robots" content="noindex"> + analytics
  * "side_projects"            -> noindex only (no analytics; not part of English Voiced)
  * "skip" pages               -> left alone (redirect stubs, design files, fragments)
  * anything else              -> analytics only, and a warning so you remember to
                                  add it to pages.json (or to "noindex")
Then it rewrites sitemap.xml in the main repo from the public pages.

Everything it writes sits between <!-- seo --> and <!-- /seo --> in the <head>,
so running it again replaces its own block instead of stacking duplicates.
Re-run it after adding a page, or after rebuilding a course preview.
"""
import fnmatch, html, json, os, re, subprocess, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = os.path.dirname(HERE)                 # krisgalezewski.github.io
GITHUB = os.path.dirname(MAIN)               # the folder holding all repos
CFG = json.load(open(os.path.join(HERE, 'pages.json'), encoding='utf-8'))
SITE = CFG['site']
ORIGIN = SITE['origin']
DRY = '--dry-run' in sys.argv

ANALYTICS = '<script defer src="/analytics.js"></script>'
NOINDEX = '<meta name="robots" content="noindex">'
PAGES = {p['path']: p for p in CFG['pages']}

# Tags the managed block owns. Removed from the rest of <head> on public pages.
OWNED_PUBLIC = [
    r'<title\b[^>]*>.*?</title>',
    r'<meta\b[^>]*\bname="description"[^>]*>',
    r'<link\b[^>]*\brel="canonical"[^>]*>',
    r'<meta\b[^>]*\bproperty="og:[^"]*"[^>]*>',
    r'<meta\b[^>]*\bname="twitter:[^"]*"[^>]*>',
]
OWNED_ALWAYS = [
    r'<meta\b[^>]*\bname="robots"[^>]*>',
    r'<script\b[^>]*\bsrc="/analytics\.js"[^>]*>\s*</script>',
]
BLOCK_RE = re.compile(r'[ \t]*<!-- seo\b.*?<!-- /seo -->[ \t]*\n?', re.S)


def a(s):
    return html.escape(s, quote=True)


def short_title(t):
    return re.split(r'\s+[—|]\s+English Voiced', t)[0]


def public_block(p):
    url = ORIGIN + p['path']
    img = f"{ORIGIN}/og/{p.get('image') or SITE['default_image']}"
    return '\n'.join([
        '<!-- seo: managed by _seo/seo.py, edit _seo/pages.json instead -->',
        f'<title>{html.escape(p["title"], quote=False)}</title>',
        f'<meta name="description" content="{a(p["description"])}">',
        f'<link rel="canonical" href="{a(url)}">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:site_name" content="{a(SITE["name"])}">',
        f'<meta property="og:locale" content="{a(SITE["locale"])}">',
        f'<meta property="og:title" content="{a(short_title(p["title"]))}">',
        f'<meta property="og:description" content="{a(p["description"])}">',
        f'<meta property="og:url" content="{a(url)}">',
        f'<meta property="og:image" content="{a(img)}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{a(short_title(p["title"]))}">',
        '<meta name="twitter:card" content="summary_large_image">',
        ANALYTICS,
        '<!-- /seo -->',
    ])


def simple_block(lines):
    return '\n'.join(['<!-- seo: managed by _seo/seo.py -->', *lines, '<!-- /seo -->'])


def patch_head(src, block, strip_public):
    m = re.search(r'</head\s*>', src, re.I)
    if not m:
        return None
    head, rest = src[:m.start()], src[m.start():]
    head = BLOCK_RE.sub('', head)
    # Only touch markup, never the inside of inline <script>/<style> elements.
    parts = re.split(r'(<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>)', head, flags=re.S | re.I)
    pats = OWNED_ALWAYS + (OWNED_PUBLIC if strip_public else [])
    for i in range(len(parts)):
        if i % 2:   # a script or style element
            if re.fullmatch(OWNED_ALWAYS[1], parts[i], flags=re.I):
                parts[i] = ''
                if i + 1 < len(parts):
                    parts[i + 1] = re.sub(r'^[ \t]*\n', '', parts[i + 1])
            continue
        for pat in pats:
            parts[i] = re.sub(r'[ \t]*' + pat + r'[ \t]*\n?', '', parts[i], flags=re.S | re.I)
    for anchor_pat in (r'<meta\b[^>]*name="viewport"[^>]*>\n?', r'<meta\b[^>]*charset[^>]*>\n?', r'<head\b[^>]*>\n?'):
        for i in range(0, len(parts), 2):
            am = re.search(anchor_pat, parts[i], re.I)
            if am:
                ins, seg = am.end(), parts[i]
                lead = '' if seg[:ins].endswith('\n') else '\n'
                parts[i] = seg[:ins] + lead + block + '\n' + seg[ins:]
                return ''.join(parts) + rest
    return None


def matches(path, globs):
    return any(fnmatch.fnmatchcase(path, g) for g in globs)


def url_path(prefix, rel):
    rel = rel.replace(os.sep, '/')
    if rel == 'index.html':
        rel = ''
    elif rel.endswith('/index.html'):
        rel = rel[:-len('index.html')]
    return prefix + rel


def git_date(repo, rel):
    try:
        out = subprocess.run(['git', '-C', repo, 'log', '-1', '--format=%cs', '--', rel],
                             capture_output=True, text=True, timeout=20).stdout.strip()
        dirty = subprocess.run(['git', '-C', repo, 'status', '--porcelain', '--', rel],
                               capture_output=True, text=True, timeout=20).stdout.strip()
        if out and not dirty:
            return out
    except Exception:
        pass
    return datetime.date.today().isoformat()


def main():
    seen, changed, warnings, counts, lastmod = set(), [], [], {}, {}
    # Longest prefix first, so /english-games/ wins over /
    repos = sorted(CFG['repos'].items(), key=lambda kv: -len(kv[0]))
    walked = {}
    for prefix, folder in repos:
        root = os.path.join(GITHUB, folder)
        if not os.path.isdir(root):
            warnings.append(f'repo folder not found: {folder}')
            continue
        for dirpath, dirnames, files in os.walk(root):
            dirnames[:] = [d for d in dirnames if not d.startswith('.') and d != 'node_modules']
            for fn in files:
                if not fn.endswith('.html'):
                    continue
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, root)
                path = url_path(prefix, rel)
                if path in walked:
                    continue               # a nested repo already claimed it
                walked[path] = (root, rel, full)

    for path, (root, rel, full) in sorted(walked.items()):
        if matches(path, CFG['skip']):
            kind = 'skip'
        elif path in PAGES:
            kind = 'public'
        elif matches(path, CFG['side_projects']):
            kind = 'side'
        elif matches(path, CFG['noindex']):
            kind = 'noindex'
        else:
            kind = 'unlisted'
        counts[kind] = counts.get(kind, 0) + 1
        if kind == 'skip':
            continue
        if kind == 'public':
            block, strip = public_block(PAGES[path]), True
            seen.add(path)
            lastmod[path] = (root, rel)
        elif kind == 'noindex':
            block, strip = simple_block([NOINDEX, ANALYTICS]), False
        elif kind == 'side':
            block, strip = simple_block([NOINDEX]), False
        else:
            block, strip = simple_block([ANALYTICS]), False
            warnings.append(f'not in pages.json (analytics only): {path}')

        src = open(full, encoding='utf-8').read()
        out = patch_head(src, block, strip)
        if out is None:
            warnings.append(f'no <head> found, left alone: {path}')
            continue
        if out != src:
            changed.append(path)
            if not DRY:
                with open(full, 'w', encoding='utf-8', newline='') as f:
                    f.write(out)

    for path in PAGES:
        if path not in seen:
            warnings.append(f'in pages.json but no file found: {path}')
        img = PAGES[path].get('image') or SITE['default_image']
        if not os.path.exists(os.path.join(MAIN, 'og', img)):
            warnings.append(f'share image missing: og/{img} (for {path})')

    # sitemap.xml
    rows = []
    for p in CFG['pages']:
        if p['path'] not in lastmod:
            continue
        root, rel = lastmod[p['path']]
        pr = f"\n    <priority>{p['priority']}</priority>" if p.get('priority') else ''
        rows.append(f"  <url>\n    <loc>{html.escape(ORIGIN + p['path'])}</loc>\n"
                    f"    <lastmod>{git_date(root, rel)}</lastmod>{pr}\n  </url>")
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
               + '\n'.join(rows) + '\n</urlset>\n')
    sm_path = os.path.join(MAIN, 'sitemap.xml')
    old = open(sm_path, encoding='utf-8').read() if os.path.exists(sm_path) else ''
    # Ignore lastmod-only churn from uncommitted files when comparing
    if re.sub(r'<lastmod>.*?</lastmod>', '', old) != re.sub(r'<lastmod>.*?</lastmod>', '', sitemap) or not old:
        if not DRY:
            open(sm_path, 'w', encoding='utf-8').write(sitemap)
        changed.append('/sitemap.xml')

    print(('Would change' if DRY else 'Changed'), len(changed), 'files')
    print('Pages by type:', ', '.join(f'{k} {v}' for k, v in sorted(counts.items())))
    print('Sitemap URLs:', len(rows))
    for w in warnings:
        print('WARNING:', w)
    return 1 if any(w.startswith(('in pages.json', 'share image', 'repo folder')) for w in warnings) else 0


if __name__ == '__main__':
    sys.exit(main())
