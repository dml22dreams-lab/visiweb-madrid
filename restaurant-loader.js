/* Carga /r/:slug y /r/:slug/mesa desde Supabase y rellena VISIWEB_DEMO. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://atcgrdfzyboqvdvtfymz.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Y2dyZGZ6eWJvcXZkdnRmeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTc1NTksImV4cCI6MjEwNzU3MzU1OX0.LKMVrtcqd_suMUeyWeedPs5yuzTYLVbz7Lel9A0iKY8';
  var DRAFT_TEXT = 'VISTA PREVIA DE DEMOSTRACIÓN · Pendiente de activación oficial en VisiWeb';

  function pathOf() {
    var path = location.pathname.replace(/\/+$/, '');
    return path || '/';
  }

  function route() {
    var parts = pathOf().split('/').filter(Boolean);
    if (parts[0] !== 'r' || parts.length < 2 || parts.length > 3) return null;
    if (parts.length === 3 && parts[2] !== 'mesa') return null;
    var slug = '';
    try { slug = decodeURIComponent(parts[1]); } catch (e) { return null; }
    if (!slug) return null;
    return { slug: slug, page: parts.length === 3 ? 'mesa' : 'web' };
  }

  function both(text) {
    var value = text || '';
    return { es: value, en: value };
  }

  function money(value) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    return {
      n: n,
      es: n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
      en: '€' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  }

  function slugify(text) {
    var value = String(text || 'carta').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    value = value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return value || 'carta';
  }

  function byOrder(a, b) {
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  }

  function showNotice(title, message) {
    document.title = title;
    document.body.innerHTML =
      '<main style="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center;background:#fff;color:#1c1917;font-family:Inter,ui-sans-serif,system-ui,sans-serif">' +
      '<div><p style="margin:0;font-family:\'Cormorant Garamond\',Georgia,serif;font-size:56px;line-height:1">' + title + '</p>' +
      '<p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:#78716c">' + message + '</p>' +
      '<a href="/" style="display:inline-flex;margin-top:24px;border-radius:999px;background:#1c1917;color:#fff;padding:10px 20px;font-size:14px;font-weight:600;text-decoration:none">Volver a VisiWeb</a>' +
      '</div></main>';
    document.documentElement.classList.remove('vw-pending');
  }

  function applyPublication(status) {
    var active = status === 'activo';
    if (!active) {
      if (!document.getElementById('vw-draft-bar')) {
        var style = document.createElement('style');
        style.textContent =
          '#vw-draft-bar{position:fixed;inset:0 0 auto 0;z-index:90;background:#f59e0b;color:#000;font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:.75rem;line-height:1rem;font-weight:600;text-align:center;padding:.375rem .75rem}' +
          'html.vw-draft{--vw-draft:30px;--demo-bar:calc(41px + var(--vw-draft))}' +
          'html.vw-draft body{padding-top:var(--vw-draft)}' +
          'html.vw-draft .site-nav,html.vw-draft #menu-tabs-bar,html.vw-draft .demo-bar{top:var(--vw-draft)}';
        document.head.appendChild(style);
        var bar = document.createElement('div');
        bar.id = 'vw-draft-bar';
        bar.className = 'bg-amber-500 text-black text-xs font-semibold text-center py-1.5 px-3';
        bar.textContent = DRAFT_TEXT;
        document.body.insertBefore(bar, document.body.firstChild);
        document.documentElement.classList.add('vw-draft');
      }
      var meta = document.querySelector('meta[name="robots"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'robots');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', 'noindex');
      return;
    }
    document.querySelectorAll('meta[name="robots"]').forEach(function (node) {
      node.parentNode.removeChild(node);
    });
  }

  function applyRestaurant(row) {
    var D = window.VISIWEB_DEMO;
    var categories = (row.menu_categories || []).slice().sort(byOrder);
    var usedAnchors = {};
    var featured = [];
    var menu = categories.map(function (category, index) {
      var anchor = slugify(category.name);
      if (usedAnchors[anchor]) anchor = anchor + '-' + (index + 1);
      usedAnchors[anchor] = true;
      var items = (category.menu_items || []).slice().sort(byOrder).map(function (item) {
        var price = money(item.price);
        var id = String(item.id);
        if (item.is_featured) featured.push(id);
        return {
          id: id,
          name: both(item.name),
          desc: both(item.description || ''),
          price: price.es,
          priceEn: price.en,
          priceValue: price.n,
          allergens: Array.isArray(item.allergens) ? item.allergens : [],
          tags: [],
          image: item.image_url || null
        };
      });
      return {
        id: String(category.id),
        anchor: anchor,
        name: both(category.name),
        desc: both(category.subtitle || ''),
        items: items
      };
    });

    var phone = row.phone || '';
    var address = row.address || '';
    D.business = {
      name: row.name || '',
      type: both(row.tagline || ''),
      timezone: 'Europe/Madrid',
      priceRange: '€€',
      cuisine: ['Restaurant'],
      phone: phone,
      phoneDisplay: phone,
      whatsapp: String(row.whatsapp || '').replace(/\D/g, ''),
      instagram: row.instagram || '',
      addressLine: address,
      address: {
        street: both(address),
        postalCode: '',
        city: '',
        region: '',
        country: 'ES'
      },
      geo: null,
      mapQuery: ''
    };
    D.images = {
      hero: row.cover_image_url || null,
      heroAlt: both(row.name || ''),
      facade: row.cover_image_url || null,
      salon: null,
      salon2: null,
      terrace: null,
      bar: null
    };
    D.hours = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    D.scheduleText = row.schedule || '';
    D.menu = menu;
    D.featured = featured;
    D.reviews = { score: 0, count: 0, items: [] };
    D.local = {
      stats: [],
      rooms: row.cover_image_url ? [{
        id: 'portada',
        image: row.cover_image_url,
        title: both(row.name || ''),
        desc: both(row.tagline || row.description || '')
      }] : []
    };
    D.history = {
      title: both(row.name || ''),
      lead: both(row.description || row.tagline || ''),
      chapters: row.description ? [{
        year: both(''),
        title: both(row.tagline || row.name || ''),
        text: both(row.description)
      }] : []
    };
    D.gbp = {
      category: both(row.tagline || 'Restaurante'),
      attributes: []
    };
    D.whatsappText = {
      es: 'Hola, me gustaría reservar mesa en ' + (row.name || 'el restaurante') + '. Seríamos [nº de comensales] el [día] a las [hora]. Gracias.',
      en: 'Hello, I would like to book a table at ' + (row.name || 'the restaurant') + ' for [number of guests] on [day] at [time]. Thank you.'
    };
    ['es', 'en'].forEach(function (lng) {
      var strings = Object.assign({}, D.i18n[lng]);
      var title = row.name + (row.tagline ? ' · ' + row.tagline : '');
      strings.metaTitle = title;
      strings.metaDescription = row.description || row.tagline || row.name || '';
      strings.heroTitle = row.tagline || row.name || '';
      strings.heroSubtitle = row.description || row.tagline || '';
      strings.heroEyebrow = address;
      strings.heroKicker = row.tagline || row.name || '';
      strings.historyTitle = row.name || strings.historyTitle;
      strings.bookWaIntro = lng === 'en'
        ? 'Hello, this is {name}. I would like to book a table at ' + (row.name || 'the restaurant') + '.'
        : 'Hola, soy {name}. Quiero reservar mesa en ' + (row.name || 'el restaurante') + '.';
      strings.mapFrameTitle = row.name || strings.mapFrameTitle;
      D.i18n[lng] = strings;
    });
    var site = document.querySelector('meta[property="og:site_name"]');
    if (site) site.setAttribute('content', row.name || '');
    window.VISIWEB_RESTAURANT_SLUG = row.slug;
    window.VISIWEB_RESTAURANT_STATUS = row.status;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('script')); };
      document.body.appendChild(script);
    });
  }

  function ensureClient() {
    if (window.visiwebSupabase) return Promise.resolve(window.visiwebSupabase);
    if (window.supabase) {
      window.visiwebSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return Promise.resolve(window.visiwebSupabase);
    }
    return loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2').then(function () {
      window.visiwebSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return window.visiwebSupabase;
    });
  }

  var current = route();
  window.VisiwebRestaurant = {
    dynamic: current ? current.page : '',
    start: function (page) {
      if (!current || current.page !== page) return Promise.resolve(false);
      return ensureClient().then(function (client) {
        return client
          .from('restaurants')
          .select('id, slug, name, tagline, description, phone, whatsapp, address, schedule, instagram, cover_image_url, primary_color, plan_tier, status, menu_categories(id, name, subtitle, sort_order, menu_items(id, name, description, price, image_url, allergens, is_featured, sort_order))')
          .eq('slug', current.slug)
          .maybeSingle();
      }).then(function (result) {
        if (!result || result.error || !result.data) {
          showNotice('404', 'Este restaurante no está en VisiWeb.');
          return false;
        }
        applyRestaurant(result.data);
        applyPublication(result.data.status);
        var src = page === 'mesa' ? '/mesa/mesa.js?v=51' : '/demo-app.js?v=75';
        return loadScript(src).then(function () {
          document.documentElement.classList.remove('vw-pending');
          return true;
        });
      }).catch(function () {
        showNotice('404', 'No se ha podido abrir este restaurante.');
        return false;
      });
    }
  };
})();
