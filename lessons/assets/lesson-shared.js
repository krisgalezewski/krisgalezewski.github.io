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

  // ---- 1) Header --------------------------------------------------------
  // Renders the same full site nav as the homepage header, so a student on
  // any lesson page can jump straight to Articles / Videos / Games /
  // Quizzes / Lessons / Courses / Book a Lesson — not just back to the
  // lessons hub. A small breadcrumb line (category · lesson title) sits
  // underneath it for orientation within /lessons/.
  EVLesson.initHeader = function (opts) {
    opts = opts || {};
    var crumb = opts.category ? opts.category + ' · ' : '';
    var header = document.createElement('header');
    header.className = 'ev-lesson-header';
    header.innerHTML =
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
      '<span class="ev-lesson-header__crumb">' +
        '<a href="/lessons/">' + crumb + 'All lessons</a>' +
      '</span>';
    document.body.insertBefore(header, document.body.firstChild);
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
