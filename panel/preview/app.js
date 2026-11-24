/* sync-trigger */
/* =====================================================================
   VisiWeb Madrid · Plantilla de carta digital — lógica de la página.
   Todos los datos salen de demo-data.js (fuente única).
   Sin dependencias. Se ejecuta antes del primer pintado para no
   provocar saltos de diseño.
   ===================================================================== */
(function () {
  'use strict';

  function isQrMesaMode() {
    if (window.FORCE_QR_MESA === true) return true;
    var path = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
    if (path === '/qr' || /\/qr$/i.test(path)) return true;
    try {
      var params = new URLSearchParams(window.location.search || '');
      if (params.get('qr') === '1' || params.get('modo') === 'qr') return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function resolveMesaHref() {
    var path = String(window.location.pathname || '');
    var base;
    if (/\/qr(?:\/index\.html)?\/?$/i.test(path)) {
      base = path.replace(/\/qr(?:\/index\.html)?\/?$/i, '/mesa/');
    } else if (/\/qr-mesa(?:\/index\.html)?\/?$/i.test(path)) {
      base = path.replace(/\/qr-mesa(?:\/index\.html)?\/?$/i, '/_plantilla-base/mesa/');
    } else {
      base = new URL('mesa/', window.location.href).pathname;
    }
    if (!/\/$/.test(base)) base += '/';
    var params = new URLSearchParams(window.location.search || '');
    params.delete('qr');
    params.delete('modo');
    var qs = params.toString();
    return base + (qs ? '?' + qs : '') + (window.location.hash || '');
  }

  if (isQrMesaMode()) {
    var here = String(window.location.pathname || '').replace(/\/+$/, '');
    if (!/\/mesa$/i.test(here)) {
      try {
        document.documentElement.style.visibility = 'hidden';
        document.documentElement.style.backgroundColor = '#ffffff';
      } catch (e) { /* ignore */ }
      window.location.replace(resolveMesaHref());
    }
    return;
  }

  const D = window.VISIWEB_DEMO;
  if (!D) return;

  const TZ = D.business.timezone;
  const STORE_LANG = 'visiweb-demo-lang';
  const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
  let eventosOn = !!(D.eventos && D.eventos.activo);
  let PAGES = eventosOn
    ? ['inicio', 'carta', 'local', 'eventos', 'reservas']
    : ['inicio', 'carta', 'local', 'reservas'];
  const allergenFilters = new Set();
  const FILTER_OFF = ['bg-white', 'text-stone-700', 'border-stone-300', 'dark:bg-slate-950', 'dark:text-slate-300', 'dark:border-slate-600'];
  const FILTER_ON = ['filter-chip-on', 'text-white', 'border-transparent'];

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
    return 'es';
  }

  let lang = initialLang();
  let bookDatePicker = null;
  let eventDatePicker = null;
  let reservasMode = 'mesa';
  let reservasEntry = 'mesa';
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
    return groups.map((g) => ({ label: daysLabel(g.days), days: g.days, ranges: g.ranges }));
  }

  function gbpDayLabel(days) {
    const full = lang === 'es'
      ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const short = lang === 'es'
      ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (days.length === 1) return full[days[0]];
    return short[days[0]] + ' - ' + short[days[days.length - 1]];
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
  const addressText = () => D.business.addressLine || (
    L(D.business.address.street) + ', ' + D.business.address.postalCode + ' ' +
    D.business.address.city + ' (' + D.business.address.region + ')'
  );
  const shortAddress = () => D.business.addressLine || (
    L(D.business.address.street) + (D.business.address.city ? ', ' + D.business.address.city : '')
  );

  function showDemoNote(key) {
    const note = $('#demo-action-note');
    if (!note) return;
    note.textContent = t(key);
    note.hidden = false;
    clearTimeout(showDemoNote.timer);
    showDemoNote.timer = setTimeout(() => { note.hidden = true; }, 3400);
  }
  window.visiwebDemoNote = showDemoNote;

  function bindDemoActions() {
    const guard = (selector, key) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (node.dataset.demoGuard) return;
        node.dataset.demoGuard = '1';
        node.addEventListener('click', (event) => {
          event.preventDefault();
          showDemoNote(key);
        });
      });
    };
    guard('#header-call, #footer-phone, #bar-call, #gbp-call', 'demoCallNote');
    guard('#gbp-directions, #map-directions, #footer-map', 'demoRouteNote');
    guard('#gbp-save', 'demoSaveNote');
  }

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
    img.loading = 'lazy';
    if (size) {
      img.width = size;
      img.height = size;
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
      const img = el('img', 'w-full rounded-2xl object-cover shadow-sm');
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
    $('#info-address').textContent = shortAddress();
    $('#map-address').textContent = addressText();
    $('#footer-address').textContent = shortAddress();

    const menuDay = (D.menu.find((c) => c.id === 'menu-del-dia') || { items: [] })
      .items.filter((i) => i.id === 'menu-completo')[0];
    if (menuDay) {
      const price = lang === 'en' ? menuDay.priceEn : menuDay.price;
      const badge = $('#info-menu-badge');
      if (badge) badge.textContent = price;
    }

    ['#bar-call', '#footer-phone', '#header-call', '#gbp-call'].forEach((sel) => {
      const node = $(sel);
      if (node) node.href = '#';
    });
    $('#footer-phone-number').textContent = D.business.phoneDisplay;

    const footerMap = $('#footer-map');
    if (footerMap) footerMap.href = '#';
  }

  function renderStatus() {
    const text = $('#status-text');
    if (text) text.textContent = D.scheduleText || t('statusOpen');
  }

  function renderToday() {
    const node = $('#info-today');
    if (D.scheduleText) {
      node.textContent = D.scheduleText;
      return;
    }
    const today = dayRanges(nowInMadrid().day);
    node.textContent = today.length ? rangesText(today, ' · ') : t('closedToday');
  }

  function renderHoursList() {
    const list = $('#hours-list');
    list.textContent = '';
    if (D.scheduleText) {
      const row = el('div', 'hours-row');
      const dt = el('dt', 'hours-day');
      dt.textContent = t('hoursShort');
      const dd = el('dd', 'hours-time');
      dd.textContent = D.scheduleText;
      row.append(dt, dd);
      list.appendChild(row);
      return;
    }
    groupedHours().forEach((group) => {
      const row = el('div', 'hours-row');
      const dt = el('dt', 'hours-day');
      dt.textContent = group.label;
      const dd = el('dd');
      if (group.ranges.length) {
        dd.className = 'hours-time';
        group.ranges.forEach((range) => {
          const line = el('span', 'block whitespace-nowrap');
          line.textContent = rangesText([range]).replace(/–/g, '-');
          dd.appendChild(line);
        });
      } else {
        dd.className = 'hours-time font-normal text-neutral-400 dark:text-stone-500';
        dd.textContent = t('closed');
      }
      row.append(dt, dd);
      list.appendChild(row);
    });
  }

  /* ---------------------------------- Carta -------------------------------- */
  function allergenName(key) {
    const a = D.allergens[key];
    if (!a) return key;
    const name = L(a.name);
    return a.kind === 'intolerance' ? name + ' · ' + t('intolerance') : name;
  }

  function priceNode(text) {
    const wrap = el('span', 'dish-price');
    wrap.textContent = text;
    return wrap;
  }

  function designOf() {
    return window.VISIWEB_DESIGN || { dishes: 'lista_foto', tabs: 'pildoras' };
  }

  function dishNode(item) {
    const dishes = designOf().dishes;
    const li = el('li', dishes === 'tarjetas_grandes' ? 'vw-card-dish' : 'border-b border-stone-300 py-2 dark:border-stone-600');
    li.dataset.allergens = item.allergens.join(',');
    const vegan = !!(item.isVegan || item.tags.indexOf('vegano') >= 0);
    const vegetarian = vegan || !!(item.isVegetarian || item.tags.indexOf('vegetariano') >= 0);
    li.dataset.vegetarian = vegetarian ? '1' : '0';
    li.dataset.vegan = vegan ? '1' : '0';

    const row = el('div', 'flex items-center gap-3');
    const text = el('div', 'min-w-0 flex-1');
    const heading = el('div', 'flex items-baseline justify-between gap-3');
    const title = el('h3', 'text-sm font-bold leading-tight text-stone-900 dark:text-stone-100 sm:text-base');
    title.textContent = L(item.name);
    heading.append(title, priceNode(lang === 'en' ? item.priceEn : item.price));
    const desc = el('p', 'mt-0.5 text-xs leading-snug text-stone-500 dark:text-stone-400 sm:text-sm');
    desc.textContent = L(item.desc);
    text.append(heading, desc);
    if (item.dietType === 'vegano' || item.dietType === 'vegetariano') {
      const veganDiet = item.dietType === 'vegano';
      const diet = el('span', veganDiet
        ? 'mb-1 mt-1.5 inline-flex items-center rounded-full border border-emerald-950 bg-emerald-900 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
        : 'diet-vegetarian mb-1 mt-1.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold');
      diet.textContent = L(D.dietTags[item.dietType].name);
      text.appendChild(diet);
    }
    const image = dishes === 'solo_texto'
      ? null
      : imageOrPlaceholder(item.image, L(item.name), 72, dishes === 'tarjetas_grandes'
        ? 'vw-photo h-36 w-full rounded-2xl object-cover'
        : 'vw-photo h-[72px] w-[72px] shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20');
    if (dishes === 'tarjetas_grandes' && image) row.append(image, text);
    else if (image) row.append(text, image);
    else row.append(text);
    li.appendChild(row);
    return li;
  }

  const TAB_CHROME = 'select-none [-webkit-tap-highlight-color:transparent] focus:outline-none focus:ring-0 active:scale-95 transition-transform duration-100';
  const TAB_ON = ['bg-stone-900', 'text-white', 'dark:bg-stone-100', 'dark:text-stone-900'];
  const TAB_OFF = ['bg-stone-100', 'text-stone-700', 'dark:bg-stone-800', 'dark:text-stone-300'];

  function paintCategoryTab(node, selected) {
    node.setAttribute('aria-selected', String(selected));
    node.tabIndex = selected ? 0 : -1;
    const mode = designOf().tabs;
    if (mode === 'subrayado') {
      node.className = 'tab ' + TAB_CHROME + (selected ? ' border-b-2 border-current bg-transparent text-stone-900' : ' border-b-2 border-transparent bg-transparent text-stone-500');
      return;
    }
    if (mode === 'bloques') {
      node.className = 'tab ' + TAB_CHROME + (selected ? ' rounded-sm bg-stone-900 px-3 py-2 text-white' : ' rounded-sm bg-stone-200 px-3 py-2 text-stone-700');
      return;
    }
    node.className = 'tab ' + TAB_CHROME + ' ' + (selected ? TAB_ON : TAB_OFF).join(' ');
  }

  function renderMenu() {
    const tabs = $('#tabs');
    const panels = $('#panels');
    tabs.textContent = '';
    panels.textContent = '';

    D.menu.forEach((cat, index) => {
      const tab = el('button', 'tab ' + TAB_CHROME + ' ' + (index === 0 ? TAB_ON : TAB_OFF).join(' '));
      tab.type = 'button';
      tab.id = 'tab-' + cat.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'panel-' + cat.id);
      tab.dataset.anchor = cat.anchor;
      if (cat.id === 'veggie') tab.dataset.category = 'veggie';
      tab.textContent = L(cat.name);
      paintCategoryTab(tab, index === 0);
      tabs.appendChild(tab);
      pinBilingual(tab, cat.name.es, cat.name.en);

      const panel = el('section', 'scroll-mt-32 focus:outline-none');
      panel.id = 'panel-' + cat.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'tab-' + cat.id);
      panel.tabIndex = 0;
      if (index !== 0) panel.hidden = true;

      const desc = el('p', 'mt-3 pb-6 text-center text-sm italic text-stone-500 sm:pb-8');
      desc.textContent = L(cat.desc);
      const list = el('ul');
      cat.items.forEach((item) => list.appendChild(dishNode(item)));
      panel.append(desc, list);
      panels.appendChild(panel);
    });
  }

  function selectTab(tab, focus, quiet) {
    const panels = $('#panels');
    const all = Array.prototype.slice.call($('#tabs').children);
    all.forEach((node) => {
      const selected = node === tab;
      paintCategoryTab(node, selected);
      const panel = document.getElementById(node.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
    applyAllergenFilter();
    if (panels && !quiet) {
      panels.classList.remove('opacity-100');
      panels.classList.add('opacity-0');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panels.classList.remove('opacity-0');
          panels.classList.add('opacity-100');
        });
      });
    }
    if (focus) tab.focus();
    revealActiveCategory(quiet ? 'auto' : 'smooth');
    if (quiet) return;
    scrollCategoryToStart();
    history.replaceState(null, '', '#' + tab.dataset.anchor);
  }

  let chipRowDrag = false;
  let chipSnapTimer = 0;
  let chipSnapArmed = false;
  let chipSlideToken = 0;

  function revealActiveCategory(behavior) {
    const row = $('#menu-chip-row');
    if (!row) return;
    const tab = row.querySelector('[role="tab"][aria-selected="true"]');
    if (!tab) return;
    const max = row.scrollWidth - row.clientWidth;
    if (max <= 1) return;
    const pad = 16;
    const rowRect = row.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    let next = row.scrollLeft;
    if (tabRect.left < rowRect.left + pad) next += tabRect.left - rowRect.left - pad;
    else if (tabRect.right > rowRect.right - pad) next += tabRect.right - rowRect.right + pad;
    next = Math.max(0, Math.min(max, next));
    const start = row.scrollLeft;
    if (Math.abs(next - start) < 1) return;
    chipSnapArmed = false;
    window.clearTimeout(chipSnapTimer);
    chipSnapTimer = 0;
    const token = ++chipSlideToken;
    if (behavior === 'auto') {
      row.scrollLeft = next;
      return;
    }
    const t0 = performance.now();
    const step = () => {
      if (token !== chipSlideToken || chipRowDrag) return;
      const p = Math.min(1, (performance.now() - t0) / 280);
      const eased = 1 - Math.pow(1 - p, 3);
      row.scrollLeft = start + (next - start) * eased;
      if (p < 1) window.setTimeout(step, 16);
    };
    window.setTimeout(step, 16);
  }

  function initCategoryBarReveal() {
    const row = $('#menu-chip-row');
    if (!row) return;
    let dragPointer = 0;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let dragMoved = false;

    function queueSnap() {
      chipSnapArmed = true;
      window.clearTimeout(chipSnapTimer);
      chipSnapTimer = window.setTimeout(() => {
        chipSnapArmed = false;
        chipSnapTimer = 0;
        if (chipRowDrag) return;
        revealActiveCategory('smooth');
      }, 140);
    }

    function endMouseDrag() {
      chipRowDrag = false;
      dragPointer = 0;
      row.classList.remove('is-dragging');
    }

    row.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      chipRowDrag = true;
      chipSnapArmed = false;
      chipSlideToken += 1;
      window.clearTimeout(chipSnapTimer);
      if (event.pointerType !== 'mouse') return;
      dragPointer = event.pointerId;
      dragStartX = event.clientX;
      dragStartScroll = row.scrollLeft;
      dragMoved = false;
      row.classList.add('is-dragging');
      try { row.setPointerCapture(event.pointerId); } catch (err) {}
    });
    row.addEventListener('pointermove', (event) => {
      if (event.pointerId !== dragPointer) return;
      const dx = event.clientX - dragStartX;
      if (Math.abs(dx) > 4) dragMoved = true;
      row.scrollLeft = dragStartScroll - dx;
    });
    row.addEventListener('click', (event) => {
      if (!dragMoved) return;
      event.preventDefault();
      event.stopPropagation();
      dragMoved = false;
    }, true);
    row.addEventListener('wheel', (event) => {
      if (row.scrollWidth - row.clientWidth <= 1) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
      if (!horizontal) return;
      const delta = event.shiftKey ? event.deltaY : event.deltaX;
      if (!delta) return;
      row.scrollLeft += delta;
      chipSnapArmed = false;
      chipSlideToken += 1;
      event.preventDefault();
    }, { passive: false });
    row.addEventListener('scroll', () => {
      if (!chipRowDrag && chipSnapArmed) queueSnap();
    }, { passive: true });
    document.addEventListener('pointerup', (event) => {
      if (event.pointerId === dragPointer) {
        const moved = dragMoved;
        endMouseDrag();
        if (moved) {
          window.setTimeout(() => { dragMoved = false; }, 0);
          return;
        }
      }
      chipRowDrag = false;
      queueSnap();
    });
    document.addEventListener('pointercancel', (event) => {
      if (event.pointerId === dragPointer) endMouseDrag();
      chipRowDrag = false;
    });

    let pageLock = 0;
    window.addEventListener('scroll', () => {
      if (chipRowDrag || pageLock) return;
      pageLock = window.setTimeout(() => { pageLock = 0; }, 320);
      revealActiveCategory('smooth');
    }, { passive: true });
  }

  function scrollCategoryToStart() {
    const bar = $('#menu-tabs-bar');
    const panels = $('#panels');
    if (!bar || !panels) return;
    const nav = document.querySelector('[data-site-sticky]');
    const navH = nav ? nav.offsetHeight : 0;
    const y = panels.getBoundingClientRect().top + window.scrollY - navH - bar.offsetHeight;
    window.scrollTo(0, Math.max(0, y));
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

  let hashNavOpts = null;
  let openSocialsSheet = function () {};
  let closeSocialsSheet = function () {};

  function showPage(id, opts) {
    if (id !== 'inicio') closeSocialsSheet({ keepHash: true });
    document.querySelectorAll('[data-page]').forEach((page) => {
      page.hidden = page.dataset.page !== id;
    });
    document.querySelectorAll('[data-nav]').forEach((link) => {
      if (link.dataset.nav === id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    syncEventosHero(id);
    if (id === 'carta') {
      placeAllergenChip();
      requestAnimationFrame(() => requestAnimationFrame(placeAllergenChip));
    }
    if (opts && opts.quiet) return;
    if (opts && opts.smooth) {
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.scrollTo(0, 0);
  }

  function menuTabByAnchor(hash) {
    return Array.prototype.slice.call($('#tabs').children)
      .filter((node) => node.dataset.anchor === hash)[0];
  }

  function applyHash(opts) {
    const navOpts = opts || hashNavOpts;
    hashNavOpts = null;
    const quiet = !!(navOpts && navOpts.quiet);
    const hash = decodeURIComponent(window.location.hash.replace('#', ''));
    if (hash !== 'redes') closeSocialsSheet({ keepHash: true });
    if (!hash || hash === 'inicio') {
      showPage('inicio', navOpts);
      return;
    }
    if (hash === 'redes') {
      showPage('inicio', navOpts);
      openSocialsSheet();
      return;
    }
    if (PAGES.indexOf(hash) >= 0) {
      if (hash === 'reservas' && !(navOpts && navOpts.quiet)) {
        reservasMode = reservasEntry === 'eventos' ? 'eventos' : 'mesa';
        reservasEntry = 'mesa';
      }
      showPage(hash, navOpts);
      if (hash === 'carta') applyAllergenFilter();
      if (hash === 'reservas') {
        refreshBookingSlots();
        syncReservasMode();
      }
      return;
    }
    if (hash === 'eventos' && !eventosOn) {
      showPage('inicio', navOpts);
      history.replaceState(null, '', window.location.pathname + window.location.search + '#inicio');
      return;
    }
    if (hash === 'horarios') {
      const hours = $('#horarios');
      if (hours && !quiet) hours.scrollIntoView({ block: 'start' });
      return;
    }
    if (hash === 'ubicacion' || hash === 'historia') {
      showPage('local', { quiet: true });
      const target = hash === 'historia' ? $('#historia') : $('#ubicacion');
      if (target && !quiet) target.scrollIntoView({ block: 'start' });
      return;
    }
    const tab = menuTabByAnchor(hash);
    if (tab) {
      showPage('carta', { quiet: true });
      selectTab(tab, false, true);
      if (!quiet) scrollCategoryToStart();
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
      name.style.whiteSpace = 'pre-line';
      name.textContent = L(item.name).replace(' con jamón', '\ncon jamón');
      const price = priceNode(lang === 'en' ? item.priceEn : item.price);
      const lowPrice = id === 'croquetas' || id === 'bravas';
      price.classList.add(lowPrice ? 'mt-3' : 'mt-1', 'block');
      if (lowPrice) price.classList.add('is-low');
      body.append(name, price);
      link.appendChild(body);
      li.appendChild(link);
      list.appendChild(li);
    });
  }

  function formatEventDate(ymd) {
    const parts = String(ymd || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => !n)) return ymd;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    try {
      return new Intl.DateTimeFormat(t('locale') || 'es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }).format(date);
    } catch (e) {
      return ymd;
    }
  }

  function eventIcon(name) {
    const paths = {
      cheers: '<path d="M8 3h8l-1.15 6.1a2.85 2.85 0 0 1-5.7 0L8 3z"/><path d="M12 12.2V17"/><path d="M9 21h6"/>',
      team: '<circle cx="9" cy="8" r="2.4"/><path d="M4.5 19.5v-1.2a3.2 3.2 0 0 1 3.2-3.2h2.6a3.2 3.2 0 0 1 3.2 3.2v1.2"/><circle cx="16.2" cy="8.4" r="2"/><path d="M16.2 15.1a3.1 3.1 0 0 1 3.1 2.6v1.8"/>',
      private: '<path d="M6 21V6.2A1.2 1.2 0 0 1 7.2 5H14a1.2 1.2 0 0 1 1.2 1.2V21"/><path d="M4.8 21h14.4"/><path d="M12.4 12.4h.01"/>',
      menu: '<path d="M5 16.5h14"/><path d="M7 16.5a5 5 0 0 1 10 0"/><path d="M12 7.2V5"/>',
      room: '<path d="M4 20V9.2L12 4l8 5.2V20"/><path d="M9.5 20v-5.2h5V20"/>',
      care: '<path d="M8 4.5h8"/><path d="M8 4.5A1.8 1.8 0 0 0 6.2 6.3v11.4A1.8 1.8 0 0 0 8 19.5h8a1.8 1.8 0 0 0 1.8-1.8V6.3A1.8 1.8 0 0 0 16 4.5"/><path d="M9 12.2l2 2 4-4"/>',
      quote: '<path d="M7 3.8h10v16.4l-1.7-1.1-1.7 1.1-1.6-1.1-1.7 1.1-1.6-1.1L7 20.2z"/><path d="M9.2 8.2h5.6M9.2 11.6h5.6M9.2 15h3.2"/>'
    };
    const body = paths[name];
    if (!body) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  function eventImageSrc(src) {
    if (!src) return '';
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    try { return new URL(src, window.location.href).href; } catch (e) { return src; }
  }

  function eventHeroClip(ev) {
    if (!ev || !ev.tipoVideo || ev.tipoVideo === 'ninguno') return null;
    const tipo = String(ev.tipoVideo);
    const cap = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    const raw = ev['video' + cap];
    if (!raw) return null;
    const inicio = Number(ev['video' + cap + 'Inicio']);
    const duracion = Number(ev['video' + cap + 'Duracion']);
    return {
      src: eventImageSrc(raw),
      inicio: isFinite(inicio) && inicio > 0 ? inicio : 0,
      duracion: isFinite(duracion) && duracion > 0 ? duracion : 5
    };
  }

  function seekHeroVideo(video, time, done) {
    let settled = false;
    const finish = function () {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', finish);
      if (done) done();
    };
    const apply = function () {
      if (video.readyState >= 1 && Math.abs(video.currentTime - time) < 0.08) {
        finish();
        return;
      }
      video.addEventListener('seeked', finish);
      try { video.currentTime = time; } catch (e) { finish(); }
    };
    if (video.readyState >= 1) apply();
    else video.addEventListener('loadedmetadata', apply, { once: true });
    setTimeout(function () {
      if (settled) return;
      if (video.readyState >= 1 && Math.abs(video.currentTime - time) > 0.3) {
        try { video.currentTime = time; } catch (e) { finish(); }
        return;
      }
      finish();
    }, 700);
  }

  function startEventHeroLoop(primary, secondary, src, inicio, duracion) {
    const LOOP = duracion > 0 ? duracion : 5;
    const FADE = 1;
    let alive = true;
    let fading = false;
    let top = primary;
    let under = secondary;
    let frame = 0;

    function stop() {
      alive = false;
      if (frame) cancelAnimationFrame(frame);
      primary.onerror = null;
      secondary.onerror = null;
      try { primary.pause(); } catch (e) { /* ignore */ }
      try { secondary.pause(); } catch (e) { /* ignore */ }
      primary.classList.remove('is-out', 'is-swap', 'is-cover');
      secondary.classList.remove('is-out', 'is-swap', 'is-cover');
    }

    function cover(video) {
      primary.classList.remove('is-cover');
      secondary.classList.remove('is-cover');
      video.classList.add('is-cover');
    }

    function prep(video, time, play) {
      video.muted = true;
      video.playsInline = true;
      video.loop = false;
      let started = false;
      const go = function () {
        if (started || !alive) return;
        started = true;
        const limit = isFinite(video.duration) ? Math.max(0, video.duration - 0.05) : time;
        seekHeroVideo(video, Math.min(time, limit), function () {
          if (!alive) return;
          if (play) {
            const pending = video.play();
            if (pending && typeof pending.catch === 'function') pending.catch(function () {});
          } else {
            video.pause();
          }
        });
      };
      if (video.getAttribute('src') !== src) {
        video.addEventListener('loadedmetadata', go, { once: true });
        video.src = src;
        if (video.readyState >= 1) go();
      } else if (video.readyState >= 1) {
        go();
      } else {
        video.addEventListener('loadedmetadata', go, { once: true });
      }
    }

    function fail() {
      stop();
      primary.hidden = true;
      secondary.hidden = true;
      primary.removeAttribute('src');
      secondary.removeAttribute('src');
    }

    primary.hidden = false;
    secondary.hidden = false;
    primary.classList.add('is-out');
    secondary.classList.add('is-out');
    cover(top);
    primary.onerror = fail;
    secondary.onerror = fail;
    prep(top, inicio, true);
    prep(under, inicio, false);
    seekHeroVideo(top, inicio, function () {
      if (!alive) return;
      top.classList.remove('is-out');
    });

    function finishFade() {
      if (!alive || !fading) return;
      fading = false;
      const shown = under;
      under = top;
      top = shown;
      cover(top);
      under.classList.add('is-swap');
      under.classList.remove('is-out');
      void under.offsetWidth;
      under.classList.remove('is-swap');
      under.pause();
      prep(under, inicio, false);
    }

    function beginFade() {
      if (fading) return;
      fading = true;
      const outgoing = top;
      const incoming = under;
      seekHeroVideo(incoming, inicio, function () {
        if (!alive) return;
        incoming.classList.add('is-swap');
        incoming.classList.remove('is-out');
        void incoming.offsetWidth;
        incoming.classList.remove('is-swap');
        const pending = incoming.play();
        if (pending && typeof pending.catch === 'function') pending.catch(function () {});
        outgoing.classList.add('is-out');
        const done = function (event) {
          if (event && event.propertyName && event.propertyName !== 'opacity') return;
          outgoing.removeEventListener('transitionend', done);
          finishFade();
        };
        outgoing.addEventListener('transitionend', done);
        setTimeout(function () {
          outgoing.removeEventListener('transitionend', done);
          finishFade();
        }, (FADE * 1000) + 120);
      });
    }

    function tick() {
      if (!alive) return;
      frame = requestAnimationFrame(tick);
      if (fading || top.readyState < 2) return;
      const duration = isFinite(top.duration) ? top.duration : inicio + LOOP;
      const end = Math.min(inicio + LOOP, Math.max(inicio, duration - 0.05));
      if (top.currentTime >= Math.max(inicio, end - FADE)) beginFade();
    }

    frame = requestAnimationFrame(tick);
    return stop;
  }

  function pauseEventosHero() {
    const heroVideo = $('#eventos-hero-video');
    const heroVideoB = $('#eventos-hero-video-b');
    if (!heroVideo) return;
    if (heroVideo._heroStop) {
      heroVideo._heroStop();
      heroVideo._heroStop = null;
    }
    [heroVideo, heroVideoB].forEach(function (video) {
      if (!video) return;
      try { video.pause(); } catch (e) { /* ignore */ }
    });
  }

  function playEventosHero() {
    if (!eventosOn || isQrMesaMode()) {
      pauseEventosHero();
      return;
    }
    const heroVideo = $('#eventos-hero-video');
    const heroVideoB = $('#eventos-hero-video-b');
    if (!heroVideo || !heroVideoB) return;
    const clip = eventHeroClip(D.eventos);
    if (!clip || !clip.src) {
      pauseEventosHero();
      return;
    }
    const key = clip.src + '|' + clip.inicio + '|' + clip.duracion;
    if (heroVideo._heroKey === key && heroVideo._heroStop) return;
    if (heroVideo._heroStop) heroVideo._heroStop();
    heroVideo._heroKey = key;
    heroVideo._heroStop = startEventHeroLoop(heroVideo, heroVideoB, clip.src, clip.inicio, clip.duracion);
  }

  function syncEventosHero(pageId) {
    if (pageId === 'eventos') {
      hydrateEventosImages();
      playEventosHero();
    } else {
      pauseEventosHero();
    }
  }

  function hydrateEventosImages() {
    document.querySelectorAll('[data-page="eventos"] img[data-src]').forEach(function (img) {
      if (img.getAttribute('src')) return;
      img.src = img.dataset.src;
    });
  }

  function eventPhotoCard(item) {
    const article = el('article', 'eventos-photo');
    const media = el('div', 'eventos-photo-media');
    const img = el('img');
    img.alt = L(item.imageAlt) || L(item.title) || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    const src = eventImageSrc(item.image);
    if (src) {
      const page = document.querySelector('[data-page="eventos"]');
      if (page && !page.hidden) img.src = src;
      else img.dataset.src = src;
      img.onerror = function () { media.hidden = true; };
    } else {
      media.hidden = true;
    }
    media.appendChild(img);
    const body = el('div', 'eventos-photo-body');
    const tag = el('p', 'eventos-photo-tag');
    tag.textContent = L(item.capacityTag);
    const heading = el('h3', 'font-serif');
    heading.textContent = L(item.title);
    const copy = el('p');
    copy.textContent = L(item.text);
    body.append(tag, heading, copy);
    article.append(media, body);
    return article;
  }

  function syncReservasMode() {
    const mode = eventosOn && reservasMode === 'eventos' ? 'eventos' : 'mesa';
    reservasMode = mode;
    const switcher = $('#reservas-switch');
    if (switcher) switcher.hidden = !eventosOn;
    document.querySelectorAll('[data-reservas-mode]').forEach((btn) => {
      const active = btn.dataset.reservasMode === mode;
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.classList.toggle('is-active', active);
    });
    const mesa = $('#booking-form');
    const eventos = $('#eventos-booking');
    if (mesa) mesa.hidden = mode === 'eventos';
    if (eventos) eventos.hidden = mode !== 'eventos';
    const title = $('#reservas-title');
    const sub = $('#reservas-sub');
    if (title) title.textContent = mode === 'eventos' ? t('eventBookTitle') : t('bookTitle');
    if (sub) sub.textContent = mode === 'eventos' ? t('eventBookSubtitle') : t('bookSubtitle');
  }

  function openEventosBooking() {
    reservasEntry = 'eventos';
    const hash = decodeURIComponent(window.location.hash.replace('#', ''));
    if (hash === 'reservas') {
      reservasMode = 'eventos';
      reservasEntry = 'mesa';
      showPage('reservas');
      syncReservasMode();
      return;
    }
    window.location.hash = 'reservas';
  }

  function eventTypesScrollLeft(scroller, card) {
    const scrollerBox = scroller.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    return scroller.scrollLeft + (cardBox.left - scrollerBox.left) - ((scroller.clientWidth - cardBox.width) / 2);
  }

  function activeEventTypeIndex(scroller) {
    const cards = scroller.querySelectorAll('.eventos-photo');
    const mid = scroller.getBoundingClientRect().left + (scroller.clientWidth / 2);
    let index = 0;
    let best = Infinity;
    cards.forEach((card, i) => {
      const box = card.getBoundingClientRect();
      const dist = Math.abs((box.left + box.width / 2) - mid);
      if (dist < best) {
        best = dist;
        index = i;
      }
    });
    return index;
  }

  function syncEventTypesDots() {
    const types = $('#eventos-types');
    const dots = $('#eventos-types-dots');
    if (!types || !dots) return;
    const index = activeEventTypeIndex(types);
    dots.querySelectorAll('button').forEach((btn, i) => {
      btn.setAttribute('aria-current', i === index ? 'true' : 'false');
    });
  }

  function renderEventTypesDots(types, items) {
    const dots = $('#eventos-types-dots');
    if (!dots) return;
    dots.textContent = '';
    dots.hidden = items.length < 2;
    if (dots.hidden) return;
    dots.setAttribute('aria-label', L(D.eventos.typesTitle) || '');
    items.forEach((item, index) => {
      const btn = el('button', 'eventos-types-dot');
      btn.type = 'button';
      btn.setAttribute('aria-label', L(item.title) || String(index + 1));
      btn.setAttribute('aria-current', index === 0 ? 'true' : 'false');
      btn.addEventListener('click', () => {
        const card = types.querySelectorAll('.eventos-photo')[index];
        if (!card) return;
        types.scrollTo({ left: Math.max(0, eventTypesScrollLeft(types, card)), behavior: 'smooth' });
      });
      dots.appendChild(btn);
    });
  }

  let eventTypesScrollBound = false;
  function bindEventTypesCarousel() {
    const types = $('#eventos-types');
    if (!types || eventTypesScrollBound) return;
    eventTypesScrollBound = true;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        syncEventTypesDots();
      });
    };
    types.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  }

  function renderEventos() {
    syncReservasMode();
    if (!eventosOn) return;
    const ev = D.eventos;
    const eyebrow = $('#eventos-eyebrow');
    const title = $('#eventos-title');
    const subtitle = $('#eventos-subtitle');
    const cta = $('#eventos-cta');
    const lead = $('#eventos-lead');
    const hero = $('#eventos-hero-img');
    const heroVideo = $('#eventos-hero-video');
    const heroVideoB = $('#eventos-hero-video-b');
    const typesTitle = $('#eventos-types-title');
    const types = $('#eventos-types');
    const readyTitle = $('#eventos-ready-title');
    const readyPoints = $('#eventos-ready-points');
    const readyCta = $('#eventos-ready-cta');
    const readyImg = $('#eventos-ready-img');
    const select = $('#eventos-book-type');
    if (eyebrow) eyebrow.textContent = L(ev.eyebrow);
    if (title) title.textContent = L(ev.title) || t('eventosTitle');
    if (subtitle) subtitle.textContent = L(ev.subtitle);
    if (cta) cta.textContent = L(ev.cta) || t('eventosSubmit');
    if (lead) lead.textContent = L(ev.lead || ev.description);
    if (typesTitle) typesTitle.textContent = L(ev.typesTitle);
    if (readyTitle) readyTitle.textContent = L(ev.readyTitle);
    if (readyCta) readyCta.textContent = L(ev.readyCta);
    const page = document.querySelector('[data-page="eventos"]');
    const onEventos = !!(page && !page.hidden);
    if (hero) {
      hero.alt = L(ev.imageAlt);
      hero.loading = 'lazy';
      hero.decoding = 'async';
      const src = eventImageSrc(ev.imagenHero || ev.image);
      if (src) {
        hero.hidden = false;
        hero.dataset.src = src;
        if (onEventos) hero.src = src;
        else hero.removeAttribute('src');
        hero.onerror = function () { hero.hidden = true; };
      } else {
        hero.hidden = true;
        hero.removeAttribute('src');
        delete hero.dataset.src;
      }
    }
    if (heroVideo && heroVideoB) {
      const clip = eventHeroClip(ev);
      const posterSrc = hero && (hero.getAttribute('src') || hero.dataset.src);
      if (posterSrc && onEventos) {
        heroVideo.poster = posterSrc;
        heroVideoB.poster = posterSrc;
      } else {
        heroVideo.removeAttribute('poster');
        heroVideoB.removeAttribute('poster');
      }
      heroVideo.setAttribute('preload', 'none');
      heroVideoB.setAttribute('preload', 'none');
      if (clip && clip.src) {
        const key = clip.src + '|' + clip.inicio + '|' + clip.duracion;
        if (heroVideo._heroKey !== key) {
          pauseEventosHero();
          heroVideo._heroKey = '';
          heroVideo.hidden = true;
          heroVideoB.hidden = true;
          if (heroVideo.getAttribute('src')) {
            heroVideo.removeAttribute('src');
            heroVideoB.removeAttribute('src');
            try { heroVideo.load(); } catch (e) { /* ignore */ }
            try { heroVideoB.load(); } catch (e) { /* ignore */ }
          }
        }
        if (onEventos) {
          hydrateEventosImages();
          playEventosHero();
        } else {
          pauseEventosHero();
        }
      } else if (heroVideo._heroStop || heroVideo.getAttribute('src') || heroVideo._heroKey) {
        pauseEventosHero();
        heroVideo._heroKey = '';
        heroVideo.hidden = true;
        heroVideoB.hidden = true;
        heroVideo.removeAttribute('src');
        heroVideoB.removeAttribute('src');
        heroVideo.removeAttribute('poster');
        heroVideoB.removeAttribute('poster');
        try { heroVideo.load(); } catch (e) { /* ignore */ }
        try { heroVideoB.load(); } catch (e) { /* ignore */ }
      }
    }
    if (readyImg) {
      readyImg.alt = L(ev.readyImageAlt);
      readyImg.loading = 'lazy';
      readyImg.decoding = 'async';
      const src = eventImageSrc(ev.readyImage);
      if (src) {
        readyImg.hidden = false;
        readyImg.dataset.src = src;
        if (onEventos) readyImg.src = src;
        else readyImg.removeAttribute('src');
        readyImg.onerror = function () { readyImg.hidden = true; };
      } else {
        readyImg.hidden = true;
        readyImg.removeAttribute('src');
        delete readyImg.dataset.src;
      }
    }
    if (types) {
      types.textContent = '';
      const items = ev.types || [];
      items.forEach((type) => types.appendChild(eventPhotoCard(type)));
      renderEventTypesDots(types, items);
      bindEventTypesCarousel();
      syncEventTypesDots();
    }
    if (readyPoints) {
      readyPoints.textContent = '';
      (ev.readyPoints || []).forEach((point) => {
        const li = el('li');
        const mark = el('span', 'eventos-ready-mark');
        mark.setAttribute('aria-hidden', 'true');
        const copy = el('span');
        copy.textContent = L(point);
        li.append(mark, copy);
        readyPoints.appendChild(li);
      });
    }
    if (select) {
      const current = select.value;
      select.textContent = '';
      const placeholder = el('option');
      placeholder.value = '';
      placeholder.textContent = t('eventTypePlaceholder');
      select.appendChild(placeholder);
      (ev.formTypes || []).forEach((type) => {
        const option = el('option');
        option.value = type.id;
        option.textContent = L(type.label);
        select.appendChild(option);
      });
      if (current) select.value = current;
      if (typeof syncBookSelect === 'function') syncBookSelect(select);
      syncEventOtherField();
    }
    if (eventDatePicker) {
      const locale = lang === 'es' && window.flatpickr && flatpickr.l10ns && flatpickr.l10ns.es ? 'es' : 'default';
      eventDatePicker.set('locale', locale);
    }
  }

  function syncEventOtherField() {
    const select = $('#eventos-book-type');
    const wrap = $('#eventos-book-other-wrap');
    const input = $('#eventos-book-other');
    if (!select || !wrap) return;
    const open = select.value === 'otro';
    wrap.classList.toggle('is-open', open);
    wrap.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (!input) return;
    input.disabled = !open;
    if (!open) input.value = '';
  }

  function initEventos() {
    const link = $('#nav-eventos');
    const row = document.querySelector('.site-nav-links');
    const page = document.querySelector('[data-page="eventos"]');
    if (!eventosOn) {
      if (link) link.hidden = true;
      if (page) page.hidden = true;
      if (row) row.classList.remove('has-eventos');
    } else {
      if (link) link.hidden = false;
      if (row) row.classList.add('has-eventos');
    }
    [$('#eventos-cta'), $('#eventos-ready-cta')].forEach((btn) => {
      if (!btn) return;
      btn.addEventListener('click', openEventosBooking);
    });
    document.querySelectorAll('[data-reservas-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        reservasMode = btn.dataset.reservasMode === 'eventos' ? 'eventos' : 'mesa';
        syncReservasMode();
      });
    });
    document.querySelectorAll('a[data-i18n="mesaLink"], a[data-view="mesa"]').forEach((mesaLink) => {
      mesaLink.addEventListener('click', pauseEventosHero);
    });
    window.addEventListener('pagehide', pauseEventosHero);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        pauseEventosHero();
        return;
      }
      const visible = document.querySelector('[data-page="eventos"]');
      if (visible && !visible.hidden) {
        hydrateEventosImages();
        playEventosHero();
      }
    });
    const form = $('#eventos-booking');
    if (!form) return;
    const guestsInput = $('#eventos-book-guests');
    if (guestsInput) {
      guestsInput.addEventListener('input', () => {
        if (guestsInput.value === '') return;
        if (Number(guestsInput.value) > 40) guestsInput.value = '40';
      });
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const feedback = $('#eventos-book-feedback');
      const name = ($('#eventos-book-name') && $('#eventos-book-name').value || '').trim();
      const ymd = $('#eventos-book-date') && $('#eventos-book-date').value;
      const guests = Number($('#eventos-book-guests') && $('#eventos-book-guests').value);
      const typeId = $('#eventos-book-type') && $('#eventos-book-type').value;
      const notes = ($('#eventos-book-notes') && $('#eventos-book-notes').value || '').trim();
      const type = (D.eventos.formTypes || []).filter((item) => item.id === typeId)[0];
      const other = ($('#eventos-book-other') && $('#eventos-book-other').value || '').trim();
      if (!name || !ymd || !guests || guests < 1 || guests > 40 || !type) {
        if (feedback) {
          feedback.textContent = t('eventosError');
          feedback.hidden = false;
        }
        return;
      }
      if (feedback) feedback.hidden = true;
      const lines = [
        t('eventosWaIntro', { name: name, restaurant: D.business.name }),
        '',
        '*' + t('eventosWaType') + ':* ' + (type.id === 'otro' && other ? L(type.label) + ' - ' + other : L(type.label)),
        '*' + t('eventosWaDate') + ':* ' + formatEventDate(ymd),
        '*' + t('eventosWaGuests') + ':* ' + String(guests)
      ];
      if (notes) lines.push('*' + t('eventosWaNotes') + ':* ' + notes);
      const phone = D.eventos.whatsapp || D.business.whatsapp;
      window.location.href = whatsappSendUrl(phone, lines.join('\n'));
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

  function gbpStars(score) {
    const star = '<svg viewBox="0 0 24 24" class="h-3 w-3 shrink-0" fill="currentColor" aria-hidden="true"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"/></svg>';
    const full = Math.floor(score);
    const frac = score - full;
    let out = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= full) {
        out += '<span class="inline-flex">' + star + '</span>';
      } else if (i === full + 1 && frac > 0) {
        const pct = Math.round(frac * 100);
        out += '<span class="relative inline-flex h-3 w-3 text-stone-300 dark:text-stone-600">' + star +
          '<span class="absolute inset-y-0 left-0 overflow-hidden text-[#fbbc04]" style="width:' + pct + '%">' + star + '</span></span>';
      } else {
        out += '<span class="inline-flex text-stone-300 dark:text-stone-600">' + star + '</span>';
      }
    }
    return out;
  }

  function renderGbp() {
    const name = $('#gbp-name');
    const cat = $('#gbp-category');
    const score = $('#gbp-score');
    const hours = $('#gbp-hours');
    const attrs = $('#gbp-attrs');
    const photos = $('#gbp-photos');
    if (!cat || !score || !attrs || !photos) return;

    if (name) name.textContent = D.business.name;
    cat.textContent = L(D.gbp.category) + ' · ' + D.business.priceRange + ' · ' + shortAddress();

    const value = D.reviews.score.toLocaleString(D.i18n[lang].locale, { minimumFractionDigits: 1 });
    score.innerHTML = '<span class="font-medium text-stone-900 dark:text-stone-100">' + value + '</span>' +
      '<span class="flex items-center gap-0.5 text-[#fbbc04]" aria-hidden="true">' + gbpStars(D.reviews.score) + '</span>' +
      '<span class="text-stone-500">(' + D.reviews.count + ')</span>';

    if (hours) {
      hours.textContent = '';
      if (D.scheduleText) {
        hours.textContent = D.scheduleText;
      } else {
      const state = openState();
      const status = el('span', state.open ? 'font-medium text-[#137333] dark:text-[#81c995]' : 'font-medium text-[#d93025] dark:text-[#f28b82]');
      status.textContent = state.open ? t('gbpOpen') : t('gbpClosed');
      hours.appendChild(status);
      const detail = el('span', 'text-stone-500');
      if (state.open && state.until) {
        detail.textContent = ' ' + t('gbpCloses', { time: fromMin(toMin(state.until)) });
        hours.appendChild(detail);
      } else if (!state.open && state.at && state.day === undefined) {
        detail.textContent = ' ' + t('gbpOpens', { time: state.at });
        hours.appendChild(detail);
      }
      }
    }

    const directions = $('#gbp-directions');
    if (directions) directions.href = '#';
    const call = $('#gbp-call');
    if (call) call.href = '#';

    attrs.textContent = '';
    D.gbp.attributes.forEach((attr) => {
      const span = el('span', 'flex items-center gap-1.5');
      const mark = el('span', 'font-bold text-[#137333]');
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '✓';
      span.appendChild(mark);
      span.appendChild(document.createTextNode(L(attr)));
      attrs.appendChild(span);
    });

    photos.textContent = '';
    const previewRooms = D.local.rooms.filter((room) => !/barra\.webp$/.test(room.image || ''));
    previewRooms.forEach((room, index) => {
      const frame = el('div', 'relative h-20 w-full overflow-hidden rounded-lg sm:h-24');
      const img = imageOrPlaceholder(room.image, L(room.title), null, 'h-full w-full object-cover');
      if (img.tagName === 'IMG') {
        img.loading = 'lazy';
        img.width = 144;
        img.height = 96;
      }
      frame.appendChild(img);
      if (index === previewRooms.length - 1) {
        const more = el('div', 'absolute inset-0 flex items-center justify-center bg-black/50 text-[11px] font-medium text-white sm:text-xs');
        more.textContent = t('gbpMorePhotos');
        frame.appendChild(more);
      }
      photos.appendChild(frame);
    });

    renderGbpMenu();
    renderGbpReviews();
    renderGbpPhotos();
    renderGbpAbout();
  }

  /* --- Ficha de Google · panel "Carta" ------------------------------------ */
  function renderGbpMenu() {
    const list = $('#gbp-menu-list');
    if (!list) return;
    list.textContent = '';
    (D.featured || []).slice(0, 4).forEach((id) => {
      const found = findDish(id);
      if (!found) return;
      const item = found.item;
      const li = el('li', 'flex items-start justify-between gap-3 py-2.5');
      const body = el('div', 'min-w-0');
      const name = el('p', 'text-xs font-medium text-stone-900 dark:text-stone-100');
      name.textContent = L(item.name);
      const desc = el('p', 'mt-0.5 line-clamp-2 text-[11px] text-stone-500 dark:text-stone-400');
      desc.textContent = L(item.desc);
      body.append(name, desc);
      const price = el('span', 'shrink-0 text-xs font-medium text-stone-700 dark:text-stone-300');
      price.textContent = lang === 'en' ? item.priceEn : item.price;
      li.append(body, price);
      list.appendChild(li);
    });
  }

  /* --- Ficha de Google · panel "Opiniones" -------------------------------- */
  function renderGbpReviews() {
    const scoreEl = $('#gbp-rv-score');
    const starsEl = $('#gbp-rv-stars');
    const countEl = $('#gbp-rv-count');
    const bars = $('#gbp-rv-bars');
    const list = $('#gbp-rv-list');
    if (!scoreEl || !bars || !list) return;

    scoreEl.textContent = D.reviews.score.toLocaleString(D.i18n[lang].locale, { minimumFractionDigits: 1 });
    starsEl.innerHTML = gbpStars(D.reviews.score);
    starsEl.setAttribute('aria-hidden', 'true');
    countEl.textContent = D.reviews.count + ' ' + t('gbpReviews');

    bars.textContent = '';
    [[5, 82], [4, 13], [3, 3], [2, 1], [1, 1]].forEach(([stars, pct]) => {
      const row = el('div', 'flex items-center gap-2');
      const label = el('span', 'w-2 text-[11px] text-stone-500 dark:text-stone-400');
      label.textContent = stars;
      const track = el('div', 'h-2 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700');
      const fill = el('div', 'h-full rounded-full bg-[#fbbc04]');
      fill.style.width = pct + '%';
      track.appendChild(fill);
      row.append(label, track);
      bars.appendChild(row);
    });

    const AVATARS = ['bg-[#1a73e8]', 'bg-[#137333]', 'bg-[#c5221f]'];
    list.textContent = '';
    D.reviews.items.slice(0, 2).forEach((review, index) => {
      const li = el('li', 'py-3');
      const head = el('div', 'flex items-center gap-2.5');
      const avatar = el('span', 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ' + AVATARS[index % AVATARS.length]);
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = review.author.charAt(0);
      const who = el('div', 'min-w-0');
      const name = el('p', 'text-xs font-medium text-stone-900 dark:text-stone-100');
      name.textContent = review.author;
      const meta = el('p', 'mt-0.5 flex items-center gap-1.5');
      const rating = el('span', 'flex gap-0.5 text-[#fbbc04]');
      rating.innerHTML = gbpStars(review.rating);
      rating.setAttribute('role', 'img');
      rating.setAttribute('aria-label', t('ratingOf', { rating: review.rating }));
      const when = el('span', 'text-[11px] text-stone-500 dark:text-stone-400');
      when.textContent = L(review.when);
      meta.append(rating, when);
      who.append(name, meta);
      head.append(avatar, who);
      const text = el('p', 'mt-2 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400');
      text.textContent = L(review.text);
      li.append(head, text);
      list.appendChild(li);
    });
  }

  /* --- Ficha de Google · panel "Fotos" ------------------------------------ */
  function gbpPhotoSet() {
    const shots = D.local.rooms.filter((room) => !/barra\.webp$/.test(room.image || '')).map((room) => ({
      image: room.image,
      alt: L(room.title),
      group: room.id === 'terraza' ? 'terrace' : 'ambience'
    }));
    (D.featured || []).forEach((id) => {
      const found = findDish(id);
      if (found && found.item.image) {
        shots.push({ image: found.item.image, alt: L(found.item.name), group: 'food' });
      }
    });
    return shots;
  }

  function renderGbpPhotos() {
    const chips = $('#gbp-ph-chips');
    const grid = $('#gbp-ph-grid');
    if (!chips || !grid) return;
    const shots = gbpPhotoSet();

    const paint = (group) => {
      grid.textContent = '';
      shots.filter((s) => group === 'all' || s.group === group).forEach((shot) => {
        const frame = el('div', 'h-20 w-full overflow-hidden rounded-lg sm:h-24');
        const img = imageOrPlaceholder(shot.image, shot.alt, null, 'h-full w-full object-cover');
        if (img.tagName === 'IMG') {
          img.loading = 'lazy';
          img.width = 160;
          img.height = 96;
        }
        frame.appendChild(img);
        grid.appendChild(frame);
      });
    };

    const CHIP_ON = 'border-[#1a73e8] bg-blue-50/60 text-[#1a73e8] dark:bg-blue-950/30 dark:text-[#8ab4f8]';
    const CHIP_OFF = 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300';
    chips.textContent = '';
    [['all', 'gbpPhotoAll'], ['food', 'gbpPhotoFood'], ['ambience', 'gbpPhotoAmbience'], ['terrace', 'gbpPhotoTerrace']].forEach(([group, key], index) => {
      const chip = el('button', 'shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium ' + (index === 0 ? CHIP_ON : CHIP_OFF));
      chip.type = 'button';
      chip.textContent = t(key);
      chip.addEventListener('click', () => {
        Array.prototype.forEach.call(chips.children, (node) => {
          node.className = 'shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium ' + (node === chip ? CHIP_ON : CHIP_OFF);
        });
        paint(group);
      });
      chips.appendChild(chip);
    });
    paint('all');
  }

  /* --- Ficha de Google · panel "Información" ------------------------------- */
  function renderGbpAbout() {
    const list = $('#gbp-about-list');
    if (!list) return;
    const ICONS = {
      pin: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>',
      clock: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>',
      phone: '<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>',
      web: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>'
    };

    const row = (icon, label, body) => {
      const li = el('li', 'flex items-start gap-3 border-b border-stone-100 pb-3 last:border-b-0 last:pb-0 dark:border-stone-800');
      const mark = el('span', 'mt-0.5 h-4 w-4 shrink-0 text-stone-400');
      mark.innerHTML = '<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">' + icon + '</svg>';
      const content = el('div', 'min-w-0 flex-1');
      const title = el('span', 'mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-stone-400');
      title.textContent = label;
      content.append(title, body);
      li.append(mark, content);
      list.appendChild(li);
    };

    list.textContent = '';

    const address = el('button', 'mt-0.5 block text-left leading-relaxed text-[#1a73e8] dark:text-[#8ab4f8]');
    address.type = 'button';
    address.textContent = addressText();
    address.addEventListener('click', () => showDemoNote('demoRouteNote'));
    row(ICONS.pin, t('gbpInfoAddress'), address);

    const hours = el('div', 'mt-1 text-stone-700 dark:text-stone-300');
    if (D.scheduleText) {
      hours.textContent = D.scheduleText;
    } else groupedHours().forEach((group) => {
      const closed = !group.ranges.length;
      const line = el('div', 'flex items-baseline justify-between gap-2 border-b border-stone-100 py-1.5 last:border-b-0 dark:border-stone-800');
      const day = el('span', 'shrink-0');
      day.textContent = gbpDayLabel(group.days);
      const time = el('span', closed
        ? 'font-medium text-red-600 dark:text-red-400'
        : 'text-right tabular-nums');
      time.textContent = closed
        ? t('closed')
        : group.ranges.map(([a, b]) => fromMin(toMin(a)) + '–' + fromMin(toMin(b))).join(' · ');
      line.append(day, time);
      hours.appendChild(line);
    });
    row(ICONS.clock, t('gbpInfoHours'), hours);

    const phone = el('button', 'mt-0.5 block text-left text-[#1a73e8] dark:text-[#8ab4f8]');
    phone.type = 'button';
    phone.textContent = D.business.phoneDisplay;
    phone.addEventListener('click', () => showDemoNote('demoCallNote'));
    row(ICONS.phone, t('gbpInfoPhone'), phone);

    const web = el('a', 'mt-0.5 block break-all text-[#1a73e8] no-underline dark:text-[#8ab4f8]');
    web.href = '#inicio';
    web.textContent = window.VISIWEB_RESTAURANT_SLUG
      ? window.location.host + '/r/' + window.VISIWEB_RESTAURANT_SLUG
      : 'tabernaelnorte.visiwebmadrid.com';
    row(ICONS.web, t('gbpInfoWebsite'), web);
  }

  /* --- Ficha de Google · pestañas ----------------------------------------- */
  const GBP_TAB_ON = 'relative shrink-0 whitespace-nowrap font-semibold text-[#1a73e8] after:absolute after:-bottom-2 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-[#1a73e8] after:content-[\'\'] dark:text-[#8ab4f8] dark:after:bg-[#8ab4f8]';
  const GBP_TAB_OFF = 'shrink-0 whitespace-nowrap text-stone-500 hover:text-stone-700 dark:text-stone-400';

  function cambiarPestanaGoogle(nombrePestana) {
    const tabs = document.querySelectorAll('[data-gbp-tab]');
    if (!tabs.length) return;
    let target = nombrePestana;
    if (!document.querySelector('[data-gbp-panel="' + target + '"]')) target = 'overview';

    tabs.forEach((tab) => {
      const active = tab.dataset.gbpTab === target;
      tab.className = active ? GBP_TAB_ON : GBP_TAB_OFF;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active && tab.parentElement) {
        const bar = tab.parentElement;
        const left = tab.offsetLeft;
        const right = left + tab.offsetWidth;
        if (left < bar.scrollLeft) bar.scrollLeft = left;
        else if (right > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = right - bar.clientWidth;
      }
    });
    document.querySelectorAll('[data-gbp-panel]').forEach((panel) => {
      const active = panel.dataset.gbpPanel === target;
      panel.hidden = !active;
      panel.classList.toggle('block', active);
    });
  }

  function initGbpTabs() {
    document.querySelectorAll('[data-gbp-tab]').forEach((tab) => {
      tab.addEventListener('click', () => cambiarPestanaGoogle(tab.dataset.gbpTab));
    });
    cambiarPestanaGoogle('overview');
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
        btn.textContent = allergenName(key);
        paintFilterButton(btn, allergenFilters.has(key));
      });
    } else {
      wrap.replaceChildren();
      keys.forEach((key) => {
        const btn = el('button', 'filter-chip bg-white text-stone-700 border-stone-300 transition-colors duration-150');
        btn.type = 'button';
        btn.dataset.filter = key;
        btn.textContent = allergenName(key);
        paintFilterButton(btn, allergenFilters.has(key));
        wrap.appendChild(btn);
      });
    }
    const clear = $('#clear-allergen-filters');
    if (clear) clear.hidden = allergenFilters.size === 0;
    const toggle = $('#open-filter-btn');
    if (toggle) toggle.classList.toggle('is-on', allergenFilters.size > 0);
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
      const filtering = allergenFilters.size > 0;
      empty.classList.toggle('hidden', visible !== 0 || !filtering);
      empty.hidden = visible !== 0 || !filtering;
    }
    const clear = $('#clear-allergen-filters');
    if (clear) clear.hidden = allergenFilters.size === 0;
    const toggle = $('#open-filter-btn');
    if (toggle) toggle.classList.toggle('is-on', allergenFilters.size > 0);
  }

  function placeAllergenPanel() {
    const panel = $('#allergen-filter-panel');
    const view = window.visualViewport;
    const viewH = view ? view.height : window.innerHeight;
    const viewTop = view ? view.offsetTop : 0;
    panel.style.top = '0px';
    const top = viewTop + Math.max(16, Math.round((viewH - panel.offsetHeight) / 2));
    panel.style.top = top + 'px';
  }

  function setAllergenPanel(open) {
    const root = $('#allergen-filter-root');
    const toggle = $('#open-filter-btn');
    if (!root || !toggle) return;
    if (open && root.parentElement !== document.body) document.body.appendChild(root);
    root.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) placeAllergenPanel();
  }

  function placeAllergenChip() {
    const row = $('#menu-chip-row');
    const chip = $('#allergen-chip');
    const slot = $('#allergen-below');
    const page = document.querySelector('[data-page="carta"]');
    if (!row || !chip || !slot || !page || page.hidden) return;
    slot.hidden = false;
    if (chip.parentElement !== slot) slot.appendChild(chip);
    row.classList.toggle('is-overflowing', row.scrollWidth - row.clientWidth > 1);
  }

  function initAllergenFilters() {
    const wrap = $('#allergen-filters');
    if (!wrap) return;
    on('#open-filter-btn', 'click', () => {
      const toggle = $('#open-filter-btn');
      setAllergenPanel(toggle.getAttribute('aria-expanded') !== 'true');
    });
    on('#allergen-filter-backdrop', 'click', () => setAllergenPanel(false));
    on('#allergen-filter-close', 'click', () => setAllergenPanel(false));
    document.addEventListener('keydown', (event) => {
      const root = $('#allergen-filter-root');
      if (event.key === 'Escape' && root && !root.hidden) setAllergenPanel(false);
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
      li.appendChild(document.createTextNode(allergenName(key)));
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
      th.innerHTML = '<abbr title="' + esc(allergenName(key)) + '" class="no-underline">' +
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
            ? '<span class="sr-only">' + esc(allergenName(key)) + '</span><span aria-hidden="true">●</span>'
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
      LAC: { es: 'Lácteos / Leche y derivados', en: 'Milk and dairy' }
    };
    if (extra[short]) return extra[short][lang] || extra[short].es;
    const key = Object.keys(D.allergens).find((id) => D.allergens[id].short === short);
    return key ? allergenName(key) : short;
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
  function stars(rating, size) {
    const box = size || 'h-4 w-4';
    let out = '';
    for (let i = 1; i <= 5; i++) {
      out += '<svg viewBox="0 0 24 24" class="' + box + ' ' +
        (i <= rating ? 'text-amber-400' : 'text-stone-300') +
        '" fill="currentColor" aria-hidden="true"><path d="m12 3.6 2.6 5.5 5.9.8-4.3 4.2 1 6-5.2-2.9-5.2 2.9 1-6L3.5 9.9l5.9-.8L12 3.6Z"/></svg>';
    }
    return out;
  }

  function renderReviews() {
    const score = D.reviews.score.toLocaleString(D.i18n[lang].locale, { minimumFractionDigits: 1 });
    const scoreEl = $('#reviews-score');
    scoreEl.textContent = '';
    const scoreText = el('span', 'text-base font-bold text-stone-900');
    scoreText.textContent = score;
    const starRow = el('span', 'flex items-center gap-0.5 text-sm text-amber-400');
    starRow.innerHTML = stars(Math.round(D.reviews.score), 'h-3.5 w-3.5');
    starRow.setAttribute('role', 'img');
    starRow.setAttribute('aria-label', t('ratingOf', { rating: D.reviews.score }));
    const summary = el('span', 'text-sm font-normal text-stone-500');
    summary.textContent = '· ' + D.reviews.count + (lang === 'en' ? ' reviews' : ' opiniones');
    scoreEl.append(scoreText, starRow, summary);

    const list = $('#reviews-list');
    list.textContent = '';
    D.reviews.items.forEach((review, index) => {
      const li = el('li', 'flex h-full flex-col rounded-2xl border border-stone-200/70 bg-white p-5 shadow-xs');
      const head = el('div', 'flex items-start gap-2.5');
      const avatar = el('span', 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ' + ['bg-stone-700', 'bg-stone-500', 'bg-stone-800'][index % 3]);
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = review.author.charAt(0);
      const who = el('div', 'min-w-0 flex-1');
      const name = el('p', 'whitespace-nowrap text-sm font-semibold text-stone-900');
      name.appendChild(document.createTextNode(review.author));
      const meta = el('div', 'mt-0.5 min-w-0');
      const rating = el('span', 'flex items-center gap-px text-xs text-amber-400');
      rating.innerHTML = stars(review.rating, 'h-3 w-3');
      rating.setAttribute('role', 'img');
      rating.setAttribute('aria-label', t('ratingOf', { rating: review.rating }));
      const ago = el('span', 'mt-0.5 block text-xs leading-snug text-stone-400');
      ago.textContent = L(review.when);
      meta.append(rating, ago);
      who.append(name, meta);
      head.append(avatar, who);
      const text = el('p', 'mt-3 flex-grow text-xs leading-relaxed text-stone-700 sm:text-[13px]');
      text.textContent = L(review.text);
      li.append(head, text);
      if (review.dish) {
        const slot = el('div', 'mt-auto pt-3');
        const tag = el('p', 'inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ' + review.dish.pill);
        tag.textContent = L(review.dish);
        slot.appendChild(tag);
        li.appendChild(slot);
      }
      list.appendChild(li);
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
    wheel.dataset.looped = '';
    const blank = el('option');
    blank.value = '';
    select.appendChild(blank);
    for (let n = 1; n <= D.booking.maxGuests; n++) {
      const opt = el('option');
      opt.value = String(n);
      opt.textContent = guestLabel(n);
      select.appendChild(opt);
      const item = el('div', 'time-guest-item');
      item.dataset.val = String(n);
      item.setAttribute('role', 'option');
      item.textContent = guestLabel(n);
      wheel.appendChild(item);
    }
    makeWheelLoop(wheel);
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
    scroller.querySelectorAll('[data-val]').forEach((node) => {
      node.className = kind;
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
    select.dispatchEvent(new Event('input', { bubbles: true }));
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
    const field = $('#hora-reserva');
    const wrap = field && field.parentElement;
    if (!panel) return;
    panel.hidden = !open;
    if (wrap) wrap.classList.toggle('is-open', open);
    if (!open) return;
    setGuestsPickerOpen(false);
    closeAllBookSelects();
    if (wrap) wrap.classList.add('is-open');
    if (bookDatePicker && bookDatePicker.isOpen) bookDatePicker.close();
    requestAnimationFrame(() => alignTimeWheels(false));
  }

  function makeWheelLoop(scroller) {
    if (!scroller || scroller.dataset.looped === '1') return;
    const base = Array.prototype.slice.call(scroller.querySelectorAll('[data-val]'));
    if (base.length < 2) return;
    const copies = 7;
    scroller.dataset.cycle = String(base.length);
    scroller.dataset.copies = String(copies);
    for (let copy = 1; copy < copies; copy++) {
      base.forEach((node) => scroller.appendChild(node.cloneNode(true)));
    }
    scroller.dataset.looped = '1';
  }

  function wheelCycleItem(scroller, val) {
    const list = scroller.querySelectorAll('[data-val]');
    const count = Number(scroller.dataset.cycle || 0);
    const copies = Number(scroller.dataset.copies || 1);
    if (!count || !list.length) return scroller.querySelector('[data-val="' + val + '"]');
    const start = Math.floor(copies / 2) * count;
    for (let i = start; i < start + count && i < list.length; i++) {
      if (list[i].dataset.val === String(val)) return list[i];
    }
    return list[start] || list[0];
  }

  function recenterWheelLoop(scroller) {
    if (!scroller || scroller.dataset.recentering === '1') return;
    const count = Number(scroller.dataset.cycle || 0);
    const copies = Number(scroller.dataset.copies || 1);
    if (count < 2 || copies < 3) return;
    const list = scroller.querySelectorAll('[data-val]');
    const itemH = list[0] && list[0].offsetHeight;
    if (!itemH) return;
    const index = Math.round(scroller.scrollTop / itemH);
    const copy = Math.floor(index / count);
    if (copy > 0 && copy < copies - 1) return;
    const within = ((index % count) + count) % count;
    const next = Math.floor(copies / 2) * count + within;
    if (next === index) return;
    scroller.dataset.recentering = '1';
    scroller.scrollTop += (next - index) * itemH;
    if (scroller.dataset.index) scroller.dataset.index = String(Number(scroller.dataset.index) + (next - index));
    scroller.dataset.recentering = '';
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
    const hourItem = wheelCycleItem(hours, '20');
    const minuteItem = wheelCycleItem(minutes, '30');
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
      recenterWheelLoop(scroller);
      const index = Number(scroller.dataset.index || 0);
      const next = index + (event.deltaY > 0 ? 1 : -1);
      if (next < 0 || next >= list.length) return;
      scroller.dataset.index = String(next);
      centerWheelItem(scroller, list[next], true);
      paintWheelColumn(scroller, list[next]);
    }, { passive: false });

    scroller.addEventListener('click', (event) => {
      const picked = event.target.closest(selector);
      if (!picked) return;
      const list = items();
      const count = Number(scroller.dataset.cycle || 0);
      const copies = Number(scroller.dataset.copies || 1);
      const found = Array.prototype.indexOf.call(list, picked);
      const mid = count ? Math.floor(copies / 2) * count + (found % count) : found;
      const item = list[mid] || picked;
      if (mid >= 0) scroller.dataset.index = String(mid);
      centerWheelItem(scroller, item, true);
      paintWheelColumn(scroller, item);
    });

    scroller.addEventListener('scroll', () => {
      if (scroller.dataset.moving === '1' || scroller.dataset.recentering === '1') return;
      recenterWheelLoop(scroller);
      const item = centeredWheelItem(scroller);
      if (item) paintWheelColumn(scroller, item);
    }, { passive: true });

    scroller.addEventListener('scrollend', () => {
      if (scroller.dataset.moving === '1') scroller.dataset.moving = '';
      recenterWheelLoop(scroller);
      settle();
    });
  }

  function initTimeWheel() {
    const hours = $('#wheel-hours');
    const minutes = $('#wheel-minutes');
    if (!hours || !minutes) return;
    makeWheelLoop(hours);
    makeWheelLoop(minutes);
    bindTimeColumn(hours);
    bindTimeColumn(minutes);
    on('#hora-reserva', 'click', () => {
      const panel = $('#time-picker');
      setTimePickerOpen(!(panel && !panel.hidden));
    });
    on('#book-time-pick', 'click', commitTimeSelection);
  }

  function alignGuestWheel(force) {
    const wheel = $('#wheel-guests');
    if (!wheel || !wheel.clientHeight) return;
    padTimeWheel(wheel);
    if (!force && wheel.dataset.aligned === '1') return;
    const current = $('#book-guests') && $('#book-guests').value;
    const item = wheelCycleItem(wheel, current || '2');
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
    if (select) select.dispatchEvent(new Event('input', { bubbles: true }));
    setGuestsPickerOpen(false);
  }

  function setGuestsPickerOpen(open) {
    const panel = $('#guests-picker');
    const wrap = panel && panel.parentElement.querySelector('.book-select');
    if (!panel || panel.hidden === !open) {
      if (wrap) wrap.classList.toggle('is-open', panel && !panel.hidden);
      if (open) requestAnimationFrame(() => alignGuestWheel(false));
      return;
    }
    panel.hidden = !open;
    if (wrap) wrap.classList.toggle('is-open', open);
    if (!open) return;
    const timePanel = $('#time-picker');
    if (timePanel) timePanel.hidden = true;
    closeAllBookSelects();
    if (wrap) wrap.classList.add('is-open');
    if (bookDatePicker && bookDatePicker.isOpen) bookDatePicker.close();
    requestAnimationFrame(() => alignGuestWheel(false));
  }

  function initGuestWheel() {
    const wheel = $('#wheel-guests');
    if (!wheel) return;
    bindTimeColumn(wheel);
    on('#comensales-reserva', 'click', () => {
      const panel = $('#guests-picker');
      setGuestsPickerOpen(!(panel && !panel.hidden));
    });
    on('#book-guests-pick', 'click', commitGuestSelection);
  }

  function applyI18nBookingOptions() {
    document.querySelectorAll('#book-area option[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    const area = $('#book-area');
    if (area) syncBookSelect(area);
    if (bookDatePicker) {
      const locale = lang === 'es' && window.flatpickr && flatpickr.l10ns && flatpickr.l10ns.es ? 'es' : 'default';
      bookDatePicker.set('locale', locale);
    }
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
    trigger.classList.toggle('is-placeholder', select.id === 'eventos-book-type' && !select.value);
    trigger.disabled = !!select.disabled;

    menu.textContent = '';
    Array.prototype.slice.call(select.options).forEach((opt) => {
      if (!opt.value && (select.id === 'book-time' || select.id === 'eventos-book-type')) return;
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
        setTimePickerOpen(false);
        setGuestsPickerOpen(false);
        if (bookDatePicker && bookDatePicker.isOpen) bookDatePicker.close();
        if (eventDatePicker && eventDatePicker.isOpen) eventDatePicker.close();
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
        if (select.id === 'eventos-book-type') syncEventOtherField();
        closeAllBookSelects();
      });
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!target.closest('#time-picker') && !target.closest('#hora-reserva')) setTimePickerOpen(false);
      if (!target.closest('#guests-picker') && !target.closest('#comensales-reserva')) setGuestsPickerOpen(false);
      if (!target.closest('.book-select')) closeAllBookSelects();
      if (bookDatePicker && bookDatePicker.isOpen && !target.closest('.flatpickr-calendar') && !target.closest('#fecha-reserva')) {
        bookDatePicker.close();
      }
      if (eventDatePicker && eventDatePicker.isOpen && !target.closest('.flatpickr-calendar') && !target.closest('#eventos-fecha')) {
        eventDatePicker.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeAllBookSelects();
      setTimePickerOpen(false);
      setGuestsPickerOpen(false);
      if (bookDatePicker && bookDatePicker.isOpen) bookDatePicker.close();
      if (eventDatePicker && eventDatePicker.isOpen) eventDatePicker.close();
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
      clickOpens: false,
      monthSelectorType: 'static',
      appendTo: document.body,
      disable: [
        function (date) {
          return date.getDay() === 1;
        }
      ],
      position: function (instance) {
        const input = instance._input.getBoundingClientRect();
        const cal = instance.calendarContainer;
        cal.style.width = '';
        cal.style.right = 'auto';
        const width = cal.offsetWidth;
        const gap = 6;
        const height = cal.offsetHeight;
        const spaceBelow = window.innerHeight - input.bottom;
        const above = spaceBelow < height + gap && input.top > height + gap;
        let left = input.left;
        const time = document.querySelector('#hora-reserva');
        if (time) {
          const tb = time.getBoundingClientRect();
          if (Math.abs(tb.top - input.top) < 12 && left + width > tb.left) left = tb.left - width - 8;
        }
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
        cal.style.left = (left + window.scrollX) + 'px';
        cal.style.top = (window.scrollY + (above ? input.top - height - gap : input.bottom + gap)) + 'px';
      },
      onOpen: function () {
        closeAllBookSelects();
        setTimePickerOpen(false);
        setGuestsPickerOpen(false);
        if (eventDatePicker && eventDatePicker.isOpen) eventDatePicker.close();
      },
      onChange: function (dates) {
        if (!dates[0]) return;
        hidden.value = madridYMD(dates[0]);
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        refreshBookingSlots();
      }
    });
    if (selected) bookDatePicker.setDate(selected, false);
  }

  function initEventDatePicker() {
    const visible = $('#eventos-fecha');
    const hidden = $('#eventos-book-date');
    if (!visible || !hidden || typeof flatpickr !== 'function') return;
    if (eventDatePicker) {
      eventDatePicker.destroy();
      eventDatePicker = null;
    }
    visible.placeholder = t('bookDatePlaceholder');
    eventDatePicker = flatpickr(visible, {
      locale: lang === 'es' && window.flatpickr && flatpickr.l10ns && flatpickr.l10ns.es ? 'es' : 'default',
      dateFormat: 'd/m/Y',
      minDate: 'today',
      disableMobile: true,
      clickOpens: false,
      monthSelectorType: 'static',
      appendTo: document.body,
      position: function (instance) {
        const input = instance._input.getBoundingClientRect();
        const cal = instance.calendarContainer;
        cal.style.width = '';
        cal.style.right = 'auto';
        const width = cal.offsetWidth;
        const gap = 6;
        const height = cal.offsetHeight;
        const spaceBelow = window.innerHeight - input.bottom;
        const above = spaceBelow < height + gap && input.top > height + gap;
        const left = Math.max(8, Math.min(input.left, window.innerWidth - width - 8));
        cal.style.left = (left + window.scrollX) + 'px';
        cal.style.top = (window.scrollY + (above ? input.top - height - gap : input.bottom + gap)) + 'px';
      },
      onOpen: function () {
        closeAllBookSelects();
        setTimePickerOpen(false);
        setGuestsPickerOpen(false);
        if (bookDatePicker && bookDatePicker.isOpen) bookDatePicker.close();
      },
      onChange: function (dates) {
        if (!dates[0]) return;
        hidden.value = madridYMD(dates[0]);
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  function initBooking() {
    const form = $('#booking-form');
    const date = $('#book-date');
    if (!form || !date) return;

    if (!date.value) date.value = nextOpenYmd();
    initBookDatePicker();
    initEventDatePicker();
    on('#fecha-reserva', 'click', () => {
      if (!bookDatePicker) return;
      if (bookDatePicker.isOpen) bookDatePicker.close();
      else bookDatePicker.open();
    });
    on('#eventos-fecha', 'click', () => {
      if (!eventDatePicker) return;
      if (eventDatePicker.isOpen) eventDatePicker.close();
      else eventDatePicker.open();
    });
    fillGuestSelect();
    refreshBookingSlots();
    initBookSelects();
    initTimeWheel();
    initGuestWheel();

    date.addEventListener('change', refreshBookingSlots);
    bindBookingPhoneInputs();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const feedback = $('#book-feedback');
      const name = $('#book-name').value.trim();
      const prefix = phoneDigits($('#book-prefix').value).slice(0, 4);
      const local = phoneDigits($('#book-phone').value);
      const ymd = $('#book-date').value;
      const hour = $('#book-time').value;
      const guests = $('#book-guests').value;
      const area = $('#book-area').value;
      const notes = $('#book-notes').value.trim();
      const closed = !dayRanges(weekdayOfYmd(ymd)).length;

      if (!name || !prefix || !local || !ymd || !hour || !guests || closed) {
        if (closed) {
          feedback.hidden = false;
          feedback.textContent = t('bookClosed');
        } else if (feedback) {
          feedback.hidden = true;
        }
        return;
      }

      feedback.hidden = true;
      const areaLabel = t({
        any: 'bookAreaAny', salon: 'bookAreaSalon', terrace: 'bookAreaTerrace', bar: 'bookAreaBar'
      }[area] || 'bookAreaAny');
      const intro = t('bookWaIntro', { name: name });
      const phoneDisplay = formatBookingPhone(prefix, local);
      const rows = [
        [t('bookName'), name],
        [t('bookDate'), formatBookDate(ymd)],
        [t('bookTime'), hour],
        [t('bookGuests'), guestLabel(Number(guests))],
        [t('bookArea'), areaLabel],
        [t('bookPhone'), phoneDisplay]
      ];
      if (notes) rows.push([t('bookWaNote'), notes]);
      const textoWhatsApp = intro + '\n\n' + rows.map((row) => '*' + row[0] + ':* ' + row[1]).join('\n') + '\n';
      const html = '<p>' + esc(intro) + '</p>' + rows.map((row) =>
        '<p><strong class="font-semibold text-stone-900 dark:text-emerald-50">' + esc(row[0]) + ':</strong> ' + esc(row[1]) + '</p>'
      ).join('');
      window.__visiwebBookingPreview = { html: html, textoWhatsApp: textoWhatsApp, phone: prefix + local };
      document.dispatchEvent(new CustomEvent('open-reserve-options'));
    });

    on('#booking-another', 'click', resetBookingForm);
    on('#booking-modal-backdrop', 'click', resetBookingForm);
    on('#booking-whatsapp', 'click', (event) => {
      event.preventDefault();
      const url = whatsappSendUrl(bookingWaPhone, bookingWaText);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) window.location.href = url;
      else window.open(url, '_blank', 'noopener');
    });
    document.addEventListener('keydown', (event) => {
      const modal = $('#booking-modal');
      if (event.key === 'Escape' && modal && !modal.hidden) resetBookingForm();
    });
  }

  function phoneDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatBookingPhone(prefix, localDigits) {
    return '+' + prefix + (localDigits ? ' ' + localDigits : '');
  }

  function bindDigitsInput(input, maxDigits, format) {
    if (!input || input.dataset.bound) return;
    input.dataset.bound = '1';
    input.addEventListener('input', () => {
      const caret = input.selectionStart || 0;
      const before = phoneDigits(input.value.slice(0, caret)).length;
      const raw = phoneDigits(input.value);
      const next = format(maxDigits > 0 ? raw.slice(0, maxDigits) : raw);
      input.value = next;
      let pos = 0;
      let seen = 0;
      while (pos < next.length && seen < before) {
        if (/\d/.test(next.charAt(pos))) seen += 1;
        pos += 1;
      }
      input.setSelectionRange(pos, pos);
    });
  }

  function bindBookingPhoneInputs() {
    bindDigitsInput($('#book-prefix'), 4, (digits) => digits);
    bindDigitsInput($('#book-phone'), 0, (digits) => digits);
  }

  function cleanWaPhone(raw) {
    let digits = String(raw || '').replace(/\D/g, '');
    if (digits.startsWith('3434') && digits.length > 11) digits = digits.slice(2);
    return digits;
  }

  function whatsappSendUrl(phone, text) {
    const mensajeCodificado = encodeURIComponent(text || '');
    const telefonoLimpio = cleanWaPhone(phone);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile
      ? 'whatsapp://send?phone=' + telefonoLimpio + '&text=' + mensajeCodificado
      : 'https://web.whatsapp.com/send?phone=' + telefonoLimpio + '&text=' + mensajeCodificado;
  }

  let bookingWaPhone = '';
  let bookingWaText = '';

  function openBookingModal(html, textoWhatsApp, waPhone) {
    const modal = $('#booking-modal');
    const body = $('#booking-wa-message');
    const stamp = $('#booking-wa-stamp');
    const wa = $('#booking-whatsapp');
    if (!modal || !body) return;
    body.innerHTML = html;
    if (stamp) {
      const now = new Date();
      stamp.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }
    bookingWaPhone = cleanWaPhone(waPhone);
    bookingWaText = textoWhatsApp || '';
    if (wa) wa.href = whatsappSendUrl(bookingWaPhone, bookingWaText);
    if (bookDatePicker && bookDatePicker.isOpen) bookDatePicker.close();
    if (eventDatePicker && eventDatePicker.isOpen) eventDatePicker.close();
    setTimePickerOpen(false);
    setGuestsPickerOpen(false);
    closeAllBookSelects();
    modal.hidden = false;
    document.body.classList.add('booking-modal-open');
    const closeBtn = $('#booking-another');
    if (closeBtn) closeBtn.focus();
  }

  window.openBookingPreview = function () {
    const preview = window.__visiwebBookingPreview;
    if (!preview) return false;
    openBookingModal(preview.html, preview.textoWhatsApp, preview.phone);
    window.__visiwebBookingPreview = null;
    return true;
  };

  function resetBookingForm() {
    const form = $('#booking-form');
    const date = $('#book-date');
    const modal = $('#booking-modal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('booking-modal-open');
    if (!form || !date) return;
    form.hidden = false;
    form.reset();
    date.min = madridYMD(new Date());
    date.value = nextOpenYmd();
    if (bookDatePicker) bookDatePicker.setDate(ymdToDate(date.value), false);
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
    const feedback = $('#book-feedback');
    if (feedback) feedback.hidden = true;
    refreshBookingSlots();
    applyI18n();
    applyI18nBookingOptions();
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.focus();
    form.dispatchEvent(new Event('input', { bubbles: true }));
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
    const siteName = $('#site-name');
    if (siteName) siteName.textContent = D.business.name;

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
      const value = t(node.dataset.i18n);
      if (value) node.textContent = value;
    });
    document.querySelectorAll('a[data-i18n="mesaLink"], a[data-view="mesa"]').forEach((link) => {
      if (window.VISIWEB_RESTAURANT_SLUG) {
        link.setAttribute('href', '/r/' + window.VISIWEB_RESTAURANT_SLUG + '/mesa' + (lang === 'en' ? '?lang=en' : ''));
        return;
      }
      if (lang === 'en') {
        var href = (link.getAttribute('href') || 'mesa/').split('?')[0];
        link.setAttribute('href', href + '?lang=en');
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
    });
    ['aviso-legal.html', 'politica-privacidad.html', 'politica-cookies.html'].forEach((file) => {
      document.querySelectorAll('a[href="' + file + '"], a[href="/' + file + '"], a[href^="' + file + '?"], a[href^="/' + file + '?"]').forEach((link) => {
        link.setAttribute('href', '/' + file + (lang === 'en' ? '?lang=en' : ''));
      });
    });
    pinChromeLabels();
    actualizarBotonIdioma();
    document.documentElement.dispatchEvent(new Event('langchange'));
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
    if (typeof a !== 'string' || typeof b !== 'string' || !a || !b || a === b) return 0;
    if (a.length > 48 || b.length > 48) return 0;
    const cs = getComputedStyle(node);
    const extra = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    return Math.ceil(Math.max(labelWidth(node, a), labelWidth(node, b)) + extra);
  }

  function pinChromeLabels() {
    const groups = new Map();
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      if (node.childElementCount) return;
      if (node.closest('p, h1, h2, h3, h4, li, dd, dt, label')) return;
      const key = node.dataset.i18n;
      const inChrome = node.closest('header, footer, nav')
        || node.classList.contains('btn-primary')
        || node.classList.contains('btn-outline')
        || node.classList.contains('tab');
      if (!inChrome) return;
      const width = pinBilingual(node, D.i18n.es[key], D.i18n.en[key]);
      if (!width) return;
      const parent = node.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push({ node, width });
    });
    groups.forEach((items, parent) => {
      if (!parent) return;
      const styles = getComputedStyle(parent);
      const gap = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 0;
      const sum = items.reduce((total, item) => total + item.width, 0) + gap * Math.max(0, items.length - 1);
      if (sum > parent.clientWidth) {
        items.forEach((item) => { item.node.style.minWidth = ''; });
        return;
      }
      items.forEach((item) => { item.node.style.minWidth = item.width + 'px'; });
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
    renderEventos();
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
    syncStickyOffset();
    if (window.VisiwebDesign && window.VISIWEB_DESIGN) window.VisiwebDesign.mountWeb(D, lang);
  }

  function setLang(next) {
    if (!D.i18n[next] || next === lang) return;
    const y = window.scrollY;
    lang = next;
    writeStore(STORE_LANG, next);
    renderAll();
    applyHash({ quiet: true });
    window.scrollTo(0, y);
  }

  function initSocials() {
    const sheet = document.getElementById('socials-sheet');
    const sheetClose = document.getElementById('socials-close');
    const opener = document.getElementById('open-socials');
    if (!sheet) return;
    let socialsScrollY = 0;

    function placeSocialsSheet() {
      const media = document.getElementById('hero-media');
      const nav = document.querySelector('.site-nav');
      const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
      let top = media ? media.getBoundingClientRect().bottom : navBottom;
      if (top < navBottom) top = navBottom;
      document.documentElement.style.setProperty('--socials-top', top + 'px');
    }

    openSocialsSheet = function () {
      const inicio = document.querySelector('[data-page="inicio"]');
      if (inicio && inicio.hidden) showPage('inicio', { quiet: true });
      const media = document.getElementById('hero-media');
      const nav = document.querySelector('.site-nav');
      const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
      if (media) {
        const rect = media.getBoundingClientRect();
        const desiredTop = navBottom + 8;
        if (rect.top < desiredTop - 4 || rect.bottom > window.innerHeight - 220) {
          window.scrollTo(0, Math.max(0, window.scrollY + rect.top - desiredTop));
        }
      }
      placeSocialsSheet();
      sheet.hidden = false;
      socialsScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + socialsScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.documentElement.classList.add('socials-open');
      placeSocialsSheet();
      if (sheetClose) sheetClose.focus();
    };

    function releaseSocialsPage() {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, socialsScrollY);
    }

    closeSocialsSheet = function (opts) {
      if (sheet.hidden) return;
      sheet.hidden = true;
      document.documentElement.classList.remove('socials-open');
      releaseSocialsPage();
      if (!(opts && opts.keepHash) && decodeURIComponent(window.location.hash.replace('#', '')) === 'redes') {
        history.replaceState(null, '', window.location.pathname + window.location.search + '#inicio');
      }
    };

    if (opener) opener.addEventListener('click', openSocialsSheet);
    if (sheetClose) sheetClose.addEventListener('click', () => closeSocialsSheet());
    document.querySelectorAll('[data-nav]').forEach((link) => {
      link.addEventListener('click', () => closeSocialsSheet({ keepHash: true }));
    });
    window.addEventListener('resize', () => {
      if (!sheet.hidden) placeSocialsSheet();
    });
    window.addEventListener('pagehide', () => closeSocialsSheet({ keepHash: true }));
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) closeSocialsSheet({ keepHash: true });
    });
    function stopPageScroll(event) {
      if (sheet.hidden) return;
      event.preventDefault();
    }
    window.addEventListener('wheel', stopPageScroll, { passive: false });
    window.addEventListener('touchmove', stopPageScroll, { passive: false });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || sheet.hidden) return;
      event.preventDefault();
      closeSocialsSheet();
    });
  }

  function syncStickyOffset() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    document.documentElement.style.setProperty('--site-nav-h', nav.getBoundingClientRect().height + 'px');
  }

  function blocksPageSwipe(target) {
    const node = target && target.nodeType === 1 ? target : target && target.parentElement;
    if (!node || !node.closest) return false;
    if (node.closest('[data-no-swipe], .overflow-x-auto')) return true;
    let el = node;
    while (el && el !== document.documentElement) {
      const overflowX = window.getComputedStyle(el).overflowX;
      if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) return true;
      el = el.parentElement;
    }
    return false;
  }

  function initPageSwipe() {
    const MIN = 50;
    let tracking = false;
    let startX = 0;
    let startY = 0;

    document.addEventListener('touchstart', (event) => {
      tracking = false;
      if (window.innerWidth >= 768 || event.touches.length !== 1) return;
      if (blocksPageSwipe(event.target)) return;
      tracking = true;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
      if (!tracking) return;
      tracking = false;
      if (window.innerWidth >= 768) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.5 || Math.abs(deltaX) <= MIN) return;
      const visible = document.querySelector('[data-page]:not([hidden])');
      const index = PAGES.indexOf(visible ? visible.dataset.page : 'inicio');
      if (index < 0) return;
      const next = deltaX < 0 ? index + 1 : index - 1;
      if (next < 0 || next >= PAGES.length) return;
      const id = PAGES[next];
      hashNavOpts = { smooth: true };
      if (window.location.hash === '#' + id) applyHash();
      else window.location.hash = id;
    }, { passive: true });

    document.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });
  }

  /* --------------------------------- Arranque ------------------------------ */
  initEventos();
  initSocials();
  bindDemoActions();
  syncStickyOffset();
  window.addEventListener('resize', syncStickyOffset);
  window.addEventListener('resize', placeAllergenChip);
  window.addEventListener('orientationchange', placeAllergenChip);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', placeAllergenChip);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncStickyOffset);
    document.fonts.ready.then(placeAllergenChip);
  }
  if ('ResizeObserver' in window) {
    const chipRow = $('#menu-chip-row');
    if (chipRow) {
      let chipFrame = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(chipFrame);
        chipFrame = requestAnimationFrame(placeAllergenChip);
      }).observe(chipRow);
    }
  }
  renderAll();
  initTabs();
  initCategoryBarReveal();
  initGbpTabs();
  window.cambiarPestanaGoogle = cambiarPestanaGoogle;
    initAllergenFilters();
  initBooking();
  applyHash({ quiet: true });
  initAllergenDialog();

  const langToggle = document.getElementById('btn-lang-toggle');
  if (langToggle) langToggle.addEventListener('click', toggleIdioma);

  const backHome = document.getElementById('back-home');
  if (backHome) {
    backHome.addEventListener('click', (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('hashchange', () => applyHash());
  initPageSwipe();
  window.setInterval(() => {
    renderStatus();
    renderToday();
    refreshBookingSlots();
  }, 60000);
  window.visiwebRepaint = renderAll;

  function bothLive(text) {
    var value = text || '';
    return { es: value, en: value };
  }

  function moneyLive(value) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    return {
      n: n,
      es: n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
      en: '€' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  }

  function slugifyCat(text) {
    var value = String(text || 'carta').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    value = value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return value || 'carta';
  }

  function syncEventosNav() {
    eventosOn = !!(D.eventos && D.eventos.activo);
    PAGES = eventosOn
      ? ['inicio', 'carta', 'local', 'eventos', 'reservas']
      : ['inicio', 'carta', 'local', 'reservas'];
    var link = document.getElementById('nav-eventos');
    var row = document.querySelector('.site-nav-links');
    var page = document.querySelector('[data-page="eventos"]');
    if (!eventosOn) {
      if (link) link.hidden = true;
      if (page) page.hidden = true;
      if (row) row.classList.remove('has-eventos');
      pauseEventosHero();
      var visible = document.querySelector('[data-page]:not([hidden])');
      if (visible && visible.dataset.page === 'eventos') showPage('inicio', { quiet: true });
    } else {
      if (link) link.hidden = false;
      if (row) row.classList.add('has-eventos');
    }
  }

  function applyAccent(color) {
    if (!color || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return;
    var style = document.getElementById('vw-live-accent');
    if (!style) {
      style = document.createElement('style');
      style.id = 'vw-live-accent';
      document.head.appendChild(style);
    }
    style.textContent =
      ':root{--vw-accent:' + color + '}' +
      '.bg-stone-900,.bg-neutral-900,button.bg-stone-900,a.bg-stone-900{background-color:var(--vw-accent)!important}' +
      '.text-stone-900 .font-serif, .site-nav-link[aria-current="page"]{color:var(--vw-accent)}' +
      '.ring-stone-900{--tw-ring-color:var(--vw-accent)}';
  }

  function applyRestaurantData(row) {
    if (!row || typeof row !== 'object') return;
    var categories = Array.isArray(row.categories) ? row.categories : (Array.isArray(row.menu) ? row.menu : []);
    var usedAnchors = {};
    var featured = [];
    var menu = categories.map(function (category, index) {
      var name = category.name || (category.name && category.name.es) || 'Carta';
      if (typeof name === 'object') name = name.es || name.en || 'Carta';
      var anchor = slugifyCat(name);
      if (usedAnchors[anchor]) anchor = anchor + '-' + (index + 1);
      usedAnchors[anchor] = true;
      var items = (category.items || category.menu_items || []).map(function (item, itemIndex) {
        var itemName = item.name;
        if (itemName && typeof itemName === 'object') itemName = itemName.es || itemName.en || '';
        itemName = itemName || 'Plato';
        var desc = item.description || item.desc || '';
        if (desc && typeof desc === 'object') desc = desc.es || desc.en || '';
        var price = moneyLive(item.price != null ? item.price : item.priceValue);
        var id = String(item.id || ('item-' + index + '-' + itemIndex));
        if (item.featured || item.is_featured) featured.push(id);
        return {
          id: id,
          name: bothLive(itemName),
          desc: bothLive(desc),
          price: price.es,
          priceEn: price.en,
          priceValue: price.n,
          allergens: Array.isArray(item.allergens) ? item.allergens : [],
          tags: Array.isArray(item.tags) ? item.tags : [],
          featured: !!(item.featured || item.is_featured),
          image: item.image_url || item.image || item.preview || null
        };
      });
      return {
        id: String(category.id || ('cat-' + index)),
        anchor: anchor,
        name: bothLive(name),
        desc: bothLive(category.subtitle || category.desc || ''),
        items: items
      };
    });

    var phone = row.phone || '';
    var address = row.address || '';
    var name = row.name || D.business.name || '';
    var tagline = row.tagline || '';
    D.business.name = name;
    D.business.type = bothLive(tagline);
    D.business.phone = phone;
    D.business.phoneDisplay = phone;
    D.business.whatsapp = String(row.whatsapp || '').replace(/\D/g, '');
    D.business.instagram = row.instagram || '';
    D.business.addressLine = address;
    D.business.address = {
      street: bothLive(address),
      postalCode: (D.business.address && D.business.address.postalCode) || '',
      city: (D.business.address && D.business.address.city) || '',
      region: (D.business.address && D.business.address.region) || '',
      country: 'ES'
    };
    if (row.cover_image_url || row.cover) {
      var cover = row.cover_image_url || row.cover;
      D.images.hero = cover;
      D.images.facade = cover;
    }
    if (row.schedule) {
      D.hours = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      D.scheduleText = row.schedule;
    } else if (row.hours) {
      D.hours = row.hours;
      D.scheduleText = row.scheduleText || '';
    }
    if (menu.length) {
      D.menu = menu;
      D.featured = featured;
    }
    if (row.primary_color || row.accent || (row.design_config && row.design_config.accent) || (row.design && row.design.accent)) {
      applyAccent(row.primary_color || row.accent || (row.design_config && row.design_config.accent) || (row.design && row.design.accent));
    }
    ['es', 'en'].forEach(function (lng) {
      if (!D.i18n || !D.i18n[lng]) return;
      var strings = D.i18n[lng];
      var title = name + (tagline ? ' · ' + tagline : '');
      strings.metaTitle = title;
      strings.metaDescription = row.description || tagline || name || strings.metaDescription;
      if (row.i18n && row.i18n[lng] && typeof row.i18n[lng] === 'object') {
        var custom = row.i18n[lng];
        ['heroEyebrow', 'heroTitle', 'heroSubtitle', 'heroKicker'].forEach(function (key) {
          if (typeof custom[key] === 'string' && custom[key].trim()) strings[key] = custom[key].trim();
        });
      }
    });
    if (document.title !== undefined) document.title = name + (tagline ? ' · ' + tagline : '');
    if (D.eventos) {
      var planOk = String(row.plan_tier || '') === '790' || String(row.plan_tier || '') === 'digitalizacion-total' || row.eventos_activo === true || (row.eventos && row.eventos.activo);
      var labels = (row.design_config && row.design_config.labels) || (row.design && row.design.labels) || {};
      var evCfg = (row.design_config && row.design_config.eventos) || (row.design && row.design.eventos) || row.eventos || {};
      if (typeof row.eventos_activo === 'boolean') D.eventos.activo = row.eventos_activo;
      else if (evCfg && typeof evCfg.activo === 'boolean') D.eventos.activo = evCfg.activo;
      else D.eventos.activo = planOk && (labels.vw_events === '1' || !!evCfg.activo);
      if (evCfg.tipoVideo === 'salon' || evCfg.tipoVideo === 'terraza' || evCfg.tipoVideo === 'ninguno') {
        D.eventos.tipoVideo = evCfg.tipoVideo;
      }
      ['eyebrow', 'title', 'subtitle', 'lead', 'cta', 'readyTitle', 'readyCta'].forEach(function (key) {
        if (typeof evCfg[key] === 'string' && evCfg[key].trim()) D.eventos[key] = bothLive(evCfg[key]);
      });
      D.eventos.phone = phone || D.eventos.phone;
      D.eventos.phoneDisplay = phone || D.eventos.phoneDisplay;
      D.eventos.whatsapp = String(row.whatsapp || D.eventos.whatsapp || '').replace(/\D/g, '');
    }
    syncEventosNav();
    renderAll();
  }

  function readRestaurantPayload(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.RESTAURANT_DATA && typeof data.RESTAURANT_DATA === 'object') return data.RESTAURANT_DATA;
    if (data.type === 'RESTAURANT_DATA' && data.payload && typeof data.payload === 'object') return data.payload;
    if (data.type === 'RESTAURANT_DATA' && data.data && typeof data.data === 'object') return data.data;
    return null;
  }

  if (window.parent !== window) {
    window.addEventListener('message', function (event) {
      if (event.origin !== location.origin) return;
      var payload = readRestaurantPayload(event.data);
      if (!payload) return;
      applyRestaurantData(payload);
    });
  }

  window.visiwebApplyRestaurantData = applyRestaurantData;

  if (document.documentElement.classList.contains('vw-editor') && window.parent !== window) {
    window.parent.postMessage({ type: 'visiweb-ready', page: 'web' }, location.origin);
  }
})();
