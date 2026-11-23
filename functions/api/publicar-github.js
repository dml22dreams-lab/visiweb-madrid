const ADMIN_EMAIL = 'diego@visiwebmadrid.com';
const DEFAULT_OWNER = 'visiwebmadrid';
const DEFAULT_REPO = 'visiweb-clientes';
const TEMPLATE_PATH = '_plantilla-base';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: corsHeaders()
  });
}

function slugOk(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || ''));
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  let binary = '';
  bytes.forEach(function (b) {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

async function githubFetch(token, path, init) {
  const res = await fetch('https://api.github.com' + path, Object.assign({}, init || {}, {
    headers: Object.assign(
      {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'visiweb-madrid-panel'
      },
      (init && init.headers) || {}
    )
  }));
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { raw: text };
  }
  return { res: res, data: data };
}

async function verifyAdmin(context, authHeader) {
  const supabaseUrl = context.env.SUPABASE_URL || 'https://atcgrdfzyboqvdvtfymz.supabase.co';
  const anon =
    context.env.SUPABASE_ANON_KEY ||
    context.env.SUPABASE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Y2dyZGZ6eWJvcXZkdnRmeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTc1NTksImV4cCI6MjEwNzU3MzU1OX0.LKMVrtcqd_suMUeyWeedPs5yuzTYLVbz7Lel9A0iKY8';
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, error: 'Falta autorización' };
  const res = await fetch(supabaseUrl + '/auth/v1/user', {
    headers: {
      Authorization: 'Bearer ' + token,
      apikey: anon
    }
  });
  const user = await res.json().catch(function () {
    return null;
  });
  if (!res.ok || !user || !user.email) return { ok: false, error: 'Sesión inválida' };
  if (String(user.email).toLowerCase() !== ADMIN_EMAIL) {
    return { ok: false, error: 'Solo el administrador puede publicar' };
  }
  return { ok: true, user: user };
}

async function listTemplateFiles(token, owner, repo, path, out) {
  const result = await githubFetch(
    token,
    '/repos/' + owner + '/' + repo + '/contents/' + encodeURI(path) + '?ref=main'
  );
  if (!result.res.ok) {
    throw new Error(
      (result.data && result.data.message) ||
        'No se pudo leer ' + path + ' en ' + owner + '/' + repo
    );
  }
  const entries = Array.isArray(result.data) ? result.data : [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.type === 'dir') {
      await listTemplateFiles(token, owner, repo, entry.path, out);
    } else if (entry.type === 'file') {
      out.push(entry);
    }
  }
}

async function getFileContent(token, owner, repo, path) {
  const result = await githubFetch(
    token,
    '/repos/' + owner + '/' + repo + '/contents/' + encodeURI(path) + '?ref=main'
  );
  if (!result.res.ok) {
    throw new Error((result.data && result.data.message) || 'No se pudo leer ' + path);
  }
  if (!result.data || result.data.type !== 'file' || !result.data.content) {
    throw new Error('Contenido inválido en ' + path);
  }
  const raw = String(result.data.content).replace(/\n/g, '');
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return {
    bytes: bytes,
    text: new TextDecoder().decode(bytes),
    sha: result.data.sha || null,
    encoding: 'base64'
  };
}

async function putFile(token, owner, repo, path, contentBase64, message, sha) {
  const body = {
    message: message,
    content: contentBase64,
    branch: 'main'
  };
  if (sha) body.sha = sha;
  const result = await githubFetch(token, '/repos/' + owner + '/' + repo + '/contents/' + encodeURI(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!result.res.ok) {
    throw new Error((result.data && result.data.message) || 'Error al subir ' + path);
  }
  return result.data;
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach(function (b) {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export async function onRequestPost(context) {
  try {
    const token = context.env.GITHUB_TOKEN;
    if (!token) return json(500, { error: 'Falta GITHUB_TOKEN en Cloudflare' });

    const auth = await verifyAdmin(context, context.request.headers.get('Authorization'));
    if (!auth.ok) return json(403, { error: auth.error });

    const body = await context.request.json();
    const slug = String((body && body.slug) || '')
      .trim()
      .toLowerCase();
    const dataJs = body && body.dataJs;
    if (!slugOk(slug)) return json(400, { error: 'Slug inválido' });
    if (typeof dataJs !== 'string' || !dataJs.trim()) {
      return json(400, { error: 'Falta dataJs' });
    }

    const owner = context.env.GITHUB_OWNER || DEFAULT_OWNER;
    const repo = context.env.GITHUB_CLIENTES_REPO || DEFAULT_REPO;
    const templateOwner = context.env.GITHUB_TEMPLATE_OWNER || owner;
    const templateRepo = context.env.GITHUB_TEMPLATE_REPO || repo;
    const templatePath = context.env.GITHUB_TEMPLATE_PATH || TEMPLATE_PATH;

    const files = [];
    try {
      await listTemplateFiles(token, templateOwner, templateRepo, templatePath, files);
    } catch (error) {
      // Si no hay plantilla, al menos subimos data.js
      files.length = 0;
    }

    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relative = String(file.path || '').replace(new RegExp('^' + templatePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?'), '');
      if (!relative || relative === 'data.js') continue;
      const content = await getFileContent(token, templateOwner, templateRepo, file.path);
      const targetPath = slug + '/' + relative;
      let sha = null;
      const existing = await githubFetch(
        token,
        '/repos/' + owner + '/' + repo + '/contents/' + encodeURI(targetPath) + '?ref=main'
      );
      if (existing.res.ok && existing.data && existing.data.sha) sha = existing.data.sha;
      await putFile(
        token,
        owner,
        repo,
        targetPath,
        bytesToBase64(content.bytes),
        'Publish ' + slug + ': sync ' + relative,
        sha
      );
      uploaded.push(targetPath);
    }

    const dataPath = slug + '/data.js';
    let dataSha = null;
    const existingData = await githubFetch(
      token,
      '/repos/' + owner + '/' + repo + '/contents/' + encodeURI(dataPath) + '?ref=main'
    );
    if (existingData.res.ok && existingData.data && existingData.data.sha) {
      dataSha = existingData.data.sha;
    }
    await putFile(
      token,
      owner,
      repo,
      dataPath,
      toBase64(dataJs),
      'Publish ' + slug + ': update data.js',
      dataSha
    );
    uploaded.push(dataPath);

    return json(200, {
      ok: true,
      slug: slug,
      repo: owner + '/' + repo,
      files: uploaded
    });
  } catch (error) {
    return json(500, { error: (error && error.message) || 'Error interno' });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
