# SEO, share images and analytics

Everything that tells Google and social apps what each page is lives here. (Folders starting with `_` aren't published by GitHub Pages.)

| File | What it is |
|---|---|
| `pages.json` | Every public page: title, description, share image, and the text on that image. Also which pages are hidden from Google (`noindex`), left alone (`skip`), or side projects. |
| `seo.py` | Writes the tags into every page in all the repos and rebuilds `/sitemap.xml`. |
| `/og/*.png` | The 1200×630 share images (link previews on WhatsApp, Facebook, LinkedIn, Slack…). |
| `/analytics.js` | Loads Cloudflare Web Analytics on every page. The token goes in this one file. |
| `/robots.txt`, `/sitemap.xml`, `/404.html` | For search engines, and the "page not found" page. |

## Adding a new page

1. Add an entry to `pages` in `pages.json` (copy a neighbour). Use `/lessons/english-<topic>.html` for new lessons.
2. Run `python3 _seo/seo.py` from the main repo.
3. Commit in each repo it changed, then push.

If you skip step 1, the script still adds analytics but prints a warning. The page gets no description or share image, and it isn't added to the sitemap.

The script only rewrites its own block (between `<!-- seo -->` and `<!-- /seo -->`) in each page's `<head>`, so it's safe to run any number of times. `--dry-run` only reports what it would change.

## After rebuilding a course

The course build scripts mark every course page `noindex` and add analytics. The public previews in `/courses/` are meant to be indexed, so after `build.py --preview …` run `python3 _seo/seo.py` again to restore their tags.

## Share image for a new page

The images are generated from the `card` text in `pages.json` (eyebrow, title, one line) in the section's colour. Ask Claude to "render the share image for <page>". If there's no image, set `"image"` to the section's image (for example `lessons.png`) or leave it out to use `default.png`.

## Moving a lesson

GitHub Pages can't do real redirects. Leave a small redirect page at the old address (see any of the old `english_*_v*.html` files in the repo root), add the old path to `skip` in `pages.json`, and update the links.
