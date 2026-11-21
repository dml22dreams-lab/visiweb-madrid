/* Personalizacion visual compartida por /panel, /r/:slug y /r/:slug/mesa. */
(function () {
  'use strict';

  var THEMES = {
    clasico: { bg: '#FAF9F6', card: '#FFFdf8', ink: '#1c1917', muted: '#78716c' },
    blanco: { bg: '#FFFFFF', card: '#F5F4F0', ink: '#171717', muted: '#57534e' },
    oscuro: { bg: '#0F0F10', card: '#1A1A1D', ink: '#F5F5F4', muted: '#A8A29E' },
    mediterraneo: { bg: '#F6EFE4', card: '#FFFBF5', ink: '#3F2E1E', muted: '#8A6A45' }
  };
  var FONTS = ['serif_clasica', 'moderna_sans', 'sans_moderna', 'geometrica', 'editorial', 'condensada', 'artesanal'];
  var SHAPES = ['redondeado', 'equilibrado', 'recto'];
  var HEROES = ['panoramica', 'dividida', 'logo_centrado', 'pantalla_completa'];
  var DISHES = ['lista_foto', 'tarjetas_grandes', 'solo_texto'];
  var TABS = ['pildoras', 'subrayado', 'bloques'];
  var BLOCKS = ['carta', 'menu_dia', 'sugerencias', 'local', 'resenas', 'horarios', 'reserva'];
  var DAYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
  var DEFAULT_ACCENT = '#1c1917';

  function blank() {
    return {
      theme: 'clasico',
      fonts: 'serif_clasica',
      shapes: 'redondeado',
      accent: DEFAULT_ACCENT,
      palette: '',
      hero: 'panoramica',
      hero_actions: {
        call: true,
        whatsapp: false,
        maps: false,
        book: true,
        menu: false,
        open_badge: true,
        google_rating: false
      },
      blocks: BLOCKS.map(function (id) {
        return { id: id, visible: id !== 'menu_dia' };
      }),
      daily_menu_enabled: false,
      dishes: 'lista_foto',
      tabs: 'pildoras',
      mesa: {
        search: true,
        allergens: true,
        selection: true,
        language: true,
        prices: true,
        tags: true
      },
      colors: blankColors(),
      blockColors: {},
      labels: {},
      footerHidden: false,
      elements: {}
    };
  }

  var ELEMENT_FONTS = {
    serif_clasica: '"Cormorant Garamond", Georgia, serif',
    sans_moderna: 'Inter, ui-sans-serif, sans-serif',
    geometrica: 'Outfit, Inter, sans-serif',
    editorial: 'Fraunces, Georgia, serif',
    condensada: '"Barlow Condensed", Impact, sans-serif',
    artesanal: 'Caveat, "Segoe Script", cursive'
  };

  var COLOR_KEYS = ['pageBg', 'cardBg', 'textPrimary', 'textSecondary', 'borderColor', 'buttonBg', 'buttonText', 'pillActiveBg', 'pillActiveText', 'badgeBg', 'badgeText', 'priceColor'];
  var BLOCK_COLOR_KEYS = ['blockBg', 'buttonBg', 'buttonText', 'pillActiveBg', 'pillActiveText', 'badgeBg', 'badgeText', 'priceColor'];

  function blankColors() {
    return {
      pageBg: '',
      cardBg: '',
      textPrimary: '',
      textSecondary: '',
      borderColor: '',
      buttonBg: '',
      buttonText: '',
      pillActiveBg: '',
      pillActiveText: '',
      badgeBg: '',
      badgeText: '',
      priceColor: ''
    };
  }

  function themeColors(theme, accent) {
    var tone = THEMES[theme] || THEMES.clasico;
    var ink = onInk(accent || DEFAULT_ACCENT);
    return {
      pageBg: tone.bg,
      cardBg: tone.card,
      textPrimary: tone.ink,
      textSecondary: tone.muted,
      borderColor: theme === 'oscuro' ? '#2e2e32' : '#e7e5e4',
      buttonBg: accent || DEFAULT_ACCENT,
      buttonText: ink,
      pillActiveBg: accent || DEFAULT_ACCENT,
      pillActiveText: ink,
      badgeBg: theme === 'oscuro' ? '#2a2a2e' : '#f5f5f4',
      badgeText: theme === 'oscuro' ? '#f5f5f4' : '#44403c',
      priceColor: tone.ink
    };
  }

  function hexOrEmpty(value) {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '';
  }

  function oneOf(value, list, fallback) {
    return list.indexOf(value) >= 0 ? value : fallback;
  }

  function merge(raw) {
    var base = blank();
    var src = raw && typeof raw === 'object' ? raw : {};
    base.theme = oneOf(src.theme, Object.keys(THEMES), base.theme);
    base.fonts = oneOf(src.fonts, FONTS, base.fonts);
    base.shapes = oneOf(src.shapes, SHAPES, base.shapes);
    base.hero = oneOf(src.hero, HEROES, base.hero);
    base.dishes = oneOf(src.dishes, DISHES, base.dishes);
    base.tabs = oneOf(src.tabs, TABS, base.tabs);
    if (typeof src.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(src.accent)) base.accent = src.accent;
    if (typeof src.palette === 'string') base.palette = src.palette;
    if (typeof src.daily_menu_enabled === 'boolean') base.daily_menu_enabled = src.daily_menu_enabled;
    if (src.hero_actions) {
      Object.keys(base.hero_actions).forEach(function (key) {
        if (typeof src.hero_actions[key] === 'boolean') base.hero_actions[key] = src.hero_actions[key];
      });
    }
    if (src.mesa) {
      Object.keys(base.mesa).forEach(function (key) {
        if (typeof src.mesa[key] === 'boolean') base.mesa[key] = src.mesa[key];
      });
    }
    if (Array.isArray(src.blocks)) {
      var seen = {};
      var next = [];
      src.blocks.forEach(function (block) {
        if (!block || BLOCKS.indexOf(block.id) < 0 || seen[block.id]) return;
        seen[block.id] = true;
        next.push({ id: block.id, visible: block.visible !== false });
      });
      BLOCKS.forEach(function (id) {
        if (!seen[id]) next.push({ id: id, visible: id !== 'menu_dia' });
      });
      base.blocks = next;
    }
    if (src.colors) {
      COLOR_KEYS.forEach(function (key) {
        base.colors[key] = hexOrEmpty(src.colors[key]);
      });
    }
    if (src.blockColors && typeof src.blockColors === 'object') {
      Object.keys(src.blockColors).forEach(function (id) {
        var from = src.blockColors[id];
        if (!from || typeof from !== 'object') return;
        base.blockColors[id] = {};
        BLOCK_COLOR_KEYS.forEach(function (key) {
          base.blockColors[id][key] = hexOrEmpty(from[key]);
        });
      });
    }
    if (src.labels && typeof src.labels === 'object') {
      Object.keys(src.labels).forEach(function (key) {
        if (typeof src.labels[key] === 'string') base.labels[key] = src.labels[key].slice(0, 80);
      });
    }
    if (typeof src.footerHidden === 'boolean') base.footerHidden = src.footerHidden;
    if (src.elements && typeof src.elements === 'object') {
      Object.keys(src.elements).forEach(function (id) {
        if (!/^[a-z0-9:_-]{1,80}$/i.test(id)) return;
        var from = src.elements[id];
        if (!from || typeof from !== 'object') return;
        var item = {};
        if (typeof from.text === 'string') item.text = from.text.slice(0, 500);
        if (typeof from.hidden === 'boolean') item.hidden = from.hidden;
        if (ELEMENT_FONTS[from.font]) item.font = from.font;
        if (typeof from.size === 'number' && from.size >= 8 && from.size <= 120) item.size = from.size;
        ['bold', 'italic', 'upper'].forEach(function (key) {
          if (typeof from[key] === 'boolean') item[key] = from[key];
        });
        if (['left', 'center', 'right'].indexOf(from.align) >= 0) item.align = from.align;
        ['color', 'bg', 'border'].forEach(function (key) {
          if (hexOrEmpty(from[key])) item[key] = hexOrEmpty(from[key]);
        });
        ['radius', 'pad', 'height'].forEach(function (key) {
          if (typeof from[key] === 'number' && from[key] >= 0 && from[key] <= 800) item[key] = from[key];
        });
        if (from.fit === 'cover' || from.fit === 'contain') item.fit = from.fit;
        if (typeof from.src === 'string' && from.src.length < 500) item.src = from.src;
        if (typeof from.href === 'string' && from.href.length < 400) item.href = from.href;
        if (['tel', 'whatsapp', 'maps', 'section', 'url'].indexOf(from.action) >= 0) item.action = from.action;
        base.elements[id] = item;
      });
    }
    return base;
  }

  function resolveColors(design) {
    var colors = themeColors(design.theme, design.accent);
    COLOR_KEYS.forEach(function (key) {
      if (design.colors && design.colors[key]) colors[key] = design.colors[key];
    });
    return colors;
  }

  function blankDaily() {
    return { price: '', primeros: '', segundos: '', incluido: '', days: ['mar', 'mie', 'jue', 'vie'] };
  }

  function mergeDaily(raw) {
    var base = blankDaily();
    if (!raw || typeof raw !== 'object') return base;
    ['price', 'primeros', 'segundos', 'incluido'].forEach(function (key) {
      if (typeof raw[key] === 'string') base[key] = raw[key];
    });
    if (Array.isArray(raw.days)) {
      base.days = raw.days.filter(function (day) { return DAYS.indexOf(day) >= 0; });
    }
    return base;
  }

  function onInk(hex) {
    var n = String(hex || '').replace('#', '');
    if (n.length !== 6) return '#ffffff';
    var y = (parseInt(n.slice(0, 2), 16) * 299 + parseInt(n.slice(2, 4), 16) * 587 + parseInt(n.slice(4, 6), 16) * 114) / 1000;
    return y > 160 ? '#171717' : '#ffffff';
  }

  function ensureFonts(fonts) {
    var id = 'vw-font-link';
    var current = document.getElementById(id);
    var href = fonts === 'moderna_sans' || fonts === 'sans_moderna' || fonts === 'geometrica'
      ? 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap'
      : fonts === 'artesanal' || fonts === 'editorial' || fonts === 'condensada'
        ? 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700&family=Caveat:wght@500;700&family=Fraunces:ital,opsz,wght@0,9..144,560;1,9..144,560&display=swap'
        : '';
    if (!href) {
      if (current) current.remove();
      return;
    }
    if (current && current.getAttribute('href') === href) return;
    if (current) current.remove();
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function paint(raw) {
    var design = merge(raw);
    window.VISIWEB_DESIGN = design;
    var root = document.documentElement;
    var colors = resolveColors(design);
    root.dataset.vwTheme = design.theme;
    root.dataset.vwFonts = design.fonts;
    root.dataset.vwShape = design.shapes;
    root.dataset.vwHero = design.hero;
    root.dataset.vwDishes = design.dishes;
    root.dataset.vwTabs = design.tabs;
    root.dataset.vwAccent = colors.buttonBg.toLowerCase() === DEFAULT_ACCENT ? 'default' : 'custom';
    root.style.setProperty('--vw-accent', colors.buttonBg);
    root.style.setProperty('--vw-on', colors.buttonText);
    root.style.setProperty('--vw-bg', colors.pageBg);
    root.style.setProperty('--vw-card', colors.cardBg);
    root.style.setProperty('--vw-ink', colors.textPrimary);
    root.style.setProperty('--vw-muted', colors.textSecondary);
    root.style.setProperty('--vw-line', colors.borderColor);
    root.style.setProperty('--vw-button', colors.buttonBg);
    root.style.setProperty('--vw-button-text', colors.buttonText);
    root.style.setProperty('--vw-pill', colors.pillActiveBg);
    root.style.setProperty('--vw-pill-text', colors.pillActiveText);
    root.style.setProperty('--vw-badge', colors.badgeBg);
    root.style.setProperty('--vw-badge-text', colors.badgeText);
    root.style.setProperty('--vw-price', colors.priceColor);
    ensureFonts(design.fonts);
    return design;
  }

  function lines(text) {
    return String(text || '').split(/\n+/).map(function (line) { return line.trim(); }).filter(Boolean);
  }

  function dayLabel(id, en) {
    var es = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };
    var enMap = { lun: 'Monday', mar: 'Tuesday', mie: 'Wednesday', jue: 'Thursday', vie: 'Friday', sab: 'Saturday', dom: 'Sunday' };
    return (en ? enMap : es)[id] || id;
  }

  function blockOn(design, id) {
    var found = design.blocks.filter(function (block) { return block.id === id; })[0];
    return !found || found.visible !== false;
  }

  function sameOrder(design) {
    return design.blocks.map(function (block) { return block.id; }).join('|') === BLOCKS.join('|');
  }

  function ensureDaily() {
    var node = document.getElementById('vw-daily');
    if (node) return node;
    node = document.createElement('section');
    node.id = 'vw-daily';
    node.className = 'vw-daily';
    var hero = document.getElementById('inicio-hero');
    if (hero && hero.parentNode) hero.parentNode.insertBefore(node, hero.nextSibling);
    else {
      var main = document.getElementById('contenido');
      if (main) main.appendChild(node);
    }
    return node;
  }

  function fillDaily(node, menu, en) {
    var primeros = lines(menu.primeros);
    var segundos = lines(menu.segundos);
    var days = (menu.days || []).map(function (day) { return dayLabel(day, en); }).join(', ');
    node.innerHTML =
      '<p class="vw-daily-kicker">' + (en ? 'Today' : 'Hoy') + '</p>' +
      '<div class="vw-daily-head"><h2>' + escapeHtml((window.VISIWEB_DESIGN && window.VISIWEB_DESIGN.labels && window.VISIWEB_DESIGN.labels.dailyTitle) || (en ? 'Menu of the day' : 'Menú del día')) + '</h2>' +
      (menu.price ? '<p class="vw-daily-price">' + escapeHtml(menu.price) + '</p>' : '') + '</div>' +
      (primeros.length ? '<h3>' + (en ? 'First courses' : 'Primeros') + '</h3><ul>' + primeros.map(function (line) { return '<li>' + escapeHtml(line) + '</li>'; }).join('') + '</ul>' : '') +
      (segundos.length ? '<h3>' + (en ? 'Mains' : 'Segundos') + '</h3><ul>' + segundos.map(function (line) { return '<li>' + escapeHtml(line) + '</li>'; }).join('') + '</ul>' : '') +
      (menu.incluido ? '<p class="vw-daily-note">' + escapeHtml(menu.incluido) + '</p>' : '') +
      (days ? '<p class="vw-daily-days">' + escapeHtml(days) + '</p>' : '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function nodeMap() {
    var featured = document.getElementById('featured-title');
    var reviews = document.getElementById('reviews-title');
    return {
      carta: document.querySelector('[data-page="carta"]'),
      menu_dia: ensureDaily(),
      sugerencias: featured ? featured.closest('section') : null,
      local: document.querySelector('[data-page="local"]'),
      resenas: reviews ? reviews.closest('section') : null,
      horarios: document.getElementById('horarios'),
      reserva: document.getElementById('reservas')
    };
  }

  function mountHero(design, business, reviews, slug, en) {
    var actions = design.hero_actions;
    var call = document.getElementById('header-call');
    var barCall = document.getElementById('bar-call');
    if (call) call.hidden = !actions.call;
    if (barCall) barCall.hidden = !actions.call;
    var status = document.getElementById('status');
    if (status) status.hidden = !actions.open_badge;
    document.querySelectorAll('.js-reserve-open').forEach(function (node) {
      node.hidden = !(actions.book && blockOn(design, 'reserva'));
    });
    var row = document.getElementById('vw-hero-actions');
    if (!row) {
      row = document.createElement('div');
      row.id = 'vw-hero-actions';
      var hero = document.getElementById('inicio-hero');
      var facts = document.getElementById('hero-facts');
      if (hero && facts) hero.insertBefore(row, facts);
      else if (hero) hero.appendChild(row);
    }
    if (!row) return;
    var bits = [];
    var phone = (business && business.phone) || '';
    var whatsapp = (business && business.whatsapp) || '';
    var address = (business && (business.addressLine || '')) || '';
    var keepHero = design.hero === 'panoramica' && design.theme === 'clasico' && design.fonts === 'serif_clasica' && design.shapes === 'redondeado';
    if (actions.whatsapp && whatsapp) {
      bits.push('<a href="https://wa.me/' + encodeURIComponent(whatsapp) + '" target="_blank" rel="noopener">WhatsApp</a>');
    }
    if (actions.maps && address) {
      bits.push('<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address) + '" target="_blank" rel="noopener">' + (en ? 'Directions' : 'Cómo llegar') + '</a>');
    }
    if (!keepHero && actions.book && blockOn(design, 'reserva')) {
      bits.push('<a href="#reservas">' + (en ? 'Book a table' : 'Reservar mesa') + '</a>');
    }
    if (actions.menu && slug) {
      bits.push('<a href="/r/' + encodeURIComponent(slug) + '/mesa">' + (en ? 'QR menu' : 'Ver Carta QR') + '</a>');
    }
    if (actions.google_rating) {
      var score = reviews && reviews.score ? reviews.score : '';
      bits.push('<span class="vw-rate">' + (en ? 'Google' : 'Valoración Google') + (score ? ' · ' + escapeHtml(score) : '') + '</span>');
    }
    if (!keepHero && actions.call && phone) {
      bits.push('<a href="tel:' + encodeURIComponent(phone) + '">' + (en ? 'Call' : 'Llamar') + '</a>');
    }
    row.innerHTML = bits.join('');
  }

  function mountWeb(demo, lang) {
    if (!window.VISIWEB_DESIGN || !document.getElementById('contenido')) return;
    var design = window.VISIWEB_DESIGN;
    var en = lang === 'en';
    var nodes = nodeMap();
    var root = document.documentElement;
    Object.keys(nodes).forEach(function (id) {
      if (!nodes[id]) return;
      var visible = blockOn(design, id);
      if (id === 'menu_dia') visible = visible && design.daily_menu_enabled;
      nodes[id].classList.toggle('vw-block-off', !visible);
    });
    var navFor = { carta: 'carta', local: 'local', reserva: 'reservas' };
    Object.keys(navFor).forEach(function (id) {
      var link = document.querySelector('[data-nav="' + navFor[id] + '"]');
      if (link) link.classList.toggle('vw-block-off', !blockOn(design, id));
    });
    if (nodes.menu_dia) fillDaily(nodes.menu_dia, mergeDaily(demo && demo.dailyMenu), en);
    if (sameOrder(design)) {
      delete root.dataset.vwStack;
      var hero = document.getElementById('inicio-hero');
      if (hero && hero.parentNode && nodes.menu_dia) hero.parentNode.insertBefore(nodes.menu_dia, hero.nextSibling);
    } else {
      var main = document.getElementById('contenido');
      design.blocks.forEach(function (block) {
        if (nodes[block.id]) main.appendChild(nodes[block.id]);
      });
      root.dataset.vwStack = '1';
      document.querySelectorAll('[data-page]').forEach(function (page) { page.hidden = false; });
    }
    mountHero(design, demo && demo.business, demo && demo.reviews, window.VISIWEB_RESTAURANT_SLUG || '', en);
    var footer = document.querySelector('footer');
    if (footer) footer.classList.toggle('vw-block-off', !!design.footerHidden);
    applyLabels(design);
    markElements();
  }

  function applyLabels(design) {
    var labels = design.labels || {};
    function text(selector, value) {
      if (!value) return;
      var node = document.querySelector(selector);
      if (node) node.textContent = value;
    }
    text('[data-nav="inicio"]', labels.navHome);
    text('[data-nav="carta"]', labels.navMenu);
    text('[data-nav="local"]', labels.navLocal);
    text('[data-nav="reservas"]', labels.navBook);
    text('#inicio-hero h1', labels.heroTitle);
    text('#inicio-hero .hero-sub', labels.heroSubtitle);
    text('#featured-title', labels.featuredTitle);
    text('#local h1, [data-page="local"] h1', labels.localTitle);
    text('#reviews-title', labels.reviewsTitle);
    text('#reservas h1', labels.bookTitle);
  }

  function tag(node, id, label) {
    if (!node) return;
    node.setAttribute('data-edit', id);
    node.setAttribute('data-edit-label', label);
    if (getComputedStyle(node).position === 'static') node.classList.add('vw-hit');
  }

  function plainText(node) {
    var copy = node.cloneNode(true);
    copy.querySelectorAll('svg, img, [data-el-label]').forEach(function (child) { child.remove(); });
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  function writeText(node, value) {
    var iconic = !!node.querySelector('svg, img');
    if (!iconic && node.getAttribute('data-element-kind') !== 'button') {
      node.textContent = value;
      return;
    }
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) child.textContent = '';
    });
    var label = null;
    Array.prototype.forEach.call(node.querySelectorAll('span'), function (span) {
      if (!label && !span.querySelector('svg')) label = span;
    });
    if (!label) {
      label = document.createElement('span');
      label.setAttribute('data-el-label', '');
      node.appendChild(label);
    }
    label.textContent = value;
  }

  function stamp(node, id, kind, label) {
    if (!node || node.getAttribute('data-element') === id && node.getAttribute('contenteditable') === 'true') return;
    if (!node.hasAttribute('data-default-text')) node.setAttribute('data-default-text', plainText(node));
    node.setAttribute('data-element', id);
    node.setAttribute('data-element-kind', kind);
    node.setAttribute('data-element-label', label);
  }

  function markElements() {
    var design = window.VISIWEB_DESIGN;
    if (!design || (!document.getElementById('contenido') && !document.getElementById('menu'))) return;
    var fixed = [
      ['name', 'text', 'Texto: Nombre', '#site-name'],
      ['hero-title', 'text', 'Texto: Frase principal', '#inicio-hero h1'],
      ['hero-sub', 'text', 'Texto: Subtítulo', '#inicio-hero .hero-sub'],
      ['hero-kicker', 'text', 'Texto: Antetítulo', '.hero-kicker'],
      ['status', 'text', 'Texto: Estado', '#status-text'],
      ['address', 'text', 'Texto: Dirección', '#info-address'],
      ['hours-today', 'text', 'Texto: Horario de hoy', '#info-today'],
      ['featured-title', 'text', 'Texto: Sugerencias', '#featured-title'],
      ['menu-title', 'text', 'Texto: Título de carta', '[data-page="carta"] h1'],
      ['menu-sub', 'text', 'Texto: Subtítulo de carta', '[data-page="carta"] h1 + p'],
      ['reviews-title', 'text', 'Texto: Reseñas', '#reviews-title'],
      ['local-title', 'text', 'Texto: El local', '[data-page="local"] h1'],
      ['book-title', 'text', 'Texto: Reservas', '#reservas h1'],
      ['hours-title', 'text', 'Texto: Horarios', '#hours-title'],
      ['footer-address', 'text', 'Texto: Pie dirección', '#footer-address'],
      ['nav-inicio', 'button', 'Pastilla: Inicio', '[data-nav="inicio"]'],
      ['nav-carta', 'button', 'Pastilla: Carta', '[data-nav="carta"]'],
      ['nav-local', 'button', 'Pastilla: El local', '[data-nav="local"]'],
      ['nav-reservas', 'button', 'Pastilla: Reservas', '[data-nav="reservas"]'],
      ['btn-call', 'button', 'Botón: Llamar', '#header-call'],
      ['btn-call-bar', 'button', 'Botón: Llamar', '#bar-call'],
      ['btn-book-bar', 'button', 'Botón: Reservar', '#quick-bar .js-reserve-open'],
      ['btn-allergens', 'button', 'Botón: Alérgenos', '#open-filter-btn'],
      ['btn-lang', 'button', 'Botón: Idioma', '#btn-lang-toggle'],
      ['logo', 'image', 'Imagen: Logotipo', '#site-logo'],
      ['hero-photo', 'image', 'Imagen: Portada', '#hero-media'],
      ['section-hero', 'section', 'Sección: Portada', '#inicio-hero'],
      ['section-featured', 'section', 'Sección: Sugerencias', '#featured-title'],
      ['section-carta', 'section', 'Sección: Carta', '[data-page="carta"]'],
      ['section-daily', 'section', 'Sección: Menú del día', '#vw-daily'],
      ['section-local', 'section', 'Sección: El local', '[data-page="local"]'],
      ['section-reviews', 'section', 'Sección: Reseñas', '#reviews-title'],
      ['section-book', 'section', 'Sección: Reservas', '#reservas'],
      ['section-hours', 'section', 'Sección: Horarios', '#horarios'],
      ['section-footer', 'section', 'Sección: Pie', 'footer'],
      ['mesa-name', 'text', 'Texto: Nombre', '.intro h1'],
      ['mesa-search', 'button', 'Botón: Buscar', '#btn-search'],
      ['mesa-lang', 'button', 'Botón: Idioma', '#btn-lang'],
      ['mesa-allergens', 'button', 'Botón: Alérgenos', '#mesa-allergens'],
      ['mesa-hero', 'image', 'Imagen: Portada', '#hero'],
      ['section-mesa', 'section', 'Sección: Carta QR', '#menu']
    ];
    fixed.forEach(function (item) {
      var node = document.querySelector(item[3]);
      if (item[0] === 'section-featured' && node) node = node.closest('section');
      if (item[0] === 'section-reviews' && node) node = node.closest('section');
      stamp(node, item[0], item[1], item[2]);
    });
    document.querySelectorAll('#vw-hero-actions a, #vw-hero-actions .vw-rate').forEach(function (node, index) {
      var name = (node.textContent || 'boton').toLowerCase();
      var id = name.indexOf('whats') >= 0 ? 'btn-whatsapp' : name.indexOf('llegar') >= 0 || name.indexOf('direction') >= 0 ? 'btn-maps' : name.indexOf('reserv') >= 0 || name.indexOf('book') >= 0 ? 'btn-book' : name.indexOf('qr') >= 0 || name.indexOf('carta') >= 0 ? 'btn-qr' : name.indexOf('llam') >= 0 || name.indexOf('call') >= 0 ? 'btn-call-hero' : 'btn-google';
      stamp(node, id, 'button', 'Botón: ' + node.textContent.trim());
      if (!node.getAttribute('data-element')) stamp(node, 'btn-action-' + index, 'button', 'Botón: ' + node.textContent.trim());
    });
    document.querySelectorAll('#tabs .tab, #mesa-cats .pill').forEach(function (node, index) {
      var key = node.dataset.anchor || node.dataset.spy || index;
      stamp(node, 'cat-' + key, 'button', 'Pastilla: ' + node.textContent.trim());
    });
    document.querySelectorAll('#panels > section > p').forEach(function (node, index) {
      stamp(node, 'cat-note-' + index, 'text', 'Texto: Nota de categoría');
    });
    document.querySelectorAll('#panels li, #menu .dish').forEach(function (node) {
      var id = node.dataset.dish || node.querySelector('h3') && (node.querySelector('h3').textContent || '').slice(0, 24);
      var key = String(id || 'plato').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plato';
      stamp(node, 'dish-' + key, 'section', 'Tarjeta: ' + (node.querySelector('h3') ? node.querySelector('h3').textContent.trim() : 'Plato'));
      stamp(node.querySelector('h3'), 'dish-name-' + key, 'text', 'Texto: Nombre del plato');
      stamp(node.querySelector('.dish-desc, p'), 'dish-desc-' + key, 'text', 'Texto: Descripción');
      stamp(node.querySelector('.dish-price'), 'dish-price-' + key, 'text', 'Texto: Precio');
      stamp(node.querySelector('img'), 'dish-photo-' + key, 'image', 'Imagen: Plato');
    });
    document.querySelectorAll('#local-gallery img').forEach(function (node, index) {
      stamp(node, 'gallery-' + index, 'image', 'Imagen: Galería');
    });
    applyElements(design);
    if (!document.documentElement.classList.contains('vw-editor')) return;
    var selected = window.VW_SELECTED || '';
    document.querySelectorAll('[data-element]').forEach(function (node) {
      node.classList.toggle('is-selected', node.getAttribute('data-element') === selected);
    });
  }

  function applyElements(design) {
    var elements = design.elements || {};
    document.querySelectorAll('[data-element]').forEach(function (node) {
      var editing = node === document.activeElement;
      var item = elements[node.getAttribute('data-element')] || {};
      node.classList.toggle('vw-element-off', !!item.hidden);
      var emptied = typeof item.text === 'string' && item.text === '' && !node.querySelector('svg, img');
      node.classList.toggle('vw-text-empty', emptied);
      if (!editing && typeof item.text === 'string' && (node.getAttribute('data-element-kind') === 'text' || node.getAttribute('data-element-kind') === 'button')) writeText(node, item.text);
      node.style.fontFamily = item.font ? ELEMENT_FONTS[item.font] : '';
      node.style.fontSize = item.size ? item.size + 'px' : '';
      node.style.fontWeight = item.bold ? '700' : '';
      node.style.fontStyle = item.italic ? 'italic' : '';
      node.style.textTransform = item.upper ? 'uppercase' : '';
      node.style.textAlign = item.align || '';
      node.style.color = item.color || '';
      if (node.getAttribute('data-element-kind') === 'button' || node.getAttribute('data-element-kind') === 'section') {
        node.style.background = item.bg || '';
      }
      node.style.borderColor = item.border || '';
      if (item.border) node.style.borderStyle = 'solid';
      if (item.border) node.style.borderWidth = '1px';
      node.style.borderRadius = item.radius != null ? item.radius + 'px' : '';
      node.style.padding = item.pad != null ? item.pad + 'px' : '';
      if (item.height) node.style.height = item.height + 'px';
      if (item.fit) node.style.objectFit = item.fit;
      if (item.href && node.tagName === 'A') node.setAttribute('href', item.href);
      if (item.src) {
        var image = node.tagName === 'IMG' ? node : node.querySelector('img');
        if (image) image.src = item.src;
      }
    });
    var used = {};
    Object.keys(elements).forEach(function (id) {
      if (elements[id].font) used[elements[id].font] = true;
    });
    if (used.geometrica || used.editorial || used.condensada || used.artesanal) {
      var link = document.getElementById('vw-element-fonts');
      var href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700&family=Caveat:wght@500;700&family=Fraunces:ital,opsz,wght@0,9..144,560;1,9..144,560&family=Outfit:wght@400;600;700&display=swap';
      if (!link) {
        link = document.createElement('link');
        link.id = 'vw-element-fonts';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      if (link.getAttribute('href') !== href) link.href = href;
    }
  }

  function markTargets() {
    if (!document.documentElement.classList.contains('vw-editor')) return;
    if (!document.getElementById('contenido') && !document.getElementById('menu')) return;
    tag(document.querySelector('.site-nav'), 'header_nav', 'Editar navegación');
    tag(document.getElementById('inicio-hero'), 'hero', 'Editar portada');
    tag(document.getElementById('vw-hero-actions'), 'action_buttons', 'Editar botones');
    tag(document.getElementById('quick-bar'), 'action_buttons', 'Editar botones');
    tag(document.getElementById('menu-tabs-bar'), 'carta_categories', 'Editar categorías');
    tag(document.getElementById('panels'), 'menu_items', 'Editar la carta');
    tag(document.getElementById('vw-daily'), 'daily_menu', 'Editar menú del día');
    tag(document.querySelector('[data-page="local"]'), 'local_gallery', 'Editar el local');
    var reviews = document.getElementById('reviews-title');
    tag(reviews ? reviews.closest('section') : null, 'reviews', 'Editar reseñas');
    tag(document.getElementById('reservas'), 'reservations', 'Editar reservas');
    tag(document.getElementById('horarios'), 'reservations', 'Editar horarios');
    tag(document.querySelector('footer'), 'footer', 'Editar pie');
    tag(document.querySelector('.hero'), 'hero', 'Editar portada');
    tag(document.getElementById('mesa-cats'), 'carta_categories', 'Editar categorías');
    tag(document.getElementById('menu'), 'menu_items', 'Editar la carta');
    tag(document.getElementById('dock'), 'action_buttons', 'Editar botones');
    var selected = window.VW_SELECTED || '';
    document.querySelectorAll('[data-edit]').forEach(function (node) {
      node.classList.toggle('is-selected', node.getAttribute('data-edit') === selected);
      var over = (window.VISIWEB_DESIGN && window.VISIWEB_DESIGN.blockColors && window.VISIWEB_DESIGN.blockColors[node.getAttribute('data-edit')]) || {};
      node.style.background = over.blockBg || '';
      ['buttonBg', 'buttonText', 'pillActiveBg', 'pillActiveText', 'badgeBg', 'badgeText', 'priceColor'].forEach(function (key) {
        if (over[key]) node.style.setProperty('--block-' + key, over[key]);
        else node.style.removeProperty('--block-' + key);
      });
    });
  }

  window.VisiwebDesign = {
    themes: THEMES,
    fonts: FONTS,
    shapes: SHAPES,
    heroes: HEROES,
    dishes: DISHES,
    tabs: TABS,
    blocks: BLOCKS,
    days: DAYS,
    colorKeys: COLOR_KEYS,
    blockColorKeys: BLOCK_COLOR_KEYS,
    blank: blank,
    merge: merge,
    blankDaily: blankDaily,
    mergeDaily: mergeDaily,
    resolveColors: resolveColors,
    elementFonts: ELEMENT_FONTS,
    paint: paint,
    mountWeb: mountWeb,
    markTargets: markTargets,
    markElements: markElements
  };

  var EDITOR = /[?&]editor=1(?:&|$)/.test(location.search);
  if (EDITOR) document.documentElement.classList.add('vw-editor');

  function applyEditorPayload(data) {
    if (!data || data.type !== 'visiweb-design') return;
    paint(data.design);
    document.documentElement.classList.toggle('vw-editing', !!data.editing);
    if (!data.editing) {
      document.querySelectorAll('.is-hover, .is-selected').forEach(function (node) {
        node.classList.remove('is-hover', 'is-selected');
      });
    }
    window.VW_SELECTED = data.selected || '';
    var demo = window.VISIWEB_DEMO;
    if (demo && data.copy) {
      if (data.copy.name) demo.business.name = data.copy.name;
      if (data.copy.phone) demo.business.phone = data.copy.phone;
      if (data.copy.whatsapp) demo.business.whatsapp = String(data.copy.whatsapp).replace(/\D/g, '');
      if (data.copy.address) demo.business.addressLine = data.copy.address;
      demo.dailyMenu = mergeDaily(data.dailyMenu);
      demo.design = window.VISIWEB_DESIGN;
      ['es', 'en'].forEach(function (lng) {
        if (!demo.i18n || !demo.i18n[lng]) return;
        if (data.copy.heroTitle) demo.i18n[lng].heroTitle = data.copy.heroTitle;
        if (data.copy.heroSubtitle) demo.i18n[lng].heroSubtitle = data.copy.heroSubtitle;
        if (data.copy.navHome) demo.i18n[lng].navHome = data.copy.navHome;
        if (data.copy.navMenu) demo.i18n[lng].navMenu = data.copy.navMenu;
        if (data.copy.navLocal) demo.i18n[lng].navLocal = data.copy.navLocal;
        if (data.copy.navBook) demo.i18n[lng].navBook = data.copy.navBook;
      });
      if (data.copy.cover && demo.images) demo.images.hero = data.copy.cover;
    }
    if (data.page === 'mesa' && window.visiwebRepaintMesa) window.visiwebRepaintMesa();
    else if (window.visiwebRepaint) window.visiwebRepaint();
    markElements();
  }

  if (EDITOR) {
    window.addEventListener('message', function (event) {
      if (event.origin !== location.origin) return;
      applyEditorPayload(event.data);
    });
    function beginTextEdit(node) {
      node.contentEditable = 'true';
      node.focus();
      var finish = function () {
        node.removeEventListener('blur', finish);
        node.contentEditable = 'false';
        window.parent.postMessage({
          type: 'visiweb-text',
          id: node.getAttribute('data-element'),
          text: node.textContent
        }, location.origin);
      };
      node.addEventListener('blur', finish);
    }
    document.addEventListener('click', function (event) {
      if (!document.documentElement.classList.contains('vw-editing')) return;
      if (event.target.closest && event.target.closest('[contenteditable="true"]')) return;
      var hit = event.target.closest ? event.target.closest('[data-element]') : null;
      event.preventDefault();
      event.stopPropagation();
      if (hit && hit.getAttribute('data-element-kind') === 'text' && window.VW_SELECTED === hit.getAttribute('data-element')) {
        beginTextEdit(hit);
        return;
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'visiweb-select',
          id: hit ? hit.getAttribute('data-element') : '',
          kind: hit ? hit.getAttribute('data-element-kind') : 'global',
          label: hit ? hit.getAttribute('data-element-label') : 'Fondo global'
        }, location.origin);
      }
    }, true);
    document.addEventListener('dblclick', function (event) {
      if (!document.documentElement.classList.contains('vw-editing')) return;
      var node = event.target.closest ? event.target.closest('[data-element-kind="text"]') : null;
      if (!node || window.parent === window) return;
      event.preventDefault();
      event.stopPropagation();
      beginTextEdit(node);
    }, true);
    document.addEventListener('mouseover', function (event) {
      if (!document.documentElement.classList.contains('vw-editing')) return;
      document.querySelectorAll('.is-hover').forEach(function (node) { node.classList.remove('is-hover'); });
      var hit = event.target.closest ? event.target.closest('[data-element]') : null;
      if (hit) hit.classList.add('is-hover');
    }, true);
    document.addEventListener('submit', function (event) {
      if (document.documentElement.classList.contains('vw-editing')) event.preventDefault();
    }, true);
  }
})();
