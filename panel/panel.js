(function () {
  'use strict';

  var SUPABASE_URL = 'https://atcgrdfzyboqvdvtfymz.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Y2dyZGZ6eWJvcXZkdnRmeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTc1NTksImV4cCI6MjEwNzU3MzU1OX0.LKMVrtcqd_suMUeyWeedPs5yuzTYLVbz7Lel9A0iKY8';

  var PLANS = [
    { id: '120', label: '120 €' },
    { id: '390', label: '390 €' },
    { id: '790', label: '790 €' }
  ];
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
    copied: ''
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

  function planLabel(id) {
    var found = PLANS.filter(function (plan) { return plan.id === id; })[0];
    return found ? found.label : 'Sin plan';
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
    return { id: null, name: '', description: '', price: '', image_url: '', imageFile: null, preview: '', allergens: [] };
  }

  function blankCategory() {
    return { id: null, name: '', items: [blankItem()] };
  }

  function blankEditor() {
    return {
      step: 'a',
      id: null,
      name: '',
      slug: '',
      autoSlug: true,
      tagline: '',
      phone: '',
      whatsapp: '',
      address: '',
      schedule: '',
      instagram: '',
      plan_tier: '390',
      status: 'borrador',
      cover_image_url: '',
      coverFile: null,
      coverPreview: '',
      categories: [blankCategory()]
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

  function render() {
    if (!state.ready) {
      app.innerHTML = '<p class="px-6 py-16 text-center text-sm text-stone-500">Cargando…</p>';
      return;
    }
    if (!state.session || !state.profile) {
      renderLogin();
      return;
    }
    if (state.editor) {
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
            '<input id="login-email" name="email" type="email" autocomplete="username" required class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none ring-stone-900 focus:ring-2">' +
          '</label>' +
          '<label class="block text-sm font-semibold">Contraseña' +
            '<input id="login-password" name="password" type="password" autocomplete="current-password" required class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none ring-stone-900 focus:ring-2">' +
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
    app.innerHTML =
      '<div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">' +
        '<header class="flex items-start justify-between gap-4">' +
          '<div>' +
            '<p class="font-serif text-3xl">VisiWeb</p>' +
            '<p class="mt-1 text-sm text-stone-500">' + (admin ? 'Administrador' : 'Colaborador') + ' · ' + esc(state.profile.email || state.session.user.email || '') + '</p>' +
          '</div>' +
          '<button type="button" id="sign-out" class="rounded-full px-3 py-2 text-sm font-semibold text-stone-500">Salir</button>' +
        '</header>' +
        '<div class="mt-6 space-y-4">' + banner() + '</div>' +
        (admin ? '' : '<div class="mt-6">' + summary() + '</div>') +
        '<div class="mt-8 flex items-center justify-between gap-3">' +
          '<h1 class="font-serif text-2xl">' + (admin ? 'Todos los restaurantes' : 'Tus restaurantes') + '</h1>' +
          (admin ? '' : '<button type="button" id="new-restaurant" class="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black">+ Nuevo Restaurante</button>') +
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
    return '<input data-field="' + fieldName + '" value="' + esc(value) + '" ' + extra + ' class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none ring-stone-900 focus:ring-2">';
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
        field('Nombre', '<input data-field="item-name" data-cat="' + catIndex + '" data-item="' + itemIndex + '" value="' + esc(item.name) + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none ring-stone-900 focus:ring-2">') +
        '<label class="mt-3 block text-sm font-semibold">Descripción<textarea data-field="item-description" data-cat="' + catIndex + '" data-item="' + itemIndex + '" rows="2" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none ring-stone-900 focus:ring-2">' + esc(item.description) + '</textarea></label>' +
        '<label class="mt-3 block text-sm font-semibold">Precio (€)<input data-field="item-price" data-cat="' + catIndex + '" data-item="' + itemIndex + '" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(item.price) + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none ring-stone-900 focus:ring-2"></label>' +
        '<div class="mt-3">' +
          '<p class="text-sm font-semibold">Foto del plato</p>' +
          (preview ? '<img src="' + esc(preview) + '" alt="" class="mt-2 h-24 w-24 rounded-2xl object-cover">' : '') +
          '<input data-file="item" data-cat="' + catIndex + '" data-item="' + itemIndex + '" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" class="mt-2 block w-full text-sm">' +
        '</div>' +
        '<div class="mt-3"><p class="text-sm font-semibold">Alérgenos</p>' + allergenButtons(item, catIndex, itemIndex) + '</div>' +
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
        '<div class="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">' +
          '<p class="rounded-full px-3 py-2 text-center ' + (stepA ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200') + '">1 · Datos del local</p>' +
          '<p class="rounded-full px-3 py-2 text-center ' + (!stepA ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200') + '">2 · Carta</p>' +
        '</div>' +
        '<div class="mt-4">' + banner() + '</div>' +
        (stepA ? renderStepA(editor) : renderStepB(editor)) +
      '</div>';
  }

  function renderStepA(editor) {
    var cover = editor.coverPreview || editor.cover_image_url;
    return (
      '<form id="step-a" class="mt-6 space-y-4">' +
        field('Nombre', input('name', editor.name, 'required autocomplete="organization"')) +
        field('Enlace', '<span class="mt-1 flex overflow-hidden rounded-2xl border border-stone-200 bg-white focus-within:ring-2 focus-within:ring-stone-900"><span class="px-3 py-3 text-sm text-stone-400">/r/</span><input data-field="slug" value="' + esc(editor.slug) + '" required class="w-full bg-transparent py-3 pr-4 text-base outline-none"></span>') +
        field('Frase corta', input('tagline', editor.tagline, 'maxlength="140"')) +
        '<div class="grid gap-4 sm:grid-cols-2">' +
          field('Teléfono', input('phone', editor.phone, 'type="tel" autocomplete="tel"')) +
          field('WhatsApp', input('whatsapp', editor.whatsapp, 'inputmode="tel" placeholder="34600000000"')) +
        '</div>' +
        field('Dirección', input('address', editor.address, 'autocomplete="street-address"')) +
        field('Horario', '<textarea data-field="schedule" rows="2" class="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none ring-stone-900 focus:ring-2">' + esc(editor.schedule) + '</textarea>') +
        field('Instagram', input('instagram', editor.instagram, 'placeholder="https://instagram.com/..."')) +
        '<fieldset><legend class="text-sm font-semibold">Plan contratado</legend><div class="mt-2 grid grid-cols-3 gap-2">' +
          PLANS.map(function (plan) {
            var on = editor.plan_tier === plan.id;
            return '<label class="cursor-pointer rounded-2xl px-3 py-3 text-center text-sm font-semibold ring-1 ' + (on ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-700 ring-stone-200') + '"><input class="sr-only" type="radio" name="plan" data-field="plan" value="' + plan.id + '"' + (on ? ' checked' : '') + '>' + plan.label + '</label>';
          }).join('') +
        '</div></fieldset>' +
        '<div><p class="text-sm font-semibold">Foto de portada</p>' +
          (cover ? '<img src="' + esc(cover) + '" alt="" class="mt-2 aspect-[16/9] w-full rounded-3xl object-cover">' : '') +
          '<input data-file="cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" class="mt-2 block w-full text-sm">' +
        '</div>' +
        '<button type="submit" class="w-full rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Guardando…' : 'Continuar a la carta') + '</button>' +
      '</form>'
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
              '<label class="mt-3 block text-sm font-semibold">Nombre<input data-field="cat-name" data-cat="' + catIndex + '" value="' + esc(category.name) + '" class="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none ring-stone-900 focus:ring-2"></label>' +
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

  async function refresh() {
    state.busy = true;
    render();
    try {
      await loadRestaurants();
      state.error = '';
    } catch (error) {
      setError('No se han podido cargar los restaurantes.');
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

  async function saveRestaurant() {
    syncEditorDom();
    var editor = state.editor;
    var message = validateLocal(editor);
    if (message) throw new Error(message);
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
          is_featured: false,
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
    if (message && message.indexOf('Escribe') === 0 || message.indexOf('El enlace') === 0 || message.indexOf('Elige') === 0 || message.indexOf('Cada') === 0 || message.indexOf('Revisa') === 0) return message;
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
        editor.phone = restaurant.phone || '';
        editor.whatsapp = restaurant.whatsapp || '';
        editor.address = restaurant.address || '';
        editor.schedule = restaurant.schedule || '';
        editor.instagram = restaurant.instagram || '';
        editor.plan_tier = restaurant.plan_tier || '390';
        editor.status = restaurant.status || 'borrador';
        editor.cover_image_url = restaurant.cover_image_url || '';
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
                allergens: item.allergens || []
              };
            })
          };
        });
        if (!editor.categories.length) editor.categories = [blankCategory()];
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
        state.editor = null;
        state.busy = false;
        setNotice('Restaurante guardado.');
        return refresh();
      }).catch(function (error) {
        state.busy = false;
        setError(dbMessage(error));
        render();
      });
    }
  });

  app.addEventListener('input', function (event) {
    var editor = state.editor;
    var target = event.target;
    if (!editor || !target.dataset) return;
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
    if (fieldName === 'plan') {
      editor.plan_tier = target.value;
      render();
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
    if (!state.editor || target.type !== 'file') return;
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
    if (!button) return;
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
    if (button.id === 'back-step' && state.editor) {
      state.editor.step = 'a';
      state.error = '';
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
