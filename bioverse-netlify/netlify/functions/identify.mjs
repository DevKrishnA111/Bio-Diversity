const headers = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const reply = (statusCode, payload) => ({ statusCode, headers, body: JSON.stringify(payload) });

export const config = { rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowLimit: 8, windowSize: 60 } };

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed. Use POST.' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return reply(503, { error: 'AI identification is not configured yet. Add GEMINI_API_KEY to your Netlify environment variables and redeploy.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return reply(400, { error: 'Request body must be valid JSON.' }); }

  const match = typeof body.image === 'string' && body.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return reply(400, { error: 'Upload a JPEG, PNG or WEBP image.' });
  const [, mimeType, base64] = match;
  if (base64.length > 5_600_000) return reply(413, { error: 'Image is too large. Use an image under 4 MB.' });

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const prompt = `You are assisting a biodiversity learning platform. Examine the supplied wildlife or plant photograph and return JSON only. Never invent certainty. If the image is unclear, say so. Use this schema: {"commonName":"string or null","scientificName":"string or null","confidence":number from 0 to 100 or null,"reasoning":"short explanation based only on visible features","notes":"what a human should verify","candidates":[{"name":"common name","scientificName":"scientific name or null"}]}. Provide at most 4 candidate taxa. Do not infer exact location. Do not recommend approaching, touching, collecting or disturbing any organism. If no organism is visible, return null names and explain why.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 900 },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `Vision provider returned ${response.status}`;
      return reply(response.status === 429 ? 429 : 502, { error: message });
    }
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
    let result;
    try { result = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
    catch { return reply(502, { error: 'The AI provider returned an unreadable response. Please try a clearer image.' }); }
    return reply(200, result);
  } catch (error) {
    return reply(502, { error: `Unable to reach the AI provider: ${error.message}` });
  }
}
