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
      'Eres un asistente que edita la configuración JSON de la web de un restaurante. ' +
      'Recibirás el JSON actual y una instrucción del usuario. ' +
      'Debes devolver ÚNICAMENTE un objeto JSON válido (sin markdown, sin explicaciones, sin bloques ```) con esta forma exacta:\n' +
      '{\n' +
      '  "jsonActualizado": { ...el mismo esquema que jsonActual, con los cambios aplicados... },\n' +
      '  "respuestaBreve": "frase corta en español confirmando el cambio"\n' +
      '}\n' +
      'Solo modifica lo que pida el usuario: nombre, descripción, tagline, colores (accent/primary_color), ' +
      'teléfono, whatsapp, dirección, horario, Instagram, platos/categorías de la carta, ' +
      'horarios o textos de Eventos (design.eventos, eventos_activo / labels.vw_events). ' +
      'Conserva el resto de campos intactos.';

    const userPrompt =
      'JSON actual:\n' +
      JSON.stringify(jsonActual) +
      '\n\nInstrucción del usuario:\n' +
      mensaje;

    const geminiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
      encodeURIComponent(apiKey);

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
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

    let jsonActualizado = parsed.jsonActualizado || parsed;
    let respuestaBreve =
      typeof parsed.respuestaBreve === 'string' && parsed.respuestaBreve.trim()
        ? parsed.respuestaBreve.trim()
        : 'Cambios aplicados en la vista previa.';

    if (!jsonActualizado || typeof jsonActualizado !== 'object' || Array.isArray(jsonActualizado)) {
      return new Response(JSON.stringify({ error: 'jsonActualizado inválido' }), {
        status: 502,
        headers: cors
      });
    }

    return new Response(
      JSON.stringify({ jsonActualizado: jsonActualizado, respuestaBreve: respuestaBreve }),
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
