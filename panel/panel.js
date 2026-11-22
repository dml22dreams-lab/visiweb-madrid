(function () {
  'use strict';

  var SUPABASE_URL = 'https://atcgrdfzyboqvdvtfymz.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Y2dyZGZ6eWJvcXZkdnRmeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTc1NTksImV4cCI6MjEwNzU3MzU1OX0.LKMVrtcqd_suMUeyWeedPs5yuzTYLVbz7Lel9A0iKY8';

  var PLANS = [
    { id: '120', name: 'Plan Básico', price: 120, summary: 'Web One-Page con carta categorizada y precios, botón de WhatsApp y QR básico.' },
    { id: '390', name: 'Plan Gastro Premium', price: 390, summary: 'Web multipágina (Carta, El Local, Reservas), carta bilingüe ES/EN, filtro de alérgenos y página de redes.' },
    { id: '790', name: 'Plan Digitalización Total', price: 790, summary: 'Todo lo anterior, más diseño a medida, carta multilingüe (hasta 3 idiomas), módulo de grupos/eventos y Modo QR en Mesa.' }
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
    adminTab: 'restaurants',
    proposals: [],
    selectedProposalId: null,
    proposalViewport: 'mobile'
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

  function planById(id) {
    return PLANS.filter(function (plan) { return plan.id === id; })[0] || null;
  }

  function planLabel(id) {
    var found = planById(id);
    return found ? found.name + ' · ' + found.price + ' €' : 'Sin plan';
  }

  function planRank(id) {
    if (id === '790') return 3;
    if (id === '390') return 2;
    if (id === '120') return 1;
    return 0;
  }

  function lockIcon() {
    return '<svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';
  }

  function lockedRow(title, note) {
    return '<div class="flex items-start gap-3 rounded-3xl bg-stone-50 px-4 py-3 text-stone-400 ring-1 ring-stone-200">' + lockIcon() + '<span><span class="block text-sm font-semibold text-stone-700">' + title + '</span><span class="mt-0.5 block text-xs">' + note + '</span></span></div>';
  }

  function planPicker(editor) {
    return '<fieldset class="mt-6"><legend class="text-sm font-semibold">Plan contratado</legend><div class="mt-2 grid gap-2">' +
      PLANS.map(function (plan) {
        var on = editor.plan_tier === plan.id;
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
    var rank = planRank(editor.plan_tier);
    var design = editor.design;
    var plan = planById(editor.plan_tier);
    ensureLabels(design);
    if (plan) design.labels.vw_plan = plan.name;
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
        id: null,
        name: langText(category.name),
        items: items.length
          ? items.map(function (item) {
              return {
                id: null,
                name: langText(item.name),
                description: langText(item.desc || item.description),
                price: priceFromDemo(item),
                image_url: item.image || '',
                imageFile: null,
                preview: '',
                allergens: Array.isArray(item.allergens) ? item.allergens.slice() : [],
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
      chat: null,
      fromPreview: true
    };
  }

  function isAdmin() {
    return state.profile && state.profile.role === 'admin';
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
    return {
      name: editor.name || '',
      tagline: editor.tagline || '',
      description: editor.description || '',
      phone: editor.phone || '',
      whatsapp: editor.whatsapp || '',
      address: editor.address || '',
      schedule: editor.schedule || '',
      instagram: editor.instagram || '',
      cover_image_url: editor.coverPreview || editor.cover_image_url || '',
      plan_tier: editor.plan_tier || '',
      design_config: editor.design,
      design: editor.design,
      daily_menu: editor.daily_menu,
      accent: editor.design.accent,
      primary_color: editor.design.accent,
      eventos_activo: editor.design.labels.vw_events === '1',
      categories: (editor.categories || []).map(function (category) {
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
  }

  function pushCollabPreview(force) {
    var frame = document.getElementById('collab-preview');
    var editor = state.editor;
    if (!frame || !frame.contentWindow || !editor) return;
    // Primer pintado: la iframe ya carga ./preview/data.js; no la pisamos hasta el primer cambio del chat.
    if (!force && editor.fromPreview && !editor.previewDirty) return;
    var payload = restaurantPayloadFromEditor(editor);
    frame.contentWindow.postMessage({
      type: 'RESTAURANT_DATA',
      payload: payload,
      RESTAURANT_DATA: payload
    }, location.origin);
  }

  function ensureCollabChat(editor) {
    if (!editor.chat) {
      editor.chat = [{
        role: 'system',
        text: 'Entorno cerrado. Escribe cambios del bar (nombre, color, teléfono, horario, carta, eventos). La vista previa se actualiza al instante. No se descarga código: solo puedes enviar la propuesta al administrador.'
      }];
    }
    if (!editor.viewport) editor.viewport = 'mobile';
  }

  function applyChatCommand(raw) {
    var editor = state.editor;
    var text = String(raw || '').trim();
    if (!text) return 'Escribe un cambio.';
    if (text.charAt(0) === '{') {
      try {
        var data = JSON.parse(text);
        ['name', 'tagline', 'description', 'phone', 'whatsapp', 'address', 'schedule', 'instagram', 'plan_tier'].forEach(function (key) {
          if (typeof data[key] === 'string') editor[key] = data[key];
        });
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
      if (!editor.plan_tier || planRank(editor.plan_tier) < 3) editor.plan_tier = '790';
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
    match = text.match(/^plan\s*[:\-]?\s*(120|390|790)$/i);
    if (match) { editor.plan_tier = match[1]; applyPlanLimits(editor); return 'Plan ' + match[1] + ' € aplicado.'; }
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
    var list = document.getElementById('collab-chat-list');
    if (list) {
      list.innerHTML = editor.chat.map(chatBubble).join('');
      list.scrollTop = list.scrollHeight;
    }
    var frame = document.getElementById('collab-preview');
    if (frame) {
      frame.style.width = editor.viewport === 'desktop' ? '100%' : '390px';
      frame.style.maxWidth = editor.viewport === 'desktop' ? '100%' : '390px';
    }
    document.querySelectorAll('[data-collab-viewport]').forEach(function (node) {
      node.className = 'h-7 rounded px-2 text-xs font-medium ' + (node.dataset.collabViewport === editor.viewport ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500');
    });
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
    app.innerHTML =
      '<div id="collab-studio" class="fixed inset-0 z-50 flex flex-col bg-stone-100">' +
        '<header class="flex h-12 shrink-0 items-center gap-2 border-b border-stone-200 bg-white px-3">' +
          '<button type="button" id="close-editor" class="h-8 rounded-md px-2 text-xs font-medium text-stone-500">← Panel</button>' +
          '<p id="collab-title" class="truncate text-sm font-semibold text-stone-900">' + esc(editor.name || 'Nuevo restaurante') + '</p>' +
          '<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Colaborador · sin descarga</span>' +
        '</header>' +
        '<div id="collab-banner" class="shrink-0 px-3 pt-2">' + banner() + '</div>' +
        '<div class="flex min-h-0 flex-1">' +
          '<section class="flex min-w-0 flex-1 flex-col">' +
            '<div class="flex shrink-0 items-center justify-center gap-2 border-b border-stone-200 bg-white px-3 py-2">' +
              '<span class="text-xs font-medium text-stone-500">Vista</span>' +
              '<div class="flex h-8 items-center rounded-md bg-stone-100 p-0.5">' +
                '<button type="button" data-collab-viewport="mobile" class="h-7 rounded px-2 text-xs font-medium">Móvil · 390px</button>' +
                '<button type="button" data-collab-viewport="desktop" class="h-7 rounded px-2 text-xs font-medium">Escritorio · 100%</button>' +
              '</div>' +
            '</div>' +
            '<div class="flex min-h-0 flex-1 justify-center overflow-auto bg-stone-100 p-4">' +
              '<iframe id="collab-preview" title="Vista previa" src="./preview/index.html#inicio" class="h-full border border-stone-200 bg-white shadow-sm" style="width:' + (editor.viewport === 'desktop' ? '100%' : '390px') + ';max-width:' + (editor.viewport === 'desktop' ? '100%' : '390px') + '"></iframe>' +
            '</div>' +
          '</section>' +
          '<section class="flex w-full max-w-md shrink-0 flex-col border-l border-stone-200 bg-white">' +
            '<div id="collab-chat-list" class="min-h-0 flex-1 space-y-2 overflow-auto p-3">' + editor.chat.map(chatBubble).join('') + '</div>' +
            '<form id="collab-chat-form" class="shrink-0 border-t border-stone-200 p-3">' +
              '<label class="sr-only" for="collab-chat-input">Mensaje</label>' +
              '<textarea id="collab-chat-input" rows="3" class="w-full resize-none rounded-2xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400" placeholder="Ej. nombre: Bar Pepe · color: #9f1239 · activa eventos"></textarea>' +
              '<div class="mt-2 flex gap-2">' +
                '<button type="submit" class="flex-1 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white">Aplicar cambio</button>' +
              '</div>' +
              '<button type="button" id="send-proposal" class="mt-2 w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-semibold text-black"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Enviando…' : 'Enviar propuesta al administrador') + '</button>' +
            '</form>' +
          '</section>' +
        '</div>' +
      '</div>';
    updateCollabChrome();
    var frame = document.getElementById('collab-preview');
    if (frame) frame.addEventListener('load', function () { pushCollabPreview(); });
  }

  async function sendProposal() {
    if (!state.editor || state.busy) return;
    state.busy = true;
    state.error = '';
    state.notice = '';
    updateCollabChrome();
    try {
      var payload = restaurantPayloadFromEditor(state.editor);
      var email = (state.profile && state.profile.email) || (state.session.user && state.session.user.email) || '';
      var result = await supabase.from('propuestas_webs').insert({
        nombre_local: state.editor.name || '',
        correo_colaborador: email,
        collaborator_id: state.session.user.id,
        restaurant_data: payload,
        estado: 'pendiente'
      }).select('id').single();
      if (result.error) throw result.error;
      state.busy = false;
      ensureCollabChat(state.editor);
      state.editor.chat.push({ role: 'system', text: 'Propuesta enviada al administrador. Queda pendiente de revisión.' });
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
              '<iframe id="proposal-preview" title="Vista previa propuesta" src="./preview/index.html#inicio" class="h-full border border-stone-200 bg-white shadow-sm" style="width:390px;max-width:390px"></iframe>' +
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
      return;
    }
    if (!state.session || !state.profile) {
      renderLogin();
      return;
    }
    if (isAdmin() && state.adminTab === 'proposals') {
      renderAdminProposals();
      return;
    }
    if (state.editor) {
      if (!isAdmin()) {
        renderCollabStudio();
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
        return;
      }
      renderEditor();
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
    var sales = closed.reduce(function (sum, restaurant) { return sum + (Number(restaurant.plan_tier) || 0); }, 0);
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
    var revenue = active.reduce(function (sum, restaurant) { return sum + (Number(restaurant.plan_tier) || 0); }, 0);
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

  function renderHome() {
    var admin = isAdmin();
    var pending = state.proposals.filter(function (row) { return row.estado === 'pendiente'; }).length;
    app.innerHTML =
      '<div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">' +
        '<header class="flex items-start justify-between gap-4">' +
          '<div>' +
            '<p class="font-serif text-3xl">VisiWeb</p>' +
            '<p class="mt-1 text-sm text-stone-500">' + (admin ? 'Administrador' : 'Colaborador') + ' · ' + esc(state.profile.email || state.session.user.email || '') + '</p>' +
          '</div>' +
          '<button type="button" id="sign-out" class="rounded-full px-3 py-2 text-sm font-semibold text-stone-500">Salir</button>' +
        '</header>' +
        (admin
          ? '<div class="mt-6 flex gap-2 rounded-full bg-stone-100 p-1 text-sm font-semibold">' +
              '<button type="button" data-admin-tab="restaurants" class="flex-1 rounded-full px-3 py-2 ' + (state.adminTab === 'restaurants' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500') + '">Restaurantes</button>' +
              '<button type="button" data-admin-tab="proposals" class="flex-1 rounded-full px-3 py-2 ' + (state.adminTab === 'proposals' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500') + '">Propuestas recibidas' + (pending ? ' · ' + pending : '') + '</button>' +
            '</div>'
          : '') +
        '<div class="mt-6 space-y-4">' + banner() + '</div>' +
        '<div class="mt-6">' + (admin ? agencySummary() : summary()) + '</div>' +
        '<div class="mt-8 flex items-center justify-between gap-3">' +
          '<h1 class="font-serif text-2xl">' + (admin ? 'Todos los restaurantes' : 'Tus restaurantes') + '</h1>' +
          '<button type="button" id="new-restaurant" class="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black">+ Nuevo Restaurante</button>' +
        '</div>' +
        '<div class="mt-4 grid gap-3">' +
          (state.restaurants.length
            ? state.restaurants.map(restaurantCard).join('')
            : '<p class="rounded-3xl border border-dashed border-stone-300 px-5 py-10 text-center text-sm text-stone-500">Todavía no hay restaurantes.</p>') +
        '</div>' +
      '</div>';
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
  }

  async function loadRestaurants() {
    var result = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    state.restaurants = result.data || [];
    state.owners = {};
    if (!isAdmin()) return;
    var people = await supabase.from('profiles').select('id, full_name, email');
    if (people.error) throw people.error;
    (people.data || []).forEach(function (person) { state.owners[person.id] = person; });
  }

  async function loadProposals() {
    if (!isAdmin()) {
      state.proposals = [];
      return;
    }
    var result = await supabase
      .from('propuestas_webs')
      .select('*')
      .order('created_at', { ascending: false });
    if (result.error) throw result.error;
    state.proposals = result.data || [];
    if (state.selectedProposalId && !selectedProposal()) state.selectedProposalId = null;
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
    state.busy = false;
    render();
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
      phone: editor.phone.trim() || null,
      whatsapp: editor.whatsapp.trim() || null,
      address: editor.address.trim() || null,
      schedule: editor.schedule.trim() || null,
      instagram: editor.instagram.trim() || null,
      plan_tier: editor.plan_tier,
      design_config: editor.design,
      cover_image_url: editor.cover_image_url || null
    };
  }

  function validateLocal(editor) {
    if (!editor.name.trim()) return 'Escribe el nombre del local.';
    var slug = slugify(editor.slug || editor.name);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'El enlace solo puede llevar minúsculas, números y guiones.';
    if (PLANS.every(function (plan) { return plan.id !== editor.plan_tier; })) return 'Elige un plan.';
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
        editor.plan_tier = restaurant.plan_tier || '';
        editor.status = restaurant.status || 'borrador';
        editor.cover_image_url = restaurant.cover_image_url || '';
        editor.design = window.VisiwebDesign.merge(restaurant.design_config);
        editor.daily_menu = window.VisiwebDesign.mergeDaily(restaurant.daily_menu);
        editor.viewport = 'mobile';
        editor.chat = null;
        editor.fromPreview = false;
        editor.previewDirty = true;
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
      if (!String(value || '').trim()) return;
      state.editor.chat.push({ role: 'user', text: value.trim() });
      var reply = applyChatCommand(value);
      state.editor.chat.push({ role: 'system', text: reply });
      if (input) input.value = '';
      state.editor.previewDirty = true;
      state.notice = '';
      state.error = '';
      updateCollabChrome();
      pushCollabPreview(true);
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
      state.editor.plan_tier = target.dataset.plan;
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
        state.notice = '';
        state.error = '';
        render();
      });
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
      state.adminTab = 'restaurants';
      state.notice = '';
      state.error = '';
      render();
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
      state.editor = blankEditor();
      state.notice = '';
      state.error = '';
      render();
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
      state.editor = null;
      refresh();
      return;
    }
    if (button.dataset.collabViewport && state.editor) {
      state.editor.viewport = button.dataset.collabViewport;
      updateCollabChrome();
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
    if (state.editor && !isAdmin()) pushCollabPreview();
    if (isAdmin() && state.adminTab === 'proposals') pushProposalPreview();
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
