export function getAppBaseUrl(requestOrigin) {
  const configuredUrl = process.env.APP_BASE_URL;
  let appUrl;
  if (configuredUrl) {
    try {
      appUrl = new URL(configuredUrl);
    } catch {
      throw new Error('APP_BASE_URL must be a valid absolute URL.');
    }
  } else if (process.env.CONTEXT === 'dev' || process.env.NETLIFY_LOCAL === 'true') {
    try {
      const localOrigin = new URL(requestOrigin || 'http://localhost:8888');
      if (!['localhost', '127.0.0.1', '[::1]'].includes(localOrigin.hostname)) {
        throw new Error('Local requests must use a loopback origin.');
      }
      appUrl = localOrigin;
    } catch {
      throw new Error('A valid local storefront origin is required when APP_BASE_URL is not configured.');
    }
  } else {
    throw new Error('APP_BASE_URL must be a valid absolute URL.');
  }
  if (appUrl.protocol !== 'https:' && appUrl.hostname !== 'localhost' && appUrl.hostname !== '127.0.0.1') {
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
