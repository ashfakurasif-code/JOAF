// Appwrite Function: fb-config
// HTTP trigger — GET only
// Serves Facebook App ID (no sensitive tokens exposed)

export default async ({ req, res, log, error }) => {
  if (req.method !== 'GET') return res.json({ error: 'Method not allowed' }, 405);

  const fbAppId = process.env.FB_APP_ID;
  if (!fbAppId) return res.json({ error: 'Facebook configuration not available' }, 500);

  return res.json({ appId: fbAppId, apiVersion: 'v22.0' });
};
