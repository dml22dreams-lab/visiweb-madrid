/* VisiWeb Madrid · Modo QR en mesa (demo del plan de 790 €). Datos: demo-data.js */
(function () {
  'use strict';

  const D = window.VISIWEB_DEMO;
  if (!D) return;

  const STORE_LANG = 'visiweb-demo-lang';
  const cart = new Map();
  let openQty = null;
  let lang = initialLang();
  let draft = null;
  let spyLock = false;
  let currentCat = '';
  let scrollY = 0;
  let lastFocus = null;
  const review = blankReview();

  const UI = {
    es: {
      excellent: 'Excelente', reviews: 'valoraciones', infoK: 'Info',
      infoS: 'Teléfono, Dirección y Redes sociales',       search: 'Buscar ...',
      searchLabel: 'Buscar platos', clearSearch: 'Cerrar búsqueda',
      empty: 'No se han encontrado platos con ese nombre.',
      allergens: 'Alérgenos', contains: 'Contiene',
      none: 'Sin alérgenos de declaración obligatoria.',
      add: 'Añadir a mi selección', variant: 'Variante', extras: 'Suplementos',
      rate: 'Valora tu experiencia', rateShort: 'Valora', mine: 'Mi selección',
      sub: 'Tu lista personal para enseñar al camarero. No se envía ningún pedido.',
      total: 'Total', clear: 'Limpiar', close: 'Cerrar', drag: 'Desliza hacia abajo para cerrar',
      sharing: 'Compartiendo públicamente en Google',
      comida: 'Comida', servicio: 'Servicio', ambiente: 'Ambiente',
      details: 'Comparte detalles de tu experiencia en este lugar',
      photos: 'Añadir fotos', ordered: '¿Qué pediste?',
      meals: ['Desayuno', 'Brunch', 'Comida', 'Cena', 'Otro'],
      publish: 'Publicar', thanksTitle: 'Gracias',
      thanks: 'Esta demo no envía la valoración a Google.',
      back: 'Volver', phone: 'Teléfono', address: 'Dirección', instagram: 'Instagram',
      spain: 'España', addOne: 'Añadir', remove: 'Quitar uno', see: 'Ver',
      lang: 'Idioma: español', cats: 'Categorías', close: 'Cerrar',
      demoBar: 'Demo VisiWeb', viewSwitch: 'Vista de la demo', viewWeb: 'Web', viewMesa: 'QR Mesa',
      mapAlt: 'Mapa de Alcobendas', title: 'Taberna El Norte · Carta en mesa'
    },
    en: {
      excellent: 'Excellent', reviews: 'reviews', infoK: 'Info',
      infoS: 'Phone, address and social media',       search: 'Search ...',
      searchLabel: 'Search dishes', clearSearch: 'Close search',
      empty: 'No dishes were found with that name.',
      allergens: 'Allergens', contains: 'Contains',
      none: 'No allergens that must be declared.',
      add: 'Add to my selection', variant: 'Option', extras: 'Extras',
      rate: 'Rate your experience', rateShort: 'Rate', mine: 'My selection',
      sub: 'Your personal list to show the waiter. No order is sent.',
      total: 'Total', clear: 'Clear', close: 'Close', drag: 'Swipe down to close',
      sharing: 'Posting publicly on Google',
      comida: 'Food', servicio: 'Service', ambiente: 'Atmosphere',
      details: 'Share details of your experience at this place',
      photos: 'Add photos', ordered: 'What did you order?',
      meals: ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Other'],
      publish: 'Post', thanksTitle: 'Thank you',
      thanks: 'This demo does not send the review to Google.',
      back: 'Back', phone: 'Phone', address: 'Address', instagram: 'Instagram',
      spain: 'Spain', addOne: 'Add', remove: 'Remove one', see: 'View',
      lang: 'Language: English', cats: 'Categories', close: 'Close',
      demoBar: 'VisiWeb demo', viewSwitch: 'Demo view', viewWeb: 'Web', viewMesa: 'QR Mesa',
      mapAlt: 'Map of Alcobendas', title: 'Taberna El Norte · Table menu'
    }
  };

  const LEGAL = {
    gluten: { es: 'Cereales con gluten', en: 'Cereals containing gluten' },
    crustaceos: { es: 'Crustáceos', en: 'Crustaceans' },
    huevos: { es: 'Huevos', en: 'Eggs' },
    pescado: { es: 'Pescado', en: 'Fish' },
    cacahuetes: { es: 'Cacahuetes', en: 'Peanuts' },
    soja: { es: 'Soja', en: 'Soybeans' },
    lacteos: { es: 'Leche (incluye lactosa)', en: 'Milk (including lactose)' },
    frutos_cascara: { es: 'Frutos de cáscara', en: 'Nuts' },
    apio: { es: 'Apio', en: 'Celery' },
    mostaza: { es: 'Mostaza', en: 'Mustard' },
    sesamo: { es: 'Granos de sésamo', en: 'Sesame seeds' },
    sulfitos: { es: 'Dióxido de azufre y sulfitos', en: 'Sulphur dioxide and sulphites' },
    altramuces: { es: 'Altramuces', en: 'Lupin' },
    moluscos: { es: 'Moluscos', en: 'Molluscs' }
  };

  const MORE = {
    costillas: {
      es: 'Costillar glaseado, patatas fritas, tomate y encurtidos. Sale de la brasa al momento, con el hueso limpio y la salsa de la casa aparte.',
      en: 'Glazed pork ribs with chips, tomato and pickles. Cut to order off the grill, with the house sauce on the side.'
    },
    croquetas: {
      es: 'Seis unidades de bechamel fundente con jamón picado a cuchillo y rebozado crujiente. La ración de doce es para la mesa.',
      en: 'Six pieces of silky béchamel with hand-cut ham in a crisp coating. The twelve-piece plate is for the table.'
    },
    'huevos-rotos': {
      es: 'Patatas en bastones, dos huevos camperos rotos en mesa y virutas de jamón curado. Se sirven humeantes.',
      en: 'Thick-cut potatoes, two free-range eggs cracked over them at the table and cured ham shavings. Served hot.'
    },
    bravas: {
      es: 'Patata frita en dos tiempos, salsa brava de la casa y alioli montado al mortero. Pica lo justo.',
      en: 'Double-fried potatoes, our house brava sauce and aioli pounded in a mortar. Gently hot.'
    },
    calamares: {
      es: 'Anillas de calamar fresco enharinadas al momento y fritas en aceite limpio, con limón. Sin rebozado grueso.',
      en: 'Fresh squid rings floured to order and fried in clean oil, served with lemon. A thin coating, not a batter.'
    },
    salmon: {
      es: 'Salmón a la plancha, judías verdes, cuscús y tomate cherry. Punto justo, sin secarlo.',
      en: 'Griddled salmon with green beans, couscous and cherry tomatoes. Cooked through, still moist.'
    },
    'tosta-gulas': {
      es: 'Gulas (sucedáneo de angula) salteadas con ajo laminado, guindilla y aceite de oliva sobre pan de hogaza.',
      en: 'Surimi baby eels sautéed with sliced garlic, chilli and olive oil, on country bread.'
    },
    'montado-lomo': {
      es: 'Lomo de cerdo confitado a baja temperatura, pimiento verde asado y sal en escamas. Pan de hogaza tostado.',
      en: 'Pork loin confit at low temperature, roasted green pepper and sea salt flakes, on toasted country bread.'
    },
    padron: {
      es: 'Fritos en aceite de oliva y terminados con sal en escamas. Unos pican y otros no.',
      en: 'Fried in olive oil and finished with sea salt flakes. Some are hot, some are not.'
    },
    parrillada: {
      es: 'Calabacín, berenjena, pimiento y cebolla a la brasa, con aceite de oliva. Para compartir o de segundo.',
      en: 'Chargrilled courgette, aubergine, pepper and onion, with olive oil. To share, or as a main.'
    }
  };

  const CATS = buildMenu();
  const ITEMS = new Map();
  CATS.forEach((cat) => cat.items.forEach((item) => ITEMS.set(item.id, item)));

  const $ = (id) => document.getElementById(id);
  const ui = (key) => UI[lang][key];
  const L = (obj) => (obj && (obj[lang] || obj.es)) || '';

  function initialLang() {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'en' || fromUrl === 'es') return fromUrl;
    try {
      const stored = window.localStorage.getItem(STORE_LANG);
      if (stored === 'en' || stored === 'es') return stored;
    } catch (e) { /* almacenamiento bloqueado */ }
    return 'es';
  }

  function writeLang(value) {
    try { window.localStorage.setItem(STORE_LANG, value); } catch (e) { /* ignore */ }
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function norm(str) {
    return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function euroFrom(price) {
    const match = String(price).replace(/\s/g, '').match(/(\d+)[,.](\d{2})/);
    return match ? Number(match[1] + '.' + match[2]) : 0;
  }

  function formatMoney(n) {
    const num = n.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return lang === 'en' ? '€' + num : num + ' €';
  }

  function img(path) {
    if (!path) return '';
    return '../' + String(path).replace(/^\//, '');
  }

  function blankReview() {
    return { overall: 0, comida: 0, servicio: 0, ambiente: 0, meal: '', text: '', photos: [], done: false };
  }

  function fromMenu(id, extra) {
    let found = null;
    D.menu.forEach((cat) => {
      cat.items.forEach((item) => { if (item.id === id) found = item; });
    });
    const base = {
      id: found.id,
      name: found.name,
      desc: found.desc,
      long: (MORE[id] || found.desc),
      price: euroFrom(found.price),
      allergens: found.allergens || [],
      image: img(found.image),
      variants: [],
      extras: []
    };
    return Object.assign(base, extra || {});
  }

  function dish(spec) {
    return Object.assign({ variants: [], extras: [], allergens: [] }, spec, {
      image: img(spec.image)
    });
  }

  function buildMenu() {
    const glutenFree = {
      id: 'sin-gluten',
      name: { es: 'Extra pan sin gluten', en: 'Extra gluten-free bread' },
      price: 1.3
    };
    return [
      {
        id: 'casa',
        name: { es: 'De la casa', en: 'House specials' },
        lead: {
          es: 'Lo que pedimos nosotros cuando nos sentamos.',
          en: 'What we order when we sit down.'
        },
        items: [
          fromMenu('costillas', { extras: [glutenFree] }),
          fromMenu('croquetas', {
            variants: [
              { id: '6', name: { es: '6 unidades', en: '6 pieces' }, price: null },
              { id: '12', name: { es: '12 unidades', en: '12 pieces' }, price: 14.5 }
            ]
          }),
          fromMenu('huevos-rotos'),
          fromMenu('bravas')
        ]
      },
      {
        id: 'raciones',
        name: { es: 'Raciones', en: 'Sharing plates' },
        lead: {
          es: 'Para el centro de la mesa. Como debe ser.',
          en: 'For the middle of the table, the way it should be.'
        },
        items: [
          fromMenu('calamares'),
          fromMenu('salmon'),
          fromMenu('tosta-gulas', { extras: [glutenFree] }),
          fromMenu('montado-lomo', { extras: [glutenFree] }),
          fromMenu('padron'),
          fromMenu('parrillada')
        ]
      },
      {
        id: 'ensaladas',
        name: { es: 'Ensaladas', en: 'Salads' },
        lead: {
          es: 'Aliñadas al momento, con el vinagre de módena de la casa.',
          en: 'Dressed to order, with the house balsamic.'
        },
        items: [
          dish({
            id: 'ensalada-atun',
            name: { es: 'Ensalada de atún', en: 'Tuna salad' },
            desc: {
              es: 'Lechuga, tomate, maíz, cebolla, atún y vinagre de módena.',
              en: 'Lettuce, tomato, sweetcorn, onion, tuna and balsamic vinegar.'
            },
            long: {
              es: 'Lechuga, tomate, maíz, cebolla, atún en aceite y vinagre de módena en crema. Se aliña al servir.',
              en: 'Lettuce, tomato, sweetcorn, onion, oil-packed tuna and a balsamic cream. Dressed as it leaves the pass.'
            },
            price: 12,
            allergens: ['pescado'],
            image: 'assets/demo/primeros.webp'
          }),
          dish({
            id: 'cesar',
            name: { es: 'César El Norte', en: 'El Norte Caesar' },
            desc: {
              es: 'Lechuga, tomate, picatostes, pollo, queso y salsa césar.',
              en: 'Lettuce, tomato, croutons, chicken, cheese and Caesar dressing.'
            },
            long: {
              es: 'Lechuga, tomate, picatostes de hogaza, pollo a la plancha, queso y salsa césar de la casa.',
              en: 'Lettuce, tomato, country-bread croutons, griddled chicken, cheese and our Caesar dressing.'
            },
            price: 12,
            allergens: ['gluten', 'huevos', 'lacteos', 'pescado'],
            image: 'assets/demo/huevos.webp'
          }),
          dish({
            id: 'ensalada-casa',
            name: { es: 'Ensalada de la casa', en: 'House salad' },
            desc: {
              es: 'Hojas verdes, tomate, cebolla tierna y vinagreta de módena.',
              en: 'Leaves, tomato, spring onion and a balsamic dressing.'
            },
            long: {
              es: 'Hojas verdes, tomate, cebolla tierna y vinagreta de módena. Sin más adorno.',
              en: 'Leaves, tomato, spring onion and a balsamic dressing. Nothing else on it.'
            },
            price: 8.5,
            allergens: ['sulfitos'],
            image: 'assets/demo/parrillada.webp'
          })
        ]
      },
      {
        id: 'postres',
        name: { es: 'Postres', en: 'Desserts' },
        lead: {
          es: 'El cierre dulce. Hechos en casa, menos la fruta.',
          en: 'The sweet ending. Made here, except the fruit.'
        },
        items: [
          dish({
            id: 'flan',
            name: { es: 'Flan de huevo', en: 'Crème caramel' },
            desc: {
              es: 'Flan de huevo casero, con el caramelo todavía líquido.',
              en: 'Homemade crème caramel, with the caramel still runny.'
            },
            long: {
              es: 'Flan de huevo casero, cuajado al baño maría, con el caramelo todavía líquido.',
              en: 'Homemade egg custard, baked in a bain-marie, with the caramel still runny.'
            },
            price: 4.5,
            allergens: ['huevos', 'lacteos'],
            image: 'assets/demo/flan-huevo.webp'
          }),
          dish({
            id: 'arroz-leche',
            name: { es: 'Arroz con leche', en: 'Rice pudding' },
            desc: {
              es: 'Arroz con leche, canela y piel de limón. Templado o frío.',
              en: 'Rice pudding with cinnamon and lemon zest. Warm or cold.'
            },
            long: {
              es: 'Arroz con leche, canela en rama y piel de limón. Se puede pedir templado o de nevera.',
              en: 'Rice pudding with a cinnamon stick and lemon zest. Ask for it warm or from the fridge.'
            },
            price: 4.8,
            allergens: ['lacteos'],
            image: 'assets/demo/menu-postres.webp'
          }),
          dish({
            id: 'fruta',
            name: { es: 'Fruta de temporada', en: 'Seasonal fruit' },
            desc: {
              es: 'Pieza de fruta de temporada, pelada en cocina si hace falta.',
              en: 'A piece of seasonal fruit, peeled in the kitchen when it needs it.'
            },
            long: {
              es: 'Pieza de fruta de temporada. Si hay que pelarla, se pela en cocina.',
              en: 'A piece of seasonal fruit. If it needs peeling, the kitchen does it.'
            },
            price: 3.5,
            allergens: [],
            image: 'assets/demo/postres.webp'
          })
        ]
      },
      {
        id: 'bebidas',
        name: { es: 'Bebidas', en: 'Drinks' },
        lead: {
          es: 'Tirador limpio cada mañana y la copa a su temperatura.',
          en: 'Beer lines cleaned every morning, and wine at the right temperature.'
        },
        items: [
          fromMenu('cana-doble', {
            variants: [
              { id: 'cana', name: { es: 'Caña', en: 'Small draught' }, price: 1.9 },
              { id: 'doble', name: { es: 'Caña doble', en: 'Double draught' }, price: null }
            ]
          }),
          fromMenu('rioja', {
            variants: [
              { id: 'copa', name: { es: 'Copa', en: 'Glass' }, price: null },
              { id: 'botella', name: { es: 'Botella', en: 'Bottle' }, price: 16 }
            ]
          }),
          fromMenu('ribera'),
          fromMenu('vermut')
        ]
      }
    ];
  }

  function joinList(parts) {
    if (parts.length < 2) return parts[0] || '';
    const conj = lang === 'en' ? ' and ' : ' y ';
    return parts.slice(0, -1).join(', ') + conj + parts[parts.length - 1];
  }

  function legalName(key) {
    return (LEGAL[key] && LEGAL[key][lang]) || '';
  }

  function allergenIcon(key) {
    const spec = D.allergens[key];
    if (!spec) return '';
    const label = legalName(key) || L(spec.name);
    return '<span class="alg" title="' + esc(label) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + spec.icon + '</svg></span>';
  }

  function plusSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" d="M12 6v12M6 12h12"/></svg>';
  }

  function trashSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 7h14M10 7V5h4v2M8 7l.7 12h6.6L16 7"/></svg>';
  }

  function closeSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" d="M8 8l8 8M16 8 8 16"/></svg>';
  }

  function searchSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.25"/><path stroke-linecap="round" d="m16 16 4 4"/></svg>';
  }

  function variantOf(item, id) {
    if (!item.variants.length) return null;
    return item.variants.filter((v) => v.id === id)[0] || item.variants[0];
  }

  function variantPrice(item, variantId) {
    const variant = variantOf(item, variantId);
    if (!variant || variant.price == null) return item.price;
    return variant.price;
  }

  function unitPrice(item, line) {
    let total = variantPrice(item, line.variantId);
    item.extras.forEach((extra) => {
      if (line.extras.indexOf(extra.id) >= 0) total += extra.price;
    });
    return Math.round(total * 100) / 100;
  }

  function emptyLine(item) {
    return {
      qty: 0,
      variantId: item.variants.length ? item.variants[0].id : null,
      extras: []
    };
  }

  function totalQty() {
    let n = 0;
    cart.forEach((line) => { n += line.qty; });
    return n;
  }

  function totalMoney() {
    let n = 0;
    cart.forEach((line, id) => { n += unitPrice(ITEMS.get(id), line) * line.qty; });
    return Math.round(n * 100) / 100;
  }

  function minusSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" d="M6 12h12"/></svg>';
  }

  function qtyControl(item, qty, expanded) {
    const id = esc(item.id);
    const name = L(item.name);
    if (!qty) {
      return '<button type="button" class="fab" data-add="' + id + '" aria-label="' + esc(ui('addOne') + ' ' + name) + '">' + plusSvg() + '</button>';
    }
    if (!expanded) {
      return '<button type="button" class="qty-badge" data-qty-open="' + id + '" aria-label="' + esc(qty + ' ' + name) + '">' + qty + '</button>';
    }
    return '<div class="qty-pill">' +
      '<button type="button" class="qty-hit" data-dec="' + id + '" aria-label="' + esc(ui('remove') + ' ' + name) + '">' + (qty > 1 ? minusSvg() : trashSvg()) + '</button>' +
      '<span class="qty">' + qty + '</span>' +
      '<button type="button" class="qty-hit" data-add="' + id + '" aria-label="' + esc(ui('addOne') + ' ' + name) + '">' + plusSvg() + '</button>' +
      '</div>';
  }

  function slotHtml(item) {
    const line = cart.get(item.id);
    const qty = line ? line.qty : 0;
    const control = '<div class="slot-act' + (item.image ? '' : ' is-bare') + '">' + qtyControl(item, qty, openQty === item.id) + '</div>';
    if (!item.image) return control;
    return '<button type="button" class="photo-hit" data-open="' + esc(item.id) + '" aria-label="' + esc(ui('see') + ' ' + L(item.name)) + '">' +
      '<img src="' + esc(item.image) + '" alt="">' +
      '</button>' + control;
  }

  function renderIntro() {
    const score = D.reviews.score.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    const rating = score + ' · ' + ui('excellent') + ' · ' + D.reviews.count + ' ' + ui('reviews');
    $('reviews-line').textContent = rating;
    $('open-reviews').setAttribute('aria-label', rating);
    $('info-k').textContent = ui('infoK');
    $('info-s').textContent = ui('infoS');
    $('open-info').setAttribute('aria-label', ui('infoK') + ' · ' + ui('infoS'));
    $('btn-lang').setAttribute('aria-label', ui('lang'));
    $('btn-lang').firstChild.textContent = (lang === 'en' ? 'EN' : 'ES') + ' ';
    $('btn-search').setAttribute('aria-label', ui('searchLabel'));
    $('search-back').setAttribute('aria-label', ui('back'));
    $('q').placeholder = ui('search');
    $('mesa-name').textContent = D.business.name;
    $('mesa-cats').setAttribute('aria-label', ui('cats'));
    $('hero').alt = L(D.images.heroAlt);
    document.title = ui('title');
    document.documentElement.lang = lang === 'en' ? 'en' : 'es';
    $('dock-rate-label').textContent = ui('rate');
    $('dock-rate-mini-label').textContent = ui('rateShort');
    $('dock-mine-label').textContent = ui('mine');
    $('demo-bar-label').textContent = ui('demoBar');
    $('view-switch').setAttribute('aria-label', ui('viewSwitch'));
    $('view-web').textContent = ui('viewWeb');
    $('view-web').setAttribute('href', lang === 'en' ? '../demo.html?lang=en' : '../demo.html');
    $('view-mesa').textContent = ui('viewMesa');
  }

  function renderMenu() {
    const nav = $('mesa-cats');
    const menu = $('menu');
    nav.textContent = '';
    menu.textContent = '';
    CATS.forEach((cat, index) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'pill';
      pill.dataset.spy = cat.id;
      pill.textContent = L(cat.name);
      if (index === 0) pill.setAttribute('aria-current', 'true');
      nav.appendChild(pill);

      const section = document.createElement('section');
      section.className = 'mesa-cat';
      section.id = 'cat-' + cat.id;
      section.dataset.mesaCat = cat.id;
      const band = document.createElement('div');
      band.className = 'cat-band';
      const heading = document.createElement('h2');
      heading.textContent = L(cat.name);
      const lead = document.createElement('p');
      lead.className = 'lead';
      lead.textContent = L(cat.lead);
      band.append(heading, lead);
      section.appendChild(band);

      cat.items.forEach((item) => appendDish(section, item));
      menu.appendChild(section);
    });
    currentCat = '';
  }

  function appendDish(parent, item) {
    const row = document.createElement('article');
    row.className = 'dish';
    row.dataset.dish = item.id;
    const hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'dish-hit';
    hit.dataset.open = item.id;
    const icons = item.allergens.map(allergenIcon).join('');
    hit.innerHTML = '<h3 class="dish-name"><span>' + esc(L(item.name)) + '</span>' +
      (icons ? '<span class="algs">' + icons + '</span>' : '') + '</h3>' +
      '<p class="dish-desc">' + esc(L(item.desc)) + '</p>' +
      '<p class="dish-price">' + esc(formatMoney(item.price)) + '</p>';
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.slot = item.id;
    slot.innerHTML = slotHtml(item);
    row.append(hit, slot);
    parent.appendChild(row);
  }

  function patchSlots() {
    document.querySelectorAll('[data-slot]').forEach((slot) => {
      slot.innerHTML = slotHtml(ITEMS.get(slot.dataset.slot));
    });
    updateDock();
    if (!$('sel-root').hidden) renderSelection();
  }

  function updateDock() {
    const n = totalQty();
    $('dock-rate').hidden = n > 0;
    $('dock-split').hidden = n === 0;
    $('dock-count').textContent = String(n);
  }

  function changeQty(id, delta) {
    const item = ITEMS.get(id);
    if (!item) return;
    const line = cart.get(id) || emptyLine(item);
    line.qty += delta;
    if (line.qty <= 0) {
      cart.delete(id);
      if (openQty === id) openQty = null;
    } else cart.set(id, line);
    patchSlots();
    if (cart.size === 0 && !$('sel-root').hidden) hide('sel');
  }

  function visibleSections() {
    return Array.prototype.filter.call(
      document.querySelectorAll('[data-mesa-cat]'),
      (sec) => !sec.classList.contains('is-hidden')
    );
  }

  let catsHold = false;
  let catsUser = false;
  let catsDrifted = false;
  let catsProg = false;
  let catsX = 0;
  let catsLeft = 0;

  function centerPill(id, behavior) {
    const pill = document.querySelector('[data-spy="' + id + '"]');
    const scroller = $('mesa-cats');
    if (!pill || pill.classList.contains('is-hidden')) return;
    const left = Math.max(0, pill.offsetLeft - (scroller.clientWidth - pill.clientWidth) / 2);
    if (Math.abs(scroller.scrollLeft - left) < 2) return;
    catsProg = true;
    scroller.scrollTo({ left: left, behavior: behavior || 'auto' });
    setTimeout(() => { catsProg = false; }, behavior === 'smooth' ? 500 : 40);
  }

  function setActive(id) {
    if (!id || currentCat === id) return;
    currentCat = id;
    document.querySelectorAll('[data-spy]').forEach((pill) => {
      if (pill.dataset.spy === id) pill.setAttribute('aria-current', 'true');
      else pill.removeAttribute('aria-current');
    });
    if (!catsHold && !catsDrifted) centerPill(id, 'auto');
  }

  function collapseQty() {
    if (!openQty) return;
    openQty = null;
    patchSlots();
  }

  function onSpy() {
    collapseQty();
    const bar = $('mesa-bar');
    const sections = visibleSections();
    const first = sections[0];
    const show = !!first && first.getBoundingClientRect().top <= bar.offsetHeight;
    bar.classList.toggle('is-on', show);
    if (spyLock || !sections.length) return;
    const edge = bar.getBoundingClientRect().bottom;
    let current = sections[0];
    sections.forEach((sec) => {
      if (sec.getBoundingClientRect().top <= edge) current = sec;
    });
    const next = sections[sections.indexOf(current) + 1];
    if (next) {
      const name = current.querySelector('.dish:last-child .dish-name');
      const band = next.querySelector('.cat-band') || next;
      const nameGone = !name || name.getBoundingClientRect().bottom <= edge;
      const nextTop = band.getBoundingClientRect().top;
      if (nameGone && nextTop <= edge + band.offsetHeight) current = next;
    }
    const id = current.dataset.mesaCat;
    const drifted = catsDrifted && !catsHold;
    if (drifted) catsDrifted = false;
    const same = currentCat === id;
    setActive(id);
    if (drifted && same) centerPill(id, 'smooth');
  }

  function pinDemoBar() {
    const bar = document.querySelector('.demo-bar');
    if (bar) document.documentElement.style.setProperty('--demo-bar', bar.offsetHeight + 'px');
  }

  function goTo(id) {
    const sec = $('cat-' + id);
    if (!sec || sec.classList.contains('is-hidden')) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = sec.getBoundingClientRect().top + window.scrollY - $('mesa-bar').offsetHeight + 1;
    spyLock = true;
    currentCat = '';
    setActive(id);
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    let timer;
    const done = () => {
      spyLock = false;
      window.removeEventListener('scroll', wait);
    };
    const wait = () => {
      clearTimeout(timer);
      timer = setTimeout(done, 120);
    };
    window.addEventListener('scroll', wait, { passive: true });
    setTimeout(done, 900);
  }

  function both(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return (value.es || '') + ' ' + (value.en || '');
  }

  function renderSearch() {
    const box = $('search-results');
    const words = norm($('q').value.trim()).split(/\s+/).filter(Boolean);
    box.textContent = '';
    if (!words.length) return;
    const seen = new Set();
    const hits = [];
    CATS.forEach((cat) => {
      cat.items.forEach((item) => {
        if (seen.has(item.id)) return;
        const hay = norm(both(item.name) + ' ' + both(item.desc));
        if (!words.every((word) => hay.indexOf(word) >= 0)) return;
        seen.add(item.id);
        hits.push(item);
      });
    });
    if (!hits.length) {
      const empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = ui('empty');
      box.appendChild(empty);
      return;
    }
    hits.forEach((item) => appendDish(box, item));
  }

  function toggleSearch(force) {
    const root = $('search-root');
    const open = typeof force === 'boolean' ? force : root.hidden;
    root.hidden = !open;
    document.body.classList.toggle('is-searching', open);
    $('btn-search').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      renderSearch();
      $('q').focus();
    } else {
      $('q').value = '';
      $('search-results').textContent = '';
    }
  }

  function lock() {
    scrollY = window.scrollY;
    document.body.classList.add('is-locked');
    document.body.style.top = '-' + scrollY + 'px';
  }

  function unlock() {
    document.body.classList.remove('is-locked');
    document.body.style.top = '';
    window.scrollTo(0, scrollY);
  }

  function rootOf(name) {
    return $(name + '-root');
  }

  function show(name) {
    ['dish', 'sel', 'info', 'review'].forEach((other) => {
      if (other !== name && !rootOf(other).hidden) hide(other, true);
    });
    const root = rootOf(name);
    lastFocus = document.activeElement;
    root.hidden = false;
    lock();
    const dialog = root.querySelector('[role="dialog"]');
    if (dialog) dialog.focus();
  }

  function hide(name, keepLock) {
    const root = rootOf(name);
    if (root.hidden) return;
    root.hidden = true;
    if (!keepLock) {
      unlock();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  }

  function openDish(id) {
    const item = ITEMS.get(id);
    if (!item) return;
    const line = cart.get(id);
    draft = {
      id: id,
      variantId: line ? line.variantId : (item.variants[0] ? item.variants[0].id : null),
      extras: line ? line.extras.slice() : []
    };
    renderDish();
    show('dish');
  }

  function renderDish() {
    const item = ITEMS.get(draft.id);
    const names = item.allergens.map(legalName).filter(Boolean);
    const shown = unitPrice(item, draft);
    let variants = '';
    if (item.variants.length) {
      variants = '<h3 class="block-title">' + esc(ui('variant')) + '</h3><div class="opts">' +
        item.variants.map((variant) => {
          const amount = variant.price == null ? item.price : variant.price;
          const on = variant.id === draft.variantId;
          return '<button type="button" class="opt" data-variant="' + esc(variant.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '"><span>' +
            esc(L(variant.name)) + '</span><b>' + esc(formatMoney(amount)) + '</b></button>';
        }).join('') + '</div>';
    }
    let extras = '';
    if (item.extras.length) {
      extras = '<h3 class="block-title">' + esc(ui('extras')) + '</h3><div class="opts">' +
        item.extras.map((extra) => {
          const on = draft.extras.indexOf(extra.id) >= 0;
          return '<button type="button" class="opt" data-extra="' + esc(extra.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '"><span>' +
            esc(L(extra.name)) + '</span><b>+' + esc(formatMoney(extra.price)) + '</b></button>';
        }).join('') + '</div>';
    }
    const allergenBlock = names.length
      ? '<h3 class="block-title">' + esc(ui('allergens')) + '</h3><p class="sheet-copy">' + esc(ui('contains') + ' ' + joinList(names)) + '.</p><ul class="alg-list">' +
        item.allergens.map((key) => '<li>' + allergenIcon(key) + '<span>' + esc(legalName(key)) + '</span></li>').join('') + '</ul>'
      : '<h3 class="block-title">' + esc(ui('allergens')) + '</h3><p class="sheet-copy">' + esc(ui('none')) + '</p>';
    const breakdown = item.extras.map((extra) => L(extra.name) + ': ' + formatMoney(extra.price)).join(' · ');
    const photo = item.image
      ? '<div class="sheet-photo" role="img" aria-label="' + esc(L(item.name)) + '" style="background-image:url(&quot;' + esc(item.image) + '&quot;)"></div>'
      : '';
    $('dish-root').querySelector('.sheet').innerHTML =
      '<button type="button" class="sheet-x" data-close="dish" aria-label="' + esc(ui('close')) + '">' + closeSvg() + '</button>' +
      photo +
      '<div class="sheet-body">' +
        '<h2 id="dish-title">' + esc(L(item.name)) + '</h2>' +
        '<p class="sheet-price">' + esc(formatMoney(shown)) + (breakdown ? ' · ' + esc(breakdown) : '') + '</p>' +
        '<p class="sheet-copy">' + esc(L(item.long)) + '</p>' +
        variants + extras + allergenBlock +
      '</div>' +
      '<div class="sheet-cta"><button type="button" id="dish-add">' + esc(ui('add')) + '</button></div>';
  }

  function addDraft() {
    const item = ITEMS.get(draft.id);
    const line = cart.get(draft.id) || emptyLine(item);
    line.qty += 1;
    line.variantId = draft.variantId;
    line.extras = draft.extras.slice();
    cart.set(draft.id, line);
    hide('dish');
    patchSlots();
  }

  function renderSelection() {
    const rows = [];
    cart.forEach((line, id) => {
      const item = ITEMS.get(id);
      const variant = variantOf(item, line.variantId);
      const extraNames = item.extras.filter((extra) => line.extras.indexOf(extra.id) >= 0).map((extra) => L(extra.name));
      const meta = [variant ? L(variant.name) : ''].concat(extraNames).filter(Boolean).join(' · ');
      rows.push('<li><div class="sel-copy"><p class="sel-name">' + esc(L(item.name)) + '</p>' +
        (meta ? '<p class="sel-meta">' + esc(meta) + '</p>' : '') +
        '<p class="sel-price">' + esc(formatMoney(unitPrice(item, line) * line.qty)) + '</p></div>' +
        qtyControl(item, line.qty, true) + '</li>');
    });
    $('sel-root').querySelector('.sheet').innerHTML =
      '<div class="handle" role="button" aria-label="' + esc(ui('drag')) + '"></div>' +
      '<header class="sheet-head"><h2 id="sel-title">' + esc(ui('mine')) + '</h2><p>' + esc(ui('sub')) + '</p></header>' +
      '<ul class="sel-list">' + rows.join('') + '</ul>' +
      '<div class="sel-total"><span>' + esc(ui('total')) + '</span><strong>' + esc(formatMoney(totalMoney())) + '</strong></div>' +
      '<div class="sel-actions"><button type="button" class="btn-clear" id="sel-clear">' + trashSvg() + esc(ui('clear')) + '</button>' +
      '<button type="button" class="btn-close" data-close="sel">' + esc(ui('close')) + '</button></div>';
  }

  function addressLine() {
    const addr = D.business.address;
    return L(addr.street) + ', ' + addr.postalCode + ' ' + addr.city + ', ' + ui('spain');
  }

  function renderInfo() {
    $('info-root').querySelector('.sheet').innerHTML =
      '<div class="map-wrap"><img src="../assets/demo/alcobendas-mapa.webp" alt="' + esc(ui('mapAlt')) + '"><span class="pin" aria-hidden="true"></span>' +
      '<button type="button" class="sheet-x" data-close="info" aria-label="' + esc(ui('close')) + '">' + closeSvg() + '</button></div>' +
      '<a class="irow" href="tel:' + esc(D.business.phone) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.6 10.8a12.8 12.8 0 0 0 5.6 5.6l2-2a1 1 0 0 1 1-.2 9.6 9.6 0 0 0 3.5.6 1 1 0 0 1 1 1V19a1 1 0 0 1-1 1A17 17 0 0 1 4 6a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1 9.6 9.6 0 0 0 .6 3.5 1 1 0 0 1-.2 1l-2 2z"/></svg>' +
      '<span><strong>' + esc(ui('phone')) + '</strong><small>' + esc(D.business.phoneDisplay) + '</small></span><span class="chev" aria-hidden="true">›</span></a>' +
      '<div class="irow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.15"/></svg>' +
      '<span><strong>' + esc(ui('address')) + '</strong><small>' + esc(addressLine()) + '</small></span></div>' +
      '<a class="irow" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.2" cy="6.8" r=".7" fill="currentColor" stroke="none"/></svg>' +
      '<span><strong>' + esc(ui('instagram')) + '</strong><small>@tabernaelnorte</small></span><span class="chev" aria-hidden="true">›</span></a>';
  }

  function starSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2 14.7 8.7l6 .9-4.4 4.2 1 6L12 17.8 6.7 20.8l1-6L3.3 9.6l6-.9L12 3.2z"/></svg>';
  }

  function starsHtml(group, value, mini) {
    let html = '<div role="radiogroup" aria-label="' + esc(ui(group === 'overall' ? 'rate' : group)) + '">';
    const cls = mini ? 'mini-star' : 'star';
    for (let i = 1; i <= 5; i += 1) {
      html += '<button type="button" class="' + cls + '" role="radio" data-group="' + group + '" data-star="' + i + '" aria-checked="' + (i <= value ? 'true' : 'false') + '" aria-label="' + i + '"></button>';
    }
    return html + '</div>';
  }

  function renderReview() {
    const dialog = $('review-root').querySelector('.sheet-full');
    if (review.done) {
      dialog.innerHTML = '<div class="thanks"><h2 id="rev-title">' + esc(ui('thanksTitle')) + '</h2><p>' + esc(ui('thanks')) + '</p>' +
        '<button type="button" class="btn-close" data-close="review">' + esc(ui('close')) + '</button></div>';
      return;
    }
    const groups = ['comida', 'servicio', 'ambiente'];
    dialog.innerHTML =
      '<div class="rev-bar"><button type="button" class="back" data-close="review" aria-label="' + esc(ui('back')) + '">←</button><h2 id="rev-title">Taberna El Norte</h2><span style="width:40px"></span></div>' +
      '<div class="who"><span class="avatar" aria-hidden="true">D</span><span><strong>Diego</strong><small>' + esc(ui('sharing')) + '</small></span></div>' +
      '<div class="stars">' + starsHtml('overall', review.overall, false).replace('<div role="radiogroup" aria-label="' + esc(ui('rate')) + '">', '').replace('</div>', '') + '</div>' +
      groups.map((group) => '<div class="subrate"><span>' + esc(ui(group)) + '</span>' + starsHtml(group, review[group], true) + '</div>').join('') +
      '<textarea id="rev-text" class="rev-text" placeholder="' + esc(ui('details')) + '">' + esc(review.text) + '</textarea>' +
      '<button type="button" class="add-photo" id="rev-photo">' + esc(ui('photos')) + '</button>' +
      '<input id="rev-file" type="file" accept="image/*" multiple hidden>' +
      (review.photos.length ? '<div class="thumbs">' + review.photos.map((photo, index) => '<img src="' + esc(photo.url) + '" alt="" data-drop-photo="' + index + '">').join('') + '</div>' : '') +
      '<p class="ask">' + esc(ui('ordered')) + '</p><div class="meals">' +
      ui('meals').map((meal) => '<button type="button" class="meal" data-meal="' + esc(meal) + '" aria-pressed="' + (review.meal === meal ? 'true' : 'false') + '">' + esc(meal) + '</button>').join('') +
      '</div><button type="button" class="pub" id="rev-pub"' + (review.overall ? '' : ' disabled') + '>' + esc(ui('publish')) + '</button>';
    const box = dialog.querySelector('.stars');
    box.setAttribute('role', 'radiogroup');
    box.setAttribute('aria-label', ui('rate'));
    box.querySelectorAll('[data-star]').forEach((btn) => {
      btn.innerHTML = starSvg();
    });
    dialog.querySelectorAll('.mini-star').forEach((btn) => { btn.innerHTML = starSvg(); });
  }

  function openReview() {
    review.photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    const fresh = blankReview();
    Object.keys(fresh).forEach((key) => { review[key] = fresh[key]; });
    review.photos = [];
    renderReview();
    show('review');
  }

  function paint() {
    renderIntro();
    renderMenu();
    updateDock();
    if (!$('dish-root').hidden && draft) renderDish();
    if (!$('sel-root').hidden) renderSelection();
    if (!$('info-root').hidden) renderInfo();
    if (!$('review-root').hidden) renderReview();
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    writeLang(next);
    const q = $('q').value;
    const searchOpen = !$('search-root').hidden;
    paint();
    if (!searchOpen) return;
    $('search-root').hidden = false;
    document.body.classList.add('is-searching');
    $('btn-search').setAttribute('aria-expanded', 'true');
    $('q').value = q;
    renderSearch();
  }

  $('btn-lang').addEventListener('click', () => setLang(lang === 'es' ? 'en' : 'es'));
  $('btn-search').addEventListener('click', () => toggleSearch());
  $('search-back').addEventListener('click', () => toggleSearch(false));
  $('q').addEventListener('input', renderSearch);
  $('open-reviews').addEventListener('click', openReview);
  $('dock-rate').addEventListener('click', openReview);
  $('dock-rate-mini').addEventListener('click', openReview);
  $('open-info').addEventListener('click', () => { renderInfo(); show('info'); });
  $('dock-mine').addEventListener('click', () => { renderSelection(); show('sel'); });

  (function bindSelDrag() {
    const sheet = $('sel-root').querySelector('.sheet');
    let startY = 0;
    let dragging = false;

    function resetSheet() {
      sheet.style.transition = '';
      sheet.style.transform = '';
      sheet.style.animation = '';
    }

    function settle(close) {
      sheet.style.transition = 'transform .22s ease';
      sheet.style.transform = close ? 'translateY(110%)' : 'translateY(0)';
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        sheet.removeEventListener('transitionend', finish);
        if (close) {
          hide('sel');
          requestAnimationFrame(resetSheet);
        } else resetSheet();
      };
      sheet.addEventListener('transitionend', finish);
      setTimeout(finish, 280);
    }

    sheet.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.handle')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragging = true;
      startY = event.clientY;
      sheet.style.animation = 'none';
      sheet.style.transition = 'none';
      sheet.setPointerCapture(event.pointerId);
    });
    sheet.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const dy = Math.max(0, event.clientY - startY);
      sheet.style.transform = 'translateY(' + dy + 'px)';
    });
    function endDrag(event) {
      if (!dragging) return;
      dragging = false;
      const dy = Math.max(0, event.clientY - startY);
      settle(dy > 72);
    }
    sheet.addEventListener('pointerup', endDrag);
    sheet.addEventListener('pointercancel', endDrag);
  })();

  $('mesa-cats').addEventListener('pointerdown', (event) => {
    catsHold = true;
    catsUser = true;
    catsX = event.clientX;
    catsLeft = $('mesa-cats').scrollLeft;
  });
  $('mesa-cats').addEventListener('pointerup', () => { catsHold = false; });
  $('mesa-cats').addEventListener('pointercancel', () => { catsHold = false; });
  $('mesa-cats').addEventListener('scroll', () => {
    if (catsProg) return;
    if (catsUser) catsDrifted = true;
  }, { passive: true });
  $('mesa-cats').addEventListener('click', (event) => {
    const pill = event.target.closest('[data-spy]');
    if (!pill) return;
    const moved = Math.abs(event.clientX - catsX) > 8 || Math.abs($('mesa-cats').scrollLeft - catsLeft) > 4;
    if (moved) return;
    catsUser = false;
    catsDrifted = false;
    goTo(pill.dataset.spy);
  });

  function onDishClick(event) {
    const add = event.target.closest('[data-add]');
    const dec = event.target.closest('[data-dec]');
    const badge = event.target.closest('[data-qty-open]');
    const open = event.target.closest('[data-open]');
    if (add) {
      openQty = add.dataset.add;
      changeQty(add.dataset.add, 1);
      return;
    }
    if (dec) {
      openQty = dec.dataset.dec;
      changeQty(dec.dataset.dec, -1);
      return;
    }
    if (badge) {
      openQty = badge.dataset.qtyOpen;
      patchSlots();
      return;
    }
    if (open) openDish(open.dataset.open);
  }

  $('menu').addEventListener('click', onDishClick);
  $('search-results').addEventListener('click', onDishClick);
  $('search-results').addEventListener('scroll', collapseQty, { passive: true });

  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-close]');
    if (close && event.target.closest('.overlay')) hide(close.dataset.close);

    const dishRoot = $('dish-root');
    if (!dishRoot.hidden) {
      const variant = event.target.closest('[data-variant]');
      const extra = event.target.closest('[data-extra]');
      if (variant) {
        draft.variantId = variant.dataset.variant;
        renderDish();
      } else if (extra) {
        const id = extra.dataset.extra;
        const at = draft.extras.indexOf(id);
        if (at >= 0) draft.extras.splice(at, 1);
        else draft.extras.push(id);
        renderDish();
      } else if (event.target.closest('#dish-add')) addDraft();
    }

    const selRoot = $('sel-root');
    if (!selRoot.hidden) {
      const add = event.target.closest('#sel-root [data-add]');
      const dec = event.target.closest('#sel-root [data-dec]');
      if (add) changeQty(add.dataset.add, 1);
      else if (dec) changeQty(dec.dataset.dec, -1);
      else if (event.target.closest('#sel-clear')) {
        cart.clear();
        openQty = null;
        patchSlots();
        hide('sel');
      }
    }

    if (openQty && !event.target.closest('.slot-act')) {
      openQty = null;
      patchSlots();
    }

    const reviewRoot = $('review-root');
    if (!reviewRoot.hidden && !review.done) {
      const star = event.target.closest('#review-root [data-star]');
      const meal = event.target.closest('#review-root [data-meal]');
      if (star) {
        review[star.dataset.group] = Number(star.dataset.star);
        renderReview();
      } else if (meal) {
        review.meal = review.meal === meal.dataset.meal ? '' : meal.dataset.meal;
        renderReview();
      } else if (event.target.closest('#rev-photo')) $('rev-file').click();
      else if (event.target.closest('#rev-pub') && review.overall) {
        review.done = true;
        renderReview();
      }
    }
  });

  $('review-root').addEventListener('input', (event) => {
    if (event.target.id === 'rev-text') review.text = event.target.value;
  });
  $('review-root').addEventListener('change', (event) => {
    if (event.target.id !== 'rev-file') return;
    Array.prototype.forEach.call(event.target.files, (file) => {
      if (!file.type || file.type.indexOf('image/') !== 0) return;
      if (review.photos.length >= 3) return;
      review.photos.push({ url: URL.createObjectURL(file), name: file.name });
    });
    renderReview();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = ['review', 'dish', 'sel', 'info'].filter((name) => !rootOf(name).hidden)[0];
    if (open) hide(open);
    else if (!$('search-root').hidden) toggleSearch(false);
  });

  window.addEventListener('scroll', onSpy, { passive: true });
  pinDemoBar();
  $('btn-search').innerHTML = searchSvg();
  paint();
  onSpy();
})();
