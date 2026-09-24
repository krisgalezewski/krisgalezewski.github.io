# Recorded audio for the free lessons

The lessons in `/lessons/` used to speak with the browser's built-in voice, which sounds different (and often robotic) on every device. This folder makes natural recordings of everything they say, using Google Cloud Text-to-Speech with the same British voice as the English Games (`en-GB-Neural2-C`).

## Generate the audio

From the main repo folder (`krisgalezewski.github.io`), in Terminal:

```bash
python3 _audio/generate_audio.py --dry-run          # see how much there is; spends nothing
python3 _audio/generate_audio.py YOUR_API_KEY       # generate
```

It creates `lessons/audio/*.mp3` and `lessons/audio/manifest.json`. Then commit `lessons/audio/` and push. That's it: the lessons pick the recordings up automatically.

- It skips recordings that already exist, so if it's interrupted, or some fail, just run it again.
- Plain Python 3, nothing to install.
- To keep the key out of your shell history, use `export GOOGLE_TTS_API_KEY="…"` and then run `python3 _audio/generate_audio.py` without the key.

## How it works in the lessons

`lessons/assets/lesson-shared.js` (loaded by every lesson) checks each sentence a lesson asks the browser to speak. If `manifest.json` has a recording of that exact sentence, it plays the recording; otherwise the browser voice speaks it as before. So a sentence without a recording still works, it just sounds like the browser voice.

## After adding or editing a lesson

New sentences won't have recordings until you collect them and run the generator again (only the new ones cost anything). Collecting needs a headless browser, so the easiest way is to ask Claude: "re-collect the lesson audio texts and update `_audio/texts.json`". Manually, with Playwright installed, serve the repo locally and run:

```bash
python3 -m http.server 8000 &          # from the repo root
cd _audio
python3 harvest.py http://localhost:8000/lessons/ english-new-lesson.html …
python3 extract.py http://localhost:8000/lessons/ ../lessons/ english-new-lesson.html …
```

- `harvest.py` opens each lesson and clicks through everything, recording what it says.
- `extract.py` adds every sentence from the lesson's own word lists and examples, passed through the lesson's own speak function, and writes `texts.json`.
