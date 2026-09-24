/* ==========================================================================
   English Voiced — shared lesson chrome
   Linked by every file in /lessons/. Two jobs:
     1) EVLesson.initHeader(opts)     — inject the wordmark + breadcrumb bar
     2) EVLesson.printGlossary(opts)  — let a student print / save-as-PDF
        whatever they've added to their glossary in this session, since
        nothing here is stored beyond the page reload.
   Each lesson's own inline script calls these with its own title/category
   and its own glossary container id — the lesson keeps its own data model
   (PVS, glossary array, etc.); this file only supplies the shared chrome.
   ========================================================================== */
(function () {
  'use strict';

  var EVLesson = {};

  // ---- 1) Header ----------------------------------------------------------
  // Renders the same full site nav as the homepage header, so a student on
  // any lesson page can jump straight to Articles / Videos / Games /
  // Quizzes / Lessons / Courses / Book a Lesson — not just back to the
  // lessons hub. The divider sits right under the nav; a subbar below it
  // carries the category crumb (left) and the light/dark toggle (right),
  // so neither crowds the nav row above.
  EVLesson.initHeader = function (opts) {
    opts = opts || {};
    var crumb = opts.category ? opts.category + ' · ' : '';

    var wrap = document.createElement('div');
    wrap.className = 'ev-lesson-header-wrap';
    wrap.innerHTML =
      '<header class="ev-lesson-header">' +
        '<a class="ev-lesson-header__logo" href="https://englishvoiced.com/" aria-label="English Voiced with Kris — home">' +
          '<span class="ev-lesson-header__logo-name">English Voiced</span>' +
          '<span class="ev-lesson-header__logo-by">with Kris</span>' +
        '</a>' +
        '<nav class="ev-lesson-header__nav" aria-label="Sections">' +
          '<a class="ev-lesson-header__nav-articles" href="https://englishvoiced.com/#articles">Lens: Articles</a>' +
          '<a class="ev-lesson-header__nav-videos"   href="https://englishvoiced.com/#videos">Lens: Videos</a>' +
          '<a class="ev-lesson-header__nav-games"    href="https://englishvoiced.com/#games">Games</a>' +
          '<a class="ev-lesson-header__nav-quizzes"  href="https://englishvoiced.com/#quizzes">Quizzes</a>' +
          '<a class="ev-lesson-header__nav-lessons"  href="/lessons/">Lessons</a>' +
          '<a class="ev-lesson-header__nav-courses"  href="https://englishvoiced.com/#courses">Courses</a>' +
          '<a class="ev-lesson-header__nav-book"     href="https://englishvoiced.com/#book">Book a Lesson</a>' +
        '</nav>' +
      '</header>';
    document.body.insertBefore(wrap, document.body.firstChild);

    var subbar = document.createElement('div');
    subbar.className = 'ev-lesson-subbar';
    subbar.innerHTML =
      '<span class="ev-lesson-header__crumb">' +
        '<a href="/lessons/">' + crumb + 'All lessons</a>' +
      '</span>' +
      '<div class="ev-theme-toggle" id="evThemeToggle" role="group" aria-label="Page theme">' +
        '<button type="button" class="ev-theme-toggle__opt" data-theme-opt="dark">Dark</button>' +
        '<button type="button" class="ev-theme-toggle__opt" data-theme-opt="light">Light</button>' +
      '</div>';
    wrap.insertAdjacentElement('afterend', subbar);

    EVLesson.initThemeToggle();
  };

  // ---- 1b) Light / dark theme toggle --------------------------------------
  // Sets <html data-theme="light|dark">, which lesson-theme.css reads to
  // swap the token set. Rendered as a two-option segmented switch (both
  // "Dark" and "Light" always visible, the active one highlighted) rather
  // than a single button that just states the current mode — so a student
  // can see at a glance that switching is possible, not just what it's
  // currently set to. Preference is remembered per-browser (localStorage)
  // so it carries across lessons and visits — there's nothing personal or
  // session-specific in "prefers a light background", unlike the glossary.
  EVLesson.initThemeToggle = function () {
    var STORAGE_KEY = 'ev-theme';
    var group = document.getElementById('evThemeToggle');
    if (!group) return;
    var opts = group.querySelectorAll('.ev-theme-toggle__opt');

    function apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      opts.forEach(function (opt) {
        var isOn = opt.getAttribute('data-theme-opt') === theme;
        opt.classList.toggle('on', isOn);
        opt.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      });
    }

    var saved = 'dark';
    try { saved = localStorage.getItem(STORAGE_KEY) || 'dark'; } catch (e) {}
    apply(saved);

    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        var theme = opt.getAttribute('data-theme-opt');
        apply(theme);
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
      });
    });
  };

  // ---- 2) Glossary print / save-as-PDF -----------------------------------
  // containerId: the element already showing the rendered glossary list
  // (e.g. '#glossCont'). We clone its current contents (whatever the
  // student has saved this session), strip interactive controls that make
  // no sense on paper, and print just that — using the browser's own
  // "Save as PDF" destination gives them a PDF for free, no server needed.
  EVLesson.printGlossary = function (opts) {
    opts = opts || {};
    var src = document.querySelector(opts.containerId || '#glossCont');
    if (!src) return;

    var root = document.getElementById('ev-print-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'ev-print-root';
      root.className = 'ev-print-root';
      root.style.display = 'none';
      document.body.appendChild(root);
    }

    var clone = src.cloneNode(true);
    clone.querySelectorAll('button, .audio-btn, .act').forEach(function (el) {
      el.remove();
    });

    var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    root.innerHTML =
      '<div class="ev-print-title">' + (opts.title || 'My glossary') + '</div>' +
      '<div class="ev-print-sub">English Voiced with Kris — saved ' + today + '</div>';
    root.appendChild(clone);

    document.body.classList.add('ev-printing-glossary');
    window.focus();
    window.print();
  };

  window.addEventListener('afterprint', function () {
    document.body.classList.remove('ev-printing-glossary');
  });

  window.EVLesson = EVLesson;
})();

