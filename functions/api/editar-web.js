export async function onRequestPost(context) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Falta GEMINI_API_KEY en Cloudflare' }), {
        status: 500,
        headers: cors
      });
    }

    const body = await context.request.json();
    const mensaje = typeof body.mensaje === 'string' ? body.mensaje.trim() : '';
    const jsonActual = body.jsonActual;

    if (!mensaje || !jsonActual || typeof jsonActual !== 'object') {
      return new Response(JSON.stringify({ error: 'Se requieren mensaje y jsonActual' }), {
        status: 400,
        headers: cors
      });
    }

    const systemPrompt =
      'Eres un asistente que edita la configuración JSON de una web de restaurante. ' +
      'Recibirás el JSON actual y una instrucción del usuario. ' +
      'Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin explicaciones, sin bloques ```) con esta forma exacta:\n' +
      '{\n' +
      '  "cambios": { ...solo las claves que el usuario ha pedido modificar... },\n' +
      '  "respuestaBreve": "frase corta en español"\n' +
      '}\n' +
      'Reglas:\n' +
      '- "cambios" contiene SOLO las claves exactas a modificar (p. ej. name, tagline, phone, whatsapp, address, schedule, instagram, accent/primary_color, design, daily_menu, categories, eventos_activo).\n' +
      '- NO devuelvas el JSON completo del restaurante.\n' +
      '- Si el usuario solo saluda, pregunta o no pide un cambio, "cambios" debe ser {} y responde de forma breve y amable.\n' +
      '- Campos editables: nombre, descripción, tagline, colores (accent/primary_color), teléfono, whatsapp, dirección, horario, Instagram, platos/categorías, Eventos (design.eventos, eventos_activo / labels.vw_events).';

    const userPrompt =
      'JSON actual:\n' +
      JSON.stringify(jsonActual) +
      '\n\nInstrucción del usuario:\n' +
      mensaje;

    const geminiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' +
      encodeURIComponent(apiKey);

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });

    const geminiData = await geminiRes.json().catch(function () {
      return null;
    });

    if (!geminiRes.ok) {
      const googleMsg =
        geminiData && geminiData.error && geminiData.error.message
          ? geminiData.error.message
          : 'Error de Gemini';
      return new Response(JSON.stringify({ error: googleMsg }), {
        status: geminiRes.status,
        headers: cors
      });
    }

    let raw =
      (((geminiData || {}).candidates || [])[0] || {}).content || {};
    raw = ((raw.parts || [])[0] || {}).text || '';

    let cleaned = String(raw).trim();
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Respuesta de Gemini no es JSON válido', raw: cleaned.slice(0, 400) }), {
        status: 502,
        headers: cors
      });
    }

    let cambios =
      parsed && parsed.cambios && typeof parsed.cambios === 'object' && !Array.isArray(parsed.cambios)
        ? parsed.cambios
        : null;
    let respuestaBreve =
      typeof parsed.respuestaBreve === 'string' && parsed.respuestaBreve.trim()
        ? parsed.respuestaBreve.trim()
        : 'Listo.';

    if (!cambios) {
      return new Response(JSON.stringify({ error: 'cambios inválido' }), {
        status: 502,
        headers: cors
      });
    }

    return new Response(
      JSON.stringify({ cambios: cambios, respuestaBreve: respuestaBreve }),
      { status: 200, headers: cors }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error && error.message) || 'Error interno' }),
      { status: 500, headers: cors }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
