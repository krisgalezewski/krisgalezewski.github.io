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
    EVLesson.initQuizLinks();
  };

  // ---- 1a) Lesson quiz links ----------------------------------------------
  // Every lesson has a 12-question self-practice quiz in the english-quiz
  // app (Supabase seed: english-quiz/sql/seed-lesson-quizzes-lessons.sql).
  // The quiz ids are fixed in that seed, so the links never change. Adds a
  // "Take the quiz" button to the subbar (visible on every tab) and a card
  // at the very end of the page. Opens in a new tab on purpose: the
  // glossary only lives until the page reloads, so leaving would lose it.
  // A value is either a quiz id, or a list of [practice.html query, label]
  // for a lesson covered by existing quizzes (matched by their slug).
  var QUIZ_URL = 'https://englishvoiced.com/english-quiz/practice.html?';
  EVLesson.QUIZZES = {
    'english-phrasal-verbs.html': '272e449b-8135-5f3a-a021-ae04d6ea17d0',
    'english-confusable-pairs.html': '91d7fbc9-4e2d-5b0c-a8aa-c2c57f4564a3',
    'english-idioms.html': '52329a05-2251-51bd-8585-ad5a1fff7e0f',
    'english-word-formation.html': '551a7af4-2366-5a1a-b6f7-09bef210abe5',
    'english-feelings-and-emotions.html': [
      ['slug=feelings-advanced', 'Vocabulary quiz'],
      ['slug=feelings-idioms', 'Idioms quiz']
    ],
    'english-collocations.html': 'cd55b686-7dfc-57aa-a1ac-d292ac8b039e',
    'english-determiners.html': '656e117d-b008-5567-97ef-661b35e30c37',
    'english-sentences-and-clauses.html': 'ddbe0ab5-1b8a-567b-9f80-4dc773ab8db8',
    'english-inversion-negative-adverbials.html': 'ad02ea0d-4e10-5469-bf55-3f2961fdd0d4',
    'english-cleft-sentences.html': 'ea11fb4c-1714-5afc-a754-c82f60e2e2a9',
    'english-conditionals.html': '1f1a4e71-7efa-5ec3-a90a-9b7612c42d10',
    'english-verb-tenses.html': 'd5369334-11c1-52c9-a704-b6f05a1fc4e3',
    'english-pronunciation.html': 'a99531d6-c60d-5af6-b0cb-bfcff53f77a5',
    'english-transitional-words.html': '5d74f5e6-a984-5605-8e83-6ab84c342e48',
    'english-hedging-language.html': 'bdb2d329-98c5-52fd-a906-fa05b74c4215',
    'workplace-eq.html': 'b215141d-dd6f-57e8-b515-d3cb80bbb68f'
  };

  EVLesson.initQuizLinks = function () {
    var file = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!/\.html$/.test(file)) file += '.html'; // pretty URLs without .html
    var entry = EVLesson.QUIZZES[file];
    if (!entry || document.getElementById('evQuizBtn')) return;
    var quizzes = typeof entry === 'string' ? [['quiz=' + entry, 'Take the quiz']] : entry;
    var href = QUIZ_URL + quizzes[0][0];
    var many = quizzes.length > 1;

    // Subbar button, grouped with the theme toggle on the right
    var toggle = document.getElementById('evThemeToggle');
    if (toggle) {
      var right = document.createElement('div');
      right.className = 'ev-lesson-subbar__right';
      toggle.parentNode.insertBefore(right, toggle);
      right.innerHTML =
        '<a class="ev-quiz-btn" id="evQuizBtn" href="' + href + '" target="_blank" rel="noopener">' +
          (many ? 'Take a quiz' : 'Take the quiz') + ' <span aria-hidden="true">→</span></a>';
      right.appendChild(toggle);
    }

    // End-of-page card, added once the lesson's own markup has loaded
    function addCard() {
      if (document.getElementById('evQuizCard')) return;
      var card = document.createElement('section');
      card.className = 'ev-quiz-card';
      card.id = 'evQuizCard';
      card.innerHTML =
        '<div class="ev-quiz-card__inner">' +
          '<div>' +
            '<div class="ev-quiz-card__kicker">' + (many ? quizzes.length + ' lesson quizzes' : 'Lesson quiz') + ' · 12 questions' + (many ? ' each' : '') + '</div>' +
            '<div class="ev-quiz-card__title">Find out what stuck</div>' +
            '<div class="ev-quiz-card__text">Quick questions on this lesson — you’ll see the right answer after each one. Opens in a new tab, so this lesson stays open.</div>' +
          '</div>' +
          '<div class="ev-quiz-card__actions">' +
            quizzes.map(function (qz) {
              return '<a class="ev-quiz-btn ev-quiz-btn--lg" href="' + QUIZ_URL + qz[0] + '" target="_blank" rel="noopener">' +
                qz[1] + ' <span aria-hidden="true">→</span></a>';
            }).join('') +
          '</div>' +
        '</div>';
      document.body.appendChild(card);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addCard);
    else addCard();
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
