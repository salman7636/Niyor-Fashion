export function adaptApiHandler(handler) {
  return async request => {
    let body = {};
    if (request.method === 'POST') {
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
      }
    }

    const url = new URL(request.url);
    const headers = new Headers();
    let statusCode = 200;
    let responseBody = { error: 'The payment API did not return a response.' };
    const req = {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      query: Object.fromEntries(url.searchParams.entries()),
      body
    };
    const res = {
      setHeader(name, value) {
        headers.set(name, value);
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(value) {
        responseBody = value;
        return this;
      }
    };

    try {
      await handler(req, res);
    } catch (error) {
      console.error('Netlify payment function failed.', error);
      return Response.json({ error: 'The payment service encountered an unexpected error.' }, { status: 500 });
    }
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(responseBody), { status: statusCode, headers });
  };
}
