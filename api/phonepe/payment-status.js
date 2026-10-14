import { getPhonePeAccessToken, getPhonePeConfig, validateSameOrigin } from '../../lib/phonepe.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const config = getPhonePeConfig();
    if (!validateSameOrigin(req, config.appBaseUrl)) {
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    }
    const merchantOrderId = req.query?.merchantOrderId;
    if (typeof merchantOrderId !== 'string' || !/^NF-[0-9a-f-]{36}$/i.test(merchantOrderId)) {
      return res.status(400).json({ error: 'Invalid merchant order ID.' });
    }

    const accessToken = await getPhonePeAccessToken(config);
    const response = await fetch(
      `${config.paymentBaseUrl}/order/${encodeURIComponent(merchantOrderId)}/status`,
      {
        headers: { Authorization: `O-Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000)
      }
    );
    const result = await response.json();
    if (!response.ok || typeof result.state !== 'string') {
      console.error('PhonePe payment status request failed.', { status: response.status });
      return res.status(502).json({ error: 'PhonePe could not verify the payment yet.' });
    }

    return res.status(200).json({ state: result.state.toUpperCase() });
  } catch (error) {
    console.error('PhonePe payment verification failed.', error.message);
    return res.status(500).json({ error: 'Unable to verify PhonePe payment. Please try again.' });
  }
}
