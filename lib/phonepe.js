const SANDBOX_BASE_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const PRODUCTION_BASE_URL = 'https://api.phonepe.com/apis';
let cachedToken;
let cachedTokenExpiry = 0;
let cachedTokenKey;

export function getPhonePeConfig() {
  const environment = (process.env.PHONEPE_ENV || 'SANDBOX').toUpperCase();
  const sandbox = environment === 'SANDBOX';
  const appBaseUrl = process.env.APP_BASE_URL;
  const config = {
    clientId: process.env.PHONEPE_CLIENT_ID,
    clientSecret: process.env.PHONEPE_CLIENT_SECRET,
    clientVersion: process.env.PHONEPE_CLIENT_VERSION,
    environment,
    appBaseUrl,
    oauthUrl: sandbox
      ? `${SANDBOX_BASE_URL}/v1/oauth/token`
      : `${PRODUCTION_BASE_URL}/identity-manager/v1/oauth/token`,
    paymentBaseUrl: sandbox
      ? `${SANDBOX_BASE_URL}/checkout/v2`
      : `${PRODUCTION_BASE_URL}/pg/checkout/v2`
  };

  if (!sandbox && environment !== 'PRODUCTION') {
    throw new Error('PHONEPE_ENV must be SANDBOX or PRODUCTION.');
  }
  if (!config.clientId || !config.clientSecret || !config.clientVersion || !appBaseUrl) {
    throw new Error('PhonePe server environment variables are not configured.');
  }

  let appUrl;
  try {
    appUrl = new URL(appBaseUrl);
  } catch {
    throw new Error('APP_BASE_URL must be a valid absolute URL.');
  }
  if (appUrl.protocol !== 'https:' && appUrl.hostname !== 'localhost' && appUrl.hostname !== '127.0.0.1') {
    throw new Error('APP_BASE_URL must use HTTPS outside local development.');
  }

  return { ...config, appBaseUrl: appUrl.origin };
}

export async function getPhonePeAccessToken(config) {
  const tokenKey = `${config.oauthUrl}:${config.clientId}`;
  if (cachedToken && cachedTokenKey === tokenKey && cachedTokenExpiry > Date.now() + 30000) return cachedToken;

  const response = await fetch(config.oauthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_version: config.clientVersion,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials'
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`PhonePe OAuth request failed with HTTP ${response.status}.`);

  const tokenResponse = await response.json();
  if (typeof tokenResponse.access_token !== 'string' || !tokenResponse.access_token) {
    throw new Error('PhonePe OAuth response did not contain an access token.');
  }
  const expiresAt = Number(tokenResponse.expires_at);
  if (Number.isFinite(expiresAt) && expiresAt > 0) {
    cachedTokenExpiry = expiresAt < 1000000000000 ? expiresAt * 1000 : expiresAt;
    cachedToken = tokenResponse.access_token;
    cachedTokenKey = tokenKey;
  }
  return tokenResponse.access_token;
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
