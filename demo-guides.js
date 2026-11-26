/* VisiWeb Madrid · textos indicativos exclusivos de demo.html
   Se inyectan en el iframe de panel/preview/ sin modificar esa carpeta. */
(function () {
  'use strict';

  var FORCE_PLAN = 'digitalizacion-total';

  var COPY = {
    es: {
      salesBannerDetail: 'Así quedaría tu local. Esta demo es interactiva.',
      reviewsDemo: 'Reseñas de demostración',
      gbpDemo: 'Vista previa',
      gbpSubtitle: 'Vista previa de ejemplo. El teléfono, la dirección y las opiniones son ficticios.',
      mapSearchHint: 'En la web del local, este mapa abre la ruta.',
      bookDemoNote: 'Vista previa. El mensaje solo sale si abres WhatsApp.',
      reserveCallHint: 'En esta demo el número es de ejemplo.',
      demoCallNote: 'Número de ejemplo. En la web del local, este botón llama de verdad.',
      demoRouteNote: 'Dirección de ejemplo. En la web del local, esto abre la ruta.',
      demoSaveNote: 'Vista previa. En la ficha real, esto guarda el local en Google.',
      demoNotice: 'Maqueta de ejemplo de VisiWeb Madrid. El negocio, los precios, los horarios y las reseñas son ficticios.',
      demoCreditLead: 'Web demo desarrollada por',
      demoCreditPlan: '· Realizada con el Plan Digitalización Total',
      demoRibbon: 'Web de demostración',
      planBadge: 'Plan Digitalización Total'
    },
    en: {
      salesBannerDetail: 'This is how your place would look. This demo is interactive.',
      reviewsDemo: 'Sample reviews',
      gbpDemo: 'Preview',
      gbpSubtitle: 'Sample preview. The phone, address and reviews are fictional.',
      mapSearchHint: 'On the real site, this map opens the route.',
      bookDemoNote: 'Preview. The message only leaves if you open WhatsApp.',
      reserveCallHint: 'The number in this demo is a sample.',
      demoCallNote: 'Sample number. On the real site, this button places the call.',
      demoRouteNote: 'Sample address. On the real site, this opens the route.',
      demoSaveNote: 'Preview. On the real listing, this saves the place in Google.',
      demoNotice: 'Sample website by VisiWeb Madrid. The business, prices, opening hours and reviews are fictional.',
      demoCreditLead: 'Demo website built by',
      demoCreditPlan: '· Built with the Digitalización Total Plan',
      demoRibbon: 'Demo website',
      planBadge: 'Digitalización Total Plan'
    }
  };

  var state = {
    lang: 'es',
    mesa: false,
    frame: null,
    noteTimer: 0,
    observer: null
  };

  function t(key) {
    return (COPY[state.lang] && COPY[state.lang][key]) || COPY.es[key] || '';
  }

  function lockPlan(win, doc) {
    if (!win) return;
    try { win.FORCE_PLAN = FORCE_PLAN; } catch (e) { /* ignore */ }
    try {
      var params = new URLSearchParams(win.location.search || '');
      if (params.get('plan') !== FORCE_PLAN) {
        params.set('plan', FORCE_PLAN);
      }
    } catch (e) { /* ignore */ }

    var demo = win.VISIWEB_DEMO;
    if (demo && typeof demo === 'object') {
      try {
        Object.defineProperty(demo, 'plan', {
          configurable: true,
          enumerable: true,
          get: function () { return FORCE_PLAN; },
          set: function () { /* locked */ }
        });
      } catch (e) {
        try { demo.plan = FORCE_PLAN; } catch (err) { /* ignore */ }
      }
    }

    if (!doc || !doc.documentElement) return;
    doc.documentElement.dataset.plan = FORCE_PLAN;
    doc.documentElement.classList.remove('plan-basico');
    doc.documentElement.classList.add('plan-digitalizacion-total');
  }

  function watchPlan(doc) {
    if (!doc || !doc.documentElement) return;
    if (state.observer) {
      try { state.observer.disconnect(); } catch (e) { /* ignore */ }
    }
    state.observer = new MutationObserver(function () {
      if (doc.documentElement.dataset.plan !== FORCE_PLAN) {
        doc.documentElement.dataset.plan = FORCE_PLAN;
      }
      doc.documentElement.classList.remove('plan-basico');
    });
    state.observer.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['data-plan', 'class']
    });
  }

  function showNote(doc, key) {
    var note = doc.getElementById('demo-action-note');
    if (!note) return;
    note.textContent = t(key);
    note.hidden = false;
    clearTimeout(state.noteTimer);
    state.noteTimer = setTimeout(function () { note.hidden = true; }, 3400);
  }

  function guardClicks(doc, selector, key) {
    Array.prototype.forEach.call(doc.querySelectorAll(selector), function (node) {
      if (node.getAttribute('data-demo-guide-guard') === '1') return;
      node.setAttribute('data-demo-guide-guard', '1');
      node.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        showNote(doc, key);
      }, true);
    });
  }

  function pill(text) {
    var span = document.createElement('span');
    span.className = 'demo-guide-pill';
    span.setAttribute('data-demo-guide', '1');
    span.textContent = text;
    return span;
  }

  function noteP(text, extraClass) {
    var p = document.createElement('p');
    p.className = 'demo-guide-note' + (extraClass ? ' ' + extraClass : '');
    p.setAttribute('data-demo-guide', '1');
    p.textContent = text;
    return p;
  }

  function ensureStyle(doc) {
    if (doc.getElementById('demo-guides-style')) return;
    var style = doc.createElement('style');
    style.id = 'demo-guides-style';
    style.textContent = [
      '.demo-guide-pill{display:inline-flex;align-items:center;border-radius:999px;border:1px solid #cbd5e1;padding:.25rem .625rem;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#334155}',
      '.dark .demo-guide-pill{border-color:#475569;color:#cbd5e1}',
      '.demo-guide-note{margin-top:.75rem;font-size:.875rem;line-height:1.625;color:#475569}',
      '.dark .demo-guide-note{color:#94a3b8}',
      '.demo-guide-note.is-xs{margin-top:1rem;font-size:.75rem;line-height:1.625;color:#64748b}',
      '.demo-guide-map-hint{display:block;margin-bottom:.5rem;text-align:right;font-size:.75rem;font-weight:500;color:#57534e}',
      '@media (min-width:640px){.demo-guide-map-hint{position:absolute;right:1rem;top:1rem;z-index:10;margin:0;border-radius:999px;border:1px solid #e7e5e4;background:rgba(255,255,255,.95);padding:.375rem .75rem;color:#44403c;box-shadow:0 1px 2px rgba(0,0,0,.05);backdrop-filter:blur(4px)}.dark .demo-guide-map-hint{border-color:#44403c;background:rgba(28,25,23,.95);color:#e7e5e4}}',
      '#demo-action-note{position:fixed;left:50%;z-index:70;max-width:min(20rem,calc(100vw - 2rem));transform:translateX(-50%);border-radius:999px;background:#1c1917;color:#fff;padding:.55rem .9rem;text-align:center;font-size:.75rem;line-height:1.35;box-shadow:0 10px 30px -12px rgb(0 0 0 / .45);bottom:1.25rem}',
      '@media (max-width:767px){#demo-action-note{bottom:calc(5.25rem + env(safe-area-inset-bottom))}}',
      '.demo-guide-footer-notice{max-width:28rem;margin:0 auto;font-size:11px;line-height:1.6;color:#a3a3a3}',
      '.dark .demo-guide-footer-notice{color:#78716c}',
      '.demo-guide-call-hint{display:block;margin-top:.125rem;font-size:.75rem;color:#78716c}'
    ].join('');
    (doc.head || doc.documentElement).appendChild(style);
  }

  function ensureActionNote(doc) {
    if (doc.getElementById('demo-action-note')) return;
    var note = doc.createElement('p');
    note.id = 'demo-action-note';
    note.hidden = true;
    note.setAttribute('data-demo-guide', '1');
    doc.body.appendChild(note);
  }

  function setGuideText(doc, key, text) {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-demo-guide-key="' + key + '"]'), function (node) {
      node.textContent = (key === 'demoCreditPlan' ? ' ' : '') + text;
    });
  }

  function wrapTitleWithBadge(doc, titleId, badgeKey) {
    var title = doc.getElementById(titleId);
    if (!title || !title.parentNode) return;
    var existing = doc.querySelector('[data-demo-guide-key="' + badgeKey + '"]');
    if (existing) {
      existing.textContent = t(badgeKey);
      return;
    }
    var wrap = doc.createElement('div');
    wrap.className = 'flex flex-wrap items-baseline justify-between gap-3';
    wrap.setAttribute('data-demo-guide-wrap', '1');
    title.parentNode.insertBefore(wrap, title);
    wrap.appendChild(title);
    var badge = pill(t(badgeKey));
    badge.setAttribute('data-demo-guide', '1');
    badge.setAttribute('data-demo-guide-key', badgeKey);
    wrap.appendChild(badge);
  }

  function ensureNode(doc, key, create) {
    var node = doc.querySelector('[data-demo-guide-key="' + key + '"]');
    if (node) {
      if (key === 'demoCreditPlan') node.textContent = ' ' + t(key);
      else node.textContent = t(key);
      return node;
    }
    node = create();
    node.setAttribute('data-demo-guide', '1');
    node.setAttribute('data-demo-guide-key', key);
    return node;
  }

  function injectWeb(doc) {
    wrapTitleWithBadge(doc, 'reviews-title', 'reviewsDemo');
    wrapTitleWithBadge(doc, 'gbp-title', 'gbpDemo');

    var gbpTitle = doc.getElementById('gbp-title');
    if (gbpTitle) {
      var gbpHost = gbpTitle.closest('[data-demo-guide-wrap]') || gbpTitle.parentNode;
      if (gbpHost && gbpHost.parentNode && !doc.querySelector('[data-demo-guide-key="gbpSubtitle"]')) {
        var sub = noteP(t('gbpSubtitle'));
        sub.setAttribute('data-demo-guide', '1');
        sub.setAttribute('data-demo-guide-key', 'gbpSubtitle');
        gbpHost.parentNode.insertBefore(sub, gbpHost.nextSibling);
      } else {
        setGuideText(doc, 'gbpSubtitle', t('gbpSubtitle'));
      }
    }

    var mapBlock = doc.querySelector('#ubicacion .relative.mt-6');
    if (mapBlock) {
      ensureNode(doc, 'mapSearchHint', function () {
        var hint = doc.createElement('span');
        hint.className = 'demo-guide-map-hint';
        hint.textContent = t('mapSearchHint');
        mapBlock.insertBefore(hint, mapBlock.firstChild);
        return hint;
      });
    }

    var booking = doc.getElementById('booking-form');
    if (booking) {
      ensureNode(doc, 'bookDemoNote', function () {
        var bookNote = noteP(t('bookDemoNote'), 'is-xs');
        var groups = booking.querySelector('[data-i18n="groupsNotice"]');
        if (groups) booking.insertBefore(bookNote, groups);
        else booking.appendChild(bookNote);
        return bookNote;
      });
    }

    var eventosBook = doc.getElementById('eventos-booking');
    if (eventosBook && !eventosBook.querySelector('[data-demo-guide-key="bookDemoNoteEventos"]')) {
      var evNote = noteP(t('bookDemoNote'), 'is-xs');
      evNote.setAttribute('data-demo-guide', '1');
      evNote.setAttribute('data-demo-guide-key', 'bookDemoNoteEventos');
      eventosBook.appendChild(evNote);
    } else {
      setGuideText(doc, 'bookDemoNoteEventos', t('bookDemoNote'));
    }

    var phoneOpt = doc.querySelector('[data-reserve-option="phone"] .min-w-0');
    if (phoneOpt) {
      ensureNode(doc, 'reserveCallHint', function () {
        var callHint = doc.createElement('span');
        callHint.className = 'demo-guide-call-hint';
        callHint.textContent = t('reserveCallHint');
        phoneOpt.appendChild(callHint);
        return callHint;
      });
    }

    var footerCol = doc.querySelector('footer .mt-10.flex.flex-col');
    if (footerCol) {
      ensureNode(doc, 'demoNotice', function () {
        var notice = doc.createElement('p');
        notice.className = 'demo-guide-footer-notice';
        notice.id = 'demo-notice';
        notice.textContent = t('demoNotice');
        var mesaLink = footerCol.querySelector('a[data-i18n="mesaLink"]');
        if (mesaLink && mesaLink.parentNode) footerCol.insertBefore(notice, mesaLink.parentNode);
        else footerCol.appendChild(notice);
        return notice;
      });

      var credit = footerCol.querySelector('[data-i18n="developedBy"]');
      if (credit) {
        credit.textContent = t('demoCreditLead');
        ensureNode(doc, 'demoCreditPlan', function () {
          var plan = doc.createElement('span');
          plan.textContent = ' ' + t('demoCreditPlan');
          credit.parentNode.appendChild(plan);
          return plan;
        });
      }
    }

    ensureActionNote(doc);
    guardClicks(doc, '#header-call, #footer-phone, #bar-call, #gbp-call', 'demoCallNote');
    guardClicks(doc, '#gbp-directions, #map-directions, #footer-map', 'demoRouteNote');
    guardClicks(doc, '#gbp-save', 'demoSaveNote');
    guardClicks(doc, '[data-reserve-option="phone"]', 'demoCallNote');
  }

  function injectMesa(doc) {
    ensureActionNote(doc);
    guardClicks(doc, 'a[href^="tel:"], a[href^="TEL:"]', 'demoCallNote');
    guardClicks(doc, 'a[href*="google.com/maps"], a[href*="maps.apple.com"], a[href*="maps.google"]', 'demoRouteNote');
  }

  function syncParentBanner() {
    var detail = document.getElementById('demo-banner-detail');
    if (detail) detail.textContent = t('salesBannerDetail');
    var badge = document.querySelector('#plan-gastro-link, [data-i18n="planBadge"]');
    if (badge) {
      badge.textContent = t('planBadge');
      badge.setAttribute('href', 'https://visiwebmadrid.com/#digitalizacion-total');
    }
  }

  function mountIntoFrame() {
    var frame = state.frame;
    if (!frame) return;
    var win = frame.contentWindow;
    var doc = frame.contentDocument;
    if (!win || !doc || !doc.body) return;

    lockPlan(win, doc);
    watchPlan(doc);
    ensureStyle(doc);

    if (state.mesa) injectMesa(doc);
    else injectWeb(doc);

    syncParentBanner();
  }

  function bindFrame(frame) {
    state.frame = frame;
    frame.addEventListener('load', function () {
      mountIntoFrame();
      try {
        var win = frame.contentWindow;
        if (!win) return;
        setTimeout(mountIntoFrame, 250);
        setTimeout(mountIntoFrame, 900);
      } catch (e) { /* ignore */ }
    });
  }

  window.VisiwebDemoGuides = {
    FORCE_PLAN: FORCE_PLAN,
    configure: function (opts) {
      opts = opts || {};
      if (opts.lang === 'en' || opts.lang === 'es') state.lang = opts.lang;
      state.mesa = !!opts.mesa;
      syncParentBanner();
      if (state.frame && state.frame.contentDocument) mountIntoFrame();
    },
    bind: bindFrame,
    remount: mountIntoFrame,
    copy: function (key) { return t(key); }
  };
})();
