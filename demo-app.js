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
  const PAGES = ['inicio', 'carta', 'local', 'historia', 'reservas'];
  const allergenFilters = new Set();
  const FILTER_OFF = ['bg-white', 'text-stone-700', 'border-stone-300', 'dark:bg-slate-950', 'dark:text-slate-300', 'dark:border-slate-600'];
  const FILTER_ON = ['bg-stone-900', 'text-white', 'border-stone-900', 'dark:bg-slate-100', 'dark:text-slate-900', 'dark:border-slate-100'];

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
  let bookDatePicker = null;
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

  const rangesText = (ranges, separator) => (ranges.length
    ? ranges.map(([a, b]) => fromMin(toMin(a)) + ' – ' + fromMin(toMin(b)))
      .join(separator || (lang === 'es' ? ' y ' : ' and '))
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
    $('#footer-address').textContent = L(D.business.address.street) + ', ' + D.business.address.city;

    const menuDay = (D.menu.find((c) => c.id === 'menu-del-dia') || { items: [] })
      .items.filter((i) => i.id === 'menu-completo')[0];
    if (menuDay) $('#info-menu-price').textContent = lang === 'en' ? menuDay.priceEn : menuDay.price;

    const tel = 'tel:' + D.business.phone;
    ['#header-call', '#bar-call', '#footer-phone'].forEach((sel) => {
      const node = $(sel);
      if (node) node.href = tel;
    });
    $('#footer-phone-number').textContent = D.business.phoneDisplay;

    const wa = whatsappUrl();
    const footerWa = $('#footer-whatsapp');
    if (footerWa) footerWa.href = wa;

    const salesWa = $('#sales-whatsapp');
    if (salesWa) {
      salesWa.href = 'https://wa.me/' + D.developer.whatsapp + '?text=' +
        encodeURIComponent(t('salesWhatsappText'));
    }

    const maps = mapsUrl();
    ['#map-directions', '#footer-map'].forEach((sel) => {
      const node = $(sel);
      if (node) node.href = maps;
    });

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
      const row = el('div', 'hours-row');
      const dt = el('dt', 'hours-day');
      dt.textContent = group.label;
      const dd = el('dd');
      if (group.ranges.length) {
        dd.className = 'hours-time';
        dd.textContent = rangesText(group.ranges, ' · ').replace(/–/g, '-');
      } else {
        const badge = el('span', 'hours-closed');
        badge.textContent = t('closed');
        dd.appendChild(badge);
      }
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
    const recommended = item.tags.indexOf('recomendado') >= 0;
    const li = el('li', 'flex items-start justify-between gap-3 border-b border-stone-300 py-2 dark:border-stone-600');
    li.dataset.allergens = item.allergens.join(',');

    const body = el('div', 'min-w-0 flex-1 pr-1');
    if (recommended) {
      const badge = el('span', 'mb-1 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800');
      badge.textContent = L(D.dietTags.recomendado.name);
      body.appendChild(badge);
    }

    const heading = el('div', 'flex items-start justify-between');
    const title = el('h3', 'text-sm font-bold leading-snug text-stone-900 dark:text-stone-100 sm:text-base');
    title.textContent = L(item.name);
    const price = el('span', 'ml-2 whitespace-nowrap text-sm font-bold text-stone-900 dark:text-stone-100 sm:text-base');
    price.textContent = lang === 'en' ? item.priceEn : item.price;
    heading.append(title, price);

    const desc = el('p', 'mt-1 text-xs leading-snug text-stone-500 dark:text-stone-400 sm:text-sm');
    desc.textContent = L(item.desc);
    body.append(heading, desc);

    const meta = el('div', 'mb-1');
    const otherTags = item.tags.filter((key) => key !== 'recomendado');
    if (otherTags.length) {
      const tags = el('div', 'mt-1.5 flex flex-wrap gap-1.5');
      otherTags.forEach((key) => {
        const tag = el('span', 'pill-tag-soft');
        tag.textContent = L(D.dietTags[key].name);
        tags.appendChild(tag);
      });
      meta.appendChild(tags);
    }

    const allergenId = 'dish-allergens-' + item.id;
    const toggle = el('button', 'toggle-allergens-btn mt-1 inline-flex cursor-pointer items-center gap-1.5 py-0.5 text-xs font-medium text-black');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', allergenId);
    const toggleLabel = el('span');
    toggleLabel.textContent = t('allergensInDish').replace(/:\s*$/, '');
    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('class', 'w-3 h-3 text-black transition-transform duration-200 transform rotate-0');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('aria-hidden', 'true');
    const chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    chevronPath.setAttribute('stroke-linecap', 'round');
    chevronPath.setAttribute('stroke-linejoin', 'round');
    chevronPath.setAttribute('stroke-width', '2');
    chevronPath.setAttribute('d', 'M9 5l7 7-7 7');
    chevron.appendChild(chevronPath);
    toggle.append(toggleLabel, chevron);

    const allergens = el('div', 'hidden');
    allergens.id = allergenId;
    if (item.allergenNote) {
      const note = el('span', 'pill-allergen');
      note.textContent = L(item.allergenNote);
      allergens.appendChild(note);
    } else if (item.allergens.length) {
      item.allergens.forEach((key) => allergens.appendChild(allergenPill(key)));
    } else {
      const empty = el('span', 'text-xs text-stone-500 dark:text-stone-400');
      empty.textContent = t('noAllergens');
      allergens.appendChild(empty);
    }
    meta.append(toggle, allergens);
    body.appendChild(meta);

    const image = imageOrPlaceholder(item.image, L(item.name), 72, 'h-[72px] w-[72px] shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20');
    li.append(body, image);
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
      pinBilingual(tab, cat.name.es, cat.name.en);

      const panel = el('section', 'focus:outline-none');
      panel.id = 'panel-' + cat.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'tab-' + cat.id);
      panel.tabIndex = 0;
      if (index !== 0) panel.hidden = true;

      const desc = el('p', 'text-center text-xs italic text-slate-600 dark:text-slate-400 sm:text-sm');
      desc.textContent = L(cat.desc);
      const list = el('ul', 'mt-1');
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
    applyAllergenFilter();
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

  function showPage(id, opts) {
    document.querySelectorAll('[data-page]').forEach((page) => {
      page.hidden = page.dataset.page !== id;
    });
    document.querySelectorAll('[data-nav]').forEach((link) => {
      if (link.dataset.nav === id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (!opts || !opts.quiet) window.scrollTo(0, 0);
  }

  function menuTabByAnchor(hash) {
    return Array.prototype.slice.call($('#tabs').children)
      .filter((node) => node.dataset.anchor === hash)[0];
  }

  function applyHash(opts) {
    const quiet = !!(opts && opts.quiet);
    const hash = decodeURIComponent(window.location.hash.replace('#', ''));
    if (!hash || hash === 'inicio') {
      showPage('inicio', opts);
      return;
    }
    if (PAGES.indexOf(hash) >= 0) {
      showPage(hash, opts);
      if (hash === 'carta') applyAllergenFilter();
      if (hash === 'reservas') refreshBookingSlots();
      return;
    }
    if (hash === 'horarios') {
      const hours = $('#horarios');
      if (hours) hours.scrollIntoView({ block: 'start' });
      return;
    }
    if (hash === 'ubicacion') {
      showPage('local', { quiet: true });
      const map = $('#ubicacion');
      if (!quiet && map) map.scrollIntoView({ block: 'start' });
      return;
    }
    const tab = menuTabByAnchor(hash);
    if (tab) {
      showPage('carta', { quiet: true });
      selectTab(tab, false, true);
      if (!quiet) tab.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }

  function findDish(id) {
    for (let c = 0; c < D.menu.length; c++) {
      const cat = D.menu[c];
      for (let i = 0; i < cat.items.length; i++) {
        if (cat.items[i].id === id) return { item: cat.items[i], cat: cat };
      }
    }
    return null;
  }

  function renderFeatured() {
    const list = $('#featured-list');
    if (!list) return;
    list.textContent = '';
    (D.featured || []).forEach((id) => {
      const found = findDish(id);
      if (!found) return;
      const item = found.item;
      const li = el('li');
      const link = el('a', 'gallery-card group flex items-center gap-4 p-3 no-underline transition-colors hover:border-slate-400 dark:hover:border-slate-500');
      link.href = '#' + found.cat.anchor;
      link.appendChild(imageOrPlaceholder(item.image, L(item.name), 88, 'h-[88px] w-[88px] shrink-0 rounded-lg object-cover'));
      const body = el('div', 'min-w-0 flex-1');
      const name = el('p', 'text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-slate-700 dark:text-slate-100');
      name.textContent = L(item.name);
      const price = el('p', 'dish-price mt-1 text-lg');
      price.textContent = lang === 'en' ? item.priceEn : item.price;
      body.append(name, price);
      link.appendChild(body);
      li.appendChild(link);
      list.appendChild(li);
    });
  }

  function renderLocal() {
    const stats = $('#local-stats');
    const gallery = $('#local-gallery');
    if (!stats || !gallery) return;
    stats.textContent = '';
    gallery.textContent = '';

    D.local.stats.forEach((stat) => {
      const wrap = el('div', 'text-center');
      const dt = el('dt', 'text-[10px] font-semibold uppercase tracking-[.18em] text-slate-600 dark:text-slate-400');
      dt.textContent = L(stat.label);
      const dd = el('dd', 'mt-1 font-serif text-3xl font-semibold tracking-tight');
      dd.textContent = stat.value;
      wrap.append(dt, dd);
      stats.appendChild(wrap);
    });

    D.local.rooms.forEach((room, index) => {
      const fig = el('figure', index === 0 ? 'gallery-card sm:col-span-2' : 'gallery-card');
      const img = imageOrPlaceholder(room.image, L(room.title), null, 'h-full w-full object-cover');
      if (img.tagName === 'IMG') {
        img.loading = 'lazy';
        img.width = 1400;
        img.height = 900;
        img.className = 'aspect-[16/10] w-full object-cover';
      } else {
        img.className = 'grid aspect-[16/10] w-full place-items-center bg-slate-100 dark:bg-slate-800';
      }
      const cap = el('figcaption', 'px-4 py-3');
      const title = el('p', 'font-serif text-lg font-semibold tracking-tight');
      title.textContent = L(room.title);
      const desc = el('p', 'mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400');
      desc.textContent = L(room.desc);
      cap.append(title, desc);
      fig.append(img, cap);
      gallery.appendChild(fig);
    });
  }

  function renderHistory() {
    const lead = $('#history-lead');
    const list = $('#history-list');
    if (!lead || !list) return;
    lead.textContent = L(D.history.lead);
    list.textContent = '';
    D.history.chapters.forEach((chapter) => {
      const li = el('li', 'grid gap-3 sm:grid-cols-[5.5rem_1fr] sm:gap-8');
      const year = el('p', 'font-serif text-2xl font-semibold tracking-tight text-slate-400');
      year.textContent = typeof chapter.year === 'object' ? L(chapter.year) : chapter.year;
      const body = el('div', 'border-t border-slate-200 pt-3 dark:border-slate-800 sm:border-t-0 sm:pt-0');
      const title = el('h2', 'font-serif text-xl font-semibold tracking-tight');
      title.textContent = L(chapter.title);
      const text = el('p', 'mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400');
      text.textContent = L(chapter.text);
      body.append(title, text);
      li.append(year, body);
      list.appendChild(li);
    });
  }

  function renderGbp() {
    const cat = $('#gbp-category');
    const score = $('#gbp-score');
    const attrs = $('#gbp-attrs');
    const photos = $('#gbp-photos');
    if (!cat || !score || !attrs || !photos) return;

    cat.textContent = L(D.gbp.category);
    const value = D.reviews.score.toLocaleString(D.i18n[lang].locale, { minimumFractionDigits: 1 });
    score.innerHTML = '<span class="flex items-center gap-0.5">' + stars(Math.round(D.reviews.score)) + '</span>';
    score.appendChild(document.createTextNode(t('reviewsScore', { score: value, count: D.reviews.count })));

    attrs.textContent = '';
    D.gbp.attributes.forEach((attr) => {
      const li = el('li', 'gbp-chip');
      li.textContent = L(attr);
      attrs.appendChild(li);
    });

    photos.textContent = '';
    D.local.rooms.forEach((room) => {
      const img = imageOrPlaceholder(room.image, L(room.title), 120, 'h-[88px] w-[120px] shrink-0 rounded-lg object-cover');
      photos.appendChild(img);
    });
  }

  function paintFilterButton(btn, active) {
    FILTER_OFF.forEach((cls) => btn.classList.toggle(cls, !active));
    FILTER_ON.forEach((cls) => btn.classList.toggle(cls, active));
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  function renderAllergenFilters() {
    const wrap = $('#allergen-filters');
    if (!wrap) return;
    const keys = Object.keys(D.allergens);
    const existing = wrap.querySelectorAll('[data-filter]');
    if (existing.length === keys.length) {
      existing.forEach((btn) => {
        const key = btn.dataset.filter;
        if (!D.allergens[key]) return;
        btn.textContent = L(D.allergens[key].name);
        paintFilterButton(btn, allergenFilters.has(key));
      });
    } else {
      wrap.replaceChildren();
      keys.forEach((key) => {
        const btn = el('button', 'filter-chip bg-white text-stone-700 border-stone-300 transition-colors duration-150');
        btn.type = 'button';
        btn.dataset.filter = key;
        btn.textContent = L(D.allergens[key].name);
        paintFilterButton(btn, allergenFilters.has(key));
        wrap.appendChild(btn);
      });
    }
    const clear = $('#clear-allergen-filters');
    if (clear) clear.hidden = allergenFilters.size === 0;
  }

  function applyAllergenFilter() {
    const empty = $('#filter-empty');
    const panels = $('#panels');
    if (!panels) return;
    let visible = 0;
    Array.prototype.slice.call(panels.querySelectorAll('[role="tabpanel"]')).forEach((panel) => {
      if (panel.hidden) return;
      Array.prototype.slice.call(panel.querySelectorAll('li[data-allergens]')).forEach((li) => {
        const keys = (li.dataset.allergens || '').split(',').filter(Boolean);
        let hide = false;
        allergenFilters.forEach((key) => {
          if (keys.indexOf(key) >= 0) hide = true;
        });
        li.classList.toggle('hidden', hide);
        if (!hide) visible += 1;
      });
    });
    if (empty) {
      empty.classList.toggle('hidden', visible !== 0 || allergenFilters.size === 0);
      empty.hidden = visible !== 0 || allergenFilters.size === 0;
    }
    const clear = $('#clear-allergen-filters');
    if (clear) clear.hidden = allergenFilters.size === 0;
  }

  function setAllergenPanel(open) {
    const panel = $('#allergen-filter-panel');
    const toggle = $('#open-filter-btn');
    const icon = $('#allergen-filter-chevron');
    if (!panel || !toggle) return;
    panel.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (icon) icon.classList.toggle('rotate-90', open);
  }

  function initDishAllergenToggles() {
    const panels = $('#panels');
    if (!panels) return;
    panels.addEventListener('click', (event) => {
      const btn = event.target.closest('.toggle-allergens-btn');
      if (!btn || !panels.contains(btn)) return;
      const list = btn.nextElementSibling;
      if (!list || list.id !== btn.getAttribute('aria-controls')) return;
      const open = list.classList.contains('hidden');
      list.className = open
        ? 'flex flex-wrap gap-1.5 pt-2 transition-all duration-200'
        : 'hidden';
      const icon = btn.querySelector('svg');
      if (icon) {
        icon.classList.toggle('rotate-90', open);
        icon.classList.toggle('rotate-0', !open);
      }
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function initAllergenFilters() {
    const wrap = $('#allergen-filters');
    if (!wrap) return;
    on('#open-filter-btn', 'click', () => {
      const toggle = $('#open-filter-btn');
      setAllergenPanel(toggle.getAttribute('aria-expanded') !== 'true');
    });
    wrap.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-filter]');
      if (!btn || !wrap.contains(btn)) return;
      const key = btn.dataset.filter;
      const active = !allergenFilters.has(key);
      if (active) allergenFilters.add(key);
      else allergenFilters.delete(key);
      paintFilterButton(btn, active);
      applyAllergenFilter();
    });
    on('#clear-allergen-filters', 'click', () => {
      allergenFilters.clear();
      wrap.querySelectorAll('[data-filter]').forEach((btn) => paintFilterButton(btn, false));
      applyAllergenFilter();
    });
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

    const thead = el('thead', 'sticky top-0 z-20 border-b border-stone-300 bg-stone-100 shadow-sm dark:border-stone-700 dark:bg-stone-800');
    const headRow = el('tr');
    const firstTh = el('th', 'sticky top-0 left-0 z-30 border-b border-r border-stone-300 bg-stone-100 py-2 pl-4 pr-4 text-left text-xs font-bold uppercase tracking-wide dark:border-stone-700 dark:bg-stone-800');
    firstTh.scope = 'col';
    firstTh.textContent = t('dish');
    headRow.appendChild(firstTh);
    keys.forEach((key) => {
      const short = D.allergens[key].short;
      const th = el('th', 'sticky top-0 z-20 cursor-pointer select-none border-b border-stone-300 bg-stone-100 px-2 py-2 text-center text-[11px] font-semibold shadow-sm transition-colors hover:bg-stone-200 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700');
      th.scope = 'col';
      th.dataset.allergen = short;
      th.dataset.allergenCol = short;
      th.innerHTML = '<abbr title="' + esc(L(D.allergens[key].name)) + '" class="no-underline">' +
        esc(short) + '</abbr>';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    D.menu.forEach((cat) => {
      const catRow = el('tr');
      const catCell = el('td', 'w-full border-b border-stone-200 bg-stone-50 p-0 text-left dark:border-stone-800 dark:bg-stone-800');
      catCell.colSpan = keys.length + 1;
      const catLabel = el('span', 'sticky left-0 inline-block px-4 py-2 bg-inherit font-bold text-xs uppercase tracking-wider z-10');
      catLabel.textContent = L(cat.name);
      catCell.appendChild(catLabel);
      catRow.appendChild(catCell);
      tbody.appendChild(catRow);

      cat.items.forEach((item) => {
        const row = el('tr');
        const th = el('th', 'sticky left-0 z-10 max-w-[12rem] border-b border-r border-stone-200 bg-white py-2.5 pl-4 pr-4 text-left text-sm font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] dark:border-stone-800 dark:bg-stone-900');
        th.scope = 'row';
        th.textContent = L(item.name);
        if (item.allergenNote) {
          const note = el('span', 'mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-slate-500');
          note.textContent = t('allergensInDish') + ' ' + L(item.allergenNote);
          th.appendChild(note);
        }
        row.appendChild(th);
        keys.forEach((key) => {
          const td = el('td', 'border-b border-stone-200 px-2 py-2.5 text-center dark:border-stone-800');
          td.dataset.allergenCol = D.allergens[key].short;
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
    if (activeAllergenCode) showAllergenInfo(activeAllergenCode);
  }

  let activeAllergenCode = '';

  function allergenInfoName(short) {
    const extra = {
      GLU: { es: 'Gluten / Cereales con gluten', en: 'Cereals containing gluten' },
      LAC: { es: 'Lácteos / Leche y derivados', en: 'Milk and dairy' }
    };
    if (extra[short]) return extra[short][lang] || extra[short].es;
    const key = Object.keys(D.allergens).find((id) => D.allergens[id].short === short);
    return key ? L(D.allergens[key].name) : short;
  }

  function showAllergenInfo(short) {
    const box = $('#allergen-info-box');
    if (!box || !D.allergens) return;
    activeAllergenCode = short;
    box.innerHTML =
      '<span class="font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px] bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 rounded">' + esc(short) + '</span>' +
      ' <span class="font-semibold text-stone-800 dark:text-stone-200">' + esc(allergenInfoName(short)) + '</span>' +
      '<button type="button" data-clear-allergen class="ml-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-100" aria-label="' + esc(t('allergenInfoClear')) + '">' +
      '<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button>';
    const table = $('#allergen-table');
    if (!table) return;
    table.querySelectorAll('[data-allergen-col]').forEach((cell) => {
      cell.classList.toggle('is-allergen-col', cell.getAttribute('data-allergen-col') === short);
    });
  }

  function clearAllergenInfo() {
    activeAllergenCode = '';
    const box = $('#allergen-info-box');
    if (box) {
      box.innerHTML =
        '<span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>' +
        '<span data-i18n="allergenInfoHint">' + esc(t('allergenInfoHint')) + '</span>';
    }
    const table = $('#allergen-table');
    if (!table) return;
    table.querySelectorAll('.is-allergen-col').forEach((cell) => cell.classList.remove('is-allergen-col'));
  }

  function lockPage() {
    const y = window.scrollY;
    document.body.dataset.scrollY = String(y);
    document.documentElement.classList.add('dialog-open');
    document.body.style.top = '-' + y + 'px';
  }

  function unlockPage() {
    const y = Number(document.body.dataset.scrollY || 0);
    document.documentElement.classList.remove('dialog-open');
    document.body.style.top = '';
    window.scrollTo(0, y);
  }

  function initAllergenDialog() {
    const dialog = $('#allergen-dialog');
    if (!dialog) return;

    function openDialog() {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      lockPage();
    }

    function closeDialog() {
      if (typeof dialog.close === 'function') {
        if (dialog.open) dialog.close();
      } else {
        dialog.removeAttribute('open');
        unlockPage();
      }
    }

    const table = $('#allergen-table');
    function allergenShortAt(event) {
      if (!table) return '';
      const cell = event.target.closest('th, td');
      if (cell && table.contains(cell) && cell.dataset.allergenCol) return cell.dataset.allergenCol;
      const x = event.clientX;
      const heads = table.querySelectorAll('thead th[data-allergen]');
      for (let i = 0; i < heads.length; i++) {
        const box = heads[i].getBoundingClientRect();
        if (x >= box.left && x <= box.right) return heads[i].dataset.allergen;
      }
      return '';
    }
    function onAllergenPointer(event) {
      const short = allergenShortAt(event);
      if (!short || short === activeAllergenCode) return;
      showAllergenInfo(short);
    }
    if (table) {
      table.addEventListener('click', onAllergenPointer);
      table.addEventListener('mousemove', onAllergenPointer);
    }
    const infoBox = $('#allergen-info-box');
    if (infoBox) {
      infoBox.addEventListener('click', (event) => {
        if (!event.target.closest('[data-clear-allergen]')) return;
        clearAllergenInfo();
      });
    }

    on('#open-allergen-table', 'click', openDialog);
    on('#close-allergen-dialog', 'click', closeDialog);
    dialog.addEventListener('close', unlockPage);
    dialog.addEventListener('cancel', unlockPage);
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

  /* ------------------------------ Reservas --------------------------------- */
  function madridYMD(date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(date);
  }

  function weekdayOfYmd(ymd) {
    const parts = ymd.split('-').map(Number);
    const noonUtc = Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' })
      .formatToParts(new Date(noonUtc)).find((p) => p.type === 'weekday').value;
    return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday] || 0;
  }

  function addDaysYmd(ymd, days) {
    const parts = ymd.split('-').map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days, 12, 0, 0));
    return madridYMD(date);
  }

  function nextOpenYmd() {
    let ymd = madridYMD(new Date());
    for (let i = 0; i < 14; i++) {
      if (slotsForDate(ymd).length) return ymd;
      ymd = addDaysYmd(ymd, 1);
    }
    return madridYMD(new Date());
  }

  function slotsForDate(ymd) {
    const ranges = dayRanges(weekdayOfYmd(ymd));
    const step = D.booking.slotMinutes;
    const lastBefore = D.booking.lastSeatingBeforeClose;
    const slots = [];
    ranges.forEach(([open, close]) => {
      let cursor = toMin(open);
      const end = toMin(close) - lastBefore;
      while (cursor <= end) {
        slots.push(fromMin(cursor));
        cursor += step;
      }
    });
    if (ymd === madridYMD(new Date())) {
      const now = nowInMadrid().minutes;
      return slots.filter((slot) => toMin(slot) > now);
    }
    return slots;
  }

  function guestLabel(n) {
    return n === 1 ? t('bookGuestOne') : t('bookGuestMany', { n: n });
  }

  function fillGuestSelect() {
    const select = $('#book-guests');
    const wheel = $('#wheel-guests');
    if (!select || !wheel) return;
    const previous = select.value;
    const keep = previous && Number(previous) >= 1 && Number(previous) <= D.booking.maxGuests ? previous : '';
    select.textContent = '';
    wheel.textContent = '';
    wheel._active = null;
    wheel.dataset.aligned = '';
    const blank = el('option');
    blank.value = '';
    select.appendChild(blank);
    for (let n = 1; n <= D.booking.maxGuests; n++) {
      const opt = el('option');
      opt.value = String(n);
      opt.textContent = guestLabel(n);
      select.appendChild(opt);
      const item = el('div', 'time-guest-item h-10 flex items-center justify-center snap-center text-base font-semibold text-stone-500 transition-all cursor-pointer');
      item.dataset.val = String(n);
      item.setAttribute('role', 'option');
      item.textContent = guestLabel(n);
      wheel.appendChild(item);
    }
    select.value = keep;
    const visible = $('#comensales-reserva');
    if (visible) visible.value = keep ? guestLabel(Number(keep)) : '';
    const panel = $('#guests-picker');
    if (panel && !panel.hidden) requestAnimationFrame(() => alignGuestWheel(false));
  }

  function refreshBookingSlots() {
    const date = $('#book-date');
    const feedback = $('#book-feedback');
    if (!date) return;
    if (!date.value) date.value = nextOpenYmd();
    if (feedback) feedback.hidden = true;
    alignTimeWheels(false);
  }

  function paintWheelColumn(scroller, active) {
    if (scroller._active === active) return;
    scroller._active = active;
    const kind = scroller.id === 'wheel-minutes' ? 'time-minute-item' : (scroller.id === 'wheel-guests' ? 'time-guest-item' : 'time-hour-item');
    const on = kind + ' h-10 flex items-center justify-center snap-center text-base font-bold text-stone-900 dark:text-stone-100 scale-110 transition-all cursor-pointer';
    const off = kind + ' h-10 flex items-center justify-center snap-center text-base font-semibold text-stone-500 transition-all cursor-pointer';
    scroller.querySelectorAll('[data-val]').forEach((node) => {
      node.className = node === active ? on : off;
      node.setAttribute('aria-selected', node === active ? 'true' : 'false');
    });
  }

  function centeredWheelItem(scroller) {
    const mid = scroller.getBoundingClientRect().top + scroller.clientHeight / 2;
    let best = null;
    let bestDist = Infinity;
    scroller.querySelectorAll('[data-val]').forEach((item) => {
      const rect = item.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = item;
      }
    });
    return best;
  }

  function selectedWheelValue(scroller) {
    if (!scroller) return '';
    const active = scroller.querySelector('[aria-selected="true"]');
    if (active) return active.dataset.val;
    const centered = centeredWheelItem(scroller);
    return centered ? centered.dataset.val : '';
  }

  function writeTimeValue(hour, minute) {
    const select = $('#book-time');
    if (!select) return;
    const value = (hour || selectedWheelValue($('#wheel-hours'))) + ':' + (minute || selectedWheelValue($('#wheel-minutes')));
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    let opt = select.querySelector('option[value="' + CSS.escape(value) + '"]');
    if (!opt) {
      opt = el('option');
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    }
    select.value = value;
    const visible = $('#hora-reserva');
    if (visible) visible.value = value;
  }

  function commitTimeSelection() {
    const hours = $('#wheel-hours');
    const minutes = $('#wheel-minutes');
    const hourItem = centeredWheelItem(hours);
    const minuteItem = centeredWheelItem(minutes);
    if (hourItem) paintWheelColumn(hours, hourItem);
    if (minuteItem) paintWheelColumn(minutes, minuteItem);
    writeTimeValue(hourItem && hourItem.dataset.val, minuteItem && minuteItem.dataset.val);
    setTimePickerOpen(false);
  }

  function setTimePickerOpen(open) {
    const panel = $('#time-picker');
    if (!panel) return;
    panel.hidden = !open;
    if (!open) return;
    setGuestsPickerOpen(false);
    requestAnimationFrame(() => alignTimeWheels(false));
  }

  function padTimeWheel(scroller) {
    const item = scroller.querySelector('[data-val]');
    if (!item || !scroller.clientHeight) return;
    const pad = Math.max(0, (scroller.clientHeight - item.offsetHeight) / 2);
    scroller.style.paddingTop = pad + 'px';
    scroller.style.paddingBottom = pad + 'px';
  }

  function centerWheelItem(scroller, item, smooth) {
    const top = Math.max(0, item.offsetTop - (scroller.clientHeight - item.offsetHeight) / 2);
    if (!smooth) {
      scroller.scrollTop = top;
      return;
    }
    scroller.dataset.moving = '1';
    scroller.scrollTo({ top: top, behavior: 'smooth' });
  }

  function alignTimeWheels(force) {
    const hours = $('#wheel-hours');
    const minutes = $('#wheel-minutes');
    if (!hours || !minutes || !hours.clientHeight) return;
    padTimeWheel(hours);
    padTimeWheel(minutes);
    if (!force && hours.dataset.aligned === '1') return;
    const hourItem = hours.querySelector('[data-val="20"]') || hours.querySelector('[data-val]');
    const minuteItem = minutes.querySelector('[data-val="30"]') || minutes.querySelector('[data-val]');
    if (hourItem) {
      centerWheelItem(hours, hourItem, false);
      paintWheelColumn(hours, hourItem);
      hours.dataset.index = String(Array.prototype.indexOf.call(hours.querySelectorAll('[data-val]'), hourItem));
    }
    if (minuteItem) {
      centerWheelItem(minutes, minuteItem, false);
      paintWheelColumn(minutes, minuteItem);
      minutes.dataset.index = String(Array.prototype.indexOf.call(minutes.querySelectorAll('[data-val]'), minuteItem));
    }
    hours.dataset.aligned = '1';
  }

  function bindTimeColumn(scroller) {
    if (!scroller || scroller.dataset.bound === '1') return;
    scroller.dataset.bound = '1';
    const selector = '[data-val]';
    function items() {
      return scroller.querySelectorAll(selector);
    }

    function settle() {
      const item = centeredWheelItem(scroller);
      if (!item) return;
      const list = items();
      const found = Array.prototype.indexOf.call(list, item);
      if (found >= 0) scroller.dataset.index = String(found);
      const top = Math.max(0, item.offsetTop - (scroller.clientHeight - item.offsetHeight) / 2);
      if (Math.abs(scroller.scrollTop - top) > 2) scroller.scrollTop = top;
      paintWheelColumn(scroller, item);
    }

    scroller.addEventListener('wheel', (event) => {
      if (!event.deltaY || event.ctrlKey) return;
      event.preventDefault();
      const list = items();
      if (!list.length) return;
      const index = Number(scroller.dataset.index || 0);
      const next = Math.min(Math.max(index + (event.deltaY > 0 ? 1 : -1), 0), list.length - 1);
      if (next === index) return;
      scroller.dataset.index = String(next);
      centerWheelItem(scroller, list[next], true);
      paintWheelColumn(scroller, list[next]);
    }, { passive: false });

    scroller.addEventListener('click', (event) => {
      const item = event.target.closest(selector);
      if (!item) return;
      const list = items();
      const found = Array.prototype.indexOf.call(list, item);
      if (found >= 0) scroller.dataset.index = String(found);
      centerWheelItem(scroller, item, true);
      paintWheelColumn(scroller, item);
    });

    scroller.addEventListener('scroll', () => {
      if (scroller.dataset.moving === '1') return;
      const item = centeredWheelItem(scroller);
      if (item) paintWheelColumn(scroller, item);
    }, { passive: true });

    scroller.addEventListener('scrollend', () => {
      if (scroller.dataset.moving === '1') {
        scroller.dataset.moving = '';
        return;
      }
      settle();
    });
  }

  function initTimeWheel() {
    const hours = $('#wheel-hours');
    const minutes = $('#wheel-minutes');
    if (!hours || !minutes) return;
    bindTimeColumn(hours);
    bindTimeColumn(minutes);
    on('#hora-reserva', 'click', () => setTimePickerOpen(true));
    on('#book-time-pick', 'click', commitTimeSelection);
  }

  function alignGuestWheel(force) {
    const wheel = $('#wheel-guests');
    if (!wheel || !wheel.clientHeight) return;
    padTimeWheel(wheel);
    if (!force && wheel.dataset.aligned === '1') return;
    const current = $('#book-guests') && $('#book-guests').value;
    const item = wheel.querySelector('[data-val="' + (current || '2') + '"]') || wheel.querySelector('[data-val]');
    if (!item) return;
    centerWheelItem(wheel, item, false);
    paintWheelColumn(wheel, item);
    wheel.dataset.index = String(Array.prototype.indexOf.call(wheel.querySelectorAll('[data-val]'), item));
    wheel.dataset.aligned = '1';
  }

  function commitGuestSelection() {
    const wheel = $('#wheel-guests');
    const item = centeredWheelItem(wheel);
    if (!item) return;
    paintWheelColumn(wheel, item);
    const n = Number(item.dataset.val);
    const select = $('#book-guests');
    if (select) select.value = String(n);
    const visible = $('#comensales-reserva');
    if (visible) visible.value = guestLabel(n);
    setGuestsPickerOpen(false);
  }

  function setGuestsPickerOpen(open) {
    const panel = $('#guests-picker');
    if (!panel || panel.hidden === !open) {
      if (open) requestAnimationFrame(() => alignGuestWheel(false));
      return;
    }
    panel.hidden = !open;
    if (!open) return;
    const timePanel = $('#time-picker');
    if (timePanel) timePanel.hidden = true;
    requestAnimationFrame(() => alignGuestWheel(false));
  }

  function initGuestWheel() {
    const wheel = $('#wheel-guests');
    if (!wheel) return;
    bindTimeColumn(wheel);
    on('#comensales-reserva', 'click', () => setGuestsPickerOpen(true));
    on('#book-guests-pick', 'click', commitGuestSelection);
  }

  function applyI18nBookingOptions() {
    document.querySelectorAll('#book-area option[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    const area = $('#book-area');
    if (area) syncBookSelect(area);
    initBookDatePicker();
  }

  function closeAllBookSelects() {
    document.querySelectorAll('.book-select').forEach((wrap) => {
      wrap.classList.remove('is-open');
      const btn = wrap.querySelector('.book-select-trigger');
      const menu = wrap.querySelector('.book-select-menu');
      const panel = wrap.querySelector('.book-wheel-panel');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
      if (panel) panel.hidden = true;
    });
  }

  function syncBookSelect(select) {
    if (select.id === 'book-time') return;
    const wrap = select.closest('.book-select');
    if (!wrap) return;
    const trigger = wrap.querySelector('.book-select-trigger');
    const valueEl = wrap.querySelector('.book-select-value');
    const menu = wrap.querySelector('.book-select-menu');
    if (!trigger || !valueEl || !menu) return;

    const selected = select.options[select.selectedIndex];
    valueEl.textContent = selected ? selected.textContent : '';
    trigger.disabled = !!select.disabled;

    menu.textContent = '';
    Array.prototype.slice.call(select.options).forEach((opt) => {
      if (!opt.value && select.id === 'book-time') return;
      const li = el('li', 'book-select-option');
      li.setAttribute('role', 'option');
      li.dataset.value = opt.value;
      li.setAttribute('aria-selected', String(opt.value === select.value && opt.value !== ''));
      li.textContent = opt.textContent;
      menu.appendChild(li);
    });
  }

  function initBookSelects() {
    document.querySelectorAll('.book-select').forEach((wrap) => {
      const select = wrap.querySelector('select');
      const trigger = wrap.querySelector('.book-select-trigger');
      const menu = wrap.querySelector('.book-select-menu');
      if (!select || !trigger || !menu) return;
      syncBookSelect(select);

      trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        if (select.disabled) return;
        const open = trigger.getAttribute('aria-expanded') === 'true';
        closeAllBookSelects();
        if (open) return;
        wrap.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
      });

      menu.addEventListener('click', (event) => {
        const option = event.target.closest('[data-value]');
        if (!option) return;
        select.value = option.dataset.value;
        syncBookSelect(select);
        closeAllBookSelects();
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.book-select')) closeAllBookSelects();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAllBookSelects();
    });
  }

  function formatBookDate(ymd) {
    const parts = ymd.split('-').map(Number);
    return new Intl.DateTimeFormat(D.i18n[lang].locale, {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date(parts[0], parts[1] - 1, parts[2]));
  }

  function ymdToDate(ymd) {
    const parts = (ymd || '').split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return undefined;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }

  function initBookDatePicker() {
    const visible = $('#fecha-reserva');
    const hidden = $('#book-date');
    if (!visible || !hidden || typeof flatpickr !== 'function') return;
    if (bookDatePicker) {
      bookDatePicker.destroy();
      bookDatePicker = null;
    }
    if (!hidden.value) hidden.value = nextOpenYmd();
    visible.placeholder = t('bookDatePlaceholder');
    const selected = ymdToDate(hidden.value);
    bookDatePicker = flatpickr(visible, {
      locale: lang === 'es' && window.flatpickr && flatpickr.l10ns && flatpickr.l10ns.es ? 'es' : 'default',
      dateFormat: 'd/m/Y',
      defaultDate: selected,
      minDate: 'today',
      disableMobile: true,
      monthSelectorType: 'static',
      appendTo: document.body,
      disable: [
        function (date) {
          return date.getDay() === 1;
        }
      ],
      onOpen: function () {
        closeAllBookSelects();
      },
      onChange: function (dates) {
        if (!dates[0]) return;
        hidden.value = madridYMD(dates[0]);
        refreshBookingSlots();
      }
    });
    if (selected) bookDatePicker.setDate(selected, false);
  }

  function initBooking() {
    const form = $('#booking-form');
    const date = $('#book-date');
    if (!form || !date) return;

    if (!date.value) date.value = nextOpenYmd();
    initBookDatePicker();
    fillGuestSelect();
    refreshBookingSlots();
    initBookSelects();
    initTimeWheel();
    initGuestWheel();

    date.addEventListener('change', refreshBookingSlots);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const feedback = $('#book-feedback');
      const name = $('#book-name').value.trim();
      const phone = $('#book-phone').value.replace(/\s/g, '');
      const ymd = $('#book-date').value;
      const hour = $('#book-time').value;
      const guests = $('#book-guests').value;
      const area = $('#book-area').value;
      const notes = $('#book-notes').value.trim();
      const closed = !dayRanges(weekdayOfYmd(ymd)).length;

      if (!name || phone.replace(/\D/g, '').length < 9 || !ymd || !hour || !guests || closed) {
        feedback.hidden = false;
        feedback.textContent = closed ? t('bookClosed') : t('bookError');
        return;
      }

      const areaLabel = t({
        any: 'bookAreaAny', salon: 'bookAreaSalon', terrace: 'bookAreaTerrace', bar: 'bookAreaBar'
      }[area] || 'bookAreaAny');

      const success = $('#booking-success');
      const successText = $('#booking-success-text');
      successText.textContent = t('bookSuccessText', {
        guests: guests,
        date: formatBookDate(ymd),
        time: hour
      });
      form.hidden = true;
      success.hidden = false;
      success.classList.remove('hidden');
      success.scrollIntoView({ block: 'start' });

      const wa = $('#booking-whatsapp');
      const message = (D.whatsappText[lang] || D.whatsappText.es)
        .replace('[nº de comensales]', guests)
        .replace('[number of guests]', guests)
        .replace('[día]', formatBookDate(ymd))
        .replace('[day]', formatBookDate(ymd))
        .replace('[hora]', hour)
        .replace('[time]', hour) +
        (area !== 'any' ? ' (' + areaLabel + ')' : '') +
        (notes ? ' — ' + notes : '');
      wa.href = 'https://wa.me/' + D.business.whatsapp + '?text=' + encodeURIComponent(message);
    });

    on('#booking-another', 'click', () => {
      form.hidden = false;
      form.reset();
      date.min = madridYMD(new Date());
      date.value = nextOpenYmd();
      const guestInput = $('#comensales-reserva');
      const guestSelect = $('#book-guests');
      const guestWheel = $('#wheel-guests');
      if (guestInput) guestInput.value = '';
      if (guestSelect) guestSelect.value = '';
      if (guestWheel) guestWheel.dataset.aligned = '';
      setGuestsPickerOpen(false);
      fillGuestSelect();
      const hours = $('#wheel-hours');
      if (hours) hours.dataset.aligned = '';
      const timeInput = $('#hora-reserva');
      if (timeInput) timeInput.value = '';
      setTimePickerOpen(false);
      refreshBookingSlots();
      const success = $('#booking-success');
      success.hidden = true;
      success.classList.add('hidden');
      applyI18n();
      applyI18nBookingOptions();
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
      acceptsReservations: 'True',
      image: [D.images.hero, D.images.facade, D.images.salon, D.images.terrace].filter(Boolean)
        .map((src) => new URL(src, base).href),
      potentialAction: {
        '@type': 'ReserveAction',
        target: base + '#reservas'
      },
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
    if (D.images.hero) {
      const abs = new URL(D.images.hero, window.location.href).href;
      ['meta[property="og:image"]', 'meta[name="twitter:image"]'].forEach((sel) => {
        const node = $(sel);
        if (node) node.setAttribute('content', abs);
      });
    }
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
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
    });
    pinChromeLabels();
    actualizarBotonIdioma();
  }

  function labelWidth(node, text) {
    let probe = labelWidth.probe;
    if (!probe) {
      probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;';
      document.body.appendChild(probe);
      labelWidth.probe = probe;
    }
    const cs = getComputedStyle(node);
    probe.style.font = cs.font;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.style.textTransform = cs.textTransform;
    probe.textContent = text;
    return probe.getBoundingClientRect().width;
  }

  function pinBilingual(node, a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || !a || !b || a === b) return;
    if (a.length > 48 || b.length > 48) return;
    const cs = getComputedStyle(node);
    const extra = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    node.style.minWidth = Math.ceil(Math.max(labelWidth(node, a), labelWidth(node, b)) + extra) + 'px';
  }

  function pinChromeLabels() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      if (node.childElementCount) return;
      if (node.closest('p, h1, h2, h3, h4, li, dd, dt, label')) return;
      const key = node.dataset.i18n;
      const inChrome = node.closest('header, footer, nav')
        || node.classList.contains('btn-primary')
        || node.classList.contains('btn-outline')
        || node.classList.contains('tab');
      if (!inChrome) return;
      pinBilingual(node, D.i18n.es[key], D.i18n.en[key]);
    });
  }

  let isLangAnimating = false;

  function actualizarBotonIdioma() {
    if (isLangAnimating) return;
    const btnText = document.getElementById('lang-text');
    if (btnText) {
      btnText.textContent = lang.toUpperCase();
      btnText.classList.remove('slide-out-up', 'slide-in-bottom');
    }
  }

  function toggleIdioma() {
    if (isLangAnimating) return;
    const textEl = document.getElementById('lang-text');
    const nextLang = lang === 'es' ? 'en' : 'es';
    const nextCode = nextLang.toUpperCase();
    const greeting = nextLang === 'en' ? 'Hello' : 'Hola';

    if (!textEl) {
      setLang(nextLang);
      actualizarBotonIdioma();
      return;
    }

    isLangAnimating = true;
    textEl.classList.add('slide-out-up');

    setTimeout(() => {
      textEl.textContent = greeting;
      textEl.classList.remove('slide-out-up');
      textEl.classList.add('slide-in-bottom');
      void textEl.offsetWidth;
      textEl.classList.remove('slide-in-bottom');
      setLang(nextLang);

      setTimeout(() => {
        textEl.classList.add('slide-out-up');
        setTimeout(() => {
          textEl.textContent = nextCode;
          textEl.classList.remove('slide-out-up');
          textEl.classList.add('slide-in-bottom');
          void textEl.offsetWidth;
          textEl.classList.remove('slide-in-bottom');
          isLangAnimating = false;
        }, 200);
      }, 700);
    }, 200);
  }

  function renderAll() {
    applyI18n();
    renderAlternates();
    renderHero();
    renderBusinessInfo();
    renderStatus();
    renderToday();
    renderHoursList();
    renderFeatured();
    renderLocal();
    renderHistory();
    renderGbp();
    renderMenu();
    renderAllergenFilters();
    renderAllergenKey();
    renderAllergenTable();
    renderReviews();
    fillGuestSelect();
    refreshBookingSlots();
    applyI18nBookingOptions();
    renderJsonLd();
    applyAllergenFilter();
  }

  function setLang(next) {
    if (!D.i18n[next] || next === lang) return;
    lang = next;
    writeStore(STORE_LANG, next);
    renderAll();
    applyHash({ quiet: true });
    const consent = readConsent();
    if (consent && consent.map) loadMap();
  }

  function syncStickyOffset() {
    var bar = document.querySelector('[data-site-sticky]');
    if (!bar) return;
    document.documentElement.style.setProperty('--site-sticky-h', bar.offsetHeight + 'px');
  }

  /* --------------------------------- Arranque ------------------------------ */
  syncStickyOffset();
  window.addEventListener('resize', syncStickyOffset);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncStickyOffset);
  renderAll();
  initTabs();
  initDishAllergenToggles();
  initAllergenFilters();
  initBooking();
  applyHash({ quiet: true });
  initAllergenDialog();
  initCookies();

  const langToggle = document.getElementById('btn-lang-toggle');
  if (langToggle) langToggle.addEventListener('click', toggleIdioma);

  window.addEventListener('hashchange', () => applyHash());
  window.setInterval(() => {
    renderStatus();
    renderToday();
    refreshBookingSlots();
  }, 60000);
})();
