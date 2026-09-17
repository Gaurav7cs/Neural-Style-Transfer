export async function onRequestPost(context) {
  const origin = context.env.BACKEND_URL;
  if (!origin) {
    return new Response(
      JSON.stringify({ error: 'BACKEND_URL environment variable is not configured' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    const form = await context.request.formData();
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