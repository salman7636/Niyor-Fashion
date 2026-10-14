export function getAppBaseUrl() {
  let appUrl;
  try {
    appUrl = new URL(process.env.APP_BASE_URL);
  } catch {
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
