/* =====================================================================
   VisiWeb Madrid · Plantilla de carta digital
   ---------------------------------------------------------------------
   FUENTE ÚNICA DE DATOS. Para reutilizar la plantilla con otro cliente
   solo hay que editar este archivo (nombre, dirección, teléfono,
   horarios, carta, fotos y reseñas). demo.html no contiene datos.

   Datos actuales: FICTICIOS (web de demostración).
   ===================================================================== */
window.VISIWEB_DEMO = (function () {
  'use strict';

  /* --- Créditos del desarrollador ---------------------------------- */
  const DEVELOPER = {
    name: 'VisiWeb Madrid',
    plansUrl: 'https://visiwebmadrid.com/#planes',
    whatsapp: '34608975906'
  };

  /* --- Negocio ------------------------------------------------------ */
  const BUSINESS = {
    name: 'Taberna El Norte',
    type: { es: 'Cervecería y raciones', en: 'Beer house & sharing plates' },
    since: 1998,
    timezone: 'Europe/Madrid',
    priceRange: '€€',
    cuisine: ['Spanish', 'Tapas'],
    phone: '+34608975906',
    phoneDisplay: '+34 608 97 59 06',
    whatsapp: '34608975906',
    address: {
      street: { es: 'C. del Marqués de la Valdavia', en: 'C. del Marqués de la Valdavia' },
      postalCode: '28100',
      city: 'Alcobendas',
      region: 'Madrid',
      country: 'ES'
    },
    // Centro aproximado de Alcobendas: no corresponde a ningún local real
    geo: { lat: 40.5411, lng: -3.6417 },
    mapQuery: 'Alcobendas, Madrid, España'
  };

  /* --- Imágenes ------------------------------------------------------
     Pon aquí la ruta de la foto real (preferiblemente .webp).
     Si el valor es null se dibuja un marcador de posición neutro.
     Cada plato admite además su propio campo `image`.
  ------------------------------------------------------------------- */
  const photo = (file) => 'assets/demo/' + file;

  const IMAGES = {
    hero: photo('hero.jpg'),
    heroAlt: {
      es: 'Interior de la taberna con la barra de madera y las mesas preparadas',
      en: 'Inside the tavern, with the wooden bar and tables set for service'
    },
    facade: photo('fachada.jpg'),
    salon: photo('salon.jpg'),
    salon2: photo('salon-2.jpg'),
    terrace: photo('terraza.jpg'),
    bar: photo('barra.jpg')
  };

  const LOCAL = {
    rooms: [
      {
        id: 'fachada',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        title: { es: 'Fachada', en: 'Façade' },
        desc: { es: 'En el corazón de Alcobendas, con la puerta abierta al barrio.', en: 'In the heart of Alcobendas, with the door open to the neighbourhood.' }
      },
      {
        id: 'salon',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        title: { es: 'El salón', en: 'The dining room' },
        desc: { es: 'Madera, luz baja y mesas para quedarse. 42 cubiertos en sala.', en: 'Wood, low light and tables you want to linger at. 42 covers inside.' }
      },
      {
        id: 'barra',
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
        title: { es: 'La barra', en: 'The bar' },
        desc: { es: 'Caña doble bien fría y el vermut de grifo. El sitio de siempre.', en: 'An ice-cold double draught and vermouth on tap. The usual spot.' }
      },
      {
        id: 'terraza',
        image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=800&q=80',
        title: { es: 'Terraza', en: 'Terrace' },
        desc: { es: '16 plazas al aire. Reservas de terraza, preferencia al mediodía.', en: '16 seats outdoors. Terrace bookings are easiest at lunchtime.' }
      }
    ],
    stats: [
      { label: { es: 'Sala', en: 'Inside' }, value: '42' },
      { label: { es: 'Terraza', en: 'Terrace' }, value: '16' },
      { label: { es: 'Desde', en: 'Since' }, value: '1998' }
    ]
  };

  const HISTORY = {
    title: { es: 'Nuestra historia', en: 'Our story' },
    lead: {
      es: 'Abrimos en 1998 como taberna de barrio. Seguimos siendo eso: raciones para compartir, cocina de cuchara y la caña que pide el vecino.',
      en: 'We opened in 1998 as a neighbourhood tavern. That is still what we are: sharing plates, slow-cooked specials and the beer the regulars ask for.'
    },
    chapters: [
      {
        year: '1998',
        title: { es: 'La primera caña', en: 'The first pint' },
        text: {
          es: 'Una barra corta, cuatro mesas y la receta de las bravas que aún no hemos tocado. El Norte nació para el mediodía de Alcobendas.',
          en: 'A short bar, four tables and the bravas recipe we still have not touched. El Norte was born for lunchtime in Alcobendas.'
        }
      },
      {
        year: '2010',
        title: { es: 'El salón de atrás', en: 'The back room' },
        text: {
          es: 'Abrimos el comedor. Más cubiertos, misma cocina. Las croquetas pasaron de tapa a ración porque nadie pedía solo una.',
          en: 'We opened the dining room. More covers, the same kitchen. Croquettes went from a tapa to a sharing plate because nobody ever ordered just one.'
        }
      },
      {
        year: { es: 'Hoy', en: 'Today' },
        title: { es: 'El sabor de siempre', en: 'The flavour you remember' },
        text: {
          es: 'Carta corta, producto de mercado y el menú del día de martes a viernes. Sin postureo: ven a comer.',
          en: 'A short menu, market produce and a set lunch Tuesday to Friday. No fuss: come and eat.'
        }
      }
    ]
  };

  const GBP = {
    category: { es: 'Cervecería · Raciones y tapas', en: 'Beer house · Tapas & sharing plates' },
    attributes: [
      { es: 'Terraza', en: 'Outdoor seating' },
      { es: 'Reservas', en: 'Takes reservations' },
      { es: 'Menú del día', en: 'Set lunch' },
      { es: 'Carta con alérgenos', en: 'Allergen-labelled menu' },
      { es: 'Grupos', en: 'Group-friendly' },
      { es: 'Pago con tarjeta', en: 'Card payments' }
    ]
  };

  const BOOKING = {
    maxGuests: 8,
    slotMinutes: 30,
    lastSeatingBeforeClose: 30,
    areas: ['any', 'salon', 'terrace', 'bar']
  };

  const FEATURED = ['bravas', 'croquetas', 'huevos-rotos', 'tosta-solomillo', 'cana-doble', 'menu-completo'];

  /* --- Horarios: FUENTE ÚNICA ----------------------------------------
     Clave = día de la semana JS (0 domingo … 6 sábado).
     Valor = lista de tramos [apertura, cierre] en formato 24 h.
     '24:00' significa medianoche del día siguiente.
     Lista vacía = cerrado.
  ------------------------------------------------------------------- */
  const HOURS = {
    0: [['12:00', '17:00']],
    1: [],
    2: [['12:00', '16:00'], ['19:30', '23:30']],
    3: [['12:00', '16:00'], ['19:30', '23:30']],
    4: [['12:00', '16:00'], ['19:30', '23:30']],
    5: [['12:00', '24:00']],
    6: [['12:00', '24:00']]
  };

  /* --- Los 14 alérgenos de declaración obligatoria (UE 1169/2011) ----
     `icon` es el contenido de un <svg viewBox="0 0 24 24"> con
     stroke="currentColor". Nombres oficiales.
  ------------------------------------------------------------------- */
  const ALLERGENS = {
    gluten: {
      short: 'GLU',
      name: { es: 'Cereales con gluten', en: 'Cereals containing gluten' },
      icon: '<path d="M12 21v-8"/><path d="M12 13c-2.2 0-3.6-1.5-3.6-3.8 2.2 0 3.6 1.5 3.6 3.8Zm0 0c2.2 0 3.6-1.5 3.6-3.8-2.2 0-3.6 1.5-3.6 3.8Z"/><path d="M12 8.6c-2.2 0-3.6-1.5-3.6-3.8 2.2 0 3.6 1.5 3.6 3.8Zm0 0c2.2 0 3.6-1.5 3.6-3.8-2.2 0-3.6 1.5-3.6 3.8Z"/>'
    },
    crustaceos: {
      short: 'CRU',
      name: { es: 'Crustáceos', en: 'Crustaceans' },
      icon: '<path d="M7 14a5 5 0 0 1 10 0v2a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3Z"/><path d="M9 9 6.5 5.5M15 9l2.5-3.5M5 13H3M21 13h-2"/>'
    },
    huevos: {
      short: 'HUE',
      name: { es: 'Huevos', en: 'Eggs' },
      icon: '<path d="M12 3c3.3 0 6 4.6 6 8.6S15.3 19 12 19s-6-3.4-6-7.4S8.7 3 12 3Z"/>'
    },
    pescado: {
      short: 'PES',
      name: { es: 'Pescado', en: 'Fish' },
      icon: '<path d="M3 12c3-4 6.5-5 9.5-5 3.6 0 6.5 2.3 8.5 5-2 2.7-4.9 5-8.5 5-3 0-6.5-1-9.5-5Z"/><circle cx="16.5" cy="10.5" r=".6" fill="currentColor"/><path d="M8 7.5 6 5M8 16.5 6 19"/>'
    },
    cacahuetes: {
      short: 'CAC',
      name: { es: 'Cacahuetes', en: 'Peanuts' },
      icon: '<path d="M12 3c2.5 0 4.2 1.7 4.2 4 0 1.4-.7 2.3-.7 3.4 0 1.2.9 2 .9 3.6 0 3.3-2.2 6-5.4 6-2.9 0-5.1-2.2-5.1-5.2 0-1.6.8-2.5.8-3.7 0-1.2-.8-2.1-.8-3.6C5.9 4.9 8.2 3 12 3Z"/><path d="M7.4 11.6h8.6"/>'
    },
    soja: {
      short: 'SOJ',
      name: { es: 'Soja', en: 'Soybeans' },
      icon: '<path d="M6 17c-2-3-1.6-7.7 1.3-10C10.6 4.4 15.5 5 18 8c2.2 2.6 1.6 7.4-1.4 9.6C13.4 20 8.2 20 6 17Z"/><circle cx="10" cy="11" r="1.1"/><circle cx="14.5" cy="14" r="1.1"/>'
    },
    lacteos: {
      short: 'LAC',
      name: { es: 'Leche y derivados', en: 'Milk and dairy' },
      icon: '<path d="M9 3h6l-.8 3.2L17 10v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l2.8-3.8Z"/><path d="M7 13h10"/>'
    },
    frutos_cascara: {
      short: 'FRU',
      name: { es: 'Frutos de cáscara', en: 'Tree nuts' },
      icon: '<path d="M12 3c4.4 0 8 3.4 8 7.8 0 5-3.8 10.2-8 10.2S4 15.8 4 10.8C4 6.4 7.6 3 12 3Z"/><path d="M12 6v12M9 9.5l6 5M15 9.5l-6 5"/>'
    },
    apio: {
      short: 'API',
      name: { es: 'Apio', en: 'Celery' },
      icon: '<path d="M8 21c-1-5-1.3-11 .6-18M12 21c0-6 .3-12 1-18M16 21c1-5 1.6-10.5 0-18"/><path d="M6 8h12"/>'
    },
    mostaza: {
      short: 'MOS',
      name: { es: 'Mostaza', en: 'Mustard' },
      icon: '<path d="M10 3h4v2.5l2.5 2.5V19a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V8l2.5-2.5Z"/><path d="M9.5 12h5"/>'
    },
    sesamo: {
      short: 'SES',
      name: { es: 'Granos de sésamo', en: 'Sesame seeds' },
      icon: '<ellipse cx="8.5" cy="9" rx="2.2" ry="3.4" transform="rotate(-25 8.5 9)"/><ellipse cx="15.5" cy="11" rx="2.2" ry="3.4" transform="rotate(20 15.5 11)"/><ellipse cx="11" cy="16.5" rx="2.2" ry="3.4" transform="rotate(-10 11 16.5)"/>'
    },
    sulfitos: {
      short: 'SUL',
      name: { es: 'Dióxido de azufre y sulfitos', en: 'Sulphur dioxide and sulphites' },
      icon: '<circle cx="9" cy="13" r="2.4"/><circle cx="15" cy="13" r="2.4"/><circle cx="12" cy="17.6" r="2.4"/><path d="M12 10.6V5c0-1.1.9-2 2-2"/>'
    },
    altramuces: {
      short: 'ALT',
      name: { es: 'Altramuces', en: 'Lupin' },
      icon: '<path d="M12 21V12"/><path d="M12 12c-2.4 0-4-1.7-4-4.2 0-2.6 1.8-4.8 4-4.8s4 2.2 4 4.8C16 10.3 14.4 12 12 12Z"/><path d="M9.5 16.5H6M18 16.5h-3.5"/>'
    },
    moluscos: {
      short: 'MOL',
      name: { es: 'Moluscos', en: 'Molluscs' },
      icon: '<path d="M12 20c-4.4 0-8-3.3-8-7.4C4 8.2 7.6 5 12 5s8 3.2 8 7.6c0 4.1-3.6 7.4-8 7.4Z"/><path d="M12 20V5M12 20 7 7.5M12 20l5-12.5"/>'
    }
  };

  /* --- Etiquetas informativas (NO son alérgenos) -------------------- */
  const DIET_TAGS = {
    recomendado: { name: { es: 'Recomendado', en: 'Recommended' } },
    picante: { name: { es: 'Picante', en: 'Spicy' } },
    vegetariano: { name: { es: 'Vegetariano', en: 'Vegetarian' } }
  };

  /* --- Carta ---------------------------------------------------------
     anchor: permite abrir una pestaña con la URL (#menu-del-dia).
     allergens: claves de ALLERGENS · tags: claves de DIET_TAGS.
     image: null = marcador de posición neutro.
  ------------------------------------------------------------------- */
  const MENU = [
    {
      id: 'raciones',
      anchor: 'raciones',
      name: { es: 'Raciones clásicas', en: 'Classic sharing plates' },
      desc: {
        es: 'Para compartir en el centro de la mesa. Como debe ser.',
        en: 'Made to share in the middle of the table, the way it should be.'
      },
      items: [
        {
          id: 'bravas',
          name: { es: 'Patatas bravas caseras con alioli', en: 'Homemade patatas bravas with aioli' },
          desc: {
            es: 'Patata frita en dos tiempos, salsa brava de la casa y alioli montado al mortero.',
            en: 'Double-fried potatoes, our house brava sauce and aioli pounded in a mortar.'
          },
          price: '7,50 €',
          priceEn: '€7.50',
          allergens: ['huevos'],
          tags: ['recomendado', 'picante', 'vegetariano'],
          image: photo('bravas.jpg')
        },
        {
          id: 'croquetas',
          name: { es: 'Croquetas cremosas de jamón ibérico', en: 'Creamy Ibérico ham croquettes' },
          desc: {
            es: 'Seis unidades de bechamel fundente con jamón picado a cuchillo y rebozado crujiente.',
            en: 'Six pieces of silky béchamel with hand-cut ham in a crisp coating.'
          },
          price: '9,20 €',
          priceEn: '€9.20',
          allergens: ['gluten', 'lacteos', 'huevos'],
          tags: [],
          image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 'calamares',
          name: { es: 'Calamares a la andaluza', en: 'Andalusian-style fried squid' },
          desc: {
            es: 'Anillas de calamar fresco enharinadas al momento y fritas en aceite limpio, con limón.',
            en: 'Fresh squid rings floured to order and fried in clean oil, served with lemon.'
          },
          price: '12,90 €',
          priceEn: '€12.90',
          allergens: ['gluten', 'moluscos'],
          tags: [],
          image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 'huevos-rotos',
          name: { es: 'Huevos rotos con jamón', en: 'Broken eggs with cured ham' },
          desc: {
            es: 'Patatas en bastones, dos huevos camperos rotos en mesa y virutas de jamón curado.',
            en: 'Thick-cut potatoes, two free-range eggs broken at the table and cured ham shavings.'
          },
          price: '13,80 €',
          priceEn: '€13.80',
          allergens: ['huevos'],
          tags: [],
          image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=400&q=80'
        }
      ]
    },
    {
      id: 'tostas',
      anchor: 'tostas',
      name: { es: 'Tostas y montados', en: 'Toasts & rolls' },
      desc: {
        es: 'Pan de hogaza tostado en plancha. Para la caña de media tarde.',
        en: 'Sourdough toasted on the griddle. Perfect with an afternoon beer.'
      },
      items: [
        {
          id: 'tosta-solomillo',
          name: { es: 'Tosta de solomillo con brie', en: 'Beef tenderloin and brie toast' },
          desc: {
            es: 'Medallones de solomillo a la plancha, brie fundido y cebolla caramelizada.',
            en: 'Griddled tenderloin medallions, melted brie and caramelised onion.'
          },
          price: '8,90 €',
          priceEn: '€8.90',
          allergens: ['gluten', 'lacteos'],
          tags: ['recomendado'],
          image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 'tosta-gulas',
          name: { es: 'Tosta de gulas al ajillo', en: 'Garlic baby-eel-style toast' },
          desc: {
            es: 'Gulas (sucedáneo de angula) salteadas con ajo laminado, guindilla y aceite de oliva.',
            en: 'Surimi baby eels sautéed with sliced garlic, chilli and olive oil.'
          },
          price: '7,60 €',
          priceEn: '€7.60',
          allergens: ['gluten', 'pescado', 'soja'],
          tags: ['picante'],
          image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 'montado-lomo',
          name: { es: 'Montado de lomo de orza', en: 'Confit pork loin roll' },
          desc: {
            es: 'Lomo de cerdo confitado a baja temperatura, pimiento verde asado y sal en escamas.',
            en: 'Pork loin confit at low temperature, roasted green pepper and sea salt flakes.'
          },
          price: '6,40 €',
          priceEn: '€6.40',
          allergens: ['gluten'],
          tags: [],
          image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80'
        }
      ]
    },
    {
      id: 'menu-del-dia',
      anchor: 'menu-del-dia',
      name: { es: 'Menú del día', en: 'Menu of the day' },
      desc: {
        es: 'De martes a viernes, de 12:00 a 16:00. Alérgenos según el plato elegido.',
        en: 'Tuesday to Friday, 12:00 to 16:00. Allergens depend on the dishes you choose.'
      },
      items: [
        {
          id: 'primeros',
          name: { es: 'Primeros a elegir', en: 'Starters (choose one)' },
          desc: {
            es: 'Sopa castellana con huevo, lentejas estofadas, ensalada de la casa o macarrones boloñesa.',
            en: 'Castilian garlic soup with egg, stewed lentils, house salad or macaroni bolognese.'
          },
          price: 'Incluido',
          priceEn: 'Included',
          allergens: ['gluten', 'huevos', 'apio', 'lacteos'],
          tags: [],
          image: photo('primeros.jpg')
        },
        {
          id: 'segundos',
          name: { es: 'Segundos a elegir', en: 'Mains (choose one)' },
          desc: {
            es: 'Merluza a la plancha, pollo asado al limón, estofado de ternera o tortilla de patatas.',
            en: 'Griddled hake, roast lemon chicken, beef stew or Spanish potato omelette.'
          },
          price: 'Incluido',
          priceEn: 'Included',
          allergens: ['pescado', 'huevos', 'gluten', 'apio'],
          tags: [],
          image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 'postres',
          name: { es: 'Postre casero o café', en: 'Homemade dessert or coffee' },
          desc: {
            es: 'Flan de huevo, arroz con leche, natillas o fruta de temporada.',
            en: 'Crème caramel, rice pudding, custard or seasonal fruit.'
          },
          price: 'Incluido',
          priceEn: 'Included',
          allergens: ['lacteos', 'huevos'],
          tags: ['vegetariano'],
          image: photo('postres.jpg')
        },
        {
          id: 'menu-completo',
          name: { es: 'Menú completo', en: 'Full set menu' },
          desc: {
            es: 'Primero, segundo, postre o café, pan de hogaza y bebida incluidos.',
            en: 'Starter, main, dessert or coffee, sourdough bread and a drink included.'
          },
          price: '13,50 €',
          priceEn: '€13.50',
          allergens: [],
          allergenNote: {
            es: 'Según platos seleccionados',
            en: 'Depends on the dishes you choose'
          },
          tags: ['recomendado'],
          image: photo('menu.jpg')
        }
      ]
    },
    {
      id: 'bebidas',
      anchor: 'vinos-y-cervezas',
      name: { es: 'Vinos y cervezas', en: 'Wines & beers' },
      desc: {
        es: 'Tirador limpio cada mañana y bodega servida a su temperatura.',
        en: 'Beer lines cleaned every morning and wines served at the right temperature.'
      },
      items: [
        {
          id: 'cana-doble',
          name: { es: 'Caña doble bien fría', en: 'Ice-cold double draught beer' },
          desc: {
            es: 'Tirada en copa helada con dos dedos de corona. La referencia del barrio.',
            en: 'Poured into a frosted glass with two fingers of head. The neighbourhood benchmark.'
          },
          price: '2,80 €',
          priceEn: '€2.80',
          allergens: ['gluten'],
          tags: ['recomendado'],
          image: photo('cana.jpg')
        },
        {
          id: 'rioja',
          name: { es: 'Copa de Rioja crianza (D.O.)', en: 'Glass of Rioja Crianza (D.O.)' },
          desc: {
            es: 'Tempranillo con catorce meses en barrica. Fruta roja madura y final especiado.',
            en: 'Tempranillo aged fourteen months in oak. Ripe red fruit and a spiced finish.'
          },
          price: '3,20 €',
          priceEn: '€3.20',
          allergens: ['sulfitos'],
          tags: [],
          image: photo('rioja.jpg')
        },
        {
          id: 'ribera',
          name: { es: 'Copa de Ribera del Duero (D.O.)', en: 'Glass of Ribera del Duero (D.O.)' },
          desc: {
            es: 'Potente y aterciopelado. Nuestro imprescindible con los huevos rotos.',
            en: 'Bold and velvety. Our must-have with the broken eggs.'
          },
          price: '3,60 €',
          priceEn: '€3.60',
          allergens: ['sulfitos'],
          tags: ['recomendado'],
          image: photo('ribera.jpg')
        },
        {
          id: 'vermut',
          name: { es: 'Vermut rojo de grifo', en: 'Red vermouth on tap' },
          desc: {
            es: 'Servido con hielo, rodaja de naranja y aceituna rellena.',
            en: 'Served over ice with an orange slice and a stuffed olive.'
          },
          price: '2,90 €',
          priceEn: '€2.90',
          allergens: ['sulfitos'],
          tags: [],
          image: photo('vermut.jpg')
        }
      ]
    }
  ];

  /* --- Reseñas (DATOS DE DEMOSTRACIÓN) ------------------------------ */
  const REVIEWS = {
    score: 4.8,
    count: 128,
    items: [
      {
        author: 'Marta G.',
        rating: 5,
        text: {
          es: 'Las croquetas son de las mejores que he probado en la zona y la caña entra helada. Trato cercano desde que cruzas la puerta.',
          en: 'The croquettes are among the best I have tried nearby and the beer arrives ice-cold. Warm welcome from the moment you walk in.'
        }
      },
      {
        author: 'Javier R.',
        rating: 5,
        text: {
          es: 'Vamos cada jueves al menú del día: raciones generosas, casero de verdad y sales por menos de quince euros.',
          en: 'We come every Thursday for the set menu: generous portions, genuinely homemade and under fifteen euros.'
        }
      },
      {
        author: 'Lucía P.',
        rating: 4,
        text: {
          es: 'Los huevos rotos, espectaculares. Los findes se llena, así que mejor reservar mesa con antelación.',
          en: 'The broken eggs are spectacular. It fills up at weekends, so it is better to book a table in advance.'
        }
      }
    ]
  };

  /* --- Textos de interfaz ------------------------------------------- */
  const I18N = {
    es: {
      htmlLang: 'es',
      locale: 'es-ES',
      metaTitle: 'Taberna El Norte · Cervecería y raciones en Alcobendas',
      metaDescription: 'Taberna El Norte, cervecería y raciones en Alcobendas. Carta bilingüe con alérgenos, salón y terraza, historia del local y reservas online.',
      days: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
      statusOpen: 'Abierto ahora',
      statusClosed: 'Cerrado ahora',
      statusOpensAt: 'Abre a las {time}',
      statusOpensDay: 'Abre el {day} a las {time}',
      call: 'Llamar',
      callLong: 'Llamar al restaurante',
      langLabel: 'Idioma',
      skipToMenu: 'Ir a la carta',
      skipToContent: 'Ir al contenido',
      navHome: 'Inicio',
      navMenu: 'Carta',
      navLocal: 'El local',
      navHistory: 'Historia',
      navBook: 'Reservas',
      featuredTitle: 'De la casa',
      featuredCta: 'Ver la carta completa',
      localTitle: 'El local',
      localSubtitle: 'Salón, barra y terraza. Como una taberna de barrio, con mesa para quedarse.',
      historyTitle: 'Nuestra historia',
      bookTitle: 'Reservar mesa',
      bookSubtitle: 'Elige día, hora y comensales. Recibirás la confirmación al instante (demostración).',
      bookName: 'Nombre',
      bookPhone: 'Teléfono',
      bookDate: 'Fecha',
      bookTime: 'Hora',
      bookGuests: 'Comensales',
      bookNotes: 'Comentario (opcional)',
      bookSubmit: 'Confirmar reserva',
      bookClosed: 'Ese día no hay cocina. Elige otro.',
      bookNoSlots: 'No quedan horarios en esa fecha.',
      bookSuccessTitle: 'Reserva solicitada',
      bookSuccessText: 'Hemos anotado tu mesa para {guests} el {date} a las {time}. En un local real se confirmaría por SMS. Esta es una demostración: no se envía nada a la cocina.',
      bookAnother: 'Hacer otra reserva',
      bookWhatsAppAlt: 'También por WhatsApp',
      bookError: 'Revisa los campos e inténtalo de nuevo.',
      bookArea: 'Zona',
      bookAreaAny: 'Sin preferencia',
      bookAreaSalon: 'Salón',
      bookAreaTerrace: 'Terraza',
      bookAreaBar: 'Barra',
      bookDemoNote: 'En un entorno real, este botón envía la solicitud estructurada directamente a tu WhatsApp, sin comisiones por comensal ni pasarelas intermedias.',
      bookTimePlaceholder: 'Elegir hora',
      bookDatePlaceholder: 'Selecciona una fecha',
      bookGuestOne: '1 persona',
      bookGuestMany: '{n} personas',
      allergenFilter: 'Filtrar por alérgenos',
      allergenFilterHint: 'Oculta los platos que contienen el alérgeno seleccionado.',
      allergenFilterClear: 'Quitar filtros',
      allergenFilterEmpty: 'Ningún plato coincide con el filtro.',
      navLabel: 'Secciones',
      gbpTitle: 'Ficha de Google',
      gbpSubtitle: 'Así aparece el local en búsquedas de tapas y menú del día en Alcobendas.',
      gbpPhotos: 'Fotos del local',
      quickActions: 'Acciones rápidas',
      heroEyebrow: 'Alcobendas · Desde 1998',
      heroTitle: 'El sabor de siempre.',
      heroSubtitle: 'Raciones caseras en el corazón de Alcobendas.',
      reserve: 'Reservar mesa',
      reserveWhatsApp: 'Reservar mesa por WhatsApp',
      directions: 'Cómo llegar',
      labelAddress: 'Dirección',
      labelToday: 'Horario de hoy',
      labelMenuDay: 'Menú del día',
      closedToday: 'Hoy cerrado',
      allHours: 'Ver todos los horarios',
      menuTitle: 'La carta',
      menuSubtitle: 'Elaborada cada mañana con producto de mercado.',
      menuTabsLabel: 'Categorías de la carta',
      allergensInDish: 'Alérgenos:',
      noAllergens: 'Sin alérgenos de declaración obligatoria',
      allergenKey: 'Leyenda de alérgenos',
      allergenTableLink: 'Ver tabla completa de alérgenos',
      allergenTableTitle: 'Tabla de alérgenos por plato',
      allergenInfoHint: 'Toca una sigla (GLU, LAC...) para ver su nombre',
      allergenInfoClear: 'Quitar',
      allergenTableHint: 'Desplaza la tabla en horizontal para ver los catorce alérgenos.',
      close: 'Cerrar',
      dish: 'Plato',
      staffNotice: 'Consulta a nuestro personal la información completa de los catorce alérgenos de declaración obligatoria.',
      vatNotice: 'Precios con IVA incluido. Pan y aceite: 1,20 € por persona (excepto en Menú del Día, donde está incluido).',
      reviewsTitle: 'Opiniones',
      reviewsDemo: 'Reseñas de demostración',
      reviewsScore: '{score} sobre 5 · {count} opiniones',
      ratingOf: '{rating} de 5 estrellas',
      mapTitle: 'Dónde estamos',
      mapConsentText: 'El mapa se carga desde Google Maps. Acepta las cookies de terceros para verlo aquí.',
      mapConsentBtn: 'Cargar el mapa',
      mapFrameTitle: 'Mapa de la ubicación de Taberna El Norte en Alcobendas',
      kitchenHours: 'Horario de cocina',
      closed: 'Cerrado',
      contact: 'Reservas y contacto',
      locationTitle: 'Ubicación y reservas',
      viewOnMap: 'Ver en mapa',
      callDirect: 'Llamar directamente',
      credit: '© {year} {name} · Carta digital ultrarrápida creada por',
      planBadge: 'Plan Gastro Premium',
      planBanner: 'Esta demo interactiva incluye las características del Plan Gastro Premium (390 € montaje. IVA no inc.).',
      planCta: 'Ver planes y contratar ↗',
      salesBar: 'Así quedaría tu local.',
      salesBarCta: 'Pide la tuya',
      salesWhatsappText: 'Hola, he visto la demo y quiero una así para mi local.',
      planHero: 'Demo Carta Digital · Nivel Gastro Premium',
      demoCreditLead: 'Web demo desarrollada por',
      demoCreditPlan: '· Realizada con el Plan Gastro Premium',
      groupsNotice: 'Mesas de más de 8 personas con reserva previa de 24h.',
      legalTitle: 'Información legal',
      legalNotice: 'Aviso legal',
      privacy: 'Política de privacidad',
      cookies: 'Política de cookies',
      cookieSettings: 'Configurar cookies',
      developedBy: 'Web desarrollada por',
      tagline: 'Carta digital ultrarrápida',
      demoRibbon: 'Web de demostración',
      demoNotice: 'Maqueta de ejemplo de VisiWeb Madrid. El negocio, los precios, los horarios y las reseñas son ficticios.',
      cookieTitle: 'Cookies en esta web',
      cookieText: 'Usamos cookies propias necesarias y, si lo aceptas, servicios de terceros como el mapa de Google Maps. Sin tu consentimiento no se carga ningún contenido externo.',
      cookieAccept: 'Aceptar',
      cookieReject: 'Rechazar',
      cookieConfigure: 'Configurar',
      cookieSave: 'Guardar preferencias',
      cookieNecessary: 'Necesarias (siempre activas)',
      cookieNecessaryHelp: 'Imprescindibles para recordar el idioma y tus preferencias de cookies.',
      cookieMap: 'Mapa de Google Maps',
      cookieMapHelp: 'Permite mostrar el mapa incrustado con nuestra ubicación.',
      cookieAnalytics: 'Estadísticas',
      cookieAnalyticsHelp: 'Medición anónima de visitas. En esta demo no se carga ninguna herramienta.'
    },
    en: {
      htmlLang: 'en',
      locale: 'en-GB',
      metaTitle: 'Taberna El Norte · Beer house and tapas in Alcobendas',
      metaDescription: 'Taberna El Norte, a beer house in Alcobendas. Bilingual menu with allergens, dining room and terrace, our story, and online table booking.',
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      statusOpen: 'Open now',
      statusClosed: 'Closed now',
      statusOpensAt: 'Opens at {time}',
      statusOpensDay: 'Opens {day} at {time}',
      call: 'Call',
      callLong: 'Call the restaurant',
      langLabel: 'Language',
      skipToMenu: 'Skip to the menu',
      skipToContent: 'Skip to content',
      navHome: 'Home',
      navMenu: 'Menu',
      navLocal: 'The rooms',
      navHistory: 'Our story',
      navBook: 'Book',
      featuredTitle: 'House favourites',
      featuredCta: 'See the full menu',
      localTitle: 'The rooms',
      localSubtitle: 'Dining room, bar and terrace. A neighbourhood tavern with tables you stay at.',
      historyTitle: 'Our story',
      bookTitle: 'Book a table',
      bookSubtitle: 'Choose a day, time and party size. You will see an instant confirmation (demo).',
      bookName: 'Name',
      bookPhone: 'Phone',
      bookDate: 'Date',
      bookTime: 'Time',
      bookGuests: 'Guests',
      bookNotes: 'Notes (optional)',
      bookSubmit: 'Confirm booking',
      bookClosed: 'The kitchen is closed that day. Please pick another.',
      bookNoSlots: 'No times left on that date.',
      bookSuccessTitle: 'Request received',
      bookSuccessText: 'We have noted a table for {guests} on {date} at {time}. In a real restaurant this would be confirmed by SMS. This is a demo: nothing is sent to the kitchen.',
      bookAnother: 'Make another booking',
      bookWhatsAppAlt: 'Or book on WhatsApp',
      bookError: 'Please check the fields and try again.',
      bookArea: 'Zone',
      bookAreaAny: 'No preference',
      bookAreaSalon: 'Dining room',
      bookAreaTerrace: 'Terrace',
      bookAreaBar: 'Bar',
      bookDemoNote: 'In a real setting, this button sends the structured request straight to your WhatsApp, with no per-guest commission and no intermediate payment gateways.',
      bookTimePlaceholder: 'Choose a time',
      bookDatePlaceholder: 'Select a date',
      bookGuestOne: '1 guest',
      bookGuestMany: '{n} guests',
      allergenFilter: 'Filter by allergen',
      allergenFilterHint: 'Hides dishes that contain the selected allergen.',
      allergenFilterClear: 'Clear filters',
      allergenFilterEmpty: 'No dishes match this filter.',
      navLabel: 'Sections',
      gbpTitle: 'Google Business profile',
      gbpSubtitle: 'How the tavern appears for tapas and set-lunch searches in Alcobendas.',
      gbpPhotos: 'Venue photos',
      quickActions: 'Quick actions',
      heroEyebrow: 'Alcobendas · Since 1998',
      heroTitle: 'The flavour you remember.',
      heroSubtitle: 'Homemade tapas in the heart of Alcobendas.',
      reserve: 'Book a table',
      reserveWhatsApp: 'Book a table on WhatsApp',
      directions: 'Get directions',
      labelAddress: 'Address',
      labelToday: "Today's hours",
      labelMenuDay: 'Set lunch',
      closedToday: 'Closed today',
      allHours: 'See all opening hours',
      menuTitle: 'The menu',
      menuSubtitle: 'Cooked every morning with market produce.',
      menuTabsLabel: 'Menu categories',
      allergensInDish: 'Allergens:',
      noAllergens: 'No declarable allergens',
      allergenKey: 'Allergen key',
      allergenTableLink: 'View the full allergen table',
      allergenTableTitle: 'Allergen table by dish',
      allergenInfoHint: 'Tap a code (GLU, LAC...) to see its name',
      allergenInfoClear: 'Clear',
      allergenTableHint: 'Scroll the table sideways to see all fourteen allergens.',
      close: 'Close',
      dish: 'Dish',
      staffNotice: 'Ask our staff for the complete information on the fourteen declarable allergens.',
      vatNotice: 'Prices include VAT. Bread and olive oil: €1.20 per person (except on the Menu of the Day, where it is included).',
      reviewsTitle: 'Reviews',
      reviewsDemo: 'Sample reviews',
      reviewsScore: '{score} out of 5 · {count} reviews',
      ratingOf: '{rating} out of 5 stars',
      mapTitle: 'Where we are',
      mapConsentText: 'The map is loaded from Google Maps. Accept third-party cookies to see it here.',
      mapConsentBtn: 'Load the map',
      mapFrameTitle: 'Map showing the location of Taberna El Norte in Alcobendas',
      kitchenHours: 'Kitchen hours',
      closed: 'Closed',
      contact: 'Bookings and contact',
      locationTitle: 'Location & bookings',
      viewOnMap: 'View on map',
      callDirect: 'Call us directly',
      credit: '© {year} {name} · Ultra-fast digital menu built by',
      planBadge: 'Gastro Premium Plan',
      planBanner: 'This interactive demo includes the features of the Gastro Premium Plan (€390 setup. VAT not included).',
      planCta: 'See plans and sign up ↗',
      salesBar: 'This is how your place would look.',
      salesBarCta: 'Request yours',
      salesWhatsappText: 'Hello, I have seen the demo and I want one like this for my place.',
      planHero: 'Digital menu demo · Gastro Premium',
      demoCreditLead: 'Demo website built by',
      demoCreditPlan: '· Built with the Gastro Premium Plan',
      groupsNotice: 'Tables for more than 8 guests need a booking 24 hours in advance.',
      legalTitle: 'Legal information',
      legalNotice: 'Legal notice',
      privacy: 'Privacy policy',
      cookies: 'Cookie policy',
      cookieSettings: 'Cookie settings',
      developedBy: 'Website built by',
      tagline: 'Ultra-fast digital menu',
      demoRibbon: 'Demo website',
      demoNotice: 'Sample website by VisiWeb Madrid. The business, prices, opening hours and reviews are fictional.',
      cookieTitle: 'Cookies on this site',
      cookieText: 'We use necessary first-party cookies and, with your consent, third-party services such as the Google Maps embed. No external content loads without your permission.',
      cookieAccept: 'Accept',
      cookieReject: 'Reject',
      cookieConfigure: 'Configure',
      cookieSave: 'Save preferences',
      cookieNecessary: 'Necessary (always on)',
      cookieNecessaryHelp: 'Required to remember your language and cookie choices.',
      cookieMap: 'Google Maps embed',
      cookieMapHelp: 'Allows the embedded map with our location to be displayed.',
      cookieAnalytics: 'Analytics',
      cookieAnalyticsHelp: 'Anonymous visit measurement. No analytics tool is loaded in this demo.'
    }
  };

  /* --- Mensajes de WhatsApp ----------------------------------------- */
  const WHATSAPP_TEXT = {
    es: 'Hola, me gustaría reservar mesa en Taberna El Norte. Seríamos [nº de comensales] el [día] a las [hora]. Gracias.',
    en: 'Hello, I would like to book a table at Taberna El Norte for [number of guests] on [day] at [time]. Thank you.'
  };

  return {
    developer: DEVELOPER,
    business: BUSINESS,
    images: IMAGES,
    hours: HOURS,
    allergens: ALLERGENS,
    dietTags: DIET_TAGS,
    menu: MENU,
    reviews: REVIEWS,
    local: LOCAL,
    history: HISTORY,
    gbp: GBP,
    booking: BOOKING,
    featured: FEATURED,
    i18n: I18N,
    whatsappText: WHATSAPP_TEXT,
    legalPages: {
      notice: 'aviso-legal.html',
      privacy: 'politica-privacidad.html',
      cookies: 'politica-cookies.html'
    }
  };
})();
