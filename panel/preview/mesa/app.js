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
      excellent: 'Excelente', reviews: 'valoraciones', reviewsTitle: 'Valoraciones',
      reviewsSample: 'Reseñas de ejemplo', infoK: 'Info',
      infoS: 'Teléfono, Dirección y Redes sociales',       search: 'Buscar ...',
      searchLabel: 'Buscar platos', clearSearch: 'Cerrar búsqueda',
      empty: 'No se han encontrado platos con ese nombre.',
      allergens: 'Alérgenos', filterTitle: 'Filtro de alérgenos', filterClear: 'Quitar filtros',
      filterEmpty: 'Ningún plato coincide con el filtro.', contains: 'Contiene',
      none: 'Sin alérgenos de declaración obligatoria.',
      add: 'Añadir a mi selección', variant: 'Variante', extras: 'Suplementos',
      rate: 'Valora tu experiencia', rateShort: 'Valora', mine: 'Mi selección',
      rateNote: 'Este botón llevaría a las reseñas del restaurante en Google para que el cliente deje la suya.',
      sub: 'Es tu lista personal para enseñar al camarero. No se envía ningún pedido.',
      total: 'Total', clear: 'Limpiar', close: 'Cerrar', drag: 'Desliza hacia abajo para cerrar',
      sharing: 'Compartiendo públicamente en Google',
      comida: 'Comida', servicio: 'Servicio', ambiente: 'Ambiente',
      details: 'Comparte detalles de tu experiencia en este lugar',
      photos: 'Añadir fotos', ordered: '¿Qué pediste?',
      meals: ['Desayuno', 'Brunch', 'Comida', 'Cena', 'Otro'],
      publish: 'Publicar', thanksTitle: 'Gracias',
      thanks: 'Esta demo no envía la valoración a Google.',
      back: 'Volver', phone: 'Teléfono', address: 'Dirección', socials: 'Redes sociales',
      socialsHint: 'Instagram, Facebook, X y TikTok',
      socialInstagram: 'En la web del local, esta flecha abre su Instagram: fotos, historias y novedades. Esta demo no abre la red ni envía datos.',
      socialFacebook: 'En la web del local, esta flecha abre su página de Facebook: horarios, eventos y publicaciones. Esta demo no abre la red ni envía datos.',
      socialX: 'En la web del local, esta flecha abre su perfil de X, para avisos cortos y novedades. Esta demo no abre la red ni envía datos.',
      socialTiktok: 'En la web del local, esta flecha abre su TikTok, con vídeos del restaurante. Esta demo no abre la red ni envía datos.',
      spain: 'España', addOne: 'Añadir', remove: 'Quitar uno', see: 'Ver',
      lang: 'Idioma: español', cats: 'Categorías', close: 'Cerrar',
      mapAlt: 'Mapa de Alcobendas', title: 'Taberna El Norte · Carta en mesa'
    },
    en: {
      excellent: 'Excellent', reviews: 'reviews', reviewsTitle: 'Reviews',
      reviewsSample: 'Sample reviews', infoK: 'Info',
      infoS: 'Phone, address and social media',       search: 'Search ...',
      searchLabel: 'Search dishes', clearSearch: 'Close search',
      empty: 'No dishes were found with that name.',
      allergens: 'Allergens', filterTitle: 'Allergen filter', filterClear: 'Clear filters',
      filterEmpty: 'No dishes match the filter.', contains: 'Contains',
      none: 'No allergens that must be declared.',
      add: 'Add to my selection', variant: 'Option', extras: 'Extras',
      rate: 'Rate your experience', rateShort: 'Rate', mine: 'My selection',
      rateNote: 'This button would open the restaurant’s Google reviews so the guest can leave one.',
      sub: 'Your personal list to show the waiter. No order is sent.',
      total: 'Total', clear: 'Clear', close: 'Close', drag: 'Swipe down to close',
      sharing: 'Posting publicly on Google',
      comida: 'Food', servicio: 'Service', ambiente: 'Atmosphere',
      details: 'Share details of your experience at this place',
      photos: 'Add photos', ordered: 'What did you order?',
      meals: ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Other'],
      publish: 'Post', thanksTitle: 'Thank you',
      thanks: 'This demo does not send the review to Google.',
      back: 'Back', phone: 'Phone', address: 'Address', socials: 'Social media',
      socialsHint: 'Instagram, Facebook, X and TikTok',
      socialInstagram: 'On the venue site, this arrow opens its Instagram: photos, stories and news. This demo does not open the network or send any data.',
      socialFacebook: 'On the venue site, this arrow opens its Facebook page: hours, events and posts. This demo does not open the network or send any data.',
      socialX: 'On the venue site, this arrow opens its X profile, for short updates and news. This demo does not open the network or send any data.',
      socialTiktok: 'On the venue site, this arrow opens its TikTok, with videos of the restaurant. This demo does not open the network or send any data.',
      spain: 'Spain', addOne: 'Add', remove: 'Remove one', see: 'View',
      lang: 'Language: English', cats: 'Categories', close: 'Close',
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
    const value = String(path);
    if (/^(https?:|data:)/.test(value)) return value;
    if (value.charAt(0) === '/') return value;
    return '/' + value.replace(/^\.\//, '');
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
    if (window.VISIWEB_RESTAURANT_SLUG) {
      return (D.menu || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        lead: cat.desc || { es: '', en: '' },
        items: (cat.items || []).map((item) => dish({
          id: item.id,
          name: item.name,
          desc: item.desc,
          long: item.desc,
          price: item.priceValue != null ? item.priceValue : euroFrom(item.price),
          allergens: item.allergens || [],
          tags: item.tags || [],
          featured: !!item.featured,
          image: item.image
        }))
      }));
    }
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
          es: 'Aliñadas al momento, con el vinagre de Módena de la casa.',
          en: 'Dressed to order, with the house balsamic.'
        },
        items: [
          dish({
            id: 'ensalada-atun',
            name: { es: 'Ensalada de atún', en: 'Tuna salad' },
            desc: {
              es: 'Lechuga, tomate, maíz, cebolla, atún y vinagre de Módena.',
              en: 'Lettuce, tomato, sweetcorn, onion, tuna and balsamic vinegar.'
            },
            long: {
              es: 'Lechuga, tomate, maíz, cebolla, atún en aceite y vinagre de Módena en crema. Se aliña al servir.',
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
              es: 'Hojas verdes, tomate, cebolla tierna y vinagreta de Módena.',
              en: 'Leaves, tomato, spring onion and a balsamic dressing.'
            },
            long: {
              es: 'Hojas verdes, tomate, cebolla tierna y vinagreta de Módena. Sin más adorno.',
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
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="6.25"/><path stroke-linecap="round" d="m16.6 16.6 4.2 4.2"/></svg>';
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

  function mesaOn(key) {
    const mesa = window.VISIWEB_DESIGN && window.VISIWEB_DESIGN.mesa;
    if (!mesa || typeof mesa[key] !== 'boolean') return true;
    return mesa[key];
  }

  function applyMesaFeatures() {
    const root = document.documentElement;
    root.dataset.vwPrices = mesaOn('prices') ? '1' : '0';
    root.dataset.vwTags = mesaOn('tags') ? '1' : '0';
    if (mesaOn('selection')) delete root.dataset.vwNoCart;
    else root.dataset.vwNoCart = '1';
    const search = $('btn-search');
    if (search) search.hidden = !mesaOn('search');
    const langBtn = $('btn-lang');
    if (langBtn) langBtn.hidden = !mesaOn('language');
    const allergenRow = document.querySelector('.mesa-allergen-row');
    if (allergenRow) allergenRow.hidden = !mesaOn('allergens');
  }

  function tagHtml(item) {
    if (!mesaOn('tags')) return '';
    const tags = item.tags || [];
    const bits = [];
    if (item.featured) bits.push('<span class="vw-tag">★</span>');
    if (tags.indexOf('sin_gluten') >= 0) bits.push('<span class="vw-tag">SG</span>');
    if (tags.indexOf('vegetariano') >= 0 || tags.indexOf('vegano') >= 0) bits.push('<span class="vw-tag">V</span>');
    if (tags.indexOf('picante') >= 0) bits.push('<span class="vw-tag">🌶</span>');
    return bits.length ? '<span class="vw-tags">' + bits.join('') + '</span>' : '';
  }

  function slotHtml(item) {
    const line = cart.get(item.id);
    const qty = line ? line.qty : 0;
    const photo = item.image
      ? '<button type="button" class="photo-hit" data-open="' + esc(item.id) + '" aria-label="' + esc(ui('see') + ' ' + L(item.name)) + '"><img src="' + esc(item.image) + '" alt=""></button>'
      : '';
    if (!mesaOn('selection')) return photo;
    const control = '<div class="slot-act' + (item.image ? '' : ' is-bare') + '">' + qtyControl(item, qty, openQty === item.id) + '</div>';
    return photo + control;
  }

  function renderIntro() {
    const score = D.reviews.score.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    const scoreLine = score + ' · ' + ui('excellent');
    const countLine = '(' + D.reviews.count + ' ' + ui('reviews') + ')';
    $('reviews-score').textContent = scoreLine;
    $('reviews-count').textContent = countLine;
    $('open-reviews').setAttribute('aria-label', scoreLine + ' ' + countLine);
    $('info-k').textContent = ui('infoK');
    $('info-s').textContent = ui('infoS');
    $('open-info').setAttribute('aria-label', ui('infoK') + ' · ' + ui('infoS'));
    $('btn-lang').setAttribute('aria-label', ui('lang'));
    actualizarBotonIdioma();
    $('btn-search').setAttribute('aria-label', ui('searchLabel'));
    $('search-back').setAttribute('aria-label', ui('back'));
    $('q').placeholder = ui('search');
    $('mesa-name').textContent = D.business.name;
    const heading = document.querySelector('.intro h1');
    if (heading) heading.textContent = D.business.name;
    if ($('hero') && D.images.hero) $('hero').src = img(D.images.hero);
    $('mesa-allergens-label').textContent = ui('allergens');
    $('mesa-filter-title').textContent = ui('filterTitle');
    $('mesa-allergens').setAttribute('aria-label', ui('allergens'));
    const clearFilters = $('mesa-filter-clear');
    if (clearFilters) clearFilters.textContent = ui('filterClear');
    $('mesa-cats').setAttribute('aria-label', ui('cats'));
    $('hero').alt = L(D.images.heroAlt);
    document.title = window.VISIWEB_RESTAURANT_SLUG
      ? D.business.name + (lang === 'en' ? ' · Table menu' : ' · Carta en mesa')
      : ui('title');
    document.documentElement.lang = lang === 'en' ? 'en' : 'es';
    $('dock-rate-label').textContent = ui('rate');
    $('dock-rate-mini-label').textContent = ui('rateShort');
    $('dock-mine-label').textContent = ui('mine');
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
    const note = document.createElement('p');
    note.id = 'mesa-filter-empty';
    note.className = 'mesa-filter-empty';
    note.hidden = true;
    note.textContent = ui('filterEmpty');
    menu.appendChild(note);
    currentCat = '';
    renderAllergenFilters();
    placeAllergen();
    applyAllergenFilter();
  }

  function placeAllergen() {
    const nav = $('mesa-cats');
    if (!nav) return;
    catsCover = 0;
    nav.style.paddingLeft = '';
  }

  function renderAllergenFilters() {
    const list = $('mesa-filter-list');
    if (!list) return;
    list.textContent = '';
    Object.keys(D.allergens).forEach((key) => {
      const spec = D.allergens[key];
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'mesa-filter-chip';
      chip.dataset.filter = key;
      chip.textContent = L(spec.name);
      chip.setAttribute('aria-pressed', allergenFilters.has(key) ? 'true' : 'false');
      list.appendChild(chip);
    });
    const clear = $('mesa-filter-clear');
    if (clear) clear.hidden = allergenFilters.size === 0;
    $('mesa-allergens').classList.toggle('is-on', allergenFilters.size > 0);
  }

  function applyAllergenFilter() {
    let visibleCats = 0;
    CATS.forEach((cat) => {
      const sec = $('cat-' + cat.id);
      const pill = document.querySelector('[data-spy="' + cat.id + '"]');
      if (!sec) return;
      let shown = 0;
      sec.querySelectorAll('.dish').forEach((row) => {
        const item = ITEMS.get(row.dataset.dish);
        const keys = item && item.allergens ? item.allergens : [];
        let hide = false;
        allergenFilters.forEach((key) => {
          if (keys.indexOf(key) >= 0) hide = true;
        });
        row.classList.toggle('is-hidden', hide);
        if (!hide) shown += 1;
      });
      const empty = shown === 0;
      sec.classList.toggle('is-hidden', empty);
      if (pill) pill.classList.toggle('is-hidden', empty);
      if (!empty) visibleCats += 1;
    });
    const note = $('mesa-filter-empty');
    if (note) note.hidden = allergenFilters.size === 0 || visibleCats > 0;
    const clear = $('mesa-filter-clear');
    if (clear) clear.hidden = allergenFilters.size === 0;
    $('mesa-allergens').classList.toggle('is-on', allergenFilters.size > 0);
    const active = document.querySelector('[data-spy][aria-current="true"]');
    if (!active || active.classList.contains('is-hidden')) {
      const next = document.querySelector('[data-spy]:not(.is-hidden)');
      if (next) setActive(next.dataset.spy);
    }
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
      (icons ? '<span class="algs">' + icons + '</span>' : '') + tagHtml(item) + '</h3>' +
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
    if (!mesaOn('selection')) {
      $('dock-rate').hidden = false;
      $('dock-split').hidden = true;
      return;
    }
    const n = totalQty();
    $('dock-rate').hidden = n > 0;
    $('dock-split').hidden = n === 0;
    $('dock-count').textContent = String(n);
  }

  function changeQty(id, delta) {
    if (!mesaOn('selection')) return;
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
  let catsCover = 0;
  const allergenFilters = new Set();

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
    ['dish', 'sel', 'info', 'review', 'socials'].forEach((other) => {
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
    if (D.business.addressLine) return D.business.addressLine;
    const addr = D.business.address;
    return L(addr.street) + ', ' + addr.postalCode + ' ' + addr.city + ', ' + ui('spain');
  }

  let socialsFrom = null;

  function renderSocials() {
    const chev = '<span class="chev" aria-hidden="true">›</span>';
    const row = (key, label) =>
      '<button type="button" class="irow" data-social="' + key + '"><span><strong>' + esc(label) + '</strong></span>' + chev + '</button>';
    $('socials-root').querySelector('.sheet-full').innerHTML =
      '<div class="rev-bar"><h2 id="soc-title">' + esc(ui('socials')) + '</h2><button type="button" class="soc-x" data-socials-back aria-label="' + esc(ui('close')) + '">' + closeSvg() + '</button></div>' +
      row('instagram', 'Instagram') + row('facebook', 'Facebook') + row('x', 'X') + row('tiktok', 'TikTok');
  }

  function placeMesaSocials() {
    const hero = document.querySelector('.hero');
    const top = hero ? Math.max(0, hero.getBoundingClientRect().bottom) : 0;
    document.documentElement.style.setProperty('--socials-top', top + 'px');
  }

  function openSocials(from) {
    socialsFrom = from || null;
    renderSocials();
    show('socials');
    placeMesaSocials();
  }

  function renderInfo() {
    $('info-root').querySelector('.sheet').innerHTML =
      '<div class="map-wrap"><img src="' + esc(window.VISIWEB_RESTAURANT_SLUG ? (D.images.hero || '') : (window.VISIWEB_ASSET ? window.VISIWEB_ASSET('demo/alcobendas-mapa.webp') : '')) + '" alt="' + esc(ui('mapAlt')) + '"><span class="pin" aria-hidden="true"></span>' +
      '<button type="button" class="sheet-x" data-close="info" aria-label="' + esc(ui('close')) + '">' + closeSvg() + '</button></div>' +
      '<a class="irow" href="tel:' + esc(D.business.phone) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.6 10.8a12.8 12.8 0 0 0 5.6 5.6l2-2a1 1 0 0 1 1-.2 9.6 9.6 0 0 0 3.5.6 1 1 0 0 1 1 1V19a1 1 0 0 1-1 1A17 17 0 0 1 4 6a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1 9.6 9.6 0 0 0 .6 3.5 1 1 0 0 1-.2 1l-2 2z"/></svg>' +
      '<span><strong>' + esc(ui('phone')) + '</strong><small>' + esc(D.business.phoneDisplay) + '</small></span><span class="chev" aria-hidden="true">›</span></a>' +
      '<div class="irow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.15"/></svg>' +
      '<span><strong>' + esc(ui('address')) + '</strong><small>' + esc(addressLine()) + '</small></span></div>' +
      '<button type="button" class="irow" data-open-socials><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="6.5" cy="12" r="2.1"/><circle cx="17.5" cy="6.5" r="2.1"/><circle cx="17.5" cy="17.5" r="2.1"/><path stroke-linecap="round" d="M8.4 11.1 15.4 7.4M8.5 12.9l6.9 3.6"/></svg>' +
      '<span><strong>' + esc(ui('socials')) + '</strong><small>' + esc(ui('socialsHint')) + '</small></span><span class="chev" aria-hidden="true">›</span></button>';
  }

  const SAMPLE_REVIEWS = [
    {
      name: 'Laura Benítez', color: '#7c4a2d', rating: 5,
      when: { es: 'hace 4 días', en: '4 days ago' },
      text: {
        es: 'He ido a comer con mi madre. Huevos rotos y media ración de croquetas, que al final nos hemos acabado entera. El huevo estaba líquido y el jamón no era la loncha gruesa de siempre. Con dos cañas nos hemos dejado 31 €. La cuenta nos la han traído cuando la hemos pedido, no a mitad del café.',
        en: 'I went for lunch with my mother. Huevos rotos and half a portion of croquettes, which we finished. The yolk was still runny and the ham was cut thin, not the usual thick slab. Two beers and the bill was €31. They brought it when we asked, not halfway through the coffee.'
      }
    },
    {
      name: 'Miguel Ángel R.', color: '#3f3f46', rating: 4,
      when: { es: 'hace 2 semanas', en: '2 weeks ago' },
      text: {
        es: 'La caña sale helada y eso en esta zona ya es mucho. El viernes a las dos había gente de pie en la barra y en la terraza tardaron un rato en tomarnos nota. Las bravas bien. El alioli, un poco fuerte para mi gusto. Entre semana se está más a gusto.',
        en: 'The beer arrives properly cold, which around here is already something. On Friday at two there were people standing at the bar, and they took a while to get to us on the terrace. The bravas were good. The aioli was a bit much for me. Weekdays are more comfortable.'
      }
    },
    {
      name: 'Sofía Romero', color: '#9a3412', rating: 5,
      when: { es: 'hace un mes', en: 'a month ago' },
      text: {
        es: 'Cumpleaños de mi suegro, siete. Pedí mesa en el salón de atrás y nos la respetaron. El pan lo iban reponiendo sin tener que avisar. Lo que más gustó fueron el lomo de orza y los pimientos de Padrón. El pan va a 1,20 por persona y viene puesto en la carta, así que no te enteras al pagar.',
        en: 'My father-in-law’s birthday, seven of us. I asked for the back dining room and they kept the table. They refilled the bread without us having to wave. The confit pork and the Padrón peppers went first. Bread is €1.20 a head and it is on the menu, so it is not a surprise when you pay.'
      }
    },
    {
      name: 'Pedro L.', color: '#44403c', rating: 3,
      when: { es: 'hace 2 meses', en: '2 months ago' },
      text: {
        es: 'La comida no está mal. Lo que me echó para atrás fue la mesa: sábado a las nueve y media, justo en la puerta, y cada vez que entraba alguien nos caía el aire. El salmón venía en su punto. Las verduras, sosas. Si reserváis, pedid dentro.',
        en: 'The food is fine. What put me off was the table: Saturday at half past nine, right by the door, and every time someone came in we got a draught. The salmon was cooked properly. The vegetables needed salt. If you book, ask to sit inside.'
      }
    },
    {
      name: 'Ana Castillo', color: '#57534e', rating: 5,
      when: { es: 'ayer', en: 'yesterday' },
      text: {
        es: 'Bajo casi todos los martes al menú porque trabajo aquí al lado, en Valdavia. Hoy lentejas y merluza, café incluido, 13,50. No es un sitio para impresionar a nadie. Es el sitio al que traes a alguien y comes bien sin mirar el móvil para ver la cuenta.',
        en: 'I come most Tuesdays for the set menu because I work next door, in Valdavia. Today it was lentils and hake, coffee included, €13.50. This is not a place you take someone to impress them. It is the place you take someone when you want to eat well and not check the bill on your phone.'
      }
    },
    {
      name: 'Iker M.', color: '#1c1917', rating: 5,
      when: { es: 'hace 6 días', en: '6 days ago' },
      text: {
        es: 'Vermut de grifo, naranja, aceituna y una tosta de gulas en la barra. Veinte minutos y nadie me ha dado conversación de más. El chico apunta en papel, que se agradece. Las gulas llevaban ajo de verdad, no de bote dulce.',
        en: 'Vermouth on tap, orange, an olive, and garlic baby-eel toast at the bar. Twenty minutes and nobody tried to make conversation. The guy writes the order on paper, which I like. Real garlic, not the sweet jar kind.'
      }
    },
    {
      name: 'Beatriz N.', color: '#78716c', rating: 4,
      when: { es: 'hace 3 semanas', en: '3 weeks ago' },
      text: {
        es: 'Fuimos con nuestra hija de ocho años. La tortilla se la pusieron sin cebolla y no pusieron mala cara. Las costillas bien, con el glaseado justo, no esa salsa que empacha. El baño de hombres pedía una limpieza. Lo demás, correcto.',
        en: 'We went with our eight-year-old. They made the tortilla without onion and did not make a fuss. The ribs were good, glazed but not sticky. The men’s toilet needed a clean. Everything else was fine.'
      }
    },
    {
      name: 'Jorge Salas', color: '#92400e', rating: 5,
      when: { es: 'hace 5 días', en: '5 days ago' },
      text: {
        es: 'Calamares nada más abrir, sobre las ocho menos veinte. El aceite no sabía a usado y el limón venía en un gajo aparte. Para lo que hay abierto en Alcobendas a esa hora, me quedo con este.',
        en: 'Squid just after they opened, around twenty to eight. The oil did not taste used and the lemon came on the side. For what is open in Alcobendas at that hour, this is the one I come back to.'
      }
    },
    {
      name: 'Rosa D.', color: '#a16207', rating: 5,
      when: { es: 'hace 3 días', en: '3 days ago' },
      text: {
        es: 'Caña doble y bravas. Igual que la última vez. Para mí con eso basta.',
        en: 'A double beer and bravas. Same as last time. That is enough for me.'
      }
    }
  ];

  function starRow(n) {
    let html = '<span class="rev-stars" aria-label="' + n + ' / 5">';
    for (let i = 1; i <= 5; i += 1) {
      html += '<svg class="' + (i <= n ? 'on' : '') + '" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3.2 14.7 8.7l6 .9-4.4 4.2 1 6L12 17.8 6.7 20.8l1-6L3.3 9.6l6-.9L12 3.2z"/></svg>';
    }
    return html + '</span>';
  }

  function renderReviewsList() {
    const dialog = $('review-root').querySelector('.sheet-full');
    const score = D.reviews.score.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    dialog.innerHTML =
      '<div class="rev-bar"><button type="button" class="back" data-close="review" aria-label="' + esc(ui('back')) + '">←</button><h2 id="rev-title">' + esc(ui('reviewsTitle')) + '</h2><span style="width:40px"></span></div>' +
      '<div class="rev-sum"><strong>' + esc(score) + '</strong>' + starRow(5) +
      '<p>' + esc(ui('excellent')) + ' · ' + D.reviews.count + ' ' + esc(ui('reviews')) + '</p></div>' +
      '<div class="rev-feed">' + (window.VISIWEB_RESTAURANT_SLUG ? [] : SAMPLE_REVIEWS).map((item) => (
        '<article class="rev-item"><div class="rev-who"><span class="avatar" style="background:' + item.color + '">' + esc(item.name.trim().charAt(0)) + '</span><div><strong>' + esc(item.name) + '</strong><span class="rev-meta">' + starRow(item.rating) + '<time>' + esc(item.when[lang] || item.when.es) + '</time></span></div></div><p>' + esc(item.text[lang] || item.text.es) + '</p></article>'
      )).join('') + '</div>';
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
      '<div class="rev-bar"><button type="button" class="back" data-close="review" aria-label="' + esc(ui('back')) + '">←</button><h2 id="rev-title">' + esc(D.business.name) + '</h2><span style="width:40px"></span></div>' +
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

  let rateNote = false;

  function renderRateNote() {
    const dialog = $('review-root').querySelector('.sheet-full');
    dialog.innerHTML = '<div class="thanks"><h2 id="rev-title">' + esc(ui('rate')) + '</h2><p>' + esc(ui('rateNote')) + '</p>' +
      '<button type="button" class="btn-close" data-close="review">' + esc(ui('close')) + '</button></div>';
  }

  function openRateNote() {
    rateNote = true;
    renderRateNote();
    show('review');
  }

  function openReview() {
    rateNote = false;
    renderReviewsList();
    show('review');
  }

  function paint() {
    applyMesaFeatures();
    renderIntro();
    renderMenu();
    updateDock();
    if (!$('dish-root').hidden && draft) renderDish();
    if (!$('sel-root').hidden) renderSelection();
    if (!$('info-root').hidden) renderInfo();
    if (!$('socials-root').hidden) renderSocials();
    if (!$('review-root').hidden) {
      if (rateNote) renderRateNote();
      else renderReviewsList();
    }
    if (window.VisiwebDesign && window.VisiwebDesign.markElements) window.VisiwebDesign.markElements();
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

  let langAnimating = false;

  function actualizarBotonIdioma() {
    if (langAnimating) return;
    const btnText = $('lang-text');
    if (!btnText) return;
    btnText.textContent = lang === 'en' ? 'EN' : 'ES';
    btnText.classList.remove('slide-out-up', 'slide-in-bottom');
  }

  function toggleIdioma() {
    if (langAnimating) return;
    const textEl = $('lang-text');
    const nextLang = lang === 'es' ? 'en' : 'es';
    const nextCode = nextLang === 'en' ? 'EN' : 'ES';
    const greeting = nextLang === 'en' ? 'Hello' : 'Hola';
    if (!textEl) {
      setLang(nextLang);
      return;
    }
    langAnimating = true;
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
          langAnimating = false;
        }, 200);
      }, 700);
    }, 200);
  }

  $('btn-lang').addEventListener('click', toggleIdioma);
  $('btn-search').addEventListener('click', () => toggleSearch());
  $('search-back').addEventListener('click', () => toggleSearch(false));
  $('q').addEventListener('input', renderSearch);
  $('open-reviews').addEventListener('click', openReview);
  $('dock-rate').addEventListener('click', openRateNote);
  $('dock-rate-mini').addEventListener('click', openRateNote);
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

  function placeAllergenPanel() {
    const panel = $('mesa-filter');
    const view = window.visualViewport;
    const viewH = view ? view.height : window.innerHeight;
    const viewTop = view ? view.offsetTop : 0;
    panel.style.top = '0px';
    const top = viewTop + Math.max(16, Math.round((viewH - panel.offsetHeight) / 2));
    panel.style.top = top + 'px';
  }

  function setAllergenPanel(open) {
    const root = $('mesa-filter-root');
    const btn = $('mesa-allergens');
    if (open && root.parentElement !== document.body) document.body.appendChild(root);
    root.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) placeAllergenPanel();
  }

  $('mesa-allergens').addEventListener('click', () => {
    setAllergenPanel($('mesa-filter-root').hidden);
  });
  $('mesa-filter-backdrop').addEventListener('click', () => setAllergenPanel(false));
  $('mesa-filter-close').addEventListener('click', () => setAllergenPanel(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('mesa-filter-root').hidden) setAllergenPanel(false);
  });
  $('mesa-filter-list').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-filter]');
    if (!chip) return;
    const key = chip.dataset.filter;
    if (allergenFilters.has(key)) allergenFilters.delete(key);
    else allergenFilters.add(key);
    chip.setAttribute('aria-pressed', allergenFilters.has(key) ? 'true' : 'false');
    applyAllergenFilter();
  });
  $('mesa-filter-clear').addEventListener('click', () => {
    allergenFilters.clear();
    $('mesa-filter-list').querySelectorAll('[data-filter]').forEach((chip) => {
      chip.setAttribute('aria-pressed', 'false');
    });
    applyAllergenFilter();
  });

  (function bindCatsDrag() {
    const row = $('mesa-cats');
    let dragPointer = 0;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let dragMoved = false;

    function endMouseDrag() {
      catsHold = false;
      dragPointer = 0;
      row.classList.remove('is-dragging');
    }

    row.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      catsHold = true;
      catsUser = true;
      catsX = event.clientX;
      catsLeft = row.scrollLeft;
      if (event.pointerType !== 'mouse') return;
      dragPointer = event.pointerId;
      dragStartX = event.clientX;
      dragStartScroll = row.scrollLeft;
      dragMoved = false;
    });
    row.addEventListener('pointermove', (event) => {
      if (event.pointerId !== dragPointer) return;
      const dx = event.clientX - dragStartX;
      if (!dragMoved) {
        if (Math.abs(dx) <= 5) return;
        dragMoved = true;
        row.classList.add('is-dragging');
        try { row.setPointerCapture(event.pointerId); } catch (err) {}
      }
      row.scrollLeft = dragStartScroll - dx;
      event.preventDefault();
    });
    row.addEventListener('click', (event) => {
      if (dragMoved) {
        event.preventDefault();
        event.stopPropagation();
        dragMoved = false;
        return;
      }
      const pill = event.target.closest('[data-spy]');
      if (!pill) return;
      const moved = Math.abs(event.clientX - catsX) > 5 || Math.abs(row.scrollLeft - catsLeft) > 4;
      if (moved) return;
      catsUser = false;
      catsDrifted = false;
      goTo(pill.dataset.spy);
    }, true);
    row.addEventListener('wheel', (event) => {
      if (row.scrollWidth - row.clientWidth <= 1) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
      const delta = horizontal
        ? (event.shiftKey ? event.deltaY : event.deltaX)
        : event.deltaY;
      if (!delta) return;
      catsUser = true;
      catsDrifted = true;
      row.scrollLeft += delta;
      event.preventDefault();
    }, { passive: false });
    row.addEventListener('scroll', () => {
      if (catsProg) return;
      if (catsUser || dragMoved) catsDrifted = true;
    }, { passive: true });
    document.addEventListener('pointerup', (event) => {
      if (event.pointerId === dragPointer) {
        const moved = dragMoved;
        endMouseDrag();
        if (moved) {
          window.setTimeout(() => { dragMoved = false; }, 0);
          return;
        }
        dragMoved = false;
        return;
      }
      catsHold = false;
    });
    document.addEventListener('pointercancel', (event) => {
      if (event.pointerId === dragPointer) endMouseDrag();
      catsHold = false;
      dragMoved = false;
    });
  })();
  $('hero-kicker').addEventListener('click', () => {
    const first = visibleSections()[0];
    if (!first) return;
    catsUser = false;
    catsDrifted = false;
    goTo(first.dataset.mesaCat);
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
    if (event.target.closest('[data-open-socials]')) openSocials('info');
    if (event.target.closest('[data-socials-back]')) {
      hide('socials');
      if (socialsFrom === 'info') {
        socialsFrom = null;
        renderInfo();
        show('info');
      }
    }
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
    if (!$('socials-root').hidden) {
      hide('socials');
      if (socialsFrom === 'info') {
        socialsFrom = null;
        renderInfo();
        show('info');
      }
      return;
    }
    const open = ['review', 'dish', 'sel', 'info'].filter((name) => !rootOf(name).hidden)[0];
    if (open) hide(open);
    else if (!$('search-root').hidden) toggleSearch(false);
  });

  window.addEventListener('resize', () => {
    placeAllergen();
    if (!$('socials-root').hidden) placeMesaSocials();
  });

  window.addEventListener('scroll', onSpy, { passive: true });
  $('btn-search').innerHTML = searchSvg();
  paint();
  onSpy();
  window.visiwebRepaintMesa = paint;
  if (document.documentElement.classList.contains('vw-editor') && window.parent !== window) {
    if (window.VisiwebDesign) window.VisiwebDesign.markTargets();
    window.parent.postMessage({ type: 'visiweb-ready', page: 'mesa' }, location.origin);
  }
})();
