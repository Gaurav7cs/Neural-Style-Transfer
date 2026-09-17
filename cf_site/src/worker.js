const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob: https://images.unsplash.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

function withSecurityHeaders(response) {
  const out = new Response(response.body, response);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    out.headers.set(key, value);
  }
  return out;
}

async function handleStylize(request, env) {
  const origin = env.BACKEND_URL;
  if (!origin) {
    return new Response(
      JSON.stringify({ error: 'BACKEND_URL environment variable is not configured' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    const form = await request.formData();
    const content = form.get('content');
    const style = form.get('style');

    if (!content || !style) {
      return new Response(
        JSON.stringify({ error: 'content and style images are required' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const upstream = new FormData();
    upstream.append('content', content, content.name || 'content.png');
    upstream.append('style', style, style.name || 'style.png');
    upstream.append('alpha', form.get('alpha') || '1.0');

    const response = await fetch(origin + '/api/stylize', {
      method: 'POST',
      body: upstream,
    });

    if (!response.ok) {
      const detail = await response.text();
      return new Response(
        JSON.stringify({ error: 'backend error: ' + response.status, detail: detail.slice(0, 500) }),
        { status: response.status, headers: { 'content-type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'content-disposition': 'attachment; filename="stylized.png"',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'proxy error: ' + err.message }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/stylize' && request.method === 'POST') {
      return withSecurityHeaders(await handleStylize(request, env));
    }

    const asset = await env.ASSETS.fetch(request);
    return withSecurityHeaders(asset);
  },
};