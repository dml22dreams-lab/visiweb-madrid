(function () {
  'use strict';

  var SUPABASE_URL = 'https://atcgrdfzyboqvdvtfymz.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Y2dyZGZ6eWJvcXZkdnRmeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTc1NTksImV4cCI6MjEwNzU3MzU1OX0.LKMVrtcqd_suMUeyWeedPs5yuzTYLVbz7Lel9A0iKY8';

  var PLANS = [
    {
      id: 'basico',
      legacyIds: ['120'],
      name: 'Básico',
      price: 120,
      tagline: 'Cervecerías y bares de tapas',
      summary: 'One-Page + Carta + WhatsApp',
      delivery: 'Entrega lista en 3 días laborables',
      features: [
        'Web One-Page ultrarrápida adaptada a móvil',
        'Carta digital completa categorizada con precios',
        'Botón directo de reserva y pedidos por WhatsApp',
        'Código QR vectorial en alta resolución para imprimir',
        'Enlace web vinculado en tu ficha de Google',
        'Textos legales y aviso de privacidad RGPD'
      ]
    },
    {
      id: 'gastro-premium',
      legacyIds: ['390'],
      name: 'Gastro Premium',
      price: 390,
      tagline: 'Restaurantes que quieren destacar',
      summary: 'Multipágina + Bilingüe ES/EN + Alérgenos + Redes',
      delivery: 'Entrega en 7 a 10 días laborables',
      features: [
        'Web multipágina estructurada (Carta, El Local, Reservas)',
        'Fotos de platos y local optimizadas',
        'Carta bilingüe interactiva (Español / Inglés)',
        'Filtro interactivo de alérgenos y platos recomendados',
        'Módulo de reserva directa por WhatsApp',
        'Optimización de horarios en Google Maps',
        'Código QR vectorial',
        'Página de redes: Instagram, Facebook, X y TikTok',
        'Textos legales y aviso de privacidad RGPD'
      ]
    },
    {
      id: 'digitalizacion-total',
      legacyIds: ['790'],
      name: 'Digitalización Total',
      price: 790,
      tagline: 'Digitalización completa del local',
      summary: 'Todo + 3 idiomas + Modo QR Mesa /mesa + Eventos privados',
      delivery: 'Entrega en 15 a 18 días laborables',
      features: [
        'Diseño y arquitectura web a medida',
        'Fotos de platos y local optimizadas',
        'Carta multilingüe (hasta 3 idiomas con selector)',
        'Página de redes accesible también desde QR mesa',
        'Modo QR Mesa (/mesa) con lista de camarero y reseñas Google',
        'Optimización completa del perfil en Google Maps',
        'Diseño de expositores QR de mesa listos para imprimir',
        'Módulo web de eventos privados y grupos',
        'Pack físico: 15 expositores acrílicos con QR',
        'Microdatos Schema gastronómicos y SEO local prioritario',
        'Configuración de correo corporativo'
      ]
    }
  ];
  var LOCK_GASTRO = 'Exclusivo desde el Plan Gastro Premium · 390 €';
  var LOCK_TOTAL = 'Exclusivo del Plan Digitalización Total · 790 €';
  var STATUSES = [
    { id: 'borrador', label: 'Borrador' },
    { id: 'pendiente_pago', label: 'Pendiente de pago' },
    { id: 'activo', label: 'Activo' }
  ];
  var ALLERGENS = [
    ['gluten', 'GLU', 'Gluten'],
    ['crustaceos', 'CRU', 'Crustáceos'],
    ['huevos', 'HUE', 'Huevos'],
    ['pescado', 'PES', 'Pescado'],
    ['cacahuetes', 'CAC', 'Cacahuetes'],
    ['soja', 'SOJ', 'Soja'],
    ['lacteos', 'LAC', 'Lácteos'],
    ['frutos_cascara', 'FRU', 'Frutos de cáscara'],
    ['apio', 'API', 'Apio'],
    ['mostaza', 'MOS', 'Mostaza'],
    ['sesamo', 'SES', 'Sésamo'],
    ['sulfitos', 'SUL', 'Sulfitos'],
    ['altramuces', 'ALT', 'Altramuces'],
    ['moluscos', 'MOL', 'Moluscos']
  ];
  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  var ADMIN_EMAIL = 'diego@visiwebmadrid.com';
  var LS_ACTIVE = 'vw_panel_active_v1';
  var LS_PROJECTS = 'vw_panel_projects_v1';
  var LS_PREVIEW = 'vw_preview_payload_v1';

  var state = {
    ready: false,
    session: null,
    profile: null,
    restaurants: [],
    owners: {},
    editor: null,
    notice: '',
    error: '',
    busy: false,
    copied: '',
    adminTab: 'people',
    proposals: [],
    myProjects: [],
    adminPeople: [],
    expandedPersonId: null,
    selectedProposalId: null,
    proposalViewport: 'mobile',
    githubOpen: false,
    githubSlug: '',
    githubBusy: false,
    githubNotice: '',
    saveTimer: null,
    createModal: null
  };

  var app = document.getElementById('app');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function euros(amount) {
    var digits = Number.isInteger(amount) ? 0 : 2;
    return amount.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function normalizePlanId(id) {
    var raw = String(id || '').trim();
    if (!raw) return '';
    if (raw === '120' || raw === 'basico') return 'basico';
    if (raw === '390' || raw === 'gastro-premium') return 'gastro-premium';
    if (raw === '790' || raw === 'digitalizacion-total') return 'digitalizacion-total';
    return raw;
  }

  function planById(id) {
    var normalized = normalizePlanId(id);
    return PLANS.filter(function (plan) {
      return plan.id === normalized || (plan.legacyIds || []).indexOf(String(id || '')) >= 0;
    })[0] || null;
  }

  function planLabel(id) {
    var found = planById(id);
    return found ? found.name + ' · ' + found.price + ' €' : 'Sin plan';
  }

  function planPrice(id) {
    var found = planById(id);
    return found ? found.price : 0;
  }

  function planRank(id) {
    var normalized = normalizePlanId(id);
    if (normalized === 'digitalizacion-total') return 3;
    if (normalized === 'gastro-premium') return 2;
    if (normalized === 'basico') return 1;
    return 0;
  }

  function planAiContext(plan) {
    if (!plan) return 'Sin plan contratado todavía.';
    return (
      'Plan contratado: ' + plan.name + ' (' + plan.price + ' € · id «' + plan.id + '»). ' +
      plan.summary + '. Características incluidas: ' + plan.features.join('; ') + '. ' +
      'Adapta la web SOLO a lo que incluye esta tarifa. No actives /mesa, 3 idiomas ni eventos privados si el plan no los incluye. ' +
      (planRank(plan.id) < 2 ? 'Plan Básico: One-Page, carta y WhatsApp. Sin multipágina, alérgenos, bilingüe ni redes.' : '') +
      (planRank(plan.id) === 2 ? 'Gastro Premium: multipágina, ES/EN, alérgenos y redes. Sin /mesa ni eventos.' : '') +
      (planRank(plan.id) >= 3 ? 'Digitalización Total: incluye /mesa con lista camarero y reseñas, hasta 3 idiomas y eventos privados.' : '')
    );
  }

  function lockIcon() {
    return '<svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';
  }

  function lockedRow(title, note) {
    return '<div class="flex items-start gap-3 rounded-3xl bg-stone-50 px-4 py-3 text-stone-400 ring-1 ring-stone-200">' + lockIcon() + '<span><span class="block text-sm font-semibold text-stone-700">' + title + '</span><span class="mt-0.5 block text-xs">' + note + '</span></span></div>';
  }

  function planPicker(editor) {
    var current = normalizePlanId(editor.plan_tier);
    return '<fieldset class="mt-6"><legend class="text-sm font-semibold">Plan contratado</legend><div class="mt-2 grid gap-2">' +
      PLANS.map(function (plan) {
        var on = current === plan.id;
        return '<label class="block cursor-pointer rounded-3xl px-4 py-3 text-left ring-1 ' + (on ? 'bg-[#FAF9F6] ring-2 ring-[#18181B]' : 'bg-white ring-stone-200') + '">' +
          '<input class="sr-only" type="radio" name="plan-tier" data-plan="' + plan.id + '" value="' + plan.id + '"' + (on ? ' checked' : '') + '>' +
          '<span class="flex items-baseline justify-between gap-3"><span class="font-semibold text-stone-900">' + plan.name + '</span><span class="font-serif text-lg text-stone-900">' + plan.price + ' €</span></span>' +
          '<span class="mt-1 block text-sm font-normal leading-snug text-stone-600">' + plan.summary + '</span></label>';
      }).join('') +
    '</div></fieldset>';
  }

  function ensureLabels(design) {
    if (!design.labels || typeof design.labels !== 'object') design.labels = {};
  }

  function ensureEventos(design) {
    ensureLabels(design);
    if (!design.eventos || typeof design.eventos !== 'object') {
      design.eventos = (window.VisiwebDesign && window.VisiwebDesign.blank().eventos) || {
        tipoVideo: 'salon', eyebrow: '', title: '', subtitle: '', lead: '', cta: '', readyTitle: '', readyCta: ''
      };
    }
    if (!design.eventos.tipoVideo) design.eventos.tipoVideo = 'salon';
  }

  function eventosEditor(design) {
    ensureEventos(design);
    var ev = design.eventos;
    var on = design.labels.vw_events === '1';
    var videos = [
      ['salon', 'Vídeo salón'],
      ['terraza', 'Vídeo terraza'],
      ['ninguno', 'Solo foto']
    ];
    return (
      flagButton('vw_events', 'Activar Eventos y grupos', on) +
      (on
        ? '<div class="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-stone-200">' +
            '<p class="text-sm font-semibold text-stone-800">Vídeo del hero</p>' +
            '<div class="grid grid-cols-3 gap-2">' + videos.map(function (item) {
              var active = ev.tipoVideo === item[0];
              return '<button type="button" data-eventos-video="' + item[0] + '" aria-pressed="' + (active ? 'true' : 'false') + '" class="rounded-2xl px-2 py-3 text-xs font-semibold ring-1 ' + (active ? 'bg-stone-900 text-white ring-stone-900' : 'bg-stone-50 text-stone-700 ring-stone-200') + '">' + item[1] + '</button>';
            }).join('') + '</div>' +
            '<label class="block text-sm font-semibold">Eyebrow<input data-eventos="eyebrow" value="' + esc(ev.eyebrow || '') + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300" placeholder="Celebraciones y grupos"></label>' +
            '<label class="block text-sm font-semibold">Título<input data-eventos="title" value="' + esc(ev.title || '') + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300" placeholder="Eventos"></label>' +
            '<label class="block text-sm font-semibold">Subtítulo<input data-eventos="subtitle" value="' + esc(ev.subtitle || '') + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300"></label>' +
            '<label class="block text-sm font-semibold">Texto introductorio<textarea data-eventos="lead" rows="3" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300">' + esc(ev.lead || '') + '</textarea></label>' +
            '<label class="block text-sm font-semibold">CTA del hero<input data-eventos="cta" value="' + esc(ev.cta || '') + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300" placeholder="Pedir presupuesto"></label>' +
            '<label class="block text-sm font-semibold">Título editorial<input data-eventos="readyTitle" value="' + esc(ev.readyTitle || '') + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300"></label>' +
            '<label class="block text-sm font-semibold">Botón editorial<input data-eventos="readyCta" value="' + esc(ev.readyCta || '') + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300" placeholder="Ir a reservas"></label>' +
          '</div>'
        : '')
    );
  }

  function applyPlanLimits(editor) {
    editor.plan_tier = normalizePlanId(editor.plan_tier) || editor.plan_tier;
    var rank = planRank(editor.plan_tier);
    var design = editor.design;
    var plan = planById(editor.plan_tier);
    ensureLabels(design);
    if (plan) {
      design.labels.vw_plan = plan.name;
      design.labels.vw_plan_id = plan.id;
      design.labels.vw_plan_features = plan.features.join(' · ');
    }
    if (rank < 2) {
      design.blocks.forEach(function (block) {
        if (block.id === 'local' || block.id === 'reserva') block.visible = false;
      });
      if (design.hero_actions) design.hero_actions.book = false;
      editor.instagram = '';
      design.labels.vw_lang = 'es';
      design.labels.vw_allergens = '0';
      design.labels.vw_social = '0';
      (editor.categories || []).forEach(function (category) {
        (category.items || []).forEach(function (item) { item.allergens = []; });
      });
    } else if (design.labels.vw_lang !== 'es' && design.labels.vw_lang !== 'esen' && design.labels.vw_lang !== 'multi') {
      design.labels.vw_lang = 'esen';
    }
    if (rank < 3) {
      Object.keys(design.mesa || {}).forEach(function (key) { design.mesa[key] = false; });
      design.labels.vw_events = '0';
      if (design.labels.vw_lang === 'multi') design.labels.vw_lang = 'esen';
    } else {
      ensureEventos(design);
      if (design.labels.vw_events !== '0' && design.labels.vw_events !== '1') design.labels.vw_events = '1';
    }
    if (rank >= 2 && design.labels.vw_allergens !== '0' && design.labels.vw_allergens !== '1') design.labels.vw_allergens = '1';
    if (rank >= 2 && design.labels.vw_social !== '0' && design.labels.vw_social !== '1') design.labels.vw_social = '1';
  }

  function statusLabel(id) {
    var found = STATUSES.filter(function (status) { return status.id === id; })[0];
    return found ? found.label : id;
  }

  function statusClass(id) {
    if (id === 'activo') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    if (id === 'pendiente_pago') return 'bg-amber-50 text-amber-900 ring-amber-200';
    return 'bg-stone-100 text-stone-600 ring-stone-200';
  }

  function blankItem() {
    return { id: null, name: '', description: '', price: '', image_url: '', imageFile: null, preview: '', allergens: [], featured: false };
  }

  function sampleItem(name, description, price, image, allergens, featured) {
    var item = blankItem();
    item.name = name;
    item.description = description;
    item.price = String(price);
    item.image_url = '/assets/demo/' + image;
    item.allergens = allergens || [];
    item.featured = !!featured;
    return item;
  }

  function sampleMenu() {
    return [blankCategory()];
  }

  function blankCategory() {
    return { id: null, name: '', items: [blankItem()] };
  }

  function langText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value.es || value.en || '';
  }

  function priceFromDemo(item) {
    if (item && item.priceValue != null && item.priceValue !== '') return String(item.priceValue);
    if (item && item.price != null && item.price !== '') {
      var raw = String(item.price).replace(',', '.').replace(/[^\d.]/g, '');
      return raw || '';
    }
    return '';
  }

  function categoriesFromPreview(demo) {
    var menu = demo && Array.isArray(demo.menu) ? demo.menu : [];
    if (!menu.length) return sampleMenu();
    return menu.map(function (category) {
      var items = Array.isArray(category.items) ? category.items : [];
      return {
        id: category.id || null,
        name: langText(category.name),
        subtitle: langText(category.desc || category.subtitle),
        items: items.length
          ? items.map(function (item) {
              return {
                id: item.id || null,
                name: langText(item.name),
                description: langText(item.desc || item.description),
                price: priceFromDemo(item),
                image_url: item.image || '',
                imageFile: null,
                preview: '',
                allergens: Array.isArray(item.allergens) ? item.allergens.slice() : [],
                tags: Array.isArray(item.tags) ? item.tags.slice() : [],
                featured: !!(item.featured || (demo.featured && demo.featured.indexOf(item.id) >= 0))
              };
            })
          : [blankItem()]
      };
    });
  }

  function addressFromPreview(demo) {
    var business = (demo && demo.business) || {};
    if (business.addressLine) return business.addressLine;
    var address = business.address || {};
    var street = langText(address.street);
    var parts = [street, address.postalCode, address.city, address.region].filter(Boolean);
    return parts.join(', ');
  }

  function blankEditor() {
    var demo = window.VISIWEB_DEMO || null;
    var business = (demo && demo.business) || {};
    var design = window.VisiwebDesign.blank();
    if (demo && demo.design) design = window.VisiwebDesign.merge(demo.design);
    ensureLabels(design);
    ensureEventos(design);
    if (demo && demo.eventos && typeof demo.eventos.activo === 'boolean') {
      design.labels.vw_events = demo.eventos.activo ? '1' : '0';
    } else {
      design.labels.vw_events = '0';
    }
    if (demo && demo.eventos) {
      ['eyebrow', 'title', 'subtitle', 'lead', 'cta', 'readyTitle', 'readyCta'].forEach(function (key) {
        var text = langText(demo.eventos[key]);
        if (text) design.eventos[key] = text;
      });
      if (demo.eventos.tipoVideo) design.eventos.tipoVideo = demo.eventos.tipoVideo;
    }
    var tagline = langText(business.type);
    var name = business.name || '';
    return {
      step: 'a',
      id: null,
      proposalId: null,
      name: name,
      slug: slugify(name),
      autoSlug: true,
      tagline: tagline,
      description: langText(demo && demo.history && demo.history.lead) || '',
      phone: business.phoneDisplay || business.phone || '',
      whatsapp: business.whatsapp || '',
      address: addressFromPreview(demo),
      schedule: (demo && demo.scheduleText) || '',
      instagram: business.instagram || '',
      plan_tier: '',
      status: 'borrador',
      cover_image_url: (demo && demo.images && demo.images.hero) || '',
      coverFile: null,
      coverPreview: '',
      categories: categoriesFromPreview(demo),
      design: design,
      daily_menu: window.VisiwebDesign.mergeDaily(demo && demo.dailyMenu),
      viewport: 'mobile',
      preview: 'web',
      chat: null,
      chats: null,
      activeChatId: null,
      fromPreview: true,
      previewDirty: false,
      studioMode: 'chat',
      ownerEmail: ''
    };
  }

  function currentEmail() {
    return String(
      (state.profile && state.profile.email) ||
      (state.session && state.session.user && state.session.user.email) ||
      ''
    ).trim().toLowerCase();
  }

  function isAdmin() {
    if (currentEmail() === ADMIN_EMAIL) return true;
    return !!(state.profile && state.profile.role === 'admin');
  }

  function userId() {
    return (state.session && state.session.user && state.session.user.id) || '';
  }

  function serializeEditor(editor) {
    if (!editor) return null;
    try {
      return JSON.parse(JSON.stringify({
        step: editor.step || 'a',
        id: editor.id || null,
        proposalId: editor.proposalId || null,
        name: editor.name || '',
        slug: editor.slug || '',
        autoSlug: !!editor.autoSlug,
        tagline: editor.tagline || '',
        description: editor.description || '',
        phone: editor.phone || '',
        whatsapp: editor.whatsapp || '',
        address: editor.address || '',
        schedule: editor.schedule || '',
        instagram: editor.instagram || '',
        plan_tier: editor.plan_tier || '',
        status: editor.status || 'borrador',
        cover_image_url: editor.cover_image_url || '',
        coverPreview: editor.coverPreview || '',
        categories: (editor.categories || []).map(function (category) {
          return {
            id: category.id || null,
            name: category.name || '',
            subtitle: category.subtitle || '',
            items: (category.items || []).map(function (item) {
              return {
                id: item.id || null,
                name: item.name || '',
                description: item.description || '',
                price: item.price == null ? '' : String(item.price),
                image_url: item.image_url || '',
                preview: item.preview || '',
                allergens: item.allergens || [],
                tags: item.tags || [],
                featured: !!item.featured
              };
            })
          };
        }),
        design: editor.design,
        daily_menu: editor.daily_menu,
        viewport: editor.viewport || 'mobile',
        preview: editor.preview || 'web',
        chat: editor.chat || null,
        chats: editor.chats || null,
        activeChatId: editor.activeChatId || null,
        fromPreview: !!editor.fromPreview,
        previewDirty: !!editor.previewDirty,
        studioMode: editor.studioMode || 'chat',
        ownerEmail: editor.ownerEmail || '',
        assigneeId: editor.assigneeId || ''
      }));
    } catch (error) {
      return null;
    }
  }

  function persistActiveLocal() {
    if (!userId() || !state.editor || state.editor.studioMode !== 'chat') {
      try { window.localStorage.removeItem(LS_ACTIVE); } catch (error) {}
      return;
    }
    var payload = {
      userId: userId(),
      proposalId: state.editor.proposalId || null,
      editor: serializeEditor(state.editor),
      savedAt: Date.now()
    };
    try { window.localStorage.setItem(LS_ACTIVE, JSON.stringify(payload)); } catch (error) {}
  }

  function clearActiveLocal() {
    try { window.localStorage.removeItem(LS_ACTIVE); } catch (error) {}
  }

  function readActiveLocal() {
    try {
      var raw = window.localStorage.getItem(LS_ACTIVE);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.userId !== userId() || !data.editor) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  function persistProjectsLocal(list) {
    if (!userId()) return;
    try {
      window.localStorage.setItem(LS_PROJECTS + ':' + userId(), JSON.stringify({
        userId: userId(),
        items: list || [],
        savedAt: Date.now()
      }));
    } catch (error) {}
  }

  function readProjectsLocal() {
    try {
      var raw = window.localStorage.getItem(LS_PROJECTS + ':' + userId());
      if (!raw) return [];
      var data = JSON.parse(raw);
      return (data && Array.isArray(data.items)) ? data.items : [];
    } catch (error) {
      return [];
    }
  }

  function projectPayloadFromEditor(editor) {
    var payload = restaurantPayloadFromEditor(editor);
    var plan = planById(editor.plan_tier);
    payload._meta = {
      chat: editor.chat || null,
      chats: editor.chats || null,
      activeChatId: editor.activeChatId || null,
      viewport: editor.viewport || 'mobile',
      preview: editor.preview || 'web',
      slug: editor.slug || '',
      studioMode: 'chat',
      plan_tier: normalizePlanId(editor.plan_tier) || editor.plan_tier || '',
      plan_features: plan ? plan.features.slice() : [],
      plan_summary: plan ? plan.summary : '',
      autoSlug: !!editor.autoSlug,
      restaurantId: editor.id || null
    };
    return payload;
  }

  function editorFromProjectRow(row) {
    var editor = blankEditor();
    var data = (row && row.restaurant_data) || {};
    var meta = data._meta || {};
    var previous = state.editor;
    state.editor = editor;
    applyRestaurantUpdate(data);
    state.editor = previous;
    editor.proposalId = row.id;
    editor.name = data.name || row.nombre_local || editor.name;
    editor.slug = meta.slug || slugify(editor.name);
    editor.autoSlug = meta.autoSlug != null ? !!meta.autoSlug : !editor.slug;
    editor.plan_tier = normalizePlanId(meta.plan_tier || data.plan_tier || editor.plan_tier) || editor.plan_tier;
    editor.viewport = meta.viewport || 'mobile';
    editor.preview = meta.preview || 'web';
    editor.chat = meta.chat || null;
    editor.chats = meta.chats || null;
    editor.activeChatId = meta.activeChatId || null;
    editor.fromPreview = false;
    editor.previewDirty = true;
    editor.studioMode = 'chat';
    editor.ownerEmail = row.correo_colaborador || '';
    editor.status = row.estado || 'borrador';
    ensureCollabChat(editor);
    return editor;
  }

  async function upsertProjectDraft(options) {
    var editor = state.editor;
    if (!editor || !state.session || editor.studioMode !== 'chat') return null;
    var email = editor.ownerEmail || currentEmail();
    var collabId = editor.assigneeId || state.session.user.id;
    var payload = projectPayloadFromEditor(editor);
    var nombre = editor.name || 'Sin nombre';
    var row;
    if (editor.proposalId) {
      var updated = await supabase.from('propuestas_webs').update({
        nombre_local: nombre,
        correo_colaborador: email || '',
        collaborator_id: collabId || null,
        restaurant_data: payload,
        updated_at: new Date().toISOString()
      }).eq('id', editor.proposalId).select('*').single();
      if (updated.error) throw updated.error;
      row = updated.data;
    } else {
      var inserted = await supabase.from('propuestas_webs').insert({
        nombre_local: nombre,
        correo_colaborador: email,
        collaborator_id: collabId || state.session.user.id,
        restaurant_data: payload,
        estado: 'borrador',
        updated_at: new Date().toISOString()
      }).select('*').single();
      if (inserted.error) throw inserted.error;
      row = inserted.data;
      editor.proposalId = row.id;
    }
    persistActiveLocal();
    mergeProjectIntoLists(row);
    return row;
  }

  function mergeProjectIntoLists(row) {
    if (!row || !row.id) return;
    var replace = function (list) {
      var found = false;
      var next = (list || []).map(function (item) {
        if (item.id === row.id) { found = true; return row; }
        return item;
      });
      if (!found) next.unshift(row);
      return next;
    };
    state.myProjects = replace(state.myProjects);
    state.proposals = replace(state.proposals);
    persistProjectsLocal(state.myProjects);
    rebuildAdminPeople();
  }

  function scheduleProjectSave() {
    persistActiveLocal();
    if (state.saveTimer) window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(function () {
      upsertProjectDraft().catch(function () {});
    }, 450);
  }

  function rebuildAdminPeople() {
    if (!isAdmin()) {
      state.adminPeople = [];
      return;
    }
    var map = {};
    Object.keys(state.owners || {}).forEach(function (id) {
      var person = state.owners[id];
      map[id] = {
        id: id,
        full_name: person.full_name || '',
        email: person.email || '',
        projects: []
      };
    });
    (state.proposals || []).forEach(function (row) {
      var id = row.collaborator_id || ('email:' + String(row.correo_colaborador || '').toLowerCase());
      if (!map[id]) {
        map[id] = {
          id: id,
          full_name: '',
          email: row.correo_colaborador || '',
          projects: []
        };
      }
      map[id].projects.push(row);
    });
    state.adminPeople = Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return String(a.email || a.full_name).localeCompare(String(b.email || b.full_name), 'es');
    });
  }

  function trashIcon() {
    return '<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4"/></svg>';
  }

  function ownerName(restaurant) {
    var person = state.owners[restaurant.collaborator_id];
    if (!person) return 'Sin asignar';
    return person.full_name || person.email || 'Colaborador';
  }

  function demoUrl(slug) {
    return location.origin + '/r/' + slug;
  }

  function setNotice(text) {
    state.notice = text || '';
    state.error = '';
  }

  function setError(text) {
    state.error = text || '';
    state.notice = '';
  }

  function authMessage(error) {
    var message = (error && error.message) || '';
    if (/invalid login/i.test(message)) return 'Correo o contraseña incorrectos.';
    if (/email not confirmed/i.test(message)) return 'Este correo todavía no está confirmado.';
    return 'No se ha podido entrar. Revisa el correo y la contraseña.';
  }

  function restaurantPayloadFromEditor(editor) {
    ensureLabels(editor.design);
    ensureEventos(editor.design);
    var plan = planById(editor.plan_tier);
    return {
      name: editor.name || '',
      slug: editor.slug || '',
      tagline: editor.tagline || '',
      description: editor.description || '',
      phone: editor.phone || '',
      whatsapp: editor.whatsapp || '',
      address: editor.address || '',
      schedule: editor.schedule || '',
      instagram: editor.instagram || '',
      cover_image_url: editor.coverPreview || editor.cover_image_url || '',
      plan_tier: normalizePlanId(editor.plan_tier) || editor.plan_tier || '',
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        summary: plan.summary,
        features: plan.features.slice(),
        delivery: plan.delivery
      } : null,
      design_config: editor.design,
      design: editor.design,
      daily_menu: editor.daily_menu,
      accent: editor.design.accent,
      primary_color: editor.design.accent,
      eventos_activo: editor.design.labels.vw_events === '1',
      fromPreview: !!editor.fromPreview,
      categories: (editor.categories || []).map(function (category) {
        return {
          id: category.id,
          name: category.name || '',
          subtitle: category.subtitle || category.desc || '',
          desc: category.subtitle || category.desc || '',
          items: (category.items || []).map(function (item) {
            return {
              id: item.id,
              name: item.name || '',
              description: item.description || '',
              price: item.price,
              image_url: item.preview || item.image_url || '',
              allergens: item.allergens || [],
              tags: item.tags || [],
              featured: !!item.featured
            };
          })
        };
      })
    };
  }

  function writePreviewPayload(payload) {
    try {
      window.localStorage.setItem(LS_PREVIEW, JSON.stringify(payload || {}));
    } catch (error) {}
  }

  function collabFrameSrc(editor) {
    return (editor && editor.preview === 'mesa') ? '/mesa/' : '/panel/preview/index.html#inicio';
  }

  function openFullscreenPreview() {
    if (!state.editor) return;
    var payload = restaurantPayloadFromEditor(state.editor);
    writePreviewPayload(payload);
    persistActiveLocal();
    var url = state.editor.preview === 'mesa'
      ? '/mesa/?preview=1'
      : '/panel/preview/index.html?preview=1#inicio';
    window.open(url, '_blank', 'noopener');
  }

  function pushCollabPreview(force) {
    var frame = document.getElementById('collab-preview');
    var editor = state.editor;
    if (!frame || !frame.contentWindow || !editor) return;
    // Demo intacta hasta el primer cambio: Web usa preview/data.js y QR Mesa usa /mesa/ nativo.
    if (editor.fromPreview && !editor.previewDirty) return;
    var payload = restaurantPayloadFromEditor(editor);
    writePreviewPayload(payload);
    frame.contentWindow.postMessage({
      type: 'RESTAURANT_DATA',
      payload: payload,
      RESTAURANT_DATA: payload
    }, location.origin);
  }

  var CHAT_WELCOME =
    'Entorno cerrado. Escribe cambios del bar (nombre, color, teléfono, horario, carta, eventos). La vista previa se actualiza al instante. No se descarga código: solo puedes enviar la propuesta al administrador.';
  var MAX_CHAT_TABS = 3;

  function welcomeChatMessages(editor) {
    var plan = planById(editor && editor.plan_tier);
    var text = CHAT_WELCOME;
    if (plan) text += '\n\n' + planAiContext(plan);
    return [{ role: 'system', text: text }];
  }

  function chatIconSvg(size) {
    var s = size || 18;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>';
  }

  function newChatId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function chatTabTitle(chat, index) {
    var userMsg = (chat.messages || []).filter(function (m) { return m.role === 'user'; })[0];
    if (userMsg && userMsg.text) {
      var t = String(userMsg.text).trim().replace(/\s+/g, ' ');
      if (t.length > 22) t = t.slice(0, 22) + '…';
      return t;
    }
    return 'Chat ' + ((index == null ? 0 : index) + 1);
  }

  function syncActiveChatRef(editor) {
    var active = getActiveChat(editor);
    editor.chat = active ? active.messages : [];
    return active;
  }

  function getActiveChat(editor) {
    if (!editor || !Array.isArray(editor.chats) || !editor.chats.length) return null;
    var found = null;
    editor.chats.forEach(function (c) {
      if (c.id === editor.activeChatId) found = c;
    });
    if (!found) {
      found = editor.chats[0];
      editor.activeChatId = found.id;
    }
    return found;
  }

  function createChatTab(editor) {
    if (!editor) return null;
    if (!Array.isArray(editor.chats)) editor.chats = [];
    if (editor.chats.length >= MAX_CHAT_TABS) return null;
    var tab = {
      id: newChatId(),
      title: 'Chat ' + (editor.chats.length + 1),
      messages: welcomeChatMessages(editor)
    };
    editor.chats.push(tab);
    editor.activeChatId = tab.id;
    syncActiveChatRef(editor);
    return tab;
  }

  function closeChatTab(editor, id) {
    if (!editor || !Array.isArray(editor.chats)) return;
    var idx = -1;
    editor.chats.forEach(function (c, i) { if (c.id === id) idx = i; });
    if (idx < 0) return;
    editor.chats.splice(idx, 1);
    if (!editor.chats.length) {
      editor.activeChatId = null;
      editor.chat = [];
      return;
    }
    if (editor.activeChatId === id) {
      var next = editor.chats[Math.min(idx, editor.chats.length - 1)];
      editor.activeChatId = next.id;
    }
    syncActiveChatRef(editor);
  }

  function ensureCollabChat(editor) {
    if (!editor.viewport) editor.viewport = 'mobile';
    if (!Array.isArray(editor.chats)) {
      var legacy = Array.isArray(editor.chat) && editor.chat.length ? editor.chat : welcomeChatMessages(editor);
      var id = newChatId();
      editor.chats = [{ id: id, title: 'Chat 1', messages: legacy }];
      editor.activeChatId = id;
    }
    if (editor.chats.length > MAX_CHAT_TABS) editor.chats = editor.chats.slice(0, MAX_CHAT_TABS);
    editor.chats.forEach(function (tab, i) {
      if (!tab.id) tab.id = newChatId();
      if (!Array.isArray(tab.messages)) tab.messages = welcomeChatMessages(editor);
      tab.title = chatTabTitle(tab, i);
    });
    syncActiveChatRef(editor);
  }

  function renderChatTabsHtml(editor) {
    var tabs = (editor && editor.chats) || [];
    if (!tabs.length) return '';
    var items = tabs.map(function (tab, i) {
      var active = tab.id === editor.activeChatId;
      return (
        '<div role="tab" data-chat-tab="' + esc(tab.id) + '" class="group flex max-w-[148px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-stone-200 px-2.5 text-[12px] ' +
          (active ? 'bg-white text-stone-900' : 'bg-stone-100 text-stone-500 hover:bg-stone-50 hover:text-stone-700') + '">' +
          '<span class="shrink-0 opacity-70">' + chatIconSvg(13) + '</span>' +
          '<span class="min-w-0 flex-1 truncate font-medium">' + esc(chatTabTitle(tab, i)) + '</span>' +
          '<button type="button" data-close-chat="' + esc(tab.id) + '" aria-label="Cerrar chat" class="grid h-5 w-5 shrink-0 place-items-center rounded text-stone-400 hover:bg-stone-200 hover:text-stone-800">×</button>' +
        '</div>'
      );
    }).join('');
    var addBtn = tabs.length < MAX_CHAT_TABS
      ? '<button type="button" id="chat-tab-add" aria-label="Nuevo chat" class="grid h-9 w-9 shrink-0 place-items-center text-stone-500 hover:bg-stone-50 hover:text-stone-800">+</button>'
      : '';
    return (
      '<div id="collab-chat-tabs" class="flex h-9 shrink-0 items-stretch border-b border-stone-200 bg-stone-100">' +
        '<div class="flex min-w-0 flex-1 items-stretch overflow-x-auto">' + items + '</div>' +
        addBtn +
      '</div>'
    );
  }

  function syncChatPanelLayout(editor) {
    var panel = document.getElementById('collab-chat-panel');
    var open = !!(editor && Array.isArray(editor.chats) && editor.chats.length);
    if (!panel) return;
    if (open) {
      panel.classList.remove('hidden');
      panel.style.width = '';
      panel.style.maxWidth = '';
      panel.style.borderLeftWidth = '';
    } else {
      panel.classList.add('hidden');
      panel.style.width = '0';
      panel.style.maxWidth = '0';
      panel.style.borderLeftWidth = '0';
    }
    var toggle = document.getElementById('toggle-chat-panel');
    if (toggle) {
      toggle.className = 'absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md border border-stone-200 text-stone-800 hover:bg-stone-50 ' +
        (open ? 'bg-stone-100' : 'bg-white');
    }
  }

  function deepMerge(target, source) {
    if (source == null) return target;
    if (Array.isArray(source)) return source.slice();
    if (typeof source !== 'object') return source;
    var out = Array.isArray(target)
      ? target.slice()
      : Object.assign({}, target && typeof target === 'object' && !Array.isArray(target) ? target : {});
    Object.keys(source).forEach(function (key) {
      var sv = source[key];
      var tv = out[key];
      if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
        out[key] = deepMerge(tv, sv);
      } else if (Array.isArray(sv)) {
        out[key] = sv.slice();
      } else {
        out[key] = sv;
      }
    });
    return out;
  }

  function applyRestaurantUpdate(data) {
    var editor = state.editor;
    if (!editor || !data || typeof data !== 'object') return false;
    ['name', 'tagline', 'description', 'phone', 'whatsapp', 'address', 'schedule', 'instagram', 'plan_tier'].forEach(function (key) {
      if (typeof data[key] === 'string') editor[key] = data[key];
    });
    if (typeof data.name === 'string' && editor.autoSlug) editor.slug = slugify(editor.name);
    if (data.design_config) editor.design = window.VisiwebDesign.merge(data.design_config);
    if (data.design) editor.design = window.VisiwebDesign.merge(data.design);
    if (data.daily_menu) editor.daily_menu = window.VisiwebDesign.mergeDaily(data.daily_menu);
    if (data.accent || data.primary_color) {
      editor.design.accent = data.accent || data.primary_color;
      editor.design.palette = '';
    }
    if (Array.isArray(data.categories)) {
      editor.categories = data.categories.map(function (category) {
        return {
          id: category.id || null,
          name: category.name || '',
          subtitle: category.subtitle || category.desc || '',
          items: (category.items || []).map(function (item) {
            return {
              id: item.id || null,
              name: item.name || '',
              description: item.description || '',
              price: item.price == null ? '' : String(item.price),
              image_url: item.image_url || '',
              imageFile: null,
              preview: item.preview || '',
              allergens: item.allergens || [],
              tags: item.tags || [],
              featured: !!item.featured
            };
          })
        };
      });
    }
    if (typeof data.eventos_activo === 'boolean') {
      ensureLabels(editor.design);
      editor.design.labels.vw_events = data.eventos_activo ? '1' : '0';
    }
    return true;
  }

  function applyChatCommand(raw) {
    var editor = state.editor;
    var text = String(raw || '').trim();
    if (!text) return 'Escribe un cambio.';
    if (text.charAt(0) === '{') {
      try {
        var data = JSON.parse(text);
        if (!applyRestaurantUpdate(data)) return 'JSON inválido.';
        return 'JSON aplicado a la vista previa.';
      } catch (error) {
        return 'JSON inválido.';
      }
    }
    var match;
    match = text.match(/^(?:nombre|cambia(?:r)?\s+el\s+nombre(?:\s+a)?)\s*[:\-]?\s*(.+)$/i);
    if (match) { editor.name = match[1].trim(); if (editor.autoSlug) editor.slug = slugify(editor.name); return 'Nombre actualizado: ' + editor.name; }
    match = text.match(/^(?:frase|tagline|lema|subt[ií]tulo)\s*[:\-]?\s*(.+)$/i);
    if (match) { editor.tagline = match[1].trim(); return 'Frase corta actualizada.'; }
    match = text.match(/^(?:descripci[oó]n)\s*[:\-]?\s*(.+)$/i);
    if (match) { editor.description = match[1].trim(); return 'Descripción actualizada.'; }
    match = text.match(/^(?:tel[eé]fono|phone)\s*[:\-]?\s*(.+)$/i);
    if (match) { editor.phone = match[1].trim(); return 'Teléfono actualizado.'; }
    match = text.match(/^(?:whatsapp|wa)\s*[:\-]?\s*(.+)$/i);
    if (match) { editor.whatsapp = match[1].replace(/\D/g, ''); return 'WhatsApp actualizado.'; }
    match = text.match(/^(?:direcci[oó]n|address)\s*[:\-]?\s*(.+)$/i);
    if (match) { editor.address = match[1].trim(); return 'Dirección actualizada.'; }
    match = text.match(/^(?:horario|horarios|schedule)\s*[:\-]?\s*(.+)$/i);
    if (match) { editor.schedule = match[1].trim(); return 'Horario actualizado.'; }
    match = text.match(/^(?:instagram|ig)\s*[:\-]?\s*(.+)$/i);
    if (match) { editor.instagram = match[1].trim(); return 'Instagram actualizado.'; }
    match = text.match(/^(?:color|acento|accent)\s*[:\-]?\s*(#[0-9a-fA-F]{3,8}|[a-z]+)$/i);
    if (match) {
      var colorMap = { negro: '#1c1917', carbon: '#1c1917', rojo: '#9f1239', taberna: '#9f1239', oliva: '#3f6212', verde: '#3f6212', dorado: '#b45309', marino: '#1e3a5f', azul: '#1e3a5f', terracota: '#c2410c' };
      var color = match[1].toLowerCase();
      editor.design.accent = color.charAt(0) === '#' ? color : (colorMap[color] || editor.design.accent);
      editor.design.palette = '';
      return 'Color actualizado: ' + editor.design.accent;
    }
    if (/^(activa|activar|mostrar)\s+eventos/i.test(text)) {
      ensureLabels(editor.design);
      ensureEventos(editor.design);
      editor.design.labels.vw_events = '1';
      if (!editor.plan_tier || planRank(editor.plan_tier) < 3) editor.plan_tier = 'digitalizacion-total';
      return 'Sección Eventos activada.';
    }
    if (/^(desactiva|desactivar|ocultar)\s+eventos/i.test(text)) {
      ensureLabels(editor.design);
      editor.design.labels.vw_events = '0';
      return 'Sección Eventos desactivada.';
    }
    match = text.match(/^eventos?\s+(eyebrow|t[ií]tulo|title|subt[ií]tulo|subtitle|lead|cta)\s*[:\-]?\s*(.+)$/i);
    if (match) {
      ensureEventos(editor.design);
      var key = match[1].toLowerCase();
      if (key.indexOf('tít') === 0 || key === 'title') key = 'title';
      else if (key.indexOf('subt') === 0 || key === 'subtitle') key = 'subtitle';
      editor.design.eventos[key] = match[2].trim();
      ensureLabels(editor.design);
      editor.design.labels.vw_events = '1';
      return 'Texto de Eventos actualizado (' + key + ').';
    }
    match = text.match(/^categor[ií]a\s*[:\-]?\s*(.+)$/i);
    if (match) {
      editor.categories.push({ id: null, name: match[1].trim(), items: [blankItem()] });
      return 'Categoría añadida: ' + match[1].trim();
    }
    match = text.match(/^plato\s*[:\-]?\s*([^|]+)\|([^|]*)\|?\s*([^|]*)\|?\s*(.*)$/i);
    if (match) {
      var catName = match[1].trim();
      var dishName = (match[2] || '').trim();
      var price = (match[3] || '').trim();
      var desc = (match[4] || '').trim();
      var cat = editor.categories.filter(function (row) { return row.name.toLowerCase() === catName.toLowerCase(); })[0];
      if (!cat) {
        cat = { id: null, name: catName, items: [] };
        editor.categories.push(cat);
      }
      cat.items.push({
        id: null,
        name: dishName || 'Plato',
        description: desc,
        price: price,
        image_url: '',
        imageFile: null,
        preview: '',
        allergens: [],
        featured: false
      });
      return 'Plato añadido en «' + catName + '»: ' + (dishName || 'Plato');
    }
    match = text.match(/^plan\s*[:\-]?\s*(120|390|790|basico|gastro-premium|digitalizacion-total)$/i);
    if (match) {
      editor.plan_tier = normalizePlanId(match[1]);
      applyPlanLimits(editor);
      return 'Plan ' + planLabel(editor.plan_tier) + ' aplicado.';
    }
    return 'No he entendido el cambio. Prueba: «nombre: …», «color: #1c1917», «horario: …», «activa eventos», «plato: Entrantes|Croquetas|8.5|Caseras» o pega un JSON.';
  }

  function chatBubble(message) {
    var mine = message.role === 'user';
    var tone = message.role === 'system'
      ? 'bg-stone-100 text-stone-600'
      : (mine ? 'bg-stone-900 text-white ml-8' : 'bg-white text-stone-800 ring-1 ring-stone-200 mr-8');
    return '<div class="rounded-2xl px-3 py-2 text-sm leading-snug ' + tone + '">' + esc(message.text) + '</div>';
  }

  function updateCollabChrome() {
    var editor = state.editor;
    if (!editor) return;
    ensureCollabChat(editor);
    var active = syncActiveChatRef(editor);
    var tabsWrap = document.getElementById('collab-chat-tabs');
    var panel = document.getElementById('collab-chat-panel');
    if (panel) {
      var tabsHtml = renderChatTabsHtml(editor);
      if (tabsWrap) {
        tabsWrap.outerHTML = tabsHtml || '<div id="collab-chat-tabs" class="hidden"></div>';
      } else if (tabsHtml) {
        panel.insertAdjacentHTML('afterbegin', tabsHtml);
      }
    }
    var list = document.getElementById('collab-chat-list');
    if (list) {
      var messages = active ? active.messages : [];
      list.innerHTML = messages.map(chatBubble).join('');
      list.scrollTop = list.scrollHeight;
    }
    syncChatPanelLayout(editor);
    var desktop = editor.viewport === 'desktop';
    var stage = document.getElementById('collab-preview-stage');
    if (stage) {
      stage.className = desktop
        ? 'flex min-h-0 flex-1 bg-white p-0'
        : 'flex min-h-0 flex-1 justify-center overflow-auto bg-stone-100 p-4';
    }
    var frame = document.getElementById('collab-preview');
    if (frame) {
      frame.className = desktop
        ? 'h-full w-full border-0 bg-white'
        : 'h-full border border-stone-200 bg-white shadow-sm';
      frame.style.width = desktop ? '100%' : '390px';
      frame.style.maxWidth = desktop ? '100%' : '390px';
      frame.style.height = '100%';
      frame.style.borderRadius = desktop ? '0' : '';
    }
    if (!editor.preview) editor.preview = 'web';
    document.querySelectorAll('[data-collab-viewport]').forEach(function (node) {
      node.className = 'h-7 rounded px-2 text-xs font-medium ' + (node.dataset.collabViewport === editor.viewport ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500');
    });
    document.querySelectorAll('[data-collab-preview]').forEach(function (node) {
      node.className = 'h-7 rounded px-2 text-xs font-medium ' + (node.dataset.collabPreview === editor.preview ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500');
    });
    var frameSrc = collabFrameSrc(editor);
    if (frame && frame.dataset.surface !== editor.preview) {
      frame.dataset.surface = editor.preview;
      frame.src = frameSrc;
    }
    var send = document.getElementById('send-proposal');
    if (send) {
      send.disabled = !!state.busy;
      send.textContent = state.busy ? 'Enviando…' : 'Enviar propuesta al administrador';
    }
    var notice = document.getElementById('collab-banner');
    if (notice) notice.innerHTML = banner();
    var title = document.getElementById('collab-title');
    if (title) title.textContent = editor.name || 'Nuevo restaurante';
  }

  function renderCollabStudio() {
    var editor = state.editor;
    ensureCollabChat(editor);
    if (document.getElementById('collab-studio')) {
      updateCollabChrome();
      pushCollabPreview();
      return;
    }
    var open = Array.isArray(editor.chats) && editor.chats.length > 0;
    var active = syncActiveChatRef(editor);
    var messages = active ? active.messages : [];
    app.innerHTML =
      '<div id="collab-studio" class="fixed inset-0 z-50 flex flex-col bg-stone-100">' +
        '<header class="flex h-12 shrink-0 items-center gap-2 border-b border-stone-200 bg-white px-3">' +
          '<button type="button" id="close-editor" class="h-10 rounded-md px-2 text-base font-semibold text-black">← Panel</button>' +
          '<p id="collab-title" class="truncate text-sm font-semibold text-stone-900">' + esc(editor.name || 'Nuevo restaurante') + '</p>' +
          '<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Colaborador · sin descarga</span>' +
          '<div class="ml-auto flex h-8 items-center rounded-md bg-stone-100 p-0.5">' +
            '<button type="button" data-collab-preview="web" class="h-7 rounded px-2 text-xs font-medium">Web</button>' +
            '<button type="button" data-collab-preview="mesa" class="h-7 rounded px-2 text-xs font-medium">QR Mesa</button>' +
          '</div>' +
        '</header>' +
        '<div id="collab-banner" class="shrink-0 px-3 pt-2">' + banner() + '</div>' +
        '<div class="flex min-h-0 flex-1">' +
          '<section class="flex min-w-0 flex-1 flex-col">' +
            '<div class="relative flex shrink-0 items-center justify-center gap-2 border-b border-stone-200 bg-white px-3 py-2 pr-14">' +
              '<span class="text-xs font-medium text-stone-500">Vista</span>' +
              '<div class="flex h-8 items-center rounded-md bg-stone-100 p-0.5">' +
                '<button type="button" data-collab-viewport="mobile" class="h-7 rounded px-2 text-xs font-medium">Móvil · 390px</button>' +
                '<button type="button" data-collab-viewport="desktop" class="h-7 rounded px-2 text-xs font-medium">Escritorio · 100%</button>' +
              '</div>' +
              '<button type="button" id="ampliar-preview" class="h-8 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-800">Ampliar</button>' +
              '<button type="button" id="toggle-chat-panel" aria-label="Abrir chat" class="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md border border-stone-200 text-stone-800 hover:bg-stone-50 ' + (open ? 'bg-stone-100' : 'bg-white') + '">' + chatIconSvg(16) + '</button>' +
            '</div>' +
            '<div id="collab-preview-stage" class="' + (editor.viewport === 'desktop' ? 'flex min-h-0 flex-1 bg-white p-0' : 'flex min-h-0 flex-1 justify-center overflow-auto bg-stone-100 p-4') + '">' +
              '<iframe id="collab-preview" title="Vista previa" data-surface="' + (editor.preview === 'mesa' ? 'mesa' : 'web') + '" src="' + collabFrameSrc(editor) + '" class="' + (editor.viewport === 'desktop' ? 'h-full w-full border-0 bg-white' : 'h-full border border-stone-200 bg-white shadow-sm') + '" style="width:' + (editor.viewport === 'desktop' ? '100%' : '390px') + ';max-width:' + (editor.viewport === 'desktop' ? '100%' : '390px') + ';height:100%"></iframe>' +
            '</div>' +
          '</section>' +
          '<section id="collab-chat-panel" class="flex w-full max-w-md shrink-0 flex-col border-l border-stone-200 bg-white' + (open ? '' : ' hidden') + '"' + (open ? '' : ' style="width:0;max-width:0;border-left-width:0"') + '>' +
            renderChatTabsHtml(editor) +
            '<div id="collab-chat-list" class="min-h-0 flex-1 space-y-2 overflow-auto p-3">' + messages.map(chatBubble).join('') + '</div>' +
            '<form id="collab-chat-form" class="shrink-0 border-t border-stone-200 p-3">' +
              '<label class="sr-only" for="collab-chat-input">Mensaje</label>' +
              '<textarea id="collab-chat-input" rows="3" class="w-full resize-none rounded-2xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400" placeholder="Escribe un cambio y pulsa Enter · Shift+Enter para salto de línea"></textarea>' +
              '<button type="submit" class="sr-only">Aplicar</button>' +
              '<button type="button" id="send-proposal" class="mt-2 w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-semibold text-black"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Enviando…' : 'Enviar propuesta al administrador') + '</button>' +
            '</form>' +
          '</section>' +
        '</div>' +
      '</div>';
    if (!editor.preview) editor.preview = 'web';
    updateCollabChrome();
    var frame = document.getElementById('collab-preview');
    if (frame) frame.addEventListener('load', function () { pushCollabPreview(true); });
  }

  async function sendProposal() {
    if (!state.editor || state.busy) return;
    state.busy = true;
    state.error = '';
    state.notice = '';
    updateCollabChrome();
    try {
      var email = currentEmail();
      var payload = projectPayloadFromEditor(state.editor);
      var row;
      if (state.editor.proposalId) {
        var updated = await supabase.from('propuestas_webs').update({
          nombre_local: state.editor.name || '',
          correo_colaborador: email,
          restaurant_data: payload,
          estado: 'pendiente',
          updated_at: new Date().toISOString()
        }).eq('id', state.editor.proposalId).select('*').single();
        if (updated.error) throw updated.error;
        row = updated.data;
      } else {
        var inserted = await supabase.from('propuestas_webs').insert({
          nombre_local: state.editor.name || '',
          correo_colaborador: email,
          collaborator_id: state.session.user.id,
          restaurant_data: payload,
          estado: 'pendiente',
          updated_at: new Date().toISOString()
        }).select('*').single();
        if (inserted.error) throw inserted.error;
        row = inserted.data;
        state.editor.proposalId = row.id;
      }
      mergeProjectIntoLists(row);
      persistActiveLocal();
      state.busy = false;
      ensureCollabChat(state.editor);
      var activeSend = syncActiveChatRef(state.editor);
      if (activeSend) {
        activeSend.messages.push({ role: 'system', text: 'Propuesta enviada al administrador. Queda pendiente de revisión.' });
        activeSend.title = chatTabTitle(activeSend, state.editor.chats.indexOf(activeSend));
      }
      setNotice('Propuesta enviada al administrador.');
      updateCollabChrome();
    } catch (error) {
      state.busy = false;
      setError(dbMessage(error) || 'No se ha podido enviar la propuesta.');
      updateCollabChrome();
    }
  }

  function selectedProposal() {
    return state.proposals.filter(function (row) { return row.id === state.selectedProposalId; })[0] || null;
  }

  function pushProposalPreview() {
    var frame = document.getElementById('proposal-preview');
    var row = selectedProposal();
    if (!frame || !frame.contentWindow || !row) return;
    var payload = row.restaurant_data || {};
    frame.contentWindow.postMessage({
      type: 'RESTAURANT_DATA',
      payload: payload,
      RESTAURANT_DATA: payload
    }, location.origin);
  }

  function bothLang(text) {
    var value = text || '';
    return { es: value, en: value };
  }

  function moneyPair(value) {
    var n = Number(value);
    if (!isFinite(n)) {
      var raw = String(value == null ? '' : value).replace(',', '.').replace(/[^\d.]/g, '');
      n = Number(raw);
    }
    if (!isFinite(n)) n = 0;
    return {
      n: n,
      es: n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
      en: '€' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  }

  function demoShapeFromPayload(payload) {
    var data = payload || {};
    var name = data.name || 'Restaurante';
    var tagline = data.tagline || '';
    var phone = data.phone || '';
    var address = data.address || '';
    var categories = Array.isArray(data.categories) ? data.categories : [];
    var featured = [];
    var menu = categories.map(function (category, index) {
      var catName = category.name || 'Carta';
      var items = (category.items || []).map(function (item, itemIndex) {
        var price = moneyPair(item.price);
        var id = String(item.id || ('item-' + index + '-' + itemIndex));
        if (item.featured) featured.push(id);
        return {
          id: id,
          name: bothLang(item.name || 'Plato'),
          desc: bothLang(item.description || ''),
          price: price.es,
          priceEn: price.en,
          priceValue: price.n,
          allergens: Array.isArray(item.allergens) ? item.allergens : [],
          tags: item.featured ? ['recomendado'] : [],
          featured: !!item.featured,
          image: item.image_url || null
        };
      });
      return {
        id: String(category.id || ('cat-' + index)),
        anchor: slugify(catName) || ('cat-' + index),
        name: bothLang(catName),
        desc: bothLang(''),
        items: items
      };
    });
    var design = data.design_config || data.design || {};
    var eventosActivo = data.eventos_activo === true || (design.labels && design.labels.vw_events === '1');
    var ev = (design && design.eventos) || {};
    return {
      developer: {
        name: 'VisiWeb Madrid',
        plansUrl: 'https://visiwebmadrid.com/#planes',
        whatsapp: '34608975906'
      },
      business: {
        name: name,
        type: bothLang(tagline),
        since: 2026,
        timezone: 'Europe/Madrid',
        priceRange: '€€',
        cuisine: ['Spanish'],
        phone: phone,
        phoneDisplay: phone,
        whatsapp: String(data.whatsapp || '').replace(/\D/g, ''),
        instagram: data.instagram || '',
        addressLine: address,
        address: {
          street: bothLang(address),
          postalCode: '',
          city: '',
          region: 'Madrid',
          country: 'ES'
        },
        geo: null,
        mapQuery: ''
      },
      images: {
        hero: data.cover_image_url || null,
        heroAlt: bothLang(name),
        facade: data.cover_image_url || null,
        salon: null,
        salon2: null,
        terrace: null,
        bar: null
      },
      hours: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      scheduleText: data.schedule || '',
      allergens: {},
      dietTags: {},
      menu: menu,
      reviews: { score: 0, count: 0, items: [] },
      local: {
        stats: [],
        rooms: []
      },
      history: {
        title: bothLang(name),
        lead: bothLang(data.description || tagline || ''),
        chapters: []
      },
      eventos: {
        activo: !!eventosActivo,
        tipoVideo: ev.tipoVideo || 'salon',
        eyebrow: bothLang(ev.eyebrow || ''),
        title: bothLang(ev.title || 'Eventos'),
        subtitle: bothLang(ev.subtitle || ''),
        lead: bothLang(ev.lead || ''),
        cta: bothLang(ev.cta || ''),
        readyTitle: bothLang(ev.readyTitle || ''),
        readyCta: bothLang(ev.readyCta || ''),
        phone: phone,
        phoneDisplay: phone,
        whatsapp: String(data.whatsapp || '').replace(/\D/g, '')
      },
      gbp: { category: bothLang(tagline || 'Restaurante'), attributes: [] },
      booking: { maxGuests: 20, slotMinutes: 30, lastSeatingBeforeClose: 30, areas: ['any', 'salon', 'terrace', 'bar'] },
      featured: featured,
      design: design,
      dailyMenu: data.daily_menu || null,
      plan_tier: normalizePlanId(data.plan_tier) || data.plan_tier || '',
      plan: (function () {
        var p = planById(data.plan_tier);
        return p ? { id: p.id, name: p.name, price: p.price, summary: p.summary, features: p.features.slice() } : null;
      })(),
      i18n: {
        es: {
          metaTitle: name + (tagline ? ' · ' + tagline : ''),
          metaDescription: data.description || tagline || name,
          heroTitle: tagline || name,
          heroSubtitle: data.description || tagline || '',
          heroEyebrow: address,
          heroKicker: tagline || name
        },
        en: {
          metaTitle: name + (tagline ? ' · ' + tagline : ''),
          metaDescription: data.description || tagline || name,
          heroTitle: tagline || name,
          heroSubtitle: data.description || tagline || '',
          heroEyebrow: address,
          heroKicker: tagline || name
        }
      },
      whatsappText: {
        es: 'Hola, me gustaría reservar mesa en ' + name + '.',
        en: 'Hello, I would like to book a table at ' + name + '.'
      },
      legalPages: {
        notice: 'aviso-legal.html',
        privacy: 'politica-privacidad.html',
        cookies: 'politica-cookies.html'
      },
      RESTAURANT_DATA: data
    };
  }

  function buildDataJsFile(payload) {
    var shape = demoShapeFromPayload(payload);
    return (
      '/* =====================================================================\n' +
      '   VisiWeb Madrid · data.js generado desde propuesta\n' +
      '   Pegar en visiweb-clientes/<slug>/data.js\n' +
      '   ===================================================================== */\n' +
      'window.VISIWEB_DEMO = (function () {\n' +
      "  'use strict';\n" +
      '  return ' + JSON.stringify(shape, null, 2).replace(/\n/g, '\n  ') + ';\n' +
      '})();\n'
    );
  }

  function downloadDataJs() {
    var row = selectedProposal();
    if (!row) return;
    var blob = new Blob([buildDataJsFile(row.restaurant_data || {})], { type: 'application/javascript;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    var slug = slugify(row.nombre_local || 'restaurante') || 'restaurante';
    link.href = url;
    link.download = 'data.js';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice('data.js descargado (' + slug + ').');
    updateProposalsChrome();
  }

  async function approveProposal() {
    var row = selectedProposal();
    if (!row || state.busy) return;
    state.busy = true;
    updateProposalsChrome();
    try {
      var result = await supabase.from('propuestas_webs').update({
        estado: 'publicada',
        reviewed_at: new Date().toISOString(),
        reviewed_by: state.session.user.id
      }).eq('id', row.id).select('*').single();
      if (result.error) throw result.error;
      state.proposals = state.proposals.map(function (item) {
        return item.id === row.id ? result.data : item;
      });
      setNotice('Propuesta marcada como Aprobada / Publicada.');
    } catch (error) {
      setError('No se ha podido actualizar la propuesta.');
    }
    state.busy = false;
    updateProposalsChrome();
  }

  function proposalStatusClass(estado) {
    if (estado === 'publicada' || estado === 'aprobada') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    if (estado === 'rechazada') return 'bg-red-50 text-red-800 ring-red-200';
    return 'bg-amber-50 text-amber-900 ring-amber-200';
  }

  function formatProposalDate(value) {
    try {
      return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    } catch (error) {
      return value || '';
    }
  }

  function updateProposalsChrome() {
    var list = document.getElementById('proposals-list');
    if (list) {
      list.innerHTML = state.proposals.length
        ? state.proposals.map(function (row) {
            var on = row.id === state.selectedProposalId;
            return (
              '<button type="button" data-proposal="' + esc(row.id) + '" class="w-full rounded-2xl px-3 py-3 text-left ring-1 ' +
                (on ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-800 ring-stone-200') + '">' +
                '<span class="block truncate text-sm font-semibold">' + esc(row.nombre_local || 'Sin nombre') + '</span>' +
                '<span class="mt-1 block truncate text-xs ' + (on ? 'text-stone-300' : 'text-stone-500') + '">' + esc(row.correo_colaborador || '') + '</span>' +
                '<span class="mt-2 flex items-center justify-between gap-2">' +
                  '<span class="text-[11px] ' + (on ? 'text-stone-400' : 'text-stone-400') + '">' + esc(formatProposalDate(row.created_at)) + '</span>' +
                  '<span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ' + proposalStatusClass(row.estado) + '">' + esc(row.estado || 'pendiente') + '</span>' +
                '</span>' +
              '</button>'
            );
          }).join('')
        : '<p class="rounded-2xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">No hay propuestas todavía.</p>';
    }
    var frame = document.getElementById('proposal-preview');
    if (frame) {
      frame.style.width = state.proposalViewport === 'desktop' ? '100%' : '390px';
      frame.style.maxWidth = state.proposalViewport === 'desktop' ? '100%' : '390px';
    }
    document.querySelectorAll('[data-proposal-viewport]').forEach(function (node) {
      node.className = 'h-7 rounded px-2 text-xs font-medium ' + (node.dataset.proposalViewport === state.proposalViewport ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500');
    });
    var download = document.getElementById('download-data-js');
    var approve = document.getElementById('approve-proposal');
    var has = !!selectedProposal();
    if (download) download.disabled = !has || state.busy;
    if (approve) {
      approve.disabled = !has || state.busy;
      var current = selectedProposal();
      approve.textContent = current && (current.estado === 'publicada' || current.estado === 'aprobada')
        ? 'Ya publicada'
        : (state.busy ? 'Guardando…' : 'Aprobada / Publicada');
    }
    var notice = document.getElementById('proposals-banner');
    if (notice) notice.innerHTML = banner();
    var empty = document.getElementById('proposal-empty');
    if (empty) empty.hidden = has;
  }

  function renderAdminProposals() {
    if (document.getElementById('admin-proposals')) {
      updateProposalsChrome();
      pushProposalPreview();
      return;
    }
    app.innerHTML =
      '<div id="admin-proposals" class="fixed inset-0 z-50 flex flex-col bg-stone-100">' +
        '<header class="flex h-12 shrink-0 items-center gap-2 border-b border-stone-200 bg-white px-3">' +
          '<button type="button" id="close-proposals" class="h-8 rounded-md px-2 text-xs font-medium text-stone-500">← Panel</button>' +
          '<p class="text-sm font-semibold text-stone-900">Propuestas recibidas</p>' +
          '<span class="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">' + esc(state.profile.email || '') + '</span>' +
        '</header>' +
        '<div id="proposals-banner" class="shrink-0 px-3 pt-2">' + banner() + '</div>' +
        '<div class="flex min-h-0 flex-1">' +
          '<aside class="flex w-full max-w-sm shrink-0 flex-col border-r border-stone-200 bg-white">' +
            '<div class="border-b border-stone-200 px-3 py-3">' +
              '<p class="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Cola de revisión</p>' +
            '</div>' +
            '<div id="proposals-list" class="min-h-0 flex-1 space-y-2 overflow-auto p-3"></div>' +
          '</aside>' +
          '<section class="flex min-w-0 flex-1 flex-col">' +
            '<div class="flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-stone-200 bg-white px-3 py-2">' +
              '<span class="text-xs font-medium text-stone-500">Vista</span>' +
              '<div class="flex h-8 items-center rounded-md bg-stone-100 p-0.5">' +
                '<button type="button" data-proposal-viewport="mobile" class="h-7 rounded px-2 text-xs font-medium">Móvil · 390px</button>' +
                '<button type="button" data-proposal-viewport="desktop" class="h-7 rounded px-2 text-xs font-medium">Escritorio · 100%</button>' +
              '</div>' +
              '<button type="button" id="download-data-js" class="ml-auto rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white">Descargar data.js</button>' +
              '<button type="button" id="approve-proposal" class="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-black">Aprobada / Publicada</button>' +
            '</div>' +
            '<div class="relative flex min-h-0 flex-1 justify-center overflow-auto bg-stone-100 p-4">' +
              '<p id="proposal-empty" class="absolute inset-0 grid place-items-center text-sm text-stone-500">Selecciona una propuesta para revisarla.</p>' +
              '<iframe id="proposal-preview" title="Vista previa propuesta" src="/panel/preview/index.html#inicio" class="h-full border border-stone-200 bg-white shadow-sm" style="width:390px;max-width:390px"></iframe>' +
            '</div>' +
          '</section>' +
        '</div>' +
      '</div>';
    updateProposalsChrome();
    var frame = document.getElementById('proposal-preview');
    if (frame) frame.addEventListener('load', function () { pushProposalPreview(); });
  }

  function render() {
    if (!state.ready) {
      app.innerHTML = '<p class="px-6 py-16 text-center text-sm text-stone-500">Cargando…</p>';
      renderCreateModal();
      return;
    }
    if (!state.session || !state.profile) {
      renderLogin();
      renderCreateModal();
      return;
    }
    if (isAdmin() && state.adminTab === 'proposals') {
      state.adminTab = 'people';
    }
    if (state.editor) {
      if (state.editor.studioMode === 'chat' || !isAdmin()) {
        renderCollabStudio();
        renderGithubDrawer();
        renderCreateModal();
        return;
      }
      if (state.editor.id && window.VisiwebCanva) {
        window.VisiwebCanva.sync(state, {
          esc: esc,
          banner: banner,
          menuHtml: function () { return renderStepB(state.editor); },
          uploadImage: function (file) { return uploadAsset(state.editor.id, file, 'pieza'); },
          close: function () {
            state.editor = null;
            refresh();
          },
          saveAll: saveAll
        });
        renderCreateModal();
        return;
      }
      renderEditor();
      renderCreateModal();
      return;
    }
    renderHome();
  }

  function banner() {
    if (state.error) return '<p class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">' + esc(state.error) + '</p>';
    if (state.notice) return '<p class="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">' + esc(state.notice) + '</p>';
    return '';
  }

  function renderLogin() {
    app.innerHTML =
      '<main class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">' +
        '<p class="font-serif text-3xl text-stone-900">VisiWeb</p>' +
        '<h1 class="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Panel privado</h1>' +
        '<form id="login-form" class="mt-8 space-y-4">' +
          banner() +
          '<label class="block text-sm font-semibold">Correo' +
            '<input id="login-email" name="email" type="email" autocomplete="username" required class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300">' +
          '</label>' +
          '<label class="block text-sm font-semibold">Contraseña' +
            '<input id="login-password" name="password" type="password" autocomplete="current-password" required class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300">' +
          '</label>' +
          '<button type="submit" class="w-full rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Entrando…' : 'Entrar') + '</button>' +
        '</form>' +
      '</main>';
  }

  function summary() {
    var closed = state.restaurants.filter(function (restaurant) { return restaurant.status === 'activo'; });
    var sales = closed.reduce(function (sum, restaurant) { return sum + planPrice(restaurant.plan_tier); }, 0);
    return (
      '<section class="grid gap-3 sm:grid-cols-2">' +
        '<article class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200">' +
          '<p class="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Ventas cerradas</p>' +
          '<p class="mt-2 font-serif text-4xl">' + closed.length + '</p>' +
          '<p class="mt-1 text-sm text-stone-500">Locales activos · ' + esc(euros(sales)) + '</p>' +
        '</article>' +
        '<article class="rounded-3xl bg-stone-900 p-5 text-white shadow-sm">' +
          '<p class="text-xs font-semibold uppercase tracking-[0.14em] text-stone-300">Comisión estimada 25 %</p>' +
          '<p class="mt-2 font-serif text-4xl">' + esc(euros(sales * 0.25)) + '</p>' +
          '<p class="mt-1 text-sm text-stone-300">Sobre los planes de los locales activos</p>' +
        '</article>' +
      '</section>'
    );
  }

  function agencySummary() {
    var active = state.restaurants.filter(function (restaurant) { return restaurant.status === 'activo'; });
    var revenue = active.reduce(function (sum, restaurant) { return sum + planPrice(restaurant.plan_tier); }, 0);
    return (
      '<section class="grid gap-3 sm:grid-cols-2">' +
        '<article class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200">' +
          '<p class="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Total de restaurantes activos</p>' +
          '<p class="mt-2 font-serif text-4xl">' + active.length + '</p>' +
        '</article>' +
        '<article class="rounded-3xl bg-stone-900 p-5 text-white shadow-sm">' +
          '<p class="text-xs font-semibold uppercase tracking-[0.14em] text-stone-300">Ingresos totales cerrados</p>' +
          '<p class="mt-2 font-serif text-4xl">' + esc(euros(revenue)) + '</p>' +
        '</article>' +
      '</section>'
    );
  }

  function restaurantCard(restaurant) {
    var admin = isAdmin();
    var status = admin
      ? '<label class="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Estado' +
          '<select data-status="' + esc(restaurant.id) + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-900">' +
            STATUSES.map(function (item) {
              return '<option value="' + item.id + '"' + (item.id === restaurant.status ? ' selected' : '') + '>' + item.label + '</option>';
            }).join('') +
          '</select></label>'
      : '<span class="mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ' + statusClass(restaurant.status) + '">' + esc(statusLabel(restaurant.status)) + '</span>';
    return (
      '<article class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<h2 class="truncate font-serif text-2xl">' + esc(restaurant.name) + '</h2>' +
            '<p class="mt-1 truncate text-sm text-stone-500">/r/' + esc(restaurant.slug) + '</p>' +
          '</div>' +
          '<p class="shrink-0 text-sm font-semibold">' + esc(planLabel(restaurant.plan_tier)) + '</p>' +
        '</div>' +
        (admin ? '<p class="mt-3 text-sm text-stone-600">Creado por <span class="font-semibold text-stone-900">' + esc(ownerName(restaurant)) + '</span></p>' : '') +
        status +
        '<div class="mt-4 flex flex-wrap gap-2">' +
          '<button type="button" data-copy="' + esc(restaurant.slug) + '" class="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">' + (state.copied === restaurant.slug ? 'Enlace copiado' : 'Copiar enlace de demo') + '</button>' +
          '<button type="button" data-edit="' + esc(restaurant.id) + '" class="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-800">Editar</button>' +
          (admin ? '<button type="button" data-delete="' + esc(restaurant.id) + '" class="rounded-full px-4 py-2 text-sm font-semibold text-red-700">Eliminar</button>' : '') +
        '</div>' +
      '</article>'
    );
  }

  function projectStatusLabel(estado) {
    if (estado === 'publicada' || estado === 'aprobada') return 'Publicada';
    if (estado === 'rechazada') return 'Rechazada';
    if (estado === 'pendiente') return 'Pendiente';
    return 'Borrador';
  }

  function projectPlanFromRow(row) {
    var data = (row && row.restaurant_data) || {};
    var meta = data._meta || {};
    return planById(meta.plan_tier || data.plan_tier || '');
  }

  function projectCard(row) {
    var name = row.nombre_local || ((row.restaurant_data && row.restaurant_data.name) || 'Sin nombre');
    var plan = projectPlanFromRow(row);
    var slug = ((row.restaurant_data && row.restaurant_data._meta && row.restaurant_data._meta.slug) || (row.restaurant_data && row.restaurant_data.slug) || '');
    return (
      '<article class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200">' +
        '<div class="flex items-start gap-3">' +
          '<div class="min-w-0 flex-1">' +
            '<div class="flex items-start justify-between gap-3">' +
              '<div class="min-w-0">' +
                '<h2 class="truncate font-serif text-2xl">' + esc(name) + '</h2>' +
                (slug ? '<p class="mt-1 truncate text-sm text-stone-500">/r/' + esc(slug) + '</p>' : '') +
              '</div>' +
              (plan ? '<p class="shrink-0 text-sm font-semibold">' + esc(plan.name + ' · ' + plan.price + ' €') + '</p>' : '') +
            '</div>' +
            '<p class="mt-1 text-sm text-stone-500">' + esc(projectStatusLabel(row.estado)) + ' · ' + esc(formatProposalDate(row.updated_at || row.created_at)) + '</p>' +
            (plan ? '<p class="mt-2 text-xs leading-snug text-stone-500">' + esc(plan.summary) + '</p>' : '') +
            '<div class="mt-4 flex flex-wrap gap-2">' +
              '<button type="button" data-open-project="' + esc(row.id) + '" class="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Abrir</button>' +
            '</div>' +
          '</div>' +
          '<button type="button" data-delete-project="' + esc(row.id) + '" class="shrink-0 rounded-full p-2 text-stone-400 hover:bg-red-50 hover:text-red-700" title="Eliminar" aria-label="Eliminar proyecto">' + trashIcon() + '</button>' +
        '</div>' +
      '</article>'
    );
  }

  function adminPersonCard(person) {
    var open = state.expandedPersonId === person.id;
    var mine =
      person.id === userId() ||
      String(person.email || '').toLowerCase() === currentEmail();
    var label = mine ? 'Tus proyectos' : (person.full_name || person.email || 'Colaborador');
    var subtitle = mine ? 'Tú' : (person.email || '');
    var count = (person.projects || []).length;
    return (
      '<article class="rounded-3xl bg-white shadow-sm ring-1 ring-stone-200">' +
        '<button type="button" data-expand-person="' + esc(person.id) + '" class="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">' +
          '<span class="min-w-0">' +
            '<span class="block truncate font-serif text-xl text-stone-900">' + esc(label) + '</span>' +
            (subtitle ? '<span class="mt-0.5 block truncate text-sm text-stone-500">' + esc(subtitle) + '</span>' : '') +
          '</span>' +
          '<span class="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">' + count + ' proyecto' + (count === 1 ? '' : 's') + '</span>' +
        '</button>' +
        (open
          ? '<div class="space-y-2 border-t border-stone-100 px-5 py-4">' +
              (count
                ? person.projects.map(function (row) {
                    var name = row.nombre_local || 'Sin nombre';
                    var plan = projectPlanFromRow(row);
                    return (
                      '<div class="flex items-center gap-2 rounded-2xl bg-stone-50 px-3 py-3">' +
                        '<div class="min-w-0 flex-1">' +
                          '<p class="truncate text-sm font-semibold text-stone-900">' + esc(name) + '</p>' +
                          '<p class="truncate text-xs text-stone-500">' + esc(projectStatusLabel(row.estado)) + (plan ? ' · ' + esc(plan.name) : '') + '</p>' +
                        '</div>' +
                        '<button type="button" data-open-project="' + esc(row.id) + '" class="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">Abrir</button>' +
                        '<button type="button" data-delete-project="' + esc(row.id) + '" class="rounded-full p-2 text-stone-400 hover:bg-red-50 hover:text-red-700" title="Eliminar" aria-label="Eliminar">' + trashIcon() + '</button>' +
                      '</div>'
                    );
                  }).join('')
                : '<p class="text-sm text-stone-500">Sin proyectos todavía.</p>') +
            '</div>'
          : '') +
      '</article>'
    );
  }

  function renderGithubDrawer() {
    var existing = document.getElementById('github-drawer');
    if (existing) existing.remove();
    if (!isAdmin()) return;
    var open = !!state.githubOpen;
    var drawer = document.createElement('div');
    drawer.id = 'github-drawer';
    drawer.innerHTML =
      '<div class="fixed inset-x-0 top-0 z-[80] transition-transform duration-200 ' + (open ? 'translate-y-0' : '-translate-y-full') + '">' +
        '<div class="border-b border-stone-200 bg-white px-4 py-3 shadow-lg sm:px-6">' +
          '<div class="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-end">' +
            '<label class="block min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Carpeta / slug del local' +
              '<input id="github-slug" type="text" value="' + esc(state.githubSlug || '') + '" placeholder="bar-el-roble" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold normal-case tracking-normal text-stone-900 outline-none focus:border-stone-400">' +
            '</label>' +
            '<button type="button" id="github-publish" class="rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white"' + (state.githubBusy ? ' disabled' : '') + '>' + (state.githubBusy ? 'Subiendo…' : 'Subir cambios a GitHub') + '</button>' +
            '<button type="button" id="github-close" class="rounded-full px-3 py-2.5 text-sm font-semibold text-stone-500">Cerrar</button>' +
          '</div>' +
          (state.githubNotice ? '<p class="mx-auto mt-2 max-w-3xl text-sm text-emerald-700">' + esc(state.githubNotice) + '</p>' : '') +
          (state.error && open ? '<p class="mx-auto mt-2 max-w-3xl text-sm text-red-700">' + esc(state.error) + '</p>' : '') +
          '<p class="mx-auto mt-2 max-w-3xl text-xs text-stone-400">Atajo: Ctrl + Ñ · Repo visiweb-clientes · rama main</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(drawer);
  }

  function blankCreateModal() {
    return {
      open: true,
      name: '',
      slug: '',
      autoSlug: true,
      plan: '',
      assigneeId: userId(),
      cuisine: '',
      phone: '',
      address: '',
      notesOpen: false,
      notes: '',
      featuresOpen: '',
      error: '',
      busy: false
    };
  }

  function openCreateModal() {
    state.createModal = blankCreateModal();
    state.error = '';
    state.notice = '';
    render();
  }

  function closeCreateModal() {
    state.createModal = null;
    render();
  }

  function assigneeOptions() {
    var seen = {};
    var list = [];
    var push = function (id, label, email) {
      if (!id || seen[id]) return;
      seen[id] = true;
      list.push({ id: id, label: label || email || 'Usuario', email: email || '' });
    };
    push(userId(), 'Tú · ' + (currentEmail() || 'sesión actual'), currentEmail());
    Object.keys(state.owners || {}).forEach(function (id) {
      var person = state.owners[id];
      push(id, person.full_name || person.email || 'Colaborador', person.email || '');
    });
    (state.adminPeople || []).forEach(function (person) {
      push(person.id, person.full_name || person.email || 'Colaborador', person.email || '');
    });
    return list;
  }

  function slugTaken(slug, ignoreRestaurantId) {
    var clean = slugify(slug);
    if (!clean) return false;
    var inRestaurants = (state.restaurants || []).some(function (row) {
      return row.slug === clean && row.id !== ignoreRestaurantId;
    });
    if (inRestaurants) return true;
    return (state.myProjects || []).concat(state.proposals || []).some(function (row) {
      var data = row.restaurant_data || {};
      var meta = data._meta || {};
      var existing = slugify(meta.slug || data.slug || '');
      return existing === clean && row.id !== (state.createModal && state.createModal.ignoreProposalId);
    });
  }

  function createModalPlanCard(plan, selected, featuresOpen) {
    var on = selected === plan.id;
    var open = featuresOpen === plan.id;
    return (
      '<article class="flex min-w-0 flex-col rounded-3xl border bg-[#FAF9F6] p-4 ' + (on ? 'border-stone-900 ring-2 ring-stone-900' : 'border-stone-200') + '">' +
        '<button type="button" data-create-plan="' + esc(plan.id) + '" class="w-full text-left">' +
          '<p class="font-serif text-xl font-semibold text-stone-900">' + esc(plan.name) + '</p>' +
          '<p class="mt-0.5 text-xs text-stone-500">' + esc(plan.tagline) + '</p>' +
          '<p class="mt-3 text-2xl font-bold text-stone-900">' + plan.price + ' €</p>' +
          '<p class="mt-0.5 text-xs text-stone-500">IVA no incluido</p>' +
          '<p class="mt-1 text-xs text-stone-500">Web en propiedad · Sin permanencia</p>' +
          '<p class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700">' +
            '<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5V8l2 1.2"/></svg>' +
            esc(plan.delivery) +
          '</p>' +
          '<p class="mt-3 text-sm leading-snug text-stone-600">' + esc(plan.summary) + '</p>' +
        '</button>' +
        '<button type="button" data-create-features="' + esc(plan.id) + '" class="mt-3 flex w-full items-center justify-center gap-1 text-xs font-semibold text-stone-500">' +
          (open ? 'Ocultar características' : 'Ver características') +
          '<span aria-hidden="true">' + (open ? '▴' : '▾') + '</span>' +
        '</button>' +
        (open
          ? '<ul class="mt-2 space-y-0 divide-y divide-stone-200/80 border-t border-stone-200/80">' +
              plan.features.map(function (feature) {
                return '<li class="flex gap-2 py-2 text-xs leading-snug text-stone-600"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300"></span><span>' + esc(feature) + '</span></li>';
              }).join('') +
            '</ul>'
          : '') +
        '<button type="button" data-create-plan="' + esc(plan.id) + '" class="mt-4 w-full rounded-full px-3 py-2.5 text-sm font-semibold ' +
          (on ? 'bg-[#f59e0b] text-black' : 'border border-stone-300 bg-white text-stone-900') + '">' +
          (on ? 'Seleccionado' : 'Elegir este') +
        '</button>' +
      '</article>'
    );
  }

  function renderCreateModal() {
    var existing = document.getElementById('create-restaurant-modal');
    if (existing) existing.remove();
    var modal = state.createModal;
    if (!modal || !modal.open) return;
    var people = assigneeOptions();
    var assigneeLocked = !isAdmin() && people.length <= 1;
    var root = document.createElement('div');
    root.id = 'create-restaurant-modal';
    root.innerHTML =
      '<div class="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-stone-900/40 px-4 py-6 sm:py-10">' +
        '<div class="w-full max-w-5xl rounded-[28px] border border-stone-200 bg-[#FAF9F6] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="create-restaurant-title">' +
          '<div class="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:px-6">' +
            '<div>' +
              '<h2 id="create-restaurant-title" class="font-serif text-2xl text-stone-900">Nuevo restaurante</h2>' +
              '<p class="mt-1 text-sm text-stone-500">Crea el local, elige el plan y abre el editor.</p>' +
            '</div>' +
            '<button type="button" id="create-modal-close" class="rounded-full px-3 py-2 text-sm font-semibold text-stone-500" aria-label="Cerrar">Cerrar</button>' +
          '</div>' +
          '<form id="create-restaurant-form" class="space-y-6 px-5 py-5 sm:px-6 sm:py-6">' +
            (modal.error ? '<p class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">' + esc(modal.error) + '</p>' : '') +
            '<div class="grid gap-4 sm:grid-cols-2">' +
              '<label class="block text-sm font-semibold">Nombre del restaurante' +
                '<input data-create="name" type="text" required value="' + esc(modal.name) + '" placeholder="Bar El Roble" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-400">' +
              '</label>' +
              '<label class="block text-sm font-semibold">Slug / Carpeta' +
                '<span class="mt-1 flex overflow-hidden rounded-2xl border border-stone-200 bg-white focus-within:border-stone-400">' +
                  '<span class="px-3 py-3 text-sm text-stone-400">/r/</span>' +
                  '<input data-create="slug" type="text" required value="' + esc(modal.slug) + '" placeholder="bar-el-roble" class="w-full bg-transparent py-3 pr-4 text-base outline-none">' +
                '</span>' +
              '</label>' +
            '</div>' +
            '<div>' +
              '<p class="text-sm font-semibold">Plan / Tipo de web</p>' +
              '<div class="mt-3 grid gap-3 lg:grid-cols-3">' +
                PLANS.map(function (plan) { return createModalPlanCard(plan, modal.plan, modal.featuresOpen); }).join('') +
              '</div>' +
            '</div>' +
            '<label class="block text-sm font-semibold">Asignado a' +
              '<select data-create="assigneeId"' + (assigneeLocked ? ' disabled' : '') + ' class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-400">' +
                people.map(function (person) {
                  return '<option value="' + esc(person.id) + '"' + (person.id === modal.assigneeId ? ' selected' : '') + '>' + esc(person.label) + (person.email && person.label.indexOf(person.email) < 0 ? ' · ' + esc(person.email) : '') + '</option>';
                }).join('') +
              '</select>' +
            '</label>' +
            '<section class="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5">' +
              '<p class="text-sm font-semibold text-stone-900">Datos iniciales opcionales</p>' +
              '<div class="mt-4 space-y-4">' +
                '<label class="block text-sm font-semibold">Tipo de cocina / Estilo' +
                  '<input data-create="cuisine" type="text" value="' + esc(modal.cuisine) + '" placeholder="Cervecería y raciones" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-400">' +
                '</label>' +
                '<div class="grid gap-4 sm:grid-cols-2">' +
                  '<label class="block text-sm font-semibold">Teléfono / WhatsApp' +
                    '<input data-create="phone" type="tel" value="' + esc(modal.phone) + '" placeholder="34600000000" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-400">' +
                  '</label>' +
                  '<label class="block text-sm font-semibold">Dirección' +
                    '<input data-create="address" type="text" value="' + esc(modal.address) + '" placeholder="Calle, ciudad" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-400">' +
                  '</label>' +
                '</div>' +
                '<button type="button" id="create-notes-toggle" class="rounded-full border border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">' +
                  (modal.notesOpen ? '− Ocultar carta o notas' : '+ Añadir carta o notas iniciales') +
                '</button>' +
                (modal.notesOpen
                  ? '<label class="block text-sm font-semibold">Carta o notas iniciales' +
                      '<textarea data-create="notes" rows="4" placeholder="Entrantes, platos estrella, tono de la web…" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-400">' + esc(modal.notes) + '</textarea>' +
                    '</label>'
                  : '') +
              '</div>' +
            '</section>' +
            '<div class="flex flex-col-reverse gap-2 border-t border-stone-200 pt-4 sm:flex-row sm:justify-end">' +
              '<button type="button" id="create-modal-cancel" class="rounded-full px-4 py-3 text-sm font-semibold text-stone-500">Cancelar</button>' +
              '<button type="submit" class="rounded-full bg-[#f59e0b] px-5 py-3 text-sm font-semibold text-black"' + (modal.busy ? ' disabled' : '') + '>' +
                (modal.busy ? 'Creando…' : 'Crear y abrir editor') +
              '</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
  }

  async function createRestaurantFromModal() {
    var modal = state.createModal;
    if (!modal || modal.busy) return;
    var name = String(modal.name || '').trim();
    var slug = slugify(modal.slug || name);
    var planId = normalizePlanId(modal.plan);
    var plan = planById(planId);
    var phone = String(modal.phone || '').trim();
    var address = String(modal.address || '').trim();
    var cuisine = String(modal.cuisine || '').trim();
    var notes = String(modal.notes || '').trim();
    var assigneeId = modal.assigneeId || userId();

    if (!name) {
      modal.error = 'Escribe el nombre del restaurante.';
      renderCreateModal();
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      modal.error = 'El slug solo puede llevar minúsculas, números y guiones.';
      renderCreateModal();
      return;
    }
    if (!plan) {
      modal.error = 'Elige un plan / tipo de web.';
      renderCreateModal();
      return;
    }
    if (slugTaken(slug)) {
      modal.error = 'Ese slug ya está en uso. Cámbialo.';
      renderCreateModal();
      return;
    }

    modal.busy = true;
    modal.error = '';
    renderCreateModal();

    try {
      var editor = blankEditor();
      editor.name = name;
      editor.slug = slug;
      editor.autoSlug = false;
      editor.tagline = cuisine || editor.tagline;
      editor.phone = phone;
      editor.whatsapp = phone.replace(/\D/g, '');
      editor.address = address;
      if (notes) editor.description = notes;
      editor.plan_tier = plan.id;
      editor.studioMode = 'chat';
      editor.fromPreview = true;
      editor.previewDirty = true;
      editor.status = 'borrador';
      editor.assigneeId = assigneeId;
      editor.ownerEmail = ((state.owners[assigneeId] && state.owners[assigneeId].email) || currentEmail());
      applyPlanLimits(editor);
      ensureCollabChat(editor);

      var payload = restaurantPayload(editor);
      payload.collaborator_id = assigneeId;
      payload.status = 'borrador';
      var inserted = await supabase.from('restaurants').insert(payload).select('*').single();
      if (inserted.error) throw inserted.error;
      editor.id = inserted.data.id;
      editor.status = inserted.data.status || 'borrador';
      state.restaurants = [inserted.data].concat(state.restaurants || []);

      state.editor = editor;
      await upsertProjectDraft();
      persistActiveLocal();

      state.createModal = null;
      state.notice = 'Restaurante creado · ' + planLabel(plan.id);
      state.error = '';
      state.busy = false;
      render();
    } catch (error) {
      modal.busy = false;
      modal.error = dbMessage(error) || 'No se ha podido crear el restaurante.';
      renderCreateModal();
    }
  }

  function renderHome() {
    var admin = isAdmin();
    var homeBody = '';
    if (admin && state.adminTab === 'proposals') state.adminTab = 'people';
    if (admin && state.adminTab === 'people') {
      homeBody =
        '<div class="mt-8 flex items-center justify-between gap-3">' +
          '<h1 class="font-serif text-2xl">Personas y colaboradores</h1>' +
          '<button type="button" id="new-restaurant" class="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black">+ Nuevo Restaurante</button>' +
        '</div>' +
        '<div class="mt-4 grid gap-3">' +
          (state.adminPeople.length
            ? state.adminPeople.map(adminPersonCard).join('')
            : '<p class="rounded-3xl border border-dashed border-stone-300 px-5 py-10 text-center text-sm text-stone-500">Todavía no hay colaboradores registrados.</p>') +
        '</div>';
    } else if (admin) {
      homeBody =
        '<div class="mt-6">' + agencySummary() + '</div>' +
        '<div class="mt-8 flex items-center justify-between gap-3">' +
          '<h1 class="font-serif text-2xl">Todos los restaurantes</h1>' +
          '<button type="button" id="new-restaurant" class="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black">+ Nuevo Restaurante</button>' +
        '</div>' +
        '<div class="mt-4 grid gap-3">' +
          (state.restaurants.length
            ? state.restaurants.map(restaurantCard).join('')
            : '<p class="rounded-3xl border border-dashed border-stone-300 px-5 py-10 text-center text-sm text-stone-500">Todavía no hay restaurantes.</p>') +
        '</div>';
    } else {
      homeBody =
        '<div class="mt-6">' + summary() + '</div>' +
        '<div class="mt-8 flex items-center justify-between gap-3">' +
          '<h1 class="font-serif text-2xl">Tus restaurantes</h1>' +
          '<button type="button" id="new-restaurant" class="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black">+ Nuevo Restaurante</button>' +
        '</div>' +
        '<div class="mt-4 grid gap-3">' +
          (state.myProjects.length
            ? state.myProjects.map(projectCard).join('')
            : '<p class="rounded-3xl border border-dashed border-stone-300 px-5 py-10 text-center text-sm text-stone-500">Todavía no hay restaurantes guardados.</p>') +
        '</div>';
    }
    app.innerHTML =
      '<div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">' +
        '<header class="flex items-start justify-between gap-4">' +
          '<div>' +
            '<p class="font-serif text-3xl">VisiWeb</p>' +
            '<p class="mt-1 text-sm text-stone-500">' + (admin ? 'Administrador' : 'Colaborador') + ' · ' + esc(state.profile.email || state.session.user.email || '') + '</p>' +
          '</div>' +
          '<div class="flex items-center gap-2">' +
            '<a href="/panel/preview/index.html" target="_blank" rel="noopener" class="rounded-full px-3 py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100">Plantilla</a>' +
            '<button type="button" id="sign-out" class="rounded-full px-3 py-2 text-sm font-semibold text-stone-500">Salir</button>' +
          '</div>' +
        '</header>' +
        (admin
          ? '<div class="mt-6 flex gap-2 rounded-full bg-stone-100 p-1 text-sm font-semibold">' +
              '<button type="button" data-admin-tab="people" class="flex-1 rounded-full px-3 py-2 ' + (state.adminTab === 'people' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500') + '">Personas</button>' +
              '<button type="button" data-admin-tab="restaurants" class="flex-1 rounded-full px-3 py-2 ' + (state.adminTab === 'restaurants' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500') + '">Restaurantes</button>' +
            '</div>'
          : '') +
        '<div class="mt-6 space-y-4">' + banner() + '</div>' +
        homeBody +
      '</div>';
    renderGithubDrawer();
    renderCreateModal();
  }

  function field(label, control) {
    return '<label class="block text-sm font-semibold">' + label + control + '</label>';
  }

  function input(fieldName, value, extra) {
    return '<input data-field="' + fieldName + '" value="' + esc(value) + '" ' + extra + ' class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300">';
  }

  function allergenButtons(item, catIndex, itemIndex) {
    return '<div class="mt-2 flex flex-wrap gap-2">' + ALLERGENS.map(function (allergen) {
      var on = item.allergens.indexOf(allergen[0]) >= 0;
      return '<button type="button" data-allergen="' + allergen[0] + '" data-cat="' + catIndex + '" data-item="' + itemIndex + '" aria-pressed="' + (on ? 'true' : 'false') + '" class="rounded-2xl px-3 py-2 text-left text-xs font-semibold ring-1 ' + (on ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-700 ring-stone-200') + '"><span class="mr-1 font-bold">' + allergen[1] + '</span>' + allergen[2] + '</button>';
    }).join('') + '</div>';
  }

  function itemEditor(item, catIndex, itemIndex, total) {
    var preview = item.preview || item.image_url;
    return (
      '<div class="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">' +
        '<div class="mb-3 flex items-center justify-between gap-2">' +
          '<p class="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Plato ' + (itemIndex + 1) + '</p>' +
          '<span class="flex gap-1">' +
            '<button type="button" data-move-item="' + itemIndex + '" data-cat="' + catIndex + '" data-dir="-1" class="rounded-full px-2 py-1 text-xs font-semibold text-stone-500"' + (itemIndex === 0 ? ' disabled' : '') + '>Subir</button>' +
            '<button type="button" data-move-item="' + itemIndex + '" data-cat="' + catIndex + '" data-dir="1" class="rounded-full px-2 py-1 text-xs font-semibold text-stone-500"' + (itemIndex === total - 1 ? ' disabled' : '') + '>Bajar</button>' +
            '<button type="button" data-remove-item="' + itemIndex + '" data-cat="' + catIndex + '" class="rounded-full px-2 py-1 text-xs font-semibold text-red-700">Quitar</button>' +
          '</span>' +
        '</div>' +
        field('Nombre', '<input data-field="item-name" data-cat="' + catIndex + '" data-item="' + itemIndex + '" value="' + esc(item.name) + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300">') +
        '<label class="mt-3 block text-sm font-semibold">Descripción<textarea data-field="item-description" data-cat="' + catIndex + '" data-item="' + itemIndex + '" rows="2" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300">' + esc(item.description) + '</textarea></label>' +
        '<label class="mt-3 block text-sm font-semibold">Precio (€)<input data-field="item-price" data-cat="' + catIndex + '" data-item="' + itemIndex + '" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(item.price) + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300"></label>' +
        '<div class="mt-3">' +
          '<p class="text-sm font-semibold">Foto del plato</p>' +
          (preview ? '<img src="' + esc(preview) + '" alt="" class="mt-2 h-24 w-24 rounded-2xl object-cover">' : '') +
          '<input data-file="item" data-cat="' + catIndex + '" data-item="' + itemIndex + '" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" class="mt-2 block w-full text-sm">' +
        '</div>' +
        (planRank(state.editor && state.editor.plan_tier) < 2
          ? '<div class="mt-3">' + lockedRow('Filtro de alérgenos', LOCK_GASTRO) + '</div>'
          : '<div class="mt-3"><p class="text-sm font-semibold">Alérgenos</p>' + allergenButtons(item, catIndex, itemIndex) + '</div>') +
      '</div>'
    );
  }

  function renderEditor() {
    var editor = state.editor;
    var stepA = editor.step === 'a';
    app.innerHTML =
      '<div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">' +
        '<button type="button" id="close-editor" class="text-sm font-semibold text-stone-500">← Volver al panel</button>' +
        '<h1 class="mt-4 font-serif text-3xl">' + (editor.id ? 'Editar restaurante' : 'Nuevo restaurante') + '</h1>' +
        planPicker(editor) +
        '<div class="mt-4 grid grid-cols-3 gap-2 text-sm font-semibold">' +
          '<button type="button" data-step="a" class="rounded-full px-3 py-2 text-center ' + (editor.step === 'a' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200') + '">1 · Datos</button>' +
          '<button type="button" data-step="b" class="rounded-full px-3 py-2 text-center ' + (editor.step === 'b' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200') + '">2 · Carta</button>' +
          '<button type="button" data-step="c" class="rounded-full px-3 py-2 text-center ' + (editor.step === 'c' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200') + '">3 · Diseño</button>' +
        '</div>' +
        '<div class="mt-4">' + banner() + '</div>' +
        (editor.step === 'b' ? renderStepB(editor) : editor.step === 'c' ? renderStepC(editor) : renderStepA(editor)) +
      '</div>';
  }

  function renderStepA(editor) {
    var cover = editor.coverPreview || editor.cover_image_url;
    return (
      '<form id="step-a" class="mt-6 space-y-4">' +
        field('Nombre', input('name', editor.name, 'required autocomplete="organization"')) +
        field('Enlace', '<span class="mt-1 flex overflow-hidden rounded-2xl border border-stone-200 bg-white focus-within:border-stone-300"><span class="px-3 py-3 text-sm text-stone-400">/r/</span><input data-field="slug" value="' + esc(editor.slug) + '" required class="w-full bg-transparent py-3 pr-4 text-base outline-none"></span>') +
        field('Frase corta', input('tagline', editor.tagline, 'maxlength="140"')) +
        '<div class="grid gap-4 sm:grid-cols-2">' +
          field('Teléfono', input('phone', editor.phone, 'type="tel" autocomplete="tel"')) +
          field('WhatsApp', input('whatsapp', editor.whatsapp, 'inputmode="tel" placeholder="34600000000"')) +
        '</div>' +
        field('Dirección', input('address', editor.address, 'autocomplete="street-address"')) +
        field('Horario', '<textarea data-field="schedule" rows="2" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300">' + esc(editor.schedule) + '</textarea>') +
        (planRank(editor.plan_tier) < 2
          ? lockedRow('Página de redes', LOCK_GASTRO)
          : field('Instagram', input('instagram', editor.instagram, 'placeholder="https://instagram.com/..."'))) +
        '<div><p class="text-sm font-semibold">Foto de portada</p>' +
          (cover ? '<img src="' + esc(cover) + '" alt="" class="mt-2 aspect-[16/9] w-full rounded-3xl object-cover">' : '') +
          '<input data-file="cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" class="mt-2 block w-full text-sm">' +
        '</div>' +
        '<button type="submit" class="w-full rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Guardando…' : 'Continuar a la carta') + '</button>' +
      '</form>'
    );
  }

  var PALETTES = [
    ['carbon', 'Carbón Elegante', '#1c1917'],
    ['taberna', 'Rojo Taberna', '#9f1239'],
    ['oliva', 'Verde Oliva', '#3f6212'],
    ['dorado', 'Dorado & Negro', '#b45309'],
    ['marino', 'Azul Marino', '#1e3a5f'],
    ['terracota', 'Terracota', '#c2410c']
  ];
  var BLOCK_LABELS = {
    carta: 'La Carta',
    menu_dia: 'Menú del Día',
    sugerencias: 'Sugerencias del Chef',
    local: 'El Local y Galería',
    resenas: 'Reseñas',
    horarios: 'Horarios y Ubicación',
    reserva: 'Formulario de Reserva'
  };
  var DAY_LABELS = { lun: 'Lun', mar: 'Mar', mie: 'Mié', jue: 'Jue', vie: 'Vie', sab: 'Sáb', dom: 'Dom' };

  function pickButton(group, id, on, inner, extra) {
    return '<button type="button" data-design="' + group + '" data-value="' + id + '"' + (extra || '') + ' aria-pressed="' + (on ? 'true' : 'false') + '" class="flex min-h-[96px] flex-col items-start justify-between rounded-3xl p-3 text-left text-sm font-semibold ring-1 ' + (on ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-800 ring-stone-200') + '">' + inner + '</button>';
  }

  function styleCard(group, id, on, preview, label) {
    var check = on
      ? '<span class="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full text-white" style="background:#18181B" aria-hidden="true"><svg viewBox="0 0 16 16" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.3 6.4 11.1 12.5 4.8"/></svg></span>'
      : '';
    var frame = on
      ? 'background:#FAF9F6;border:2px solid #18181B'
      : 'background:#fff;border:1px solid #e7e5e4';
    return '<button type="button" data-design="' + group + '" data-value="' + id + '" aria-pressed="' + (on ? 'true' : 'false') + '" class="relative flex min-h-[112px] flex-col items-start justify-between gap-3 rounded-3xl p-3 pr-9 text-left text-sm font-semibold text-stone-900" style="' + frame + '">' + check + preview + '<span>' + label + '</span></button>';
  }

  function themeSwatches(colors) {
    return '<span class="flex items-center">' + colors.map(function (color, index) {
      return '<span class="h-8 w-8 shrink-0 rounded-full" style="background:' + color + ';border:1px solid rgba(0,0,0,0.1);margin-left:' + (index ? '-12px' : '0') + '"></span>';
    }).join('') + '</span>';
  }

  function sampleWell(inner) {
    return '<span class="flex h-12 w-full items-center justify-center rounded-2xl px-3" style="background:#F4F4F5;border:1px solid rgba(0,0,0,0.1)">' + inner + '</span>';
  }

  function toggleButton(path, label, on) {
    return '<button type="button" data-toggle="' + path + '" aria-pressed="' + (on ? 'true' : 'false') + '" class="flex min-h-[68px] w-full items-center justify-between gap-3 rounded-3xl bg-white px-4 py-3 text-left text-base font-semibold ring-1 ring-stone-200"><span>' + label + '</span><span class="relative h-8 w-14 shrink-0 rounded-full ' + (on ? 'bg-emerald-500' : 'bg-stone-300') + '"><span class="absolute top-1 h-6 w-6 rounded-full bg-white shadow ' + (on ? 'left-7' : 'left-1') + '"></span></span></button>';
  }

  function flagButton(key, label, on) {
    return '<button type="button" data-flag="' + key + '" aria-pressed="' + (on ? 'true' : 'false') + '" class="flex min-h-[68px] w-full items-center justify-between gap-3 rounded-3xl bg-white px-4 py-3 text-left text-base font-semibold ring-1 ring-stone-200"><span>' + label + '</span><span class="relative h-8 w-14 shrink-0 rounded-full ' + (on ? 'bg-emerald-500' : 'bg-stone-300') + '"><span class="absolute top-1 h-6 w-6 rounded-full bg-white shadow ' + (on ? 'left-7' : 'left-1') + '"></span></span></button>';
  }

  function langOptions(rank, current) {
    var options = [['es', 'Solo español'], ['esen', 'Bilingüe ES/EN']];
    if (rank >= 3) options.push(['multi', 'Hasta 3 idiomas']);
    return '<div class="grid gap-2 sm:grid-cols-3">' + options.map(function (item) {
      var on = current === item[0];
      return '<button type="button" data-lang="' + item[0] + '" aria-pressed="' + (on ? 'true' : 'false') + '" class="rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ' + (on ? 'bg-[#FAF9F6] text-stone-900 ring-2 ring-[#18181B]' : 'bg-white text-stone-700 ring-stone-200') + '">' + item[1] + '</button>';
    }).join('') + '</div>';
  }

  function renderStepC(editor) {
    var design = editor.design;
    ensureLabels(design);
    var themes = [
      ['clasico', 'Clásico', ['#FAF9F6', '#EFE6D6', '#1C1917']],
      ['blanco', 'Blanco', ['#FFFFFF', '#F5F4F0', '#171717']],
      ['oscuro', 'Oscuro', ['#0F0F10', '#2A2A2E', '#F5F5F4']],
      ['mediterraneo', 'Mediterráneo', ['#F6EFE4', '#FFFBF5', '#C2613A']]
    ];
    var fonts = [
      ['serif_clasica', 'Serif clásica', 'Aa', 'font-serif'],
      ['moderna_sans', 'Moderna sans', 'Ag', 'font-sans'],
      ['artesanal', 'Artesanal', 'Aa', 'font-serif italic']
    ];
    var shapes = [
      ['redondeado', 'Redondeado', '999px'],
      ['equilibrado', 'Equilibrado', '12px'],
      ['recto', 'Recto', '2px']
    ];
    var heroes = [
      ['panoramica', 'Panorámica'],
      ['dividida', 'Dividida'],
      ['logo_centrado', 'Logo centrado'],
      ['pantalla_completa', 'Pantalla completa']
    ];
    var dishes = [
      ['lista_foto', 'Lista con foto'],
      ['tarjetas_grandes', 'Tarjetas grandes'],
      ['solo_texto', 'Solo texto']
    ];
    var tabs = [
      ['pildoras', 'Píldoras'],
      ['subrayado', 'Subrayado'],
      ['bloques', 'Bloques']
    ];
    return (
      '<div id="step-c" class="mt-6 space-y-8">' +
        '<button type="button" id="live-preview" class="w-full rounded-full bg-stone-900 px-4 py-4 text-base font-semibold text-white"' + (state.busy || !editor.slug ? ' disabled' : '') + '>Vista previa en vivo</button>' +
        '<section class="space-y-3"><h2 class="text-lg font-semibold">Tema de color</h2><div class="grid grid-cols-2 gap-2">' +
          themes.map(function (item) {
            return styleCard('theme', item[0], design.theme === item[0], themeSwatches(item[2]), item[1]);
          }).join('') +
        '</div></section>' +
        '<section class="space-y-3"><h2 class="text-lg font-semibold">Tipografía</h2><div class="grid grid-cols-3 gap-2">' +
          fonts.map(function (item) {
            return styleCard('fonts', item[0], design.fonts === item[0], sampleWell('<span class="' + item[3] + ' text-3xl leading-none text-stone-900">' + item[2] + '</span>'), item[1]);
          }).join('') +
        '</div></section>' +
        '<section class="space-y-3"><h2 class="text-lg font-semibold">Bordes y formas</h2><div class="grid grid-cols-3 gap-2">' +
          shapes.map(function (item) {
            return styleCard('shapes', item[0], design.shapes === item[0], sampleWell('<span class="h-3 w-full bg-stone-300" style="border-radius:' + item[2] + '"></span>'), item[1]);
          }).join('') +
        '</div></section>' +
        '<section class="space-y-3"><h2 class="text-lg font-semibold">Color de botones</h2><div class="grid grid-cols-2 gap-2 sm:grid-cols-3">' +
          PALETTES.map(function (item) {
            return pickButton('palette', item[0], design.palette === item[0] && design.accent.toLowerCase() === item[2], '<span class="h-10 w-full rounded-2xl" style="background:' + item[2] + '"></span><span>' + item[1] + '</span>', ' data-accent="' + item[2] + '"');
          }).join('') +
        '</div><label class="flex items-center justify-between gap-3 rounded-3xl bg-white px-4 py-3 text-base font-semibold ring-1 ring-stone-200">Color del logo<span class="flex items-center gap-3"><span id="accent-chip" class="h-10 w-10 rounded-full ring-1 ring-stone-200" style="background:' + esc(design.accent) + '"></span><input data-field="accent" type="color" value="' + esc(design.accent) + '" class="h-12 w-16 cursor-pointer border-0 bg-transparent"></span></label></section>' +
        '<section class="space-y-3"><h2 class="text-lg font-semibold">Cabecera</h2><div class="grid grid-cols-2 gap-2">' +
          heroes.map(function (item) {
            return pickButton('hero', item[0], design.hero === item[0], '<span class="text-xs uppercase tracking-wide opacity-70">Hero</span><span>' + item[1] + '</span>');
          }).join('') +
        '</div></section>' +
        '<section class="space-y-2"><h2 class="text-lg font-semibold">Botones de portada</h2>' +
          toggleButton('hero_actions.call', 'Llamar', design.hero_actions.call) +
          toggleButton('hero_actions.whatsapp', 'WhatsApp directo', design.hero_actions.whatsapp) +
          toggleButton('hero_actions.maps', 'Cómo llegar (Maps)', design.hero_actions.maps) +
          (planRank(editor.plan_tier) < 2 ? lockedRow('Reservar mesa', LOCK_GASTRO) : toggleButton('hero_actions.book', 'Reservar mesa', design.hero_actions.book)) +
          toggleButton('hero_actions.menu', 'Ver Carta QR', design.hero_actions.menu) +
          toggleButton('hero_actions.open_badge', 'Abierto / Cerrado', design.hero_actions.open_badge) +
          toggleButton('hero_actions.google_rating', 'Valoración Google', design.hero_actions.google_rating) +
        '</section>' +
        '<section class="space-y-2"><h2 class="text-lg font-semibold">Bloques de la web</h2>' +
          design.blocks.map(function (block, index) {
            if (planRank(editor.plan_tier) < 2 && (block.id === 'local' || block.id === 'reserva')) return lockedRow(BLOCK_LABELS[block.id], LOCK_GASTRO);
            return '<div class="flex items-center gap-2 rounded-3xl bg-white p-2 ring-1 ring-stone-200"><span class="flex flex-col gap-1"><button type="button" data-move-block="' + index + '" data-dir="-1" class="h-11 w-11 rounded-2xl bg-stone-100 text-lg font-bold"' + (index === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-move-block="' + index + '" data-dir="1" class="h-11 w-11 rounded-2xl bg-stone-100 text-lg font-bold"' + (index === design.blocks.length - 1 ? ' disabled' : '') + '>↓</button></span><span class="min-w-0 flex-1 px-1 text-base font-semibold">' + BLOCK_LABELS[block.id] + '</span><button type="button" data-block-toggle="' + block.id + '" aria-pressed="' + (block.visible ? 'true' : 'false') + '" class="relative h-8 w-14 shrink-0 rounded-full ' + (block.visible ? 'bg-emerald-500' : 'bg-stone-300') + '"><span class="absolute top-1 h-6 w-6 rounded-full bg-white shadow ' + (block.visible ? 'left-7' : 'left-1') + '"></span></button></div>';
          }).join('') +
        '</section>' +
        '<section class="space-y-3"><h2 class="text-lg font-semibold">Menú del día</h2>' +
          toggleButton('daily_menu_enabled', 'Activar Menú del Día', design.daily_menu_enabled) +
          (design.daily_menu_enabled ?
            '<label class="block text-sm font-semibold">Precio<input data-daily="price" value="' + esc(editor.daily_menu.price) + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300" placeholder="14,50 €"></label>' +
            '<label class="block text-sm font-semibold">Primeros<textarea data-daily="primeros" rows="3" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300" placeholder="Un plato por línea">' + esc(editor.daily_menu.primeros) + '</textarea></label>' +
            '<label class="block text-sm font-semibold">Segundos<textarea data-daily="segundos" rows="3" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300">' + esc(editor.daily_menu.segundos) + '</textarea></label>' +
            '<label class="block text-sm font-semibold">Postre o bebida incluidos<input data-daily="incluido" value="' + esc(editor.daily_menu.incluido) + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-300"></label>' +
            '<div class="grid grid-cols-4 gap-2 sm:grid-cols-7">' + window.VisiwebDesign.days.map(function (day) {
              var on = editor.daily_menu.days.indexOf(day) >= 0;
              return '<button type="button" data-day="' + day + '" aria-pressed="' + (on ? 'true' : 'false') + '" class="rounded-2xl px-2 py-3 text-sm font-semibold ring-1 ' + (on ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-600 ring-stone-200') + '">' + DAY_LABELS[day] + '</button>';
            }).join('') + '</div>'
          : '') +
        '</section>' +
        '<section class="space-y-3"><h2 class="text-lg font-semibold">Diseño de los platos</h2><div class="grid grid-cols-3 gap-2">' +
          dishes.map(function (item) {
            return pickButton('dishes', item[0], design.dishes === item[0], '<span class="text-xs uppercase tracking-wide opacity-70">Carta</span><span>' + item[1] + '</span>');
          }).join('') +
        '</div></section>' +
        '<section class="space-y-3"><h2 class="text-lg font-semibold">Pestañas de categorías</h2><div class="grid grid-cols-3 gap-2">' +
          tabs.map(function (item) {
            return pickButton('tabs', item[0], design.tabs === item[0], '<span class="text-xs uppercase tracking-wide opacity-70">Tabs</span><span>' + item[1] + '</span>');
          }).join('') +
        '</div></section>' +
        '<section class="space-y-2"><h2 class="text-lg font-semibold">Funciones del plan</h2>' +
          (planRank(editor.plan_tier) < 2 ? lockedRow('Filtro de alérgenos', LOCK_GASTRO) : flagButton('vw_allergens', 'Filtro de alérgenos', design.labels.vw_allergens === '1')) +
          (planRank(editor.plan_tier) < 2 ? lockedRow('Selector de idiomas', LOCK_GASTRO) : langOptions(planRank(editor.plan_tier), design.labels.vw_lang || 'esen')) +
          (planRank(editor.plan_tier) === 2 ? lockedRow('Carta multilingüe (hasta 3 idiomas)', LOCK_TOTAL) : '') +
          (planRank(editor.plan_tier) < 2 ? lockedRow('Página de redes', LOCK_GASTRO) : flagButton('vw_social', 'Página de redes', design.labels.vw_social === '1')) +
          (planRank(editor.plan_tier) < 3 ? lockedRow('Diseño a medida', LOCK_TOTAL) : '<p class="rounded-3xl bg-white px-4 py-3 text-sm text-stone-600 ring-1 ring-stone-200">Diseño a medida incluido en este plan.</p>') +
        '</section>' +
        '<section class="space-y-2"><h2 class="text-lg font-semibold">Eventos y grupos</h2>' +
          (planRank(editor.plan_tier) < 3 ? lockedRow('Eventos y grupos', LOCK_TOTAL) : eventosEditor(design)) +
        '</section>' +
        '<section class="space-y-2"><h2 class="text-lg font-semibold">Modo QR /mesa</h2>' +
          (planRank(editor.plan_tier) < 3
            ? lockedRow('Modo QR /mesa', LOCK_TOTAL)
            : toggleButton('mesa.search', 'Buscador de platos', design.mesa.search) +
              toggleButton('mesa.allergens', 'Filtro de alérgenos', design.mesa.allergens) +
              toggleButton('mesa.selection', 'Lista «Mi selección»', design.mesa.selection) +
              toggleButton('mesa.language', 'Selector de idioma ES/EN', design.mesa.language) +
              toggleButton('mesa.prices', 'Mostrar precios', design.mesa.prices) +
              toggleButton('mesa.tags', 'Iconos de etiquetas', design.mesa.tags)) +
        '</section>' +
        '<button type="button" id="save-design" class="w-full rounded-full bg-stone-900 px-4 py-4 text-base font-semibold text-white"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Guardando…' : 'Guardar diseño') + '</button>' +
      '</div>'
    );
  }

  function renderStepB(editor) {
    return (
      '<form id="step-b" class="mt-6 space-y-4">' +
        editor.categories.map(function (category, catIndex) {
          return (
            '<section class="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200">' +
              '<div class="flex items-center justify-between gap-2">' +
                '<p class="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Categoría ' + (catIndex + 1) + '</p>' +
                '<span class="flex gap-1">' +
                  '<button type="button" data-move-cat="' + catIndex + '" data-dir="-1" class="rounded-full px-2 py-1 text-xs font-semibold text-stone-500"' + (catIndex === 0 ? ' disabled' : '') + '>Subir</button>' +
                  '<button type="button" data-move-cat="' + catIndex + '" data-dir="1" class="rounded-full px-2 py-1 text-xs font-semibold text-stone-500"' + (catIndex === editor.categories.length - 1 ? ' disabled' : '') + '>Bajar</button>' +
                  '<button type="button" data-remove-cat="' + catIndex + '" class="rounded-full px-2 py-1 text-xs font-semibold text-red-700">Quitar</button>' +
                '</span>' +
              '</div>' +
              '<label class="mt-3 block text-sm font-semibold">Nombre<input data-field="cat-name" data-cat="' + catIndex + '" value="' + esc(category.name) + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-stone-300"></label>' +
              '<div class="mt-3 space-y-3">' + category.items.map(function (item, itemIndex) {
                return itemEditor(item, catIndex, itemIndex, category.items.length);
              }).join('') + '</div>' +
              '<button type="button" data-add-item="' + catIndex + '" class="mt-3 text-sm font-semibold text-stone-700">+ Añadir plato</button>' +
            '</section>'
          );
        }).join('') +
        '<button type="button" id="add-category" class="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-800 ring-1 ring-stone-200">+ Añadir categoría</button>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<button type="button" id="back-step" class="rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold">Atrás</button>' +
          '<button type="submit" class="rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Guardando…' : 'Guardar carta') + '</button>' +
        '</div>' +
      '</form>'
    );
  }

  async function loadProfile(session) {
    var result = await supabase.from('profiles').select('id, full_name, role, email').eq('id', session.user.id).single();
    if (result.error || !result.data || (result.data.role !== 'admin' && result.data.role !== 'collaborator')) {
      await supabase.auth.signOut();
      state.session = null;
      state.profile = null;
      setError('Esta cuenta no tiene acceso al panel.');
      return;
    }
    state.profile = result.data;
    var email = String(result.data.email || (session.user && session.user.email) || '').toLowerCase();
    if (email === ADMIN_EMAIL && result.data.role !== 'admin') {
      state.profile.role = 'admin';
      await supabase.from('profiles').update({ role: 'admin' }).eq('id', session.user.id);
    }
  }

  async function loadRestaurants() {
    var result = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    state.restaurants = result.data || [];
    state.owners = {};
    if (!isAdmin()) return;
    var people = await supabase.from('profiles').select('id, full_name, email, role');
    if (people.error) throw people.error;
    (people.data || []).forEach(function (person) { state.owners[person.id] = person; });
  }

  async function loadProposals() {
    var result = await supabase
      .from('propuestas_webs')
      .select('*')
      .order('updated_at', { ascending: false });
    if (result.error) throw result.error;
    state.proposals = result.data || [];
    if (isAdmin()) {
      state.myProjects = state.proposals.slice();
    } else {
      var uid = userId();
      var email = currentEmail();
      state.myProjects = state.proposals.filter(function (row) {
        return row.collaborator_id === uid || String(row.correo_colaborador || '').toLowerCase() === email;
      });
      if (!state.myProjects.length) {
        var cached = readProjectsLocal();
        if (cached.length) state.myProjects = cached;
      }
      persistProjectsLocal(state.myProjects);
    }
    rebuildAdminPeople();
    if (state.selectedProposalId && !selectedProposal()) state.selectedProposalId = null;
  }

  function applyLocalChatState(editor, localEditor) {
    if (!editor || !localEditor || !Array.isArray(localEditor.chats)) return;
    editor.chats = localEditor.chats;
    editor.activeChatId = localEditor.activeChatId || null;
    editor.chat = Array.isArray(localEditor.chat) ? localEditor.chat : [];
    if (editor.chats.length) {
      ensureCollabChat(editor);
    } else {
      editor.activeChatId = null;
      editor.chat = [];
    }
  }

  function restoreActiveProjectIfNeeded() {
    if (state.editor) return false;
    var active = readActiveLocal();
    if (!active || !active.editor) return false;
    if (active.proposalId) {
      var row = (state.proposals || []).filter(function (item) { return item.id === active.proposalId; })[0];
      if (row) {
        state.editor = editorFromProjectRow(row);
        applyLocalChatState(state.editor, active.editor);
        return true;
      }
    }
    var editor = active.editor;
    editor.coverFile = null;
    editor.studioMode = 'chat';
    if (editor.categories) {
      editor.categories.forEach(function (category) {
        (category.items || []).forEach(function (item) { item.imageFile = null; });
      });
    }
    if (Array.isArray(editor.chats) && !editor.chats.length) {
      editor.activeChatId = null;
      editor.chat = [];
    } else {
      ensureCollabChat(editor);
    }
    state.editor = editor;
    return true;
  }

  async function refresh() {
    state.busy = true;
    render();
    try {
      await loadRestaurants();
      await loadProposals();
      state.error = '';
    } catch (error) {
      setError('No se han podido cargar los datos del panel.');
    }
    if (!state.editor) clearActiveLocal();
    state.busy = false;
    render();
  }

  async function openProject(id) {
    var row = (state.proposals || []).filter(function (item) { return item.id === id; })[0]
      || (state.myProjects || []).filter(function (item) { return item.id === id; })[0];
    if (!row) {
      setError('No se ha encontrado el proyecto.');
      render();
      return;
    }
    state.editor = editorFromProjectRow(row);
    if (!state.githubSlug) state.githubSlug = slugify(row.nombre_local || '');
    state.notice = '';
    state.error = '';
    persistActiveLocal();
    render();
  }

  async function deleteProject(id) {
    var row = (state.proposals || []).filter(function (item) { return item.id === id; })[0]
      || (state.myProjects || []).filter(function (item) { return item.id === id; })[0];
    var name = (row && (row.nombre_local || (row.restaurant_data && row.restaurant_data.name))) || 'este proyecto';
    if (!window.confirm('¿Eliminar «' + name + '»?')) return;
    var result = await supabase.from('propuestas_webs').delete().eq('id', id);
    if (result.error) {
      setError('No se ha podido eliminar el proyecto.');
      render();
      return;
    }
    if (state.editor && state.editor.proposalId === id) {
      state.editor = null;
      clearActiveLocal();
    }
    setNotice('Proyecto eliminado.');
    return refresh();
  }

  async function publishToGithub() {
    if (!isAdmin() || state.githubBusy) return;
    var slug = slugify(state.githubSlug || (state.editor && state.editor.slug) || (state.editor && state.editor.name) || '');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      state.error = 'Indica un slug válido (ej. bar-el-roble).';
      state.githubNotice = '';
      renderGithubDrawer();
      return;
    }
    if (!state.editor || state.editor.studioMode !== 'chat') {
      state.error = 'Abre un proyecto en el visor/chat para publicar su data.js.';
      state.githubNotice = '';
      renderGithubDrawer();
      return;
    }
    state.githubBusy = true;
    state.githubSlug = slug;
    state.error = '';
    state.githubNotice = '';
    renderGithubDrawer();
    try {
      var dataJs = buildDataJsFile(restaurantPayloadFromEditor(state.editor));
      var token = state.session && state.session.access_token;
      var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      var url = isLocal ? 'https://visiwebmadrid.com/api/publicar-github' : '/api/publicar-github';
      var res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? ('Bearer ' + token) : ''
        },
        body: JSON.stringify({ slug: slug, dataJs: dataJs })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error((data && data.error) || ('Error ' + res.status));
      state.githubNotice = 'Publicado en visiweb-clientes/' + slug + '/';
      state.githubBusy = false;
      renderGithubDrawer();
    } catch (error) {
      state.githubBusy = false;
      state.error = (error && error.message) || 'No se ha podido publicar en GitHub.';
      renderGithubDrawer();
    }
  }

  function readImage(file) {
    if (!file) return Promise.resolve('');
    if (IMAGE_TYPES.indexOf(file.type) < 0) return Promise.reject(new Error('type'));
    if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('size'));
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.readAsDataURL(file);
    });
  }

  async function uploadAsset(restaurantId, file, prefix) {
    var ext = ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')) || 'jpg';
    var path = restaurantId + '/' + prefix + '-' + Date.now() + '.' + ext;
    var uploaded = await supabase.storage.from('restaurant-assets').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false
    });
    if (uploaded.error) throw uploaded.error;
    return supabase.storage.from('restaurant-assets').getPublicUrl(path).data.publicUrl;
  }

  function restaurantPayload(editor) {
    return {
      name: editor.name.trim(),
      slug: slugify(editor.slug),
      tagline: editor.tagline.trim() || null,
      description: (editor.description || '').trim() || null,
      phone: editor.phone.trim() || null,
      whatsapp: editor.whatsapp.trim() || null,
      address: editor.address.trim() || null,
      schedule: editor.schedule.trim() || null,
      instagram: editor.instagram.trim() || null,
      plan_tier: normalizePlanId(editor.plan_tier) || editor.plan_tier,
      design_config: editor.design,
      cover_image_url: editor.cover_image_url || null
    };
  }

  function validateLocal(editor) {
    if (!editor.name.trim()) return 'Escribe el nombre del local.';
    var slug = slugify(editor.slug || editor.name);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'El enlace solo puede llevar minúsculas, números y guiones.';
    if (!planById(editor.plan_tier)) return 'Elige un plan.';
    editor.plan_tier = normalizePlanId(editor.plan_tier);
    return '';
  }

  function itemIsEmpty(item) {
    return !item.name.trim() && !item.description.trim() && item.price === '' && !item.image_url && !item.imageFile && !item.allergens.length;
  }

  function validateMenu(editor) {
    editor.categories = editor.categories.filter(function (category) {
      return category.name.trim() || category.items.some(function (item) { return !itemIsEmpty(item); });
    });
    for (var i = 0; i < editor.categories.length; i++) {
      var category = editor.categories[i];
      if (!category.name.trim()) return 'Cada categoría necesita un nombre.';
      category.items = category.items.filter(function (item) { return !itemIsEmpty(item); });
      for (var j = 0; j < category.items.length; j++) {
        var item = category.items[j];
        if (!item.name.trim()) return 'Cada plato necesita un nombre.';
        if (item.price === '' || Number(item.price) < 0 || !isFinite(Number(item.price))) return 'Revisa el precio de «' + item.name.trim() + '».';
      }
    }
    return '';
  }

  function syncEditorDom() {
    var editor = state.editor;
    if (!editor) return;
    app.querySelectorAll('[data-field]').forEach(function (node) {
      var name = node.dataset.field;
      if (name === 'plan') {
        if (node.checked) editor.plan_tier = node.value;
        return;
      }
      if (name === 'name' || name === 'slug' || name === 'tagline' || name === 'phone' || name === 'whatsapp' || name === 'address' || name === 'schedule' || name === 'instagram') {
        editor[name] = node.value;
        return;
      }
      var category = editor.categories[Number(node.dataset.cat)];
      if (!category) return;
      if (name === 'cat-name') category.name = node.value;
      if (node.dataset.item == null) return;
      var item = category.items[Number(node.dataset.item)];
      if (!item) return;
      if (name === 'item-name') item.name = node.value;
      if (name === 'item-description') item.description = node.value;
      if (name === 'item-price') item.price = node.value;
    });
  }

  function readDailyDom() {
    var editor = state.editor;
    if (!editor) return;
    app.querySelectorAll('[data-daily]').forEach(function (node) {
      editor.daily_menu[node.dataset.daily] = node.value;
    });
  }

  async function saveAll() {
    syncEditorDom();
    readDailyDom();
    state.busy = true;
    state.error = '';
    render();
    try {
      await saveRestaurant();
      var named = state.editor.categories.some(function (category) { return category.name.trim(); });
      if (named) await saveMenu();
      await saveDesign();
      state.busy = false;
      setNotice('Cambios guardados.');
    } catch (error) {
      state.busy = false;
      setError(dbMessage(error));
    }
    render();
  }

  async function saveDesign() {
    readDailyDom();
    var editor = state.editor;
    if (!planById(editor.plan_tier)) throw new Error('Elige un plan.');
    applyPlanLimits(editor);
    if (!editor.id) await saveRestaurant();
    if (!/^#[0-9a-fA-F]{6}$/.test(editor.design.accent)) throw new Error('El color tiene que ser un código hexadecimal.');
    var updated = await supabase.from('restaurants').update({
      design_config: editor.design,
      daily_menu: editor.daily_menu,
      primary_color: editor.design.accent,
      plan_tier: editor.plan_tier
    }).eq('id', editor.id);
    if (updated.error) throw updated.error;
    var row = state.restaurants.filter(function (item) { return item.id === editor.id; })[0];
    if (row) {
      row.design_config = editor.design;
      row.daily_menu = editor.daily_menu;
      row.primary_color = editor.design.accent;
      row.plan_tier = editor.plan_tier;
    }
  }

  async function saveRestaurant() {
    syncEditorDom();
    var editor = state.editor;
    var message = validateLocal(editor);
    if (message) throw new Error(message);
    applyPlanLimits(editor);
    var payload = restaurantPayload(editor);
    if (!editor.id) {
      payload.collaborator_id = state.session.user.id;
      payload.status = 'borrador';
      var inserted = await supabase.from('restaurants').insert(payload).select('id, status').single();
      if (inserted.error) throw inserted.error;
      editor.id = inserted.data.id;
      editor.status = inserted.data.status;
    }
    if (editor.coverFile) {
      editor.cover_image_url = await uploadAsset(editor.id, editor.coverFile, 'portada');
      editor.coverFile = null;
      payload.cover_image_url = editor.cover_image_url;
    }
    if (editor.id) {
      var updated = await supabase.from('restaurants').update(restaurantPayload(editor)).eq('id', editor.id);
      if (updated.error) throw updated.error;
    }
  }

  async function saveMenu() {
    syncEditorDom();
    var editor = state.editor;
    var message = validateMenu(editor);
    if (message) throw new Error(message);
    applyPlanLimits(editor);
    var existing = await supabase.from('menu_categories').select('id').eq('restaurant_id', editor.id);
    if (existing.error) throw existing.error;
    var keep = editor.categories.map(function (category) { return category.id; }).filter(Boolean);
    var drop = (existing.data || []).map(function (category) { return category.id; }).filter(function (id) { return keep.indexOf(id) < 0; });
    if (drop.length) {
      var removed = await supabase.from('menu_categories').delete().in('id', drop);
      if (removed.error) throw removed.error;
    }
    for (var i = 0; i < editor.categories.length; i++) {
      var category = editor.categories[i];
      var catPayload = { restaurant_id: editor.id, name: category.name.trim(), subtitle: null, sort_order: i };
      if (category.id) {
        var catUpdate = await supabase.from('menu_categories').update(catPayload).eq('id', category.id);
        if (catUpdate.error) throw catUpdate.error;
      } else {
        var catInsert = await supabase.from('menu_categories').insert(catPayload).select('id').single();
        if (catInsert.error) throw catInsert.error;
        category.id = catInsert.data.id;
      }
      var currentItems = await supabase.from('menu_items').select('id').eq('category_id', category.id);
      if (currentItems.error) throw currentItems.error;
      var keepItems = category.items.map(function (item) { return item.id; }).filter(Boolean);
      var dropItems = (currentItems.data || []).map(function (item) { return item.id; }).filter(function (id) { return keepItems.indexOf(id) < 0; });
      if (dropItems.length) {
        var removedItems = await supabase.from('menu_items').delete().in('id', dropItems);
        if (removedItems.error) throw removedItems.error;
      }
      for (var j = 0; j < category.items.length; j++) {
        var item = category.items[j];
        if (item.imageFile) {
          item.image_url = await uploadAsset(editor.id, item.imageFile, 'plato');
          item.imageFile = null;
        }
        var itemPayload = {
          restaurant_id: editor.id,
          category_id: category.id,
          name: item.name.trim(),
          description: item.description.trim() || null,
          price: Number(item.price),
          image_url: item.image_url || null,
          allergens: item.allergens,
          is_featured: !!item.featured,
          sort_order: j
        };
        if (item.id) {
          var itemUpdate = await supabase.from('menu_items').update(itemPayload).eq('id', item.id);
          if (itemUpdate.error) throw itemUpdate.error;
        } else {
          var itemInsert = await supabase.from('menu_items').insert(itemPayload).select('id').single();
          if (itemInsert.error) throw itemInsert.error;
          item.id = itemInsert.data.id;
        }
      }
    }
  }

  function dbMessage(error) {
    var message = (error && error.message) || '';
    if (error && error.code === '23505') return 'Ese enlace ya está en uso. Cámbialo.';
    if (/only admin can set status/i.test(message)) return 'Solo el administrador puede activar un restaurante.';
    if (message === 'type') return 'La foto tiene que ser JPG, PNG, WEBP, AVIF o GIF.';
    if (message === 'size') return 'La foto no puede pasar de 10 MB.';
    if (message && message.indexOf('Escribe') === 0 || message.indexOf('El enlace') === 0 || message.indexOf('Elige') === 0 || message.indexOf('Cada') === 0 || message.indexOf('Revisa') === 0 || message.indexOf('El color') === 0) return message;
    return 'No se ha podido guardar. Revisa los datos e inténtalo otra vez.';
  }

  async function openEditor(id) {
    state.busy = true;
    state.error = '';
    render();
    var editor = blankEditor();
    editor.autoSlug = !id;
    editor.studioMode = isAdmin() ? 'canva' : 'chat';
    try {
      if (id) {
        var restaurant = state.restaurants.filter(function (row) { return row.id === id; })[0];
        if (!restaurant) throw new Error('missing');
        editor.id = restaurant.id;
        editor.name = restaurant.name || '';
        editor.slug = restaurant.slug || '';
        editor.tagline = restaurant.tagline || '';
        editor.description = restaurant.description || '';
        editor.phone = restaurant.phone || '';
        editor.whatsapp = restaurant.whatsapp || '';
        editor.address = restaurant.address || '';
        editor.schedule = restaurant.schedule || '';
        editor.instagram = restaurant.instagram || '';
        editor.plan_tier = normalizePlanId(restaurant.plan_tier) || restaurant.plan_tier || '';
        editor.status = restaurant.status || 'borrador';
        editor.cover_image_url = restaurant.cover_image_url || '';
        editor.design = window.VisiwebDesign.merge(restaurant.design_config);
        editor.daily_menu = window.VisiwebDesign.mergeDaily(restaurant.daily_menu);
        editor.viewport = 'mobile';
        editor.preview = 'web';
        editor.chat = null;
        editor.chats = null;
        editor.activeChatId = null;
        editor.fromPreview = false;
        editor.previewDirty = true;
        editor.studioMode = isAdmin() ? 'canva' : 'chat';
        var categories = await supabase.from('menu_categories').select('*').eq('restaurant_id', id).order('sort_order');
        var items = await supabase.from('menu_items').select('*').eq('restaurant_id', id).order('sort_order');
        if (categories.error || items.error) throw categories.error || items.error;
        editor.categories = (categories.data || []).map(function (category) {
          return {
            id: category.id,
            name: category.name || '',
            items: (items.data || []).filter(function (item) { return item.category_id === category.id; }).map(function (item) {
              return {
                id: item.id,
                name: item.name || '',
                description: item.description || '',
                price: item.price == null ? '' : String(item.price),
                image_url: item.image_url || '',
                imageFile: null,
                preview: '',
                allergens: item.allergens || [],
                featured: !!item.is_featured
              };
            })
          };
        });
        if (!editor.categories.length) editor.categories = sampleMenu();
        if (planById(editor.plan_tier)) applyPlanLimits(editor);
      }
      state.editor = editor;
      state.notice = '';
    } catch (error) {
      setError('No se ha podido abrir el restaurante.');
    }
    state.busy = false;
    render();
  }

  function move(list, index, dir) {
    var next = index + dir;
    if (next < 0 || next >= list.length) return;
    var item = list[index];
    list.splice(index, 1);
    list.splice(next, 0, item);
  }

  app.addEventListener('submit', function (event) {
    event.preventDefault();
    if (event.target.id === 'login-form') {
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;
      state.busy = true;
      state.error = '';
      render();
      supabase.auth.signInWithPassword({
        email: email,
        password: password
      }).then(function (result) {
        if (result.error) {
          state.busy = false;
          setError(authMessage(result.error));
          render();
          return;
        }
        state.session = result.data.session;
        return loadProfile(state.session).then(function () {
          state.busy = false;
          if (state.session) return refresh();
          render();
        });
      }).catch(function () {
        state.busy = false;
        setError('No se ha podido entrar.');
        render();
      });
      return;
    }
    if (event.target.id === 'step-a') {
      state.busy = true;
      state.error = '';
      render();
      saveRestaurant().then(function () {
        state.editor.step = 'b';
        state.busy = false;
        state.notice = '';
        render();
      }).catch(function (error) {
        state.busy = false;
        setError(dbMessage(error));
        render();
      });
      return;
    }
    if (event.target.id === 'step-b') {
      state.busy = true;
      state.error = '';
      render();
      saveMenu().then(function () {
        state.busy = false;
        if (document.getElementById('vw-canvas')) {
          state.editor.overlay = '';
          setNotice('Carta guardada.');
          render();
          return;
        }
        state.editor = null;
        setNotice('Restaurante guardado.');
        return refresh();
      }).catch(function (error) {
        state.busy = false;
        setError(dbMessage(error));
        render();
      });
      return;
    }
    if (event.target.id === 'collab-chat-form') {
      var input = document.getElementById('collab-chat-input');
      var value = input ? input.value : '';
      if (!state.editor) return;
      ensureCollabChat(state.editor);
      if (!Array.isArray(state.editor.chats) || !state.editor.chats.length) {
        createChatTab(state.editor);
      }
      var targetTab = syncActiveChatRef(state.editor);
      if (!targetTab) return;
      if (!String(value || '').trim()) return;
      var mensaje = value.trim();
      var messages = targetTab.messages;
      messages.push({ role: 'user', text: mensaje });
      targetTab.title = chatTabTitle(targetTab, state.editor.chats.indexOf(targetTab));
      if (input) input.value = '';
      state.editor.previewDirty = true;
      state.notice = '';
      state.error = '';
      updateCollabChrome();

      var jsonActual = restaurantPayloadFromEditor(state.editor);
      var isLocal =
        location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      var editarWebUrl = isLocal
        ? 'https://visiwebmadrid.com/api/editar-web'
        : '/api/editar-web';
      messages.push({ role: 'system', text: 'Aplicando cambios...', pending: true });
      updateCollabChrome();
      fetch(editarWebUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: mensaje, jsonActual: jsonActual })
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var errMsg =
              (data && data.error) || ('Error ' + res.status + ' en /api/editar-web');
            throw new Error(errMsg);
          }
          return data;
        }, function () {
          throw new Error('Error ' + res.status + ' en /api/editar-web');
        });
      }).then(function (data) {
        if (!data || typeof data.cambios !== 'object' || data.cambios === null || Array.isArray(data.cambios)) {
          throw new Error('Respuesta inválida de /api/editar-web');
        }
        var merged = deepMerge(jsonActual, data.cambios);
        applyRestaurantUpdate(merged);
        if (messages.length && messages[messages.length - 1].pending) messages.pop();
        messages.push({
          role: 'system',
          text: data.respuestaBreve || 'Cambios aplicados en la vista previa.'
        });
        scheduleProjectSave();
        updateCollabChrome();
        pushCollabPreview(true);
      }).catch(function (err) {
        if (messages.length && messages[messages.length - 1].pending) messages.pop();
        messages.push({
          role: 'system',
          text: (err && err.message) || 'Error al conectar con /api/editar-web'
        });
        persistActiveLocal();
        updateCollabChrome();
        pushCollabPreview(true);
      });
    }
  });

  app.addEventListener('keydown', function (event) {
    if (event.target && event.target.id === 'collab-chat-input') {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        var form = document.getElementById('collab-chat-form');
        if (form) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  });

  window.addEventListener('keydown', function (event) {
    if (!isAdmin()) return;
    if (!(event.ctrlKey || event.metaKey)) return;
    var key = String(event.key || '');
    var code = String(event.code || '');
    var isEnie =
      key === 'ñ' ||
      key === 'Ñ' ||
      key.toLowerCase() === 'ñ' ||
      code === 'Semicolon' ||
      (code === 'KeyN' && event.altKey);
    if (!isEnie) return;
    event.preventDefault();
    state.githubOpen = !state.githubOpen;
    if (state.githubOpen && !state.githubSlug && state.editor) {
      state.githubSlug = slugify(state.editor.slug || state.editor.name || '');
    }
    state.githubNotice = '';
    renderGithubDrawer();
  });

  document.addEventListener('input', function (event) {
    if (event.target && event.target.id === 'github-slug') {
      state.githubSlug = event.target.value;
    }
    var createField = event.target && event.target.dataset && event.target.dataset.create;
    if (createField && state.createModal) {
      if (createField === 'name') {
        state.createModal.name = event.target.value;
        if (state.createModal.autoSlug) {
          state.createModal.slug = slugify(event.target.value);
          var slugNode = document.querySelector('#create-restaurant-modal [data-create="slug"]');
          if (slugNode) slugNode.value = state.createModal.slug;
        }
        return;
      }
      if (createField === 'slug') {
        state.createModal.autoSlug = false;
        state.createModal.slug = event.target.value;
        return;
      }
      if (createField === 'cuisine' || createField === 'phone' || createField === 'address' || createField === 'notes') {
        state.createModal[createField] = event.target.value;
      }
    }
  });

  document.addEventListener('change', function (event) {
    if (event.target && event.target.dataset && event.target.dataset.create === 'assigneeId' && state.createModal) {
      state.createModal.assigneeId = event.target.value;
    }
  });

  document.addEventListener('submit', function (event) {
    if (event.target && event.target.id === 'create-restaurant-form') {
      event.preventDefault();
      createRestaurantFromModal();
    }
  });

  document.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) return;
    if (button.id === 'github-close') {
      state.githubOpen = false;
      renderGithubDrawer();
      return;
    }
    if (button.id === 'github-publish') {
      var slugInput = document.getElementById('github-slug');
      if (slugInput) state.githubSlug = slugInput.value.trim();
      publishToGithub();
      return;
    }
    if (button.id === 'create-modal-close' || button.id === 'create-modal-cancel') {
      closeCreateModal();
      return;
    }
    if (button.id === 'create-notes-toggle' && state.createModal) {
      state.createModal.notesOpen = !state.createModal.notesOpen;
      renderCreateModal();
      return;
    }
    if (button.dataset.createPlan && state.createModal) {
      state.createModal.plan = button.dataset.createPlan;
      state.createModal.error = '';
      renderCreateModal();
      return;
    }
    if (button.dataset.createFeatures && state.createModal) {
      state.createModal.featuresOpen = state.createModal.featuresOpen === button.dataset.createFeatures
        ? ''
        : button.dataset.createFeatures;
      renderCreateModal();
      return;
    }
    if (event.target.matches && event.target.matches('#create-restaurant-modal > div')) {
      closeCreateModal();
    }
  });

  app.addEventListener('input', function (event) {
    var editor = state.editor;
    var target = event.target;
    if (!editor || !target.dataset || target.dataset.canvaInput) return;
    if (target.dataset.field === 'accent') {
      editor.design.accent = target.value;
      editor.design.palette = '';
      var chip = document.getElementById('accent-chip');
      if (chip) chip.style.background = target.value;
      return;
    }
    if (target.dataset.daily) {
      editor.daily_menu[target.dataset.daily] = target.value;
      return;
    }
    if (target.dataset.eventos) {
      ensureEventos(editor.design);
      editor.design.eventos[target.dataset.eventos] = target.value;
      if (window.VisiwebCanva && editor.id) window.VisiwebCanva.sync(state, {
        esc: esc, banner: banner, menuHtml: function () { return renderStepB(state.editor); },
        uploadImage: function (file) { return uploadAsset(state.editor.id, file, 'pieza'); },
        close: function () { state.editor = null; refresh(); },
        saveAll: saveAll
      });
      return;
    }
    var fieldName = target.dataset.field;
    if (fieldName === 'name') {
      editor.name = target.value;
      if (editor.autoSlug) {
        editor.slug = slugify(target.value);
        var slugInput = app.querySelector('[data-field="slug"]');
        if (slugInput) slugInput.value = editor.slug;
      }
      return;
    }
    if (fieldName === 'slug') {
      editor.autoSlug = false;
      editor.slug = target.value;
      return;
    }
    if (['tagline', 'phone', 'whatsapp', 'address', 'schedule', 'instagram'].indexOf(fieldName) >= 0) {
      editor[fieldName] = target.value;
      return;
    }
    var cat = editor.categories[Number(target.dataset.cat)];
    if (!cat) return;
    if (fieldName === 'cat-name') cat.name = target.value;
    if (target.dataset.item == null) return;
    var item = cat.items[Number(target.dataset.item)];
    if (!item) return;
    if (fieldName === 'item-name') item.name = target.value;
    if (fieldName === 'item-description') item.description = target.value;
    if (fieldName === 'item-price') item.price = target.value;
  });

  app.addEventListener('change', function (event) {
    var target = event.target;
    if (target.dataset.status) {
      var id = target.dataset.status;
      var next = target.value;
      var restaurant = state.restaurants.filter(function (row) { return row.id === id; })[0];
      var previous = restaurant ? restaurant.status : next;
      supabase.from('restaurants').update({ status: next }).eq('id', id).then(function (result) {
        if (result.error) {
          if (restaurant) restaurant.status = previous;
          setError('No se ha podido cambiar el estado.');
        } else if (restaurant) {
          restaurant.status = next;
          setNotice('Estado actualizado.');
        }
        render();
      });
      return;
    }
    if (target.dataset.plan && state.editor) {
      state.editor.plan_tier = normalizePlanId(target.dataset.plan);
      applyPlanLimits(state.editor);
      state.error = '';
      render();
      return;
    }
    if (!state.editor || target.type !== 'file' || target.dataset.canva === 'image-file') return;
    var file = target.files && target.files[0];
    if (!file) return;
    readImage(file).then(function (preview) {
      if (target.dataset.file === 'cover') {
        state.editor.coverFile = file;
        state.editor.coverPreview = preview;
      } else {
        var item = state.editor.categories[Number(target.dataset.cat)].items[Number(target.dataset.item)];
        item.imageFile = file;
        item.preview = preview;
      }
      state.error = '';
      render();
    }).catch(function (error) {
      setError(dbMessage(error));
      render();
    });
  });

  app.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (event.target.id === 'sign-out' || (button && button.id === 'sign-out')) {
      supabase.auth.signOut().then(function () {
        state.session = null;
        state.profile = null;
        state.editor = null;
        state.restaurants = [];
        state.myProjects = [];
        state.proposals = [];
        state.adminPeople = [];
        clearActiveLocal();
        state.notice = '';
        state.error = '';
        var drawer = document.getElementById('github-drawer');
        if (drawer) drawer.remove();
        render();
      });
      return;
    }
    var closeChatBtn = event.target.closest('[data-close-chat]');
    if (closeChatBtn && state.editor) {
      event.preventDefault();
      event.stopPropagation();
      closeChatTab(state.editor, closeChatBtn.getAttribute('data-close-chat'));
      updateCollabChrome();
      scheduleProjectSave();
      return;
    }
    var chatTabEl = event.target.closest('[data-chat-tab]');
    if (chatTabEl && state.editor && !event.target.closest('[data-close-chat]')) {
      state.editor.activeChatId = chatTabEl.getAttribute('data-chat-tab');
      syncActiveChatRef(state.editor);
      updateCollabChrome();
      persistActiveLocal();
      return;
    }
    if (!button || button.dataset.canva) return;
    if (button.dataset.adminTab && isAdmin()) {
      state.adminTab = button.dataset.adminTab;
      state.notice = '';
      state.error = '';
      render();
      return;
    }
    if (button.id === 'close-proposals') {
      state.adminTab = 'people';
      state.notice = '';
      state.error = '';
      render();
      return;
    }
    if (button.dataset.expandPerson && isAdmin()) {
      state.expandedPersonId = state.expandedPersonId === button.dataset.expandPerson ? null : button.dataset.expandPerson;
      render();
      return;
    }
    if (button.dataset.openProject) {
      openProject(button.dataset.openProject);
      return;
    }
    if (button.dataset.deleteProject) {
      deleteProject(button.dataset.deleteProject);
      return;
    }
    if (button.dataset.proposal && isAdmin()) {
      state.selectedProposalId = button.dataset.proposal;
      state.notice = '';
      state.error = '';
      updateProposalsChrome();
      pushProposalPreview();
      return;
    }
    if (button.dataset.proposalViewport && isAdmin()) {
      state.proposalViewport = button.dataset.proposalViewport;
      updateProposalsChrome();
      return;
    }
    if (button.id === 'download-data-js') {
      downloadDataJs();
      return;
    }
    if (button.id === 'approve-proposal') {
      approveProposal();
      return;
    }
    if (button.id === 'new-restaurant') {
      openCreateModal();
      return;
    }
    if (button.dataset.copy) {
      var url = demoUrl(button.dataset.copy);
      var slug = button.dataset.copy;
      var done = function () {
        state.copied = slug;
        state.notice = '';
        render();
        setTimeout(function () {
          if (state.copied === slug) {
            state.copied = '';
            render();
          }
        }, 1600);
      };
      var fallback = function () {
        var input = document.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
        input.remove();
        if (ok) done();
        else setNotice(url);
        if (!ok) render();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(fallback);
      } else {
        fallback();
      }
      return;
    }
    if (button.dataset.edit) {
      openEditor(button.dataset.edit);
      return;
    }
    if (button.dataset.delete) {
      var targetId = button.dataset.delete;
      var victim = state.restaurants.filter(function (row) { return row.id === targetId; })[0];
      if (!victim || !window.confirm('¿Eliminar «' + victim.name + '» y su carta?')) return;
      supabase.from('restaurants').delete().eq('id', targetId).then(function (result) {
        if (result.error) setError('No se ha podido eliminar el restaurante.');
        else setNotice('Restaurante eliminado.');
        return refresh();
      });
      return;
    }
    if (button.id === 'close-editor') {
      if (state.editor && state.editor.studioMode === 'chat') {
        upsertProjectDraft().finally(function () {
          state.editor = null;
          clearActiveLocal();
          refresh();
        });
        return;
      }
      state.editor = null;
      clearActiveLocal();
      refresh();
      return;
    }
    if (button.id === 'ampliar-preview') {
      openFullscreenPreview();
      return;
    }
    if (button.id === 'toggle-chat-panel' && state.editor) {
      if (!Array.isArray(state.editor.chats)) state.editor.chats = [];
      if (!state.editor.chats.length || state.editor.chats.length < MAX_CHAT_TABS) {
        createChatTab(state.editor);
        updateCollabChrome();
        persistActiveLocal();
        var focusInput = document.getElementById('collab-chat-input');
        if (focusInput) focusInput.focus();
      }
      return;
    }
    if (button.id === 'chat-tab-add' && state.editor) {
      if (!Array.isArray(state.editor.chats)) state.editor.chats = [];
      if (state.editor.chats.length < MAX_CHAT_TABS) {
        createChatTab(state.editor);
        updateCollabChrome();
        persistActiveLocal();
        var addInput = document.getElementById('collab-chat-input');
        if (addInput) addInput.focus();
      }
      return;
    }
    if (button.dataset.collabViewport && state.editor) {
      state.editor.viewport = button.dataset.collabViewport;
      updateCollabChrome();
      return;
    }
    if (button.dataset.collabPreview && state.editor) {
      state.editor.preview = button.dataset.collabPreview;
      if (state.editor.preview === 'mesa') state.editor.viewport = 'mobile';
      updateCollabChrome();
      persistActiveLocal();
      return;
    }
    if (button.id === 'send-proposal') {
      sendProposal();
      return;
    }
    if (button.id === 'back-step' && state.editor) {
      state.editor.step = 'a';
      state.error = '';
      render();
      return;
    }
    if (button.dataset.step && state.editor) {
      if (!planById(state.editor.plan_tier)) {
        setError('Elige un plan.');
        render();
        return;
      }
      syncEditorDom();
      readDailyDom();
      state.editor.step = button.dataset.step;
      state.error = '';
      render();
      return;
    }
    if ((button.id === 'save-design' || button.id === 'live-preview') && state.editor) {
      var openPreview = button.id === 'live-preview';
      state.busy = true;
      state.error = '';
      render();
      saveDesign().then(function () {
        state.busy = false;
        setNotice('Diseño guardado.');
        render();
        if (openPreview) window.open(demoUrl(state.editor.slug), '_blank', 'noopener');
      }).catch(function (error) {
        state.busy = false;
        setError(dbMessage(error));
        render();
      });
      return;
    }
    if (button.dataset.design && state.editor) {
      if (button.dataset.design === 'palette') {
        state.editor.design.palette = button.dataset.value;
        state.editor.design.accent = button.dataset.accent;
      } else {
        state.editor.design[button.dataset.design] = button.dataset.value;
      }
      render();
      return;
    }
    if (button.dataset.lang && state.editor) {
      var langRank = planRank(state.editor.plan_tier);
      if (langRank < 2 || (button.dataset.lang === 'multi' && langRank < 3)) return;
      ensureLabels(state.editor.design);
      state.editor.design.labels.vw_lang = button.dataset.lang;
      render();
      return;
    }
    if (button.dataset.flag && state.editor) {
      var flagRank = planRank(state.editor.plan_tier);
      var flag = button.dataset.flag;
      if (flag === 'vw_events' && flagRank < 3) return;
      if ((flag === 'vw_allergens' || flag === 'vw_social') && flagRank < 2) return;
      ensureLabels(state.editor.design);
      state.editor.design.labels[flag] = state.editor.design.labels[flag] === '1' ? '0' : '1';
      render();
      return;
    }
    if (button.dataset.eventosVideo && state.editor) {
      if (planRank(state.editor.plan_tier) < 3) return;
      ensureEventos(state.editor.design);
      state.editor.design.eventos.tipoVideo = button.dataset.eventosVideo;
      render();
      return;
    }
    if (button.dataset.toggle && state.editor) {
      if (planRank(state.editor.plan_tier) < 3 && button.dataset.toggle.indexOf('mesa.') === 0) return;
      if (planRank(state.editor.plan_tier) < 2 && button.dataset.toggle === 'hero_actions.book') return;
      var parts = button.dataset.toggle.split('.');
      var target = state.editor.design;
      if (parts.length === 2) target = target[parts[0]];
      var key = parts[parts.length - 1];
      target[key] = !target[key];
      if (key === 'daily_menu_enabled' && target[key]) {
        state.editor.design.blocks.forEach(function (block) {
          if (block.id === 'menu_dia') block.visible = true;
        });
      }
      render();
      return;
    }
    if (button.dataset.blockToggle && state.editor) {
      if (planRank(state.editor.plan_tier) < 2 && (button.dataset.blockToggle === 'local' || button.dataset.blockToggle === 'reserva')) return;
      state.editor.design.blocks.forEach(function (block) {
        if (block.id === button.dataset.blockToggle) block.visible = !block.visible;
      });
      render();
      return;
    }
    if (button.dataset.moveBlock != null && state.editor) {
      move(state.editor.design.blocks, Number(button.dataset.moveBlock), Number(button.dataset.dir));
      render();
      return;
    }
    if (button.dataset.day && state.editor) {
      var days = state.editor.daily_menu.days;
      var day = button.dataset.day;
      var at = days.indexOf(day);
      if (at >= 0) days.splice(at, 1);
      else days.push(day);
      render();
      return;
    }
    if (button.id === 'add-category' && state.editor) {
      state.editor.categories.push(blankCategory());
      render();
      return;
    }
    if (!state.editor) return;
    if (button.dataset.moveCat != null) {
      move(state.editor.categories, Number(button.dataset.moveCat), Number(button.dataset.dir));
      render();
      return;
    }
    if (button.dataset.removeCat != null) {
      state.editor.categories.splice(Number(button.dataset.removeCat), 1);
      if (!state.editor.categories.length) state.editor.categories.push(blankCategory());
      render();
      return;
    }
    if (button.dataset.addItem != null) {
      state.editor.categories[Number(button.dataset.addItem)].items.push(blankItem());
      render();
      return;
    }
    if (button.dataset.moveItem != null) {
      move(state.editor.categories[Number(button.dataset.cat)].items, Number(button.dataset.moveItem), Number(button.dataset.dir));
      render();
      return;
    }
    if (button.dataset.removeItem != null) {
      var items = state.editor.categories[Number(button.dataset.cat)].items;
      items.splice(Number(button.dataset.removeItem), 1);
      render();
      return;
    }
    if (button.dataset.allergen) {
      var dish = state.editor.categories[Number(button.dataset.cat)].items[Number(button.dataset.item)];
      var key = button.dataset.allergen;
      var index = dish.allergens.indexOf(key);
      if (index >= 0) dish.allergens.splice(index, 1);
      else dish.allergens.push(key);
      render();
    }
  });

  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || !event.data) return;
    if (event.data.type !== 'visiweb-ready') return;
    if (state.editor && (state.editor.studioMode === 'chat' || !isAdmin())) pushCollabPreview(true);
    if (isAdmin() && state.adminTab === 'proposals') pushProposalPreview();
  });

  window.addEventListener('beforeunload', function () {
    persistActiveLocal();
  });

  supabase.auth.getSession().then(function (result) {
    state.session = result.data.session;
    state.ready = true;
    if (!state.session) {
      render();
      return;
    }
    loadProfile(state.session).then(function () {
      if (state.session) return refresh();
      render();
    });
  });
})();
