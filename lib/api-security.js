export function getAppBaseUrl(requestOrigin) {
  const localMode = process.env.CONTEXT === 'dev' || process.env.NETLIFY_LOCAL === 'true';
  const configuredUrl = process.env.APP_BASE_URL;
  let appUrl;
  if (localMode) {
    try {
      appUrl = new URL(requestOrigin || configuredUrl || 'http://localhost:8888');
      if (!['localhost', '127.0.0.1', '[::1]'].includes(appUrl.hostname)) {
        throw new Error('Local requests must use a loopback origin.');
      }
    } catch {
      throw new Error('A valid local storefront origin is required.');
    }
  } else if (configuredUrl) {
    try {
      appUrl = new URL(configuredUrl);
    } catch {
      throw new Error('APP_BASE_URL must be a valid absolute URL.');
    }
  } else {
    throw new Error('APP_BASE_URL must be a valid absolute URL.');
  }
  if (appUrl.protocol !== 'https:' && !(localMode && ['localhost', '127.0.0.1', '[::1]'].includes(appUrl.hostname))) {
    throw new Error('APP_BASE_URL must use HTTPS outside local development.');
  }
  return appUrl.origin;
}

export function validateSameOrigin(req, appBaseUrl) {
  const requestOrigin = req.headers.origin;
  if (typeof requestOrigin === 'string') {
    try {
      if (new URL(requestOrigin).origin !== appBaseUrl) return false;
    } catch {
      return false;
    }
  }
  return true;
}