/* ==========================================================================
   3) Recorded audio
   Every lesson speaks through the browser's built-in voice
   (speechSynthesis.speak). If a natural-sounding recording of the same
   sentence exists in /lessons/audio/ (made by _audio/generate_audio.py),
   play that instead; otherwise fall back to the browser voice exactly as
   before. The lessons themselves don't need to know: their play buttons,
   "playing" highlights and onend handlers keep working, because the
   recording fires the same start/end events on the lesson's utterance.
   Also stops speech from carrying over to the next page.
   ========================================================================== */
(function () {
  'use strict';
  var synth = window.speechSynthesis;
  if (!synth || !window.Audio) return;

  var BASE = '/lessons/audio/';
  // Lessons slow the browser voice down (rate ~0.82-0.87) to sound natural;
  // the recordings are already at a natural pace, so rates are taken
  // relative to that. A "slow" button (0.5-0.55) still plays clearly slower.
  var NATURAL_RATE = 0.84;
  var manifest = null, current = null, currentU = null;

  try {
    fetch(BASE + 'manifest.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) { manifest = m; })
      .catch(function () {});
  } catch (e) {}

  var origSpeak = synth.speak.bind(synth);
  var origCancel = synth.cancel.bind(synth);
  var speakingDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(synth), 'speaking');

  function key(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); }
  function fire(u, type) { try { u.dispatchEvent(new Event(type)); } catch (e) {} }
  function stopCurrent() {
    if (!current) return;
    var a = current, u = currentU;
    current = null; currentU = null;
    try { a.pause(); } catch (e) {}
    fire(u, 'end');
  }

  synth.speak = function (u) {
    var file = manifest && u && manifest[key(u.text)];
    if (!file) return origSpeak(u);
    stopCurrent();
    var a = new Audio(BASE + file);
    a.playbackRate = Math.max(0.6, Math.min(1.25, (u.rate || NATURAL_RATE) / NATURAL_RATE));
    current = a; currentU = u;
    var fellBack = false;
    function fallback() {
      if (fellBack) return; fellBack = true;
      if (current === a) { current = null; currentU = null; }
      origSpeak(u);
    }
    a.addEventListener('playing', function () { fire(u, 'start'); }, { once: true });
    a.addEventListener('ended', function () {
      if (current === a) { current = null; currentU = null; }
      fire(u, 'end');
    }, { once: true });
    a.addEventListener('error', fallback, { once: true });
    var p = a.play();
    if (p && p.catch) p.catch(fallback);
  };

  synth.cancel = function () { stopCurrent(); origCancel(); };

  if (speakingDesc && speakingDesc.get) {
    try {
      Object.defineProperty(synth, 'speaking', {
        configurable: true,
        get: function () { return !!current || speakingDesc.get.call(synth); }
      });
    } catch (e) {}
  }

  // Don't let anything keep talking after the student leaves the page.
  window.addEventListener('pagehide', function () { synth.cancel(); });
})();
