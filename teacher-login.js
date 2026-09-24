/* ==========================================================================
   English Voiced — teacher sign-in
   Used by the course teacher dashboards and the quiz Host page. The database
   only lets the teacher's account read/mark student progress and run quizzes
   (see english-plus-grammar-course/courses-security.sql and
   english-quiz/sql/quiz-security.sql), so these pages ask you to sign in once.
   The browser then remembers you (per Supabase project) until you sign out.

   Usage, after creating the page's Supabase client:
     EVTeacherGate(supabaseClient);
   ========================================================================== */
(function () {
  'use strict';

  var CSS =
    '.evt-overlay{position:fixed;inset:0;z-index:99999;background:rgba(8,8,10,.72);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.evt-card{background:#fff;color:#14140f;width:100%;max-width:380px;border-radius:14px;padding:26px 24px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '.evt-card h2{margin:0 0 6px;font-size:21px;line-height:1.2}' +
    '.evt-card p{margin:0 0 16px;font-size:14px;line-height:1.5;color:#55554f}' +
    '.evt-card label{display:block;font-size:12px;font-weight:600;letter-spacing:.04em;margin:0 0 5px;color:#33332d}' +
    '.evt-card input{width:100%;box-sizing:border-box;font:inherit;font-size:15px;padding:10px 12px;border:1px solid #c9c7bd;border-radius:8px;margin:0 0 12px;background:#fff;color:#14140f}' +
    '.evt-card button{width:100%;font:inherit;font-size:15px;font-weight:700;padding:11px;border:0;border-radius:8px;background:#1c6b34;color:#fff;cursor:pointer}' +
    '.evt-card button[disabled]{opacity:.6;cursor:default}' +
    '.evt-err{min-height:1.2em;margin:10px 0 0;font-size:13px;color:#b3261e}' +
    '.evt-bar{position:fixed;right:12px;bottom:12px;z-index:99998;background:rgba(20,20,15,.88);color:#f4f1ea;font:12px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:7px 10px;border-radius:999px;display:flex;gap:8px;align-items:center}' +
    '.evt-bar button{font:inherit;color:#f4f1ea;background:transparent;border:1px solid rgba(244,241,234,.45);border-radius:999px;padding:3px 9px;cursor:pointer}';

  function addStyle() {
    if (document.getElementById('evt-style')) return;
    var s = document.createElement('style');
    s.id = 'evt-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function showLogin(client) {
    addStyle();
    var o = document.createElement('div');
    o.className = 'evt-overlay';
    o.innerHTML =
      '<form class="evt-card" autocomplete="on">' +
      '<h2>Teacher sign-in</h2>' +
      '<p>This page is for Kris only. Students don\'t need it: their lessons and quizzes work without signing in.</p>' +
      '<label for="evt-email">Email</label><input id="evt-email" type="email" autocomplete="username" required>' +
      '<label for="evt-pass">Password</label><input id="evt-pass" type="password" autocomplete="current-password" required>' +
      '<button type="submit">Sign in</button>' +
      '<div class="evt-err" role="alert"></div>' +
      '</form>';
    document.body.appendChild(o);
    var form = o.querySelector('form'), err = o.querySelector('.evt-err'), btn = o.querySelector('button');
    o.querySelector('#evt-email').focus();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.textContent = '';
      btn.disabled = true; btn.textContent = 'Signing in…';
      client.auth.signInWithPassword({
        email: o.querySelector('#evt-email').value.trim(),
        password: o.querySelector('#evt-pass').value
      }).then(function (res) {
        if (res.error) {
          err.textContent = /invalid/i.test(res.error.message) ? 'Wrong email or password.' : res.error.message;
          btn.disabled = false; btn.textContent = 'Sign in';
          return;
        }
        location.reload(); // reload so everything loads with your access
      }).catch(function () {
        err.textContent = 'Could not reach the server. Check your connection and try again.';
        btn.disabled = false; btn.textContent = 'Sign in';
      });
    });
  }

  function showBar(client, email) {
    addStyle();
    var b = document.createElement('div');
    b.className = 'evt-bar';
    b.innerHTML = '<span></span><button type="button">Sign out</button>';
    b.querySelector('span').textContent = 'Signed in' + (email ? ' as ' + email : '');
    b.querySelector('button').addEventListener('click', function () {
      client.auth.signOut().then(function () { location.reload(); });
    });
    document.body.appendChild(b);
  }

  window.EVTeacherGate = function (client) {
    if (!client || !client.auth) return;
    client.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      ready(function () {
        if (session) showBar(client, session.user && session.user.email);
        else showLogin(client);
      });
    }).catch(function () { ready(function () { showLogin(client); }); });
  };
})();
