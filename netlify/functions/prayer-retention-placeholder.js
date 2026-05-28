// Placeholder for Phase 2 "Namaz-time Retention Engine"
// This function intentionally avoids hardcoded secrets and only validates JOAF_CONFIG_* env placeholders.

const REQUIRED = [
  'JOAF_CONFIG_PRAYER_LAT',
  'JOAF_CONFIG_PRAYER_LNG',
  'JOAF_CONFIG_PRAYER_TZ',
];

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: false,
        placeholder: true,
        message: 'Set JOAF_CONFIG_* env vars before enabling prayer scheduling.',
        missing,
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      placeholder: true,
      message: 'Config validated. Implement prayer-time computation + send-notification trigger here.',
      config: {
        lat: process.env.JOAF_CONFIG_PRAYER_LAT,
        lng: process.env.JOAF_CONFIG_PRAYER_LNG,
        tz: process.env.JOAF_CONFIG_PRAYER_TZ,
      },
    }),
  };
};
