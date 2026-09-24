#!/usr/bin/env python3
"""
Recorded audio for the free lessons in /lessons/ (Google Cloud Text-to-Speech).

Run from the main repo folder (krisgalezewski.github.io):

    python3 _audio/generate_audio.py YOUR_API_KEY
    # or, without the key ending up in your shell history:
    export GOOGLE_TTS_API_KEY="YOUR_API_KEY"; python3 _audio/generate_audio.py

    python3 _audio/generate_audio.py --dry-run    # just count, call nothing, spend nothing

What it does
  * Reads _audio/texts.json: every sentence/word the lessons can speak
    (collected by _audio/harvest.py + _audio/extract.py).
  * Creates one MP3 per text in lessons/audio/, named by a hash of the text,
    and writes lessons/audio/manifest.json (text -> file).
  * Skips any MP3 that already exists, so it's safe to stop and re-run, and
    after editing a lesson only the new sentences cost anything.

How the lessons use it
  lessons/assets/lesson-shared.js looks up every sentence a lesson asks the
  browser to speak. If there's a recording, it plays that; if not, the lesson
  falls back to the browser's own voice exactly as before. Nothing breaks if
  this script has never been run.

No extra installs needed: plain Python 3.
"""
import base64, hashlib, json, os, re, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
TEXTS = os.path.join(HERE, "texts.json")
OUT_DIR = os.path.join(REPO, "lessons", "audio")
MANIFEST = os.path.join(OUT_DIR, "manifest.json")

VOICE = "en-GB-Neural2-C"      # same British voice as the English Games
SPEAKING_RATE = 0.95           # natural pace; lessons slow it down themselves when needed
ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize?key="
WORKERS = 6


def key(text):
    return " ".join(str(text).split())


def filename(text):
    return hashlib.sha1(key(text).encode("utf-8")).hexdigest()[:16] + ".mp3"


def synthesize(api_key, text):
    body = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": "en-GB", "name": VOICE},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": SPEAKING_RATE},
    }).encode("utf-8")
    req = urllib.request.Request(ENDPOINT + api_key, data=body, headers={"Content-Type": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return base64.b64decode(json.load(r)["audioContent"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:300]
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt * 2)
                continue
            raise RuntimeError(f"HTTP {e.code}: {msg}")
        except urllib.error.URLError as e:
            if attempt < 3:
                time.sleep(2 ** attempt * 2)
                continue
            raise RuntimeError(f"network error: {e.reason}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    api_key = (args[0] if args else os.environ.get("GOOGLE_TTS_API_KEY", "")).strip()
    if api_key and not re.fullmatch(r"[A-Za-z0-9_-]{30,60}", api_key):
        sys.exit("That doesn't look like a Google API key (it should be about 39 letters, numbers, - or _ "
                 "and start with AIza). Run:  python3 _audio/generate_audio.py YOUR_API_KEY")

    lessons = json.load(open(TEXTS, encoding="utf-8"))
    texts = sorted({key(t) for ts in lessons.values() for t in ts if key(t)})
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = {}
    todo = []
    for t in texts:
        f = filename(t)
        manifest[t] = f
        if not os.path.exists(os.path.join(OUT_DIR, f)):
            todo.append(t)

    chars = sum(len(t) for t in todo)
    print(f"{len(texts)} texts in {len(lessons)} lessons; {len(texts) - len(todo)} already recorded; "
          f"{len(todo)} to generate ({chars:,} characters).")
    if dry:
        print("Dry run: nothing generated.")
        return
    if todo and not api_key:
        sys.exit("No API key. Run:  python3 _audio/generate_audio.py YOUR_API_KEY")

    done = failed = 0
    errors = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(synthesize, api_key, t): t for t in todo}
        for fut in as_completed(futures):
            t = futures[fut]
            try:
                audio = fut.result()
                with open(os.path.join(OUT_DIR, filename(t)), "wb") as fh:
                    fh.write(audio)
                done += 1
            except Exception as e:
                failed += 1
                errors.append((t, str(e)))
                if failed == 1:
                    print(f"\nFirst error (for \"{t[:60]}\"): {e}\n")
                if failed >= 10 and done == 0:
                    pool.shutdown(cancel_futures=True)
                    break
            if (done + failed) % 50 == 0:
                print(f"  {done + failed}/{len(todo)} …", flush=True)

    # Only list files that actually exist, so the lessons never ask for a missing one
    manifest = {t: f for t, f in manifest.items() if os.path.exists(os.path.join(OUT_DIR, f))}
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)

    print(f"\nDone: {done} new recordings, {failed} failed. Manifest lists {len(manifest)} recordings.")
    if failed:
        print("Some failed — just run the same command again to retry only those.")
    else:
        print("Next: commit lessons/audio/ and push.")


if __name__ == "__main__":
    main()
