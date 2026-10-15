/* =====================================================================
   VisiWeb Madrid · Plantilla de carta digital — lógica de la página.
   Todos los datos salen de demo-data.js (fuente única).
   Sin dependencias. Se ejecuta antes del primer pintado para no
   provocar saltos de diseño.
   ===================================================================== */
(function () {
  'use strict';

  const D = window.VISIWEB_DEMO;
  if (!D) return;

  const TZ = D.business.timezone;
  const STORE_LANG = 'visiweb-demo-lang';
  const STORE_CONSENT = 'visiweb-demo-consent';
  const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

  /* ------------------------------- Utilidades ------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const on = (sel, event, handler) => {
    const node = $(sel);
    if (node) node.addEventListener(event, handler);
  };
  const el = (tag, cls) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  };

  function readStore(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeStore(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* modo privado o almacenamiento bloqueado: se ignora */
    }
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* --------------------------------- Idioma -------------------------------- */
  function initialLang() {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl && D.i18n[fromUrl]) return fromUrl;
    const stored = readStore(STORE_LANG);
    if (stored && D.i18n[stored]) return stored;
    const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
    return D.i18n[nav] ? nav : 'es';
  }

  let lang = initialLang();
  const t = (key, vars) => {
    let out = D.i18n[lang][key] || D.i18n.es[key] || '';
    if (vars) Object.keys(vars).forEach((k) => { out = out.replace('{' + k + '}', vars[k]); });
    return out;
  };
  const L = (obj) => (obj && (obj[lang] || obj.es)) || '';

  /* -------------------------------- Horarios ------------------------------- */
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const fromMin = (min) => {
    const m = ((min % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  const dayRanges = (day) => D.hours[day] || [];

  function nowInMadrid() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    const get = (type) => (parts.find((p) => p.type === type) || {}).value;
    const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const hour = Number(get('hour')) % 24;
    return { day: days[get('weekday')] || 0, minutes: hour * 60 + Number(get('minute')) };
  }

  function openState() {
    const now = nowInMadrid();
    const today = dayRanges(now.day);

    for (const [open, close] of today) {
      if (now.minutes >= toMin(open) && now.minutes < toMin(close)) {
        return { open: true, until: close };
      }
    }
    for (const [open] of today) {
      if (toMin(open) > now.minutes) return { open: false, at: open };
    }
    for (let i = 1; i <= 7; i++) {
      const day = (now.day + i) % 7;
      const ranges = dayRanges(day);
      if (ranges.length) return { open: false, at: ranges[0][0], day: day };
    }
    return { open: false };
  }

  /** Agrupa días consecutivos con el mismo horario: "Martes a jueves". */
  function groupedHours() {
    const groups = [];
    WEEK_ORDER.forEach((day) => {
      const key = JSON.stringify(dayRanges(day));
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.days.push(day);
      else groups.push({ key: key, days: [day], ranges: dayRanges(day) });
    });
    return groups.map((g) => ({ label: daysLabel(g.days), ranges: g.ranges }));
  }

  function daysLabel(days) {
    const names = D.i18n[lang].days;
    if (days.length === 1) return capitalize(names[days[0]]);
    const first = capitalize(names[days[0]]);
    const last = names[days[days.length - 1]];
    if (days.length === 2) return first + (lang === 'es' ? ' y ' : ' and ') + last;
    return first + (lang === 'es' ? ' a ' : ' to ') + last;
  }

  const rangesText = (ranges) => (ranges.length
    ? ranges.map(([a, b]) => fromMin(toMin(a)) + ' – ' + fromMin(toMin(b))).join(lang === 'es' ? ' y ' : ' and ')
    : t('closed'));

  /* --------------------------- Enlaces de contacto -------------------------- */
  const addressText = () => L(D.business.address.street) + ', ' + D.business.address.postalCode + ' ' +
    D.business.address.city + ' (' + D.business.address.region + ')';

  const mapsUrl = () => 'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(L(D.business.address.street) + ', ' + D.business.address.city + ', ' + D.business.address.region);

  const whatsappUrl = () => 'https://wa.me/' + D.business.whatsapp + '?text=' +
    encodeURIComponent(D.whatsappText[lang] || D.whatsappText.es);

  /* ------------------------------- Marcadores ------------------------------ */
  const CUTLERY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true" class="h-7 w-7 text-slate-500 dark:text-slate-400"><path stroke-linecap="round" d="M7 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M9 12v9M15 21v-7m0 0c2 0 3-1.5 3-4.5V3c-2 .6-3 2.4-3 5.5V14Z"/></svg>';

  function placeholderBox(size) {
    const box = el('div', 'grid place-items-center rounded-lg bg-slate-100 dark:bg-slate-800');
    if (size) {
      box.style.width = size + 'px';
      box.style.height = size + 'px';
      box.classList.add('shrink-0');
    } else {
      box.className = 'grid h-full w-full place-items-center bg-slate-100 dark:bg-slate-800';
    }
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = CUTLERY;
    return box;
  }

  function imageOrPlaceholder(src, alt, size, classes) {
    if (!src) return placeholderBox(size);
    const img = el('img', classes);
    img.src = src;
    img.alt = alt;
    img.decoding = 'async';
    if (size) {
      img.width = size;
      img.height = size;
      img.loading = 'lazy';
    }
    img.addEventListener('error', function () {
      img.replaceWith(placeholderBox(size));
    });
    return img;
  }

  /* --------------------------------- Portada ------------------------------- */
  function renderHero() {
    const figure = $('#hero-media');
    figure.textContent = '';
    if (D.images.hero) {
      const img = el('img', 'h-full w-full object-cover');
      img.src = D.images.hero;
      img.alt = L(D.images.heroAlt);
      img.width = 1600;
      img.height = 900;
      img.decoding = 'async';
      img.setAttribute('fetchpriority', 'high');
      img.addEventListener('error', function () {
        figure.textContent = '';
        figure.appendChild(placeholderBox());
      });
      figure.appendChild(img);
    } else {
      figure.appendChild(placeholderBox());
    }
  }

  function renderBusinessInfo() {
    $('#info-address').textContent = L(D.business.address.street) + ', ' + D.business.address.city;
    $('#map-address').textContent = addressText();
    $('#footer-address').innerHTML = esc(L(D.business.address.street)) + '<br>' +
      esc(D.business.address.postalCode + ' ' + D.business.address.city + ', ' + D.business.address.region);
    $('#footer-type').textContent = L(D.business.type);

    const menuDay = (D.menu.find((c) => c.id === 'menu-del-dia') || { items: [] })
      .items.filter((i) => i.id === 'menu-completo')[0];
    if (menuDay) $('#info-menu-price').textContent = lang === 'en' ? menuDay.priceEn : menuDay.price;

    const tel = 'tel:' + D.business.phone;
    ['#header-call', '#bar-call', '#footer-phone'].forEach((sel) => { $(sel).href = tel; });
    $('#footer-phone').textContent = D.business.phoneDisplay;

    const wa = whatsappUrl();
    ['#hero-whatsapp', '#bar-whatsapp', '#footer-whatsapp'].forEach((sel) => { $(sel).href = wa; });

    const maps = mapsUrl();
    ['#hero-directions', '#map-directions'].forEach((sel) => { $(sel).href = maps; });

    $('#credit-link').href = D.developer.plansUrl;
    $('#credit-link').textContent = D.developer.name;
  }

  function renderStatus() {
    const state = openState();
    const dot = $('#status-dot');
    const text = $('#status-text');

    dot.className = 'h-1.5 w-1.5 shrink-0 rounded-full ' +
      (state.open ? 'live-dot bg-emerald-600 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500');

    if (state.open) text.textContent = t('statusOpen');
    else if (state.at && state.day !== undefined) {
      text.textContent = t('statusOpensDay', { day: D.i18n[lang].days[state.day], time: state.at });
    } else if (state.at) text.textContent = t('statusOpensAt', { time: state.at });
    else text.textContent = t('statusClosed');
  }

  function renderToday() {
    const today = dayRanges(nowInMadrid().day);
    $('#info-today').textContent = today.length ? rangesText(today) : t('closedToday');
  }

  function renderHoursList() {
    const list = $('#hours-list');
    list.textContent = '';
    groupedHours().forEach((group) => {
      const row = el('div', 'flex items-baseline justify-between gap-6');
      const dt = el('dt', 'text-slate-600 dark:text-slate-400');
      dt.textContent = group.label;
      const dd = el('dd', group.ranges.length
        ? 'text-right tabular text-slate-900 dark:text-slate-100'
        : 'text-right text-slate-600 dark:text-slate-400');
      dd.textContent = rangesText(group.ranges);
      row.append(dt, dd);
      list.appendChild(row);
    });
  }

  /* ---------------------------------- Carta -------------------------------- */
  function allergenPill(key) {
    const a = D.allergens[key];
    const span = el('span', 'pill-allergen');
    span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true">' + a.icon + '</svg>';
    span.appendChild(document.createTextNode(L(a.name)));
    return span;
  }

  function dishNode(item) {
    const li = el('li', 'flex items-start gap-4 py-6');
    li.appendChild(imageOrPlaceholder(item.image, L(item.name), 80, 'h-20 w-20 shrink-0 rounded-lg object-cover'));

    const body = el('div', 'min-w-0 flex-1');
    const title = el('h3', 'pr-3 text-[15px] font-semibold leading-snug');
    title.textContent = L(item.name);
    const desc = el('p', 'mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400');
    desc.textContent = L(item.desc);
    body.append(title, desc);

    if (item.tags.length) {
      const tags = el('div', 'mt-2.5 flex flex-wrap gap-1.5');
      item.tags.forEach((key) => {
        const tag = el('span', key === 'recomendado' ? 'pill-tag' : 'pill-tag-soft');
        tag.textContent = L(D.dietTags[key].name);
        tags.appendChild(tag);
      });
      body.appendChild(tags);
    }

    const allergens = el('div', 'mt-2.5 flex flex-wrap items-center gap-1.5');
    const label = el('span', 'text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400');
    label.textContent = item.allergens.length ? t('allergensInDish') : t('noAllergens');
    allergens.appendChild(label);
    item.allergens.forEach((key) => allergens.appendChild(allergenPill(key)));
    body.appendChild(allergens);

    const price = el('span', 'shrink-0 text-lg font-bold tabular');
    price.textContent = lang === 'en' ? item.priceEn : item.price;

    li.append(body, price);
    return li;
  }

  function renderMenu() {
    const tabs = $('#tabs');
    const panels = $('#panels');
    tabs.textContent = '';
    panels.textContent = '';

    D.menu.forEach((cat, index) => {
      const tab = el('button', 'tab');
      tab.type = 'button';
      tab.id = 'tab-' + cat.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'panel-' + cat.id);
      tab.setAttribute('aria-selected', String(index === 0));
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.dataset.anchor = cat.anchor;
      tab.textContent = L(cat.name);
      tabs.appendChild(tab);

      const panel = el('section', 'focus:outline-none');
      panel.id = 'panel-' + cat.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'tab-' + cat.id);
      panel.tabIndex = 0;
      if (index !== 0) panel.hidden = true;

      const desc = el('p', 'text-center text-sm italic text-slate-600 dark:text-slate-400');
      desc.textContent = L(cat.desc);
      const list = el('ul', 'mt-6 divide-y divide-slate-200 dark:divide-slate-800');
      cat.items.forEach((item) => list.appendChild(dishNode(item)));
      panel.append(desc, list);
      panels.appendChild(panel);
    });
  }

  function selectTab(tab, focus, quiet) {
    const all = Array.prototype.slice.call($('#tabs').children);
    all.forEach((node) => {
      const selected = node === tab;
      node.setAttribute('aria-selected', String(selected));
      node.tabIndex = selected ? 0 : -1;
      $('#' + node.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
    if (quiet) return;
    tab.scrollIntoView({ block: 'nearest', inline: 'center' });
    history.replaceState(null, '', '#' + tab.dataset.anchor);
  }

  function initTabs() {
    const tabs = $('#tabs');

    tabs.addEventListener('click', (event) => {
      const tab = event.target.closest('[role="tab"]');
      if (tab) selectTab(tab, false);
    });

    tabs.addEventListener('keydown', (event) => {
      const all = Array.prototype.slice.call(tabs.children);
      const current = all.indexOf(document.activeElement);
      if (current < 0) return;
      let next = -1;
      if (event.key === 'ArrowRight') next = (current + 1) % all.length;
      else if (event.key === 'ArrowLeft') next = (current - 1 + all.length) % all.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = all.length - 1;
      if (next < 0) return;
      event.preventDefault();
      selectTab(all[next], true);
    });
  }

  function applyHash() {
    const hash = decodeURIComponent(window.location.hash.replace('#', ''));
    if (!hash) return;
    const tab = Array.prototype.slice.call($('#tabs').children)
      .filter((node) => node.dataset.anchor === hash)[0];
    if (tab) selectTab(tab, false);
  }

  /* ----------------------------- Alérgenos (UI) ---------------------------- */
  function renderAllergenKey() {
    const list = $('#allergen-key');
    list.textContent = '';
    Object.keys(D.allergens).forEach((key) => {
      const a = D.allergens[key];
      const li = el('li', 'flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300');
      li.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
        'stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 shrink-0" aria-hidden="true">' + a.icon + '</svg>';
      li.appendChild(document.createTextNode(L(a.name)));
      list.appendChild(li);
    });
  }

  function renderAllergenTable() {
    const table = $('#allergen-table');
    const keys = Object.keys(D.allergens);
    table.textContent = '';

    const thead = el('thead');
    const headRow = el('tr', 'border-b border-slate-300 dark:border-slate-700');
    const firstTh = el('th', 'sticky left-0 bg-white py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide dark:bg-slate-900');
    firstTh.scope = 'col';
    firstTh.textContent = t('dish');
    headRow.appendChild(firstTh);
    keys.forEach((key) => {
      const th = el('th', 'px-2 py-2 text-center text-[11px] font-semibold');
      th.scope = 'col';
      th.innerHTML = '<abbr title="' + esc(L(D.allergens[key].name)) + '" class="no-underline">' +
        esc(D.allergens[key].short) + '</abbr>';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    D.menu.forEach((cat) => {
      const catRow = el('tr');
      const catCell = el('th', 'bg-slate-50 py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide dark:bg-slate-800');
      catCell.scope = 'colgroup';
      catCell.colSpan = keys.length + 1;
      catCell.textContent = L(cat.name);
      catRow.appendChild(catCell);
      tbody.appendChild(catRow);

      cat.items.forEach((item) => {
        const row = el('tr', 'border-b border-slate-200 dark:border-slate-800');
        const th = el('th', 'sticky left-0 max-w-[12rem] bg-white py-2.5 pr-4 text-left text-sm font-medium dark:bg-slate-900');
        th.scope = 'row';
        th.textContent = L(item.name);
        row.appendChild(th);
        keys.forEach((key) => {
          const td = el('td', 'px-2 py-2.5 text-center');
          const has = item.allergens.indexOf(key) >= 0;
          td.innerHTML = has
            ? '<span class="sr-only">' + esc(L(D.allergens[key].name)) + '</span><span aria-hidden="true">●</span>'
            : '<span class="sr-only">—</span><span aria-hidden="true" class="text-slate-400 dark:text-slate-600">·</span>';
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });
    });
    table.appendChild(tbody);
  }

  function initAllergenDialog() {
    const dialog = $('#allergen-dialog');
    if (!dialog) return;
    on('#open-allergen-table', 'click', () => {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
    on('#close-allergen-dialog', 'click', () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    });
  }

  /* -------------------------------- Opiniones ------------------------------ */
  function stars(rating) {
    let out = '';
    for (let i = 1; i <= 5; i++) {
      out += '<svg viewBox="0 0 24 24" class="h-4 w-4 ' +
        (i <= rating ? 'text-slate-900 dark:text-slate-100' : 'text-slate-300 dark:text-slate-700') +
        '" fill="currentColor" aria-hidden="true"><path d="m12 3.6 2.6 5.5 5.9.8-4.3 4.2 1 6-5.2-2.9-5.2 2.9 1-6L3.5 9.9l5.9-.8L12 3.6Z"/></svg>';
    }
    return out;
  }

  function renderReviews() {
    const score = D.reviews.score.toLocaleString(D.i18n[lang].locale, { minimumFractionDigits: 1 });
    const scoreEl = $('#reviews-score');
    scoreEl.innerHTML = '<span class="flex items-center gap-0.5">' + stars(Math.round(D.reviews.score)) + '</span>';
    scoreEl.appendChild(document.createTextNode(t('reviewsScore', { score: score, count: D.reviews.count })));

    const list = $('#reviews-list');
    list.textContent = '';
    D.reviews.items.forEach((review) => {
      const li = el('li', 'py-5');
      const head = el('div', 'flex items-center gap-3');
      const name = el('p', 'text-sm font-semibold');
      name.textContent = review.author;
      const rating = el('span', 'flex items-center gap-0.5');
      rating.innerHTML = stars(review.rating);
      rating.setAttribute('role', 'img');
      rating.setAttribute('aria-label', t('ratingOf', { rating: review.rating }));
      head.append(name, rating);
      const text = el('p', 'mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400');
      text.textContent = L(review.text);
      li.append(head, text);
      list.appendChild(li);
    });
  }

  /* ----------------------------------- Mapa -------------------------------- */
  function loadMap() {
    const wrap = $('#map-wrap');
    if (wrap.querySelector('iframe')) return;
    const frame = el('iframe', 'h-full w-full border-0');
    frame.title = t('mapFrameTitle');
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.allowFullscreen = false;
    frame.src = 'https://www.google.com/maps?q=' + encodeURIComponent(D.business.mapQuery) +
      '&hl=' + lang + '&z=14&output=embed';
    // El aviso de consentimiento se oculta, no se destruye: sus botones siguen vivos.
    const consent = $('#map-consent');
    if (consent) consent.hidden = true;
    wrap.appendChild(frame);
  }

  /* --------------------------------- Cookies ------------------------------- */
  function readConsent() {
    try {
      return JSON.parse(readStore(STORE_CONSENT) || 'null');
    } catch (e) {
      return null;
    }
  }

  function saveConsent(consent) {
    writeStore(STORE_CONSENT, JSON.stringify(Object.assign({ date: new Date().toISOString() }, consent)));
  }

  function applyConsent(consent) {
    if (consent && consent.map) loadMap();
  }

  function initCookies() {
    const banner = $('#cookie-banner');
    const detail = $('#cookie-detail');
    const saveBtn = $('#cookie-save');
    const configureBtn = $('#cookie-configure');
    const mapOpt = $('#cookie-map-opt');
    const analyticsOpt = $('#cookie-analytics-opt');
    const consent = readConsent();

    function openBanner(showDetail) {
      banner.hidden = false;
      detail.hidden = !showDetail;
      saveBtn.hidden = !showDetail;
      configureBtn.hidden = showDetail;
      const current = readConsent();
      mapOpt.checked = !!(current && current.map);
      analyticsOpt.checked = !!(current && current.analytics);
    }

    function closeBanner() {
      banner.hidden = true;
    }

    function decide(next) {
      saveConsent(next);
      applyConsent(next);
      closeBanner();
    }

    if (!consent) openBanner(false);
    else applyConsent(consent);

    configureBtn.addEventListener('click', () => openBanner(true));
    on('#cookie-accept', 'click', () => decide({ map: true, analytics: true }));
    on('#cookie-reject', 'click', () => decide({ map: false, analytics: false }));
    saveBtn.addEventListener('click', () => decide({ map: mapOpt.checked, analytics: analyticsOpt.checked }));
    on('#open-cookie-settings', 'click', () => openBanner(true));

    on('#map-consent-btn', 'click', () => {
      const current = readConsent() || { analytics: false };
      decide({ map: true, analytics: !!current.analytics });
    });
  }

  /* --------------------------------- JSON-LD ------------------------------- */
  function renderJsonLd() {
    const spec = [];
    WEEK_ORDER.forEach((day) => {
      dayRanges(day).forEach(([open, close]) => {
        spec.push({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: SCHEMA_DAYS[day],
          opens: open,
          closes: close === '24:00' ? '23:59' : close
        });
      });
    });

    const base = window.location.href.split('#')[0];
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: D.business.name,
      description: D.i18n[lang].metaDescription,
      url: base,
      telephone: D.business.phone,
      priceRange: D.business.priceRange,
      servesCuisine: D.business.cuisine,
      currenciesAccepted: 'EUR',
      address: {
        '@type': 'PostalAddress',
        streetAddress: L(D.business.address.street),
        postalCode: D.business.address.postalCode,
        addressLocality: D.business.address.city,
        addressRegion: D.business.address.region,
        addressCountry: D.business.address.country
      },
      geo: { '@type': 'GeoCoordinates', latitude: D.business.geo.lat, longitude: D.business.geo.lng },
      openingHoursSpecification: spec,
      hasMenu: {
        '@type': 'Menu',
        url: base + '#carta',
        hasMenuSection: D.menu.map((cat) => ({
          '@type': 'MenuSection',
          name: L(cat.name),
          hasMenuItem: cat.items.map((item) => {
            const entry = { '@type': 'MenuItem', name: L(item.name), description: L(item.desc) };
            const amount = item.price.replace(/[^\d,]/g, '').replace(',', '.');
            if (amount) entry.offers = { '@type': 'Offer', price: amount, priceCurrency: 'EUR' };
            return entry;
          })
        }))
      }
    };

    let node = document.getElementById('ld-restaurant');
    if (!node) {
      node = el('script');
      node.type = 'application/ld+json';
      node.id = 'ld-restaurant';
      document.head.appendChild(node);
    }
    node.textContent = JSON.stringify(data);
  }

  /* ------------------------------ Textos e idioma -------------------------- */
  /** hreflang necesita URLs absolutas; se calculan sobre el dominio real. */
  function renderAlternates() {
    const base = window.location.origin + window.location.pathname;
    const map = { 'alt-es': base, 'alt-en': base + '?lang=en', 'alt-default': base };
    Object.keys(map).forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.href = map[id];
    });
  }

  function applyI18n() {
    const strings = D.i18n[lang];
    document.documentElement.lang = strings.htmlLang;
    document.title = strings.metaTitle;

    const metas = [
      ['meta[name="description"]', 'content', strings.metaDescription],
      ['meta[property="og:title"]', 'content', strings.metaTitle],
      ['meta[property="og:description"]', 'content', strings.metaDescription],
      ['meta[property="og:locale"]', 'content', lang === 'es' ? 'es_ES' : 'en_GB'],
      ['meta[name="twitter:title"]', 'content', strings.metaTitle],
      ['meta[name="twitter:description"]', 'content', strings.metaDescription]
    ];
    metas.forEach(([sel, attr, value]) => {
      const node = $(sel);
      if (node) node.setAttribute(attr, value);
    });

    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
    });
    document.querySelectorAll('[data-lang]').forEach((node) => {
      node.setAttribute('aria-pressed', String(node.dataset.lang === lang));
      node.className = 'min-h-11 rounded-full px-2.5 text-xs font-semibold ' + (node.dataset.lang === lang
        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
        : 'text-slate-700 dark:text-slate-300');
    });
  }

  function renderAll() {
    applyI18n();
    renderAlternates();
    renderHero();
    renderBusinessInfo();
    renderStatus();
    renderToday();
    renderHoursList();
    renderMenu();
    renderAllergenKey();
    renderAllergenTable();
    renderReviews();
    renderJsonLd();
  }

  function setLang(next) {
    if (!D.i18n[next] || next === lang) return;
    const activeAnchor = (Array.prototype.slice.call($('#tabs').children)
      .filter((node) => node.getAttribute('aria-selected') === 'true')[0] || {}).dataset;
    lang = next;
    writeStore(STORE_LANG, next);
    renderAll();
    if (activeAnchor && activeAnchor.anchor) {
      const tab = Array.prototype.slice.call($('#tabs').children)
        .filter((node) => node.dataset.anchor === activeAnchor.anchor)[0];
      if (tab) selectTab(tab, false, true);
    }
    const consent = readConsent();
    if (consent && consent.map) loadMap();
  }

  /* --------------------------------- Arranque ------------------------------ */
  renderAll();
  initTabs();
  applyHash();
  initAllergenDialog();
  initCookies();

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  window.addEventListener('hashchange', applyHash);
  window.setInterval(() => {
    renderStatus();
    renderToday();
  }, 60000);
})();
