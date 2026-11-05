(function () {
  var lang = new URLSearchParams(window.location.search).get('lang');
  if (lang !== 'en' && lang !== 'es') {
    try { lang = window.localStorage.getItem('visiweb-demo-lang'); } catch (e) { lang = 'es'; }
  }
  if (lang !== 'en') return;
  document.documentElement.lang = 'en';
  document.querySelectorAll('[data-en]').forEach(function (node) {
    var text = node.getAttribute('data-en');
    if (node.tagName === 'META') node.setAttribute('content', text);
    else node.textContent = text;
  });
  document.querySelectorAll('a[href]').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href || /^(https?:|mailto:|tel:|#)/.test(href) || href.indexOf('lang=') !== -1) return;
    link.setAttribute('href', href + (href.indexOf('?') === -1 ? '?' : '&') + 'lang=en');
  });
})();
