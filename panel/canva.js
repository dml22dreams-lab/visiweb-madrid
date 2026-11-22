(function () {
  'use strict';

  var stateRef = null;
  var api = null;
  var picker = { path: '', h: 0, s: 1, v: 1 };
  var postTimer = 0;
  var TITLES = {
    global_theme: 'Ajustes generales y fondo de la web',
    header_nav: 'Navegación',
    hero: 'Portada',
    action_buttons: 'Botones de acción',
    carta_categories: 'Categorías',
    menu_items: 'La carta',
    daily_menu: 'Menú del día',
    local_gallery: 'El local',
    reviews: 'Reseñas',
    reservations: 'Reservas y horarios',
    footer: 'Pie de página'
  };
  var COLOR_LABELS = {
    pageBg: 'Fondo de la página',
    cardBg: 'Tarjetas',
    textPrimary: 'Texto principal',
    textSecondary: 'Texto secundario',
    borderColor: 'Líneas y bordes',
    buttonBg: 'Fondo de botón',
    buttonText: 'Texto de botón',
    pillActiveBg: 'Pastilla activa',
    pillActiveText: 'Texto de pastilla',
    badgeBg: 'Etiqueta',
    badgeText: 'Texto de etiqueta',
    priceColor: 'Precio',
    blockBg: 'Fondo del bloque'
  };
  var ORDER = {
    carta_categories: 'carta',
    menu_items: 'carta',
    daily_menu: 'menu_dia',
    local_gallery: 'local',
    reviews: 'resenas',
    reservations: 'reserva'
  };

  function ed() { return stateRef.editor; }

  function pack() {
    var current = ed();
    return {
      design: current.design,
      daily_menu: current.daily_menu,
      name: current.name,
      tagline: current.tagline,
      phone: current.phone,
      whatsapp: current.whatsapp,
      address: current.address
    };
  }

  function snapshot() {
    var current = ed();
    current.past.push(JSON.stringify(pack()));
    if (current.past.length > 40) current.past.shift();
    current.future = [];
  }

  function restore(raw) {
    var data = JSON.parse(raw);
    var current = ed();
    current.design = window.VisiwebDesign.merge(data.design);
    current.daily_menu = window.VisiwebDesign.mergeDaily(data.daily_menu);
    current.name = data.name || '';
    current.tagline = data.tagline || '';
    current.phone = data.phone || '';
    current.whatsapp = data.whatsapp || '';
    current.address = data.address || '';
  }

  function restaurantPayload() {
    var current = ed();
    var payload = {
      name: current.name || '',
      tagline: current.tagline || '',
      description: current.description || '',
      phone: current.phone || '',
      whatsapp: current.whatsapp || '',
      address: current.address || '',
      schedule: current.schedule || '',
      instagram: current.instagram || '',
      cover_image_url: current.coverPreview || current.cover_url || current.cover_image_url || '',
      plan_tier: current.plan_tier || '',
      design_config: current.design,
      design: current.design,
      daily_menu: current.daily_menu,
      accent: current.design && current.design.accent,
      primary_color: current.design && current.design.accent,
      categories: (current.categories || []).map(function (category) {
        return {
          id: category.id,
          name: category.name || '',
          items: (category.items || []).map(function (item) {
            return {
              id: item.id,
              name: item.name || '',
              description: item.description || '',
              price: item.price,
              image_url: item.preview || item.image_url || '',
              allergens: item.allergens || [],
              featured: !!item.featured
            };
          })
        };
      })
    };
    // Si el editor aún no tiene carta, no enviar categories vacías (evita pisar preview/data.js).
    if (!payload.categories.length || (payload.categories.length === 1 && !payload.categories[0].name && !(payload.categories[0].items || []).some(function (item) { return item.name; }))) {
      delete payload.categories;
    }
    return payload;
  }

  function sendDesign() {
    var frame = document.getElementById('vw-canvas');
    var current = ed();
    if (!frame || !frame.contentWindow || !current) return;
    if (current.fromPreview && !current.previewDirty) return;
    var payload = restaurantPayload();
    frame.contentWindow.postMessage({
      type: 'RESTAURANT_DATA',
      payload: payload,
      RESTAURANT_DATA: payload
    }, location.origin);
  }

  function postDesign(now) {
    clearTimeout(postTimer);
    if (now) sendDesign();
    else postTimer = setTimeout(sendDesign, 40);
  }

  function frameSrc() {
    return './preview/index.html#inicio';
  }

  var ICON = {
    cursor: '<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l7.5 16 2.2-6.3L20 11.5z"></path></svg>',
    pencil: '<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>',
    dishes: '<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v8M4 3v5a2 2 0 0 0 4 0V3M6 11v10M15 3v18M19 3c-1.5 2-1.5 4 0 6V3z"></path></svg>',
    eye: '<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18M10.6 6.2A10 10 0 0 1 12 6c6 0 10 6 10 6a18 18 0 0 1-3.2 3.6M6.1 6.1C3.5 7.8 2 12 2 12s4 6 10 6a10 10 0 0 0 4-.8"></path></svg>'
  };

  function build() {
    var current = ed();
    app().innerHTML =
      '<div class="fixed inset-0 z-50 flex flex-col bg-neutral-100">' +
        '<header class="flex h-12 shrink-0 items-center gap-1.5 border-b border-neutral-200 bg-white px-2">' +
          '<button type="button" data-canva="close" class="h-8 rounded-md px-2 text-xs font-medium text-neutral-500">← Panel</button>' +
          '<p class="w-[120px] truncate text-xs font-medium text-neutral-900">' + api.esc(current.name || 'Restaurante') + '</p>' +
          '<div class="flex h-8 items-center rounded-md bg-neutral-100 p-0.5">' +
            '<button type="button" data-canva="mode" data-value="navigate" class="flex h-7 items-center gap-1 rounded px-2 text-xs font-medium">' + ICON.cursor + 'Navegar</button>' +
            '<button type="button" data-canva="mode" data-value="edit" class="flex h-7 items-center gap-1 rounded px-2 text-xs font-medium">' + ICON.pencil + 'Editar</button>' +
          '</div>' +
          '<button type="button" data-canva="menu" class="flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2 text-xs font-medium text-neutral-700">' + ICON.dishes + 'Platos y Carta</button>' +
          '<button type="button" data-canva="undo" class="h-8 rounded-md px-2 text-xs font-medium text-neutral-600">Deshacer</button>' +
          '<div class="flex h-8 items-center rounded-md bg-neutral-100 p-0.5">' +
            '<button type="button" data-canva="viewport" data-value="mobile" class="h-7 rounded px-2 text-xs font-medium">Móvil</button>' +
            '<button type="button" data-canva="viewport" data-value="desktop" class="h-7 rounded px-2 text-xs font-medium">Escritorio</button>' +
          '</div>' +
          '<button type="button" data-canva="save" class="ml-auto h-8 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white">Guardar</button>' +
        '</header>' +
        '<div id="vw-banner" class="shrink-0 px-3"></div>' +
        '<div class="flex min-h-0 flex-1">' +
          '<div id="vw-stage" class="flex min-w-0 flex-1 flex-col bg-neutral-100">' +
            '<div class="flex shrink-0 items-center justify-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">' +
              '<span class="text-xs font-medium text-neutral-500">Vista</span>' +
              '<div class="flex h-8 items-center rounded-md bg-neutral-100 p-0.5">' +
                '<button type="button" data-canva="viewport" data-value="mobile" class="h-7 rounded px-2 text-xs font-medium">Móvil · 390px</button>' +
                '<button type="button" data-canva="viewport" data-value="desktop" class="h-7 rounded px-2 text-xs font-medium">Escritorio · 100%</button>' +
              '</div>' +
            '</div>' +
            '<div class="flex min-h-0 flex-1 justify-center overflow-auto p-6">' +
              '<iframe id="vw-canvas" title="Vista previa" class="h-full border border-neutral-200 bg-white shadow-sm" data-src="' + frameSrc() + '" src="' + frameSrc() + '"></iframe>' +
            '</div>' +
          '</div>' +
          '<aside id="vw-inspector" class="w-[340px] shrink-0 overflow-auto border-l border-neutral-200 bg-white"></aside>' +
        '</div>' +
        '<div id="vw-overlay"></div>' +
        '<div id="vw-picker" hidden class="fixed z-[80] w-72 rounded-2xl border border-stone-200 bg-white p-3 shadow-2xl">' +
          '<canvas id="vw-sv" width="248" height="148" class="h-[148px] w-full cursor-crosshair rounded-xl"></canvas>' +
          '<input id="vw-hue" type="range" min="0" max="360" class="mt-3 w-full">' +
          '<div class="mt-3 flex gap-2">' +
            '<input id="vw-hex" spellcheck="false" class="w-full rounded-xl border border-stone-200 px-3 py-2 font-mono text-sm uppercase">' +
            '<button type="button" data-canva="eyedrop" class="shrink-0 rounded-xl bg-stone-100 px-3 text-xs font-semibold">Cuentagotas</button>' +
            '<button type="button" data-canva="copyhex" class="shrink-0 rounded-xl bg-stone-100 px-3 text-xs font-semibold">Copiar</button>' +
          '</div>' +
          '<div id="vw-recent" class="mt-3 flex flex-wrap gap-2"></div>' +
        '</div>' +
      '</div>';
    document.getElementById('vw-canvas').addEventListener('load', function () { postDesign(true); });
  }

  function app() { return document.getElementById('app'); }

  function updateChrome() {
    var current = ed();
    var name = document.querySelector('[data-canva="close"]');
    if (name && name.nextElementSibling) name.nextElementSibling.textContent = current.name || 'Restaurante';
    document.querySelectorAll('[data-canva="viewport"]').forEach(function (node) {
      node.className = 'h-7 rounded px-2 text-xs font-medium ' + (node.dataset.value === current.viewport ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500');
    });
    document.querySelectorAll('[data-canva="mode"]').forEach(function (node) {
      node.className = 'flex h-7 items-center gap-1 rounded px-2 text-xs font-medium ' + (node.dataset.value === (current.mode || 'navigate') ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500');
    });
    var undo = document.querySelector('[data-canva="undo"]');
    if (undo) undo.disabled = !current.past.length;
    var save = document.querySelector('[data-canva="save"]');
    if (save) {
      save.disabled = !!stateRef.busy;
      save.textContent = stateRef.busy ? 'Guardando…' : 'Guardar';
    }
    var frame = document.getElementById('vw-canvas');
    if (frame) {
      frame.style.width = current.viewport === 'desktop' ? '100%' : '390px';
      frame.style.maxWidth = current.viewport === 'desktop' ? '100%' : '390px';
      if (frame.dataset.src !== frameSrc()) {
        frame.dataset.src = frameSrc();
        frame.src = frameSrc();
      }
    }
    var banner = document.getElementById('vw-banner');
    if (banner) banner.innerHTML = api.banner();
  }

  var TEXT_SIZE = { s: 14, m: 18, l: 28, xl: 44 };
  var BOX_SIZE = { s: 8, m: 14, l: 22 };
  var RADIUS = { recto: 0, suave: 10, pildora: 800 };
  var IMAGE_HEIGHT = { s: 140, m: 240, l: 420 };

  function colorRow(path, label) {
    var hex = String(readColor(path) || '#000000').toUpperCase();
    return '<label class="flex h-8 items-center justify-between gap-2"><span class="text-[11px] font-medium text-neutral-500">' + label + '</span><span class="flex items-center gap-1.5"><button type="button" data-canva="color" data-color-path="' + path + '" class="h-5 w-5 rounded-full border border-neutral-200" style="background:' + api.esc(hex) + '"></button><input data-canva-input="hex.' + path + '" data-hex-path="' + path + '" value="' + api.esc(hex) + '" spellcheck="false" class="h-8 w-[78px] rounded-md border border-neutral-200 px-1.5 font-mono text-xs uppercase text-neutral-800"></span></label>';
  }

  function elementItem() {
    var current = ed();
    var id = current.selectedElementId;
    if (!id) return {};
    if (!current.design.elements[id]) current.design.elements[id] = {};
    return current.design.elements[id];
  }

  function readColor(path) {
    var design = ed().design;
    var colors = window.VisiwebDesign.resolveColors(design);
    var parts = path.split('.');
    if (parts[0] === 'colors') return design.colors[parts[1]] || colors[parts[1]];
    if (parts[0] === 'elements') {
      var stored = design.elements[parts[1]] && design.elements[parts[1]][parts[2]];
      return stored || (parts[2] === 'color' ? colors.textPrimary : parts[2] === 'border' ? colors.borderColor : colors.buttonBg);
    }
    var custom = design.blockColors[parts[1]] && design.blockColors[parts[1]][parts[2]];
    if (custom) return custom;
    if (parts[2] === 'blockBg') return colors.cardBg;
    return colors[parts[2]] || colors.buttonBg;
  }

  function writeColor(path, value) {
    var design = ed().design;
    var parts = path.split('.');
    if (parts[0] === 'colors') {
      design.colors[parts[1]] = value;
      if (parts[1] === 'buttonBg' || parts[1] === 'pillActiveBg') design.accent = value;
      return;
    }
    if (parts[0] === 'elements') {
      if (!design.elements[parts[1]]) design.elements[parts[1]] = {};
      design.elements[parts[1]][parts[2]] = value;
      return;
    }
    if (!design.blockColors[parts[1]]) design.blockColors[parts[1]] = {};
    design.blockColors[parts[1]][parts[2]] = value;
  }

  function seg(group, value, options) {
    return '<div class="flex h-8 overflow-hidden rounded-md border border-neutral-200">' + options.map(function (opt) {
      var on = opt[0] === value;
      return '<button type="button" data-canva="set" data-group="' + group + '" data-value="' + opt[0] + '" class="flex-1 text-xs ' + (on ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600') + '">' + opt[1] + '</button>';
    }).join('') + '</div>';
  }

  function mini(group, id, label, on) {
    return '<button type="button" data-canva="set" data-group="' + group + '" data-value="' + id + '" class="h-8 rounded-md border px-2 text-xs ' + (on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700') + '">' + label + '</button>';
  }

  function labelOf(text) {
    return '<p class="mb-1 text-[11px] font-medium text-neutral-500">' + text + '</p>';
  }

  function boxInput(path, value) {
    return '<input data-canva-input="' + path + '" value="' + api.esc(value) + '" class="h-8 w-full rounded-md border border-neutral-200 px-2 text-xs text-neutral-800">';
  }

  function getDefaultElementText(elementId, restaurant) {
    var labels = (restaurant.design && restaurant.design.labels) || {};
    var map = {
      name: restaurant.name || '',
      'mesa-name': restaurant.name || '',
      'hero-title': labels.heroTitle || restaurant.tagline || restaurant.name || '',
      'hero-sub': labels.heroSubtitle || 'Raciones y cocina tradicional.',
      'hero-kicker': 'Alcobendas · Desde 1998',
      'menu-title': 'La carta',
      'menu-sub': labels.menuSubtitle || 'Elaborada cada mañana con producto de mercado.',
      'featured-title': 'De la casa',
      'local-title': labels.localTitle || 'El local',
      'reviews-title': labels.reviewsTitle || 'Opiniones',
      'book-title': labels.bookTitle || 'Reservar mesa',
      'hours-title': 'Horario de cocina',
      address: restaurant.address || '',
      'footer-address': restaurant.address || '',
      'nav-inicio': labels.navHome || 'Inicio',
      'nav-carta': labels.navMenu || 'Carta',
      'nav-local': labels.navLocal || 'El local',
      'nav-reservas': labels.navBook || 'Reservas',
      'btn-call': 'Llamar',
      'btn-call-bar': 'Llamar',
      'btn-call-hero': 'Llamar',
      'btn-book': 'Reservar',
      'btn-book-bar': 'Reservar',
      'btn-whatsapp': 'WhatsApp',
      'btn-maps': 'Cómo llegar',
      'btn-qr': 'Ver Carta QR',
      'btn-allergens': 'Alérgenos',
      'mesa-allergens': 'Alérgenos',
      'btn-lang': 'ES',
      'mesa-lang': 'ES',
      'mesa-search': 'Buscar'
    };
    var frame = document.getElementById('vw-canvas');
    var node = frame && frame.contentDocument && frame.contentDocument.querySelector('[data-element="' + elementId + '"]');
    var live = node ? node.getAttribute('data-default-text') : '';
    if (live) return live;
    return map[elementId] != null ? map[elementId] : '';
  }

  function shownText(id) {
    var item = (ed().design.elements && ed().design.elements[id]) || {};
    return item.text !== undefined ? item.text : getDefaultElementText(id, ed());
  }

  function keyOf(map, value) {
    var found = '';
    Object.keys(map).forEach(function (key) {
      if (map[key] === value) found = key;
    });
    if (found) return found;
    var best = '';
    var dist = Infinity;
    if (value == null) return '';
    Object.keys(map).forEach(function (key) {
      var gap = Math.abs(map[key] - value);
      if (gap < dist) { dist = gap; best = key; }
    });
    return best;
  }

  function blockIndex(id) {
    var blocks = ed().design.blocks;
    for (var i = 0; i < blocks.length; i++) if (blocks[i].id === id) return i;
    return -1;
  }

  function blockVisible(id) {
    var blocks = ed().design.blocks;
    for (var i = 0; i < blocks.length; i++) if (blocks[i].id === id) return blocks[i].visible !== false;
    return true;
  }

  function orderControls(blockId) {
    var index = blockIndex(blockId);
    if (index < 0) return '';
    return '<div class="flex gap-1">' +
      '<button type="button" data-canva="move" data-block="' + blockId + '" data-dir="-1" class="h-8 flex-1 rounded-md border border-neutral-200 text-xs"' + (index === 0 ? ' disabled' : '') + '>Subir ↑</button>' +
      '<button type="button" data-canva="move" data-block="' + blockId + '" data-dir="1" class="h-8 flex-1 rounded-md border border-neutral-200 text-xs"' + (index === ed().design.blocks.length - 1 ? ' disabled' : '') + '>Bajar ↓</button>' +
      '</div>';
  }

  var SECTION_BLOCK = {
    'section-featured': 'sugerencias',
    'section-carta': 'carta',
    'section-daily': 'menu_dia',
    'section-local': 'local',
    'section-reviews': 'resenas',
    'section-hours': 'horarios',
    'section-book': 'reserva'
  };

  function panelKind(id, kind) {
    if (!id) return 'global';
    if (kind === 'button' && (/^nav-|^cat-/.test(id))) return 'nav';
    if (kind === 'button' && /call|whats|maps|book|qr|google/.test(id)) return 'action';
    if (kind === 'button') return 'nav';
    return kind || 'text';
  }

  function heading(kind, label) {
    var name = String(label || '').split(':').pop().trim() || 'Elemento';
    var prefix = { text: 'Texto', nav: 'Pestaña', action: 'Botón', image: 'Imagen', section: 'Sección' };
    if (kind === 'global') return 'Ajustes generales';
    return (prefix[kind] || 'Elemento') + ' · ' + name;
  }

  function typeControls(item) {
    var fonts = [['serif_clasica', 'Serifa clásica'], ['sans_moderna', 'Sans moderna'], ['geometrica', 'Geométrica'], ['editorial', 'Editorial'], ['condensada', 'Condensada'], ['artesanal', 'Artesanal']];
    return labelOf('Fuente') + '<select data-canva-input="element.font" class="h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-xs">' +
      '<option value="">Por defecto</option>' + fonts.map(function (font) {
        return '<option value="' + font[0] + '"' + (item.font === font[0] ? ' selected' : '') + '>' + font[1] + '</option>';
      }).join('') + '</select>' +
      '<div class="mt-2">' + labelOf('Tamaño') + seg('el-size', keyOf(TEXT_SIZE, item.size), [['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL']]) + '</div>' +
      '<div class="mt-2 flex gap-1">' +
        mini('el-flag', 'bold', 'B', !!item.bold) +
        mini('el-flag', 'italic', 'I', !!item.italic) +
        mini('el-flag', 'upper', 'AA', !!item.upper) +
      '</div>';
  }

  function inspector() {
    var current = ed();
    var id = current.selectedElementId || '';
    var kind = panelKind(id, current.selectedKind);
    var item = id ? (current.design.elements[id] || {}) : {};
    var design = current.design;
    var head = '<div class="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-neutral-200 bg-white px-3">' +
      '<p class="min-w-0 flex-1 truncate text-xs font-medium text-neutral-900">' + api.esc(heading(kind, current.selectedLabel)) + '</p>' +
      (kind === 'global' ? '' : '<button type="button" data-canva="el" data-key="hidden" title="Mostrar / Ocultar" class="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600">' + (item.hidden ? ICON.eyeOff : ICON.eye) + '</button>') +
      (kind === 'global' ? '' : '<button type="button" data-canva="select" title="Ajustes generales" class="flex h-8 w-8 items-center justify-center rounded-md text-sm text-neutral-500">×</button>') +
      '</div>';
    var body = '';
    if (kind === 'global') {
      body += '<section class="border-b border-neutral-100 px-3 py-3"><div class="grid grid-cols-2 gap-1">' +
        mini('theme', 'clasico', 'Clásico', design.theme === 'clasico') +
        mini('theme', 'blanco', 'Blanco', design.theme === 'blanco') +
        mini('theme', 'oscuro', 'Oscuro', design.theme === 'oscuro') +
        mini('theme', 'mediterraneo', 'Mediterráneo', design.theme === 'mediterraneo') +
        '</div><div class="mt-2">' + seg('shapes', design.shapes, [['redondeado', 'Redondo'], ['equilibrado', 'Medio'], ['recto', 'Recto']]) + '</div>' +
        '<div class="mt-2">' + labelOf('Fuente') + '<select data-canva-input="design.fonts" class="h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-xs">' +
        [['serif_clasica', 'Serifa clásica'], ['sans_moderna', 'Sans moderna'], ['geometrica', 'Geométrica'], ['editorial', 'Editorial'], ['condensada', 'Condensada'], ['artesanal', 'Artesanal']].map(function (font) {
          return '<option value="' + font[0] + '"' + (design.fonts === font[0] ? ' selected' : '') + '>' + font[1] + '</option>';
        }).join('') + '</select></div></section>' +
        '<section class="space-y-1 px-3 py-2">' +
        colorRow('colors.pageBg', 'Fondo') + colorRow('colors.cardBg', 'Tarjetas') + colorRow('colors.textPrimary', 'Texto') +
        '</section>';
      if (String(current.plan_tier || '') === '790') {
        if (!design.labels) design.labels = {};
        if (!design.eventos) design.eventos = { tipoVideo: 'salon', eyebrow: '', title: '', subtitle: '', lead: '', cta: '', readyTitle: '', readyCta: '' };
        var eventsOn = design.labels.vw_events === '1';
        var ev = design.eventos;
        body += '<section class="border-b border-neutral-100 px-3 py-3">' +
          labelOf('Eventos y grupos') +
          '<button type="button" data-canva="events-flag" aria-pressed="' + (eventsOn ? 'true' : 'false') + '" class="flex h-8 w-full items-center justify-between rounded-md border border-neutral-200 px-2 text-xs font-medium ' + (eventsOn ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700') + '"><span>Activar módulo</span><span>' + (eventsOn ? 'ON' : 'OFF') + '</span></button>';
        if (eventsOn) {
          body += '<div class="mt-2">' + labelOf('Vídeo hero') + seg('events-video', ev.tipoVideo || 'salon', [['salon', 'Salón'], ['terraza', 'Terraza'], ['ninguno', 'Foto']]) + '</div>' +
            '<div class="mt-2 space-y-1.5">' +
            labelOf('Eyebrow') + boxInput('events.eyebrow', ev.eyebrow || '') +
            labelOf('Título') + boxInput('events.title', ev.title || '') +
            labelOf('Subtítulo') + boxInput('events.subtitle', ev.subtitle || '') +
            labelOf('Lead') + '<textarea data-canva-input="events.lead" rows="3" class="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-800">' + api.esc(ev.lead || '') + '</textarea>' +
            labelOf('CTA hero') + boxInput('events.cta', ev.cta || '') +
            labelOf('Título editorial') + boxInput('events.readyTitle', ev.readyTitle || '') +
            labelOf('Botón editorial') + boxInput('events.readyCta', ev.readyCta || '') +
            '</div>';
        }
        body += '</section>';
      }
    }
    if (kind === 'text' || kind === 'nav') {
      var textItem = elementItem();
      body += '<section class="border-b border-neutral-100 px-3 py-3">' + labelOf('Texto') + boxInput('element.text', shownText(id)) +
        '<div class="mt-1 flex gap-3"><button type="button" data-canva="clear-text" class="text-[11px] font-medium text-neutral-500">Vaciar texto</button><button type="button" data-canva="restore-text" class="text-[11px] font-medium text-neutral-500">Restaurar original</button></div></section>' +
        '<section class="border-b border-neutral-100 px-3 py-3">' + typeControls(textItem) +
        (kind === 'text' ? '<div class="mt-2">' + labelOf('Alineación') + seg('el-align', textItem.align || 'center', [['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']]) + '</div>' : '') +
        '</section><section class="px-3 py-2">' + colorRow('elements.' + id + '.color', 'Texto') +
        (kind === 'nav' ? colorRow('elements.' + id + '.bg', 'Fondo') + colorRow('elements.' + id + '.border', 'Borde') : '') +
        '</section>';
    }
    if (kind === 'action') {
      var buttonItem = elementItem();
      body += '<section class="border-b border-neutral-100 px-3 py-3">' + labelOf('Texto') + boxInput('element.text', shownText(id)) +
        '<div class="mt-1 flex gap-3"><button type="button" data-canva="clear-text" class="text-[11px] font-medium text-neutral-500">Vaciar texto</button><button type="button" data-canva="restore-text" class="text-[11px] font-medium text-neutral-500">Restaurar original</button></div>' +
        '<div class="mt-2">' + labelOf('Enlace o teléfono') + boxInput('element.href', buttonItem.href || '') + '</div></section>' +
        '<section class="border-b border-neutral-100 px-3 py-3">' + labelOf('Esquinas') + seg('el-radius', keyOf(RADIUS, buttonItem.radius), [['recto', 'Recto'], ['suave', 'Suave'], ['pildora', 'Píldora']]) +
        '<div class="mt-2">' + labelOf('Tamaño') + seg('el-pad', keyOf(BOX_SIZE, buttonItem.pad), [['s', 'S'], ['m', 'M'], ['l', 'L']]) + '</div></section>' +
        '<section class="px-3 py-2">' + colorRow('elements.' + id + '.bg', 'Fondo') + colorRow('elements.' + id + '.color', 'Texto') + colorRow('elements.' + id + '.border', 'Borde') + '</section>';
    }
    if (kind === 'image') {
      var imageItem = elementItem();
      body += '<section class="border-b border-neutral-100 px-3 py-3"><p class="mb-1 text-[11px] font-medium text-neutral-500">Imagen</p><input data-canva="image-file" type="file" accept="image/*" class="block w-full text-xs"></section>' +
        '<section class="border-b border-neutral-100 px-3 py-3">' + labelOf('Ajuste') + seg('el-fit', imageItem.fit === 'contain' ? 'contain' : 'cover', [['cover', 'Rellenar'], ['contain', 'Encajar']]) +
        '<div class="mt-2">' + labelOf('Tamaño') + seg('el-height', keyOf(IMAGE_HEIGHT, imageItem.height), [['s', 'S'], ['m', 'M'], ['l', 'L']]) + '</div>' +
        '<div class="mt-2">' + labelOf('Esquinas') + seg('el-radius', keyOf(RADIUS, imageItem.radius), [['recto', 'Recto'], ['suave', 'Suave'], ['pildora', 'Píldora']]) + '</div></section>';
    }
    if (kind === 'section') {
      body += '<section class="border-b border-neutral-100 px-3 py-2">' + colorRow('elements.' + id + '.bg', 'Fondo') + '</section>';
      if (SECTION_BLOCK[id]) body += '<section class="px-3 py-3">' + orderControls(SECTION_BLOCK[id]) + '</section>';
    }
    return head + body;
  }

  function updateInspector() {
    var node = document.getElementById('vw-inspector');
    if (!node) return;
    var editing = ed().mode === 'edit';
    node.classList.toggle('hidden', !editing);
    node.innerHTML = editing ? inspector() : '';
  }

  function updateOverlay() {
    var node = document.getElementById('vw-overlay');
    if (!node) return;
    if (ed().overlay !== 'menu') {
      node.innerHTML = '';
      return;
    }
    node.innerHTML = '<div class="fixed inset-y-0 right-[340px] z-[60] w-[420px] overflow-auto border-l border-neutral-200 bg-white p-4 shadow-xl"><div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-medium">Gestionar platos</h2><button type="button" data-canva="close-menu" class="h-8 rounded-md border border-neutral-200 px-2 text-xs">Cerrar</button></div>' + api.menuHtml() + '</div>';
  }

  function move(blockId, dir) {
    snapshot();
    var blocks = ed().design.blocks;
    var index = blockIndex(blockId);
    var next = index + dir;
    if (index < 0 || next < 0 || next >= blocks.length) return;
    var item = blocks[index];
    blocks.splice(index, 1);
    blocks.splice(next, 0, item);
    if (blockId === 'reserva') {
      var hours = blockIndex('horarios');
      var reserva = blockIndex('reserva');
      if (hours >= 0 && reserva >= 0 && hours !== reserva + 1) {
        var hour = blocks.splice(hours, 1)[0];
        blocks.splice(blockIndex('reserva') + 1, 0, hour);
      }
    }
  }

  function togglePath(path) {
    snapshot();
    var current = ed();
    if (path === 'footerHidden') {
      current.design.footerHidden = !current.design.footerHidden;
      return;
    }
    if (path === 'daily_menu_enabled') {
      current.design.daily_menu_enabled = !current.design.daily_menu_enabled;
      if (current.design.daily_menu_enabled) {
        current.design.blocks.forEach(function (block) {
          if (block.id === 'menu_dia') block.visible = true;
        });
      }
      return;
    }
    if (path.indexOf('block.') === 0) {
      var id = path.slice(6);
      current.design.blocks.forEach(function (block) {
        if (block.id === id || (id === 'reserva' && block.id === 'horarios')) block.visible = !block.visible;
      });
      return;
    }
    var parts = path.split('.');
    var target = current.design;
    if (parts.length === 2) target = target[parts[0]];
    target[parts[parts.length - 1]] = !target[parts[parts.length - 1]];
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, max === 0 ? 0 : d / max, max];
  }

  function hsvToHex(h, s, v) {
    var c = v * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = v - c;
    var r = 0; var g = 0; var b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    function hex(n) { return ('0' + Math.round((n + m) * 255).toString(16)).slice(-2); }
    return '#' + hex(r) + hex(g) + hex(b);
  }

  function drawSV() {
    var canvas = document.getElementById('vw-sv');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = 'hsl(' + picker.h + ',100%,50%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var white = ctx.createLinearGradient(0, 0, canvas.width, 0);
    white.addColorStop(0, '#fff');
    white.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var black = ctx.createLinearGradient(0, 0, 0, canvas.height);
    black.addColorStop(0, 'rgba(0,0,0,0)');
    black.addColorStop(1, '#000');
    ctx.fillStyle = black;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function openPicker(path, anchor) {
    snapshot();
    picker.path = path;
    var hex = readColor(path);
    var rgb = hex.replace('#', '');
    var hsv = rgbToHsv(parseInt(rgb.slice(0, 2), 16), parseInt(rgb.slice(2, 4), 16), parseInt(rgb.slice(4, 6), 16));
    picker.h = hsv[0];
    picker.s = hsv[1];
    picker.v = hsv[2];
    var pop = document.getElementById('vw-picker');
    var rect = anchor.getBoundingClientRect();
    pop.hidden = false;
    pop.style.top = Math.min(rect.bottom + 8, window.innerHeight - 320) + 'px';
    pop.style.left = Math.max(8, rect.right - 288) + 'px';
    document.getElementById('vw-hue').value = String(Math.round(picker.h));
    document.getElementById('vw-hex').value = hex.toUpperCase();
    drawSV();
    var recent = document.getElementById('vw-recent');
    recent.innerHTML = (ed().recentColors || []).map(function (color) {
      return '<button type="button" data-canva="recent" data-value="' + color + '" class="h-8 w-8 rounded-full border border-stone-200" style="background:' + color + '"></button>';
    }).join('');
  }

  function commitColor(hex, remember) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    hex = hex.toLowerCase();
    writeColor(picker.path, hex);
    var button = document.querySelector('[data-color-path="' + picker.path + '"]');
    if (button) button.style.background = hex;
    document.querySelectorAll('[data-hex-path]').forEach(function (input) {
      if (input.getAttribute('data-hex-path') === picker.path && document.activeElement !== input) input.value = hex.toUpperCase();
    });
    if (remember) {
      var recent = ed().recentColors;
      if (recent.indexOf(hex) < 0) recent.unshift(hex);
      ed().recentColors = recent.slice(0, 8);
    }
    postDesign();
  }

  function sync(state, hooks) {
    stateRef = state;
    api = hooks;
    var current = ed();
    if (!current.past) current.past = [];
    if (!current.future) current.future = [];
    if (!current.recentColors) current.recentColors = [];
    if (!current.preview) current.preview = 'web';
    if (!current.viewport) current.viewport = 'mobile';
    if (!current.mode) current.mode = 'navigate';
    if (current.selectedElementId == null) current.selectedElementId = '';
    if (!current.design.colors) current.design = window.VisiwebDesign.merge(current.design);
    if (!document.getElementById('vw-canvas')) {
      current.mode = 'navigate';
      current.selectedElementId = null;
      build();
    }
    updateChrome();
    updateInspector();
    updateOverlay();
    postDesign(true);
  }

  document.addEventListener('click', function (event) {
    if (!stateRef || !stateRef.editor || !stateRef.editor.id) return;
    var button = event.target.closest('[data-canva]');
    var pop = document.getElementById('vw-picker');
    if (pop && !pop.hidden && !event.target.closest('#vw-picker') && !(button && button.dataset.canva === 'color')) pop.hidden = true;
    if (!button) return;
    var current = ed();
    var kind = button.dataset.canva;
    if (kind === 'close') { api.close(); return; }
    if (kind === 'undo') {
      if (!current.past.length) return;
      current.future.push(JSON.stringify(pack()));
      restore(current.past.pop());
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'mode') {
      current.mode = button.dataset.value;
      if (current.mode !== 'edit') {
        current.selectedElementId = null;
        current.selectedKind = '';
        current.selectedLabel = '';
      }
      updateChrome();
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'viewport') { current.viewport = button.dataset.value; updateChrome(); return; }
    if (kind === 'save') { api.saveAll(); return; }
    if (kind === 'select') {
      current.selectedElementId = '';
      current.selectedKind = 'global';
      current.selectedLabel = 'Fondo global';
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'clear-text') {
      snapshot();
      elementItem().text = '';
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'restore-text') {
      snapshot();
      delete elementItem().text;
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'el') {
      snapshot();
      var piece = elementItem();
      piece[button.dataset.key] = !piece[button.dataset.key];
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'set' && button.dataset.group.indexOf('el-') === 0) {
      snapshot();
      var pieceSet = elementItem();
      if (button.dataset.group === 'el-font') pieceSet.font = button.dataset.value;
      if (button.dataset.group === 'el-align') pieceSet.align = button.dataset.value;
      if (button.dataset.group === 'el-fit') pieceSet.fit = button.dataset.value;
      if (button.dataset.group === 'el-size') pieceSet.size = TEXT_SIZE[button.dataset.value];
      if (button.dataset.group === 'el-pad') pieceSet.pad = BOX_SIZE[button.dataset.value];
      if (button.dataset.group === 'el-radius') pieceSet.radius = RADIUS[button.dataset.value];
      if (button.dataset.group === 'el-height') pieceSet.height = IMAGE_HEIGHT[button.dataset.value];
      if (button.dataset.group === 'el-flag') pieceSet[button.dataset.value] = !pieceSet[button.dataset.value];
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'events-flag') {
      snapshot();
      if (!current.design.labels) current.design.labels = {};
      current.design.labels.vw_events = current.design.labels.vw_events === '1' ? '0' : '1';
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'set' && button.dataset.group === 'events-video') {
      snapshot();
      if (!current.design.eventos) current.design.eventos = { tipoVideo: 'salon' };
      current.design.eventos.tipoVideo = button.dataset.value;
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'set') {
      snapshot();
      current.design[button.dataset.group] = button.dataset.value;
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'toggle') { togglePath(button.dataset.path); updateInspector(); postDesign(true); return; }
    if (kind === 'move') { move(button.dataset.block, Number(button.dataset.dir)); updateInspector(); postDesign(true); return; }
    if (kind === 'menu') { current.overlay = 'menu'; updateOverlay(); return; }
    if (kind === 'close-menu') { current.overlay = ''; updateOverlay(); return; }
    if (kind === 'color') { openPicker(button.dataset.colorPath, button); return; }
    if (kind === 'reset-color') {
      snapshot();
      writeColor(button.dataset.path, '');
      updateInspector();
      postDesign(true);
      return;
    }
    if (kind === 'recent') {
      commitColor(button.dataset.value, true);
      document.getElementById('vw-hex').value = button.dataset.value.toUpperCase();
      return;
    }
    if (kind === 'copyhex') {
      var value = document.getElementById('vw-hex').value;
      if (navigator.clipboard) navigator.clipboard.writeText(value);
      return;
    }
    if (kind === 'eyedrop') {
      if (!window.EyeDropper) return;
      new window.EyeDropper().open().then(function (result) {
        var hex = result.sRGBHex;
        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
        var rgb = hex.replace('#', '');
        var hsv = rgbToHsv(parseInt(rgb.slice(0, 2), 16), parseInt(rgb.slice(2, 4), 16), parseInt(rgb.slice(4, 6), 16));
        picker.h = hsv[0]; picker.s = hsv[1]; picker.v = hsv[2];
        document.getElementById('vw-hue').value = String(Math.round(picker.h));
        document.getElementById('vw-hex').value = hex.toUpperCase();
        drawSV();
        commitColor(hex, true);
      }).catch(function () {});
    }
  });

  document.addEventListener('input', function (event) {
    if (!stateRef || !stateRef.editor) return;
    var target = event.target;
    if (target.dataset.canvaInput) {
      var path = target.dataset.canvaInput;
      var current = ed();
      if (path === 'name' || path === 'tagline' || path === 'phone' || path === 'whatsapp' || path === 'address') current[path] = target.value;
      else if (path.indexOf('labels.') === 0) current.design.labels[path.slice(7)] = target.value;
      else if (path.indexOf('daily.') === 0) current.daily_menu[path.slice(6)] = target.value;
      else if (path.indexOf('events.') === 0) {
        if (!current.design.eventos) current.design.eventos = { tipoVideo: 'salon' };
        current.design.eventos[path.slice(7)] = target.value;
      }
      else if (path.indexOf('element.') === 0) {
        var key = path.slice(8);
        var piece = elementItem();
        piece[key] = key === 'size' || key === 'pad' || key === 'radius' || key === 'height' ? Number(target.value) : target.value;
      } else if (path.indexOf('hex.') === 0) {
        var hexValue = target.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(hexValue)) {
          writeColor(path.slice(4), hexValue.toLowerCase());
          var swatch = document.querySelector('[data-color-path="' + path.slice(4) + '"]');
          if (swatch) swatch.style.background = hexValue;
        }
      } else if (path === 'design.fonts') current.design.fonts = target.value;
      if (path === 'name') updateChrome();
      postDesign();
      return;
    }
    if (target.id === 'vw-hue') {
      picker.h = Number(target.value);
      drawSV();
      var hex = hsvToHex(picker.h, picker.s, picker.v);
      document.getElementById('vw-hex').value = hex.toUpperCase();
      commitColor(hex);
    }
    if (target.id === 'vw-hex') {
      var next = target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(next)) commitColor(next, true);
    }
  });

  document.addEventListener('focusin', function (event) {
    if (stateRef && stateRef.editor && event.target.dataset && event.target.dataset.canvaInput) snapshot();
  });

  document.addEventListener('pointerdown', function (event) {
    var canvas = document.getElementById('vw-sv');
    if (!canvas || event.target !== canvas) return;
    function pick(ev) {
      var rect = canvas.getBoundingClientRect();
      picker.s = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      picker.v = Math.min(1, Math.max(0, 1 - (ev.clientY - rect.top) / rect.height));
      var hex = hsvToHex(picker.h, picker.s, picker.v);
      document.getElementById('vw-hex').value = hex.toUpperCase();
      commitColor(hex);
    }
    pick(event);
    function movePick(ev) { pick(ev); }
    function stop() {
      document.removeEventListener('pointermove', movePick);
      document.removeEventListener('pointerup', stop);
    }
    document.addEventListener('pointermove', movePick);
    document.addEventListener('pointerup', stop);
  });

  window.addEventListener('message', function (event) {
    if (!stateRef || !stateRef.editor || event.origin !== location.origin || !event.data) return;
    if (event.data.type === 'visiweb-ready') postDesign(true);
    if (event.data.type === 'visiweb-select') {
      if (ed().mode !== 'edit') return;
      ed().selectedElementId = event.data.id || '';
      ed().selectedKind = event.data.id ? (event.data.kind || 'text') : 'global';
      ed().selectedLabel = event.data.label || '';
      updateInspector();
      postDesign(true);
    }
    if (event.data.type === 'visiweb-text' && event.data.id) {
      if (!ed().design.elements[event.data.id]) ed().design.elements[event.data.id] = {};
      ed().design.elements[event.data.id].text = event.data.text;
      updateInspector();
    }
  });

  document.addEventListener('change', function (event) {
    if (!stateRef || !stateRef.editor || !event.target || event.target.dataset.canva !== 'image-file') return;
    var file = event.target.files && event.target.files[0];
    if (!file || !api.uploadImage) return;
    api.uploadImage(file).then(function (url) {
      elementItem().src = url;
      if (ed().selectedElementId === 'hero-photo') ed().cover_image_url = url;
      updateInspector();
      postDesign(true);
    }).catch(function () {});
  });

  window.VisiwebCanva = { sync: sync };
})();
