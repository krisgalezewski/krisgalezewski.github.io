/* English Voiced — Cloudflare Web Analytics
   Every page on englishvoiced.com loads this one file, so the token lives here only.

   To switch it on: Cloudflare dashboard → Analytics & Logs → Web Analytics →
   Add a site → englishvoiced.com → copy the "token" value from the JS snippet
   and paste it below in place of PASTE_TOKEN_HERE.

   Cookieless: no cookies, no personal data, so no cookie banner is needed.
   Visits from your own computer (localhost, file://) are not counted. */
(function () {
  var TOKEN = '797cf882a0744ad3a659cf16e09b5977';
  if (!TOKEN || TOKEN === 'PASTE_TOKEN_HERE') return;
  if (!/(^|\.)englishvoiced\.com$/.test(location.hostname)) return;
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: TOKEN }));
  document.head.appendChild(s);
})();
