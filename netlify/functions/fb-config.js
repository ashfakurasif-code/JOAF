/**
 * Netlify Function: fb-config
 * Serves Facebook App configuration (App ID only)
 * Does not expose access tokens or sensitive credentials
 */

exports.handler = async (event, context) => {
  // Allow only GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // App ID is public information (used for OAuth flow)
    // Should be configured as an environment variable
    const fbAppId = process.env.FB_APP_ID || '821514351035673';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify({
        appId: fbAppId,
        apiVersion: 'v22.0'
      })
    };
  } catch (error) {
    console.error('Error serving FB config:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
