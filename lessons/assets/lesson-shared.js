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
  EVLesson.initHeader = function (opts) {
    opts = opts || {};
    var crumb = opts.category ? opts.category + ' · ' : '';
    var header = document.createElement('div');
    header.className = 'ev-lesson-header';
    header.innerHTML =
      '<a href="https://englishvoiced.com/" class="ev-lesson-header__logo">' +
        'English Voiced <small>with Kris</small>' +
      '</a>' +
      '<span class="ev-lesson-header__sep">/</span>' +
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
