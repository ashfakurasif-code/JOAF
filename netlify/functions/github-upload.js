// netlify/functions/github-upload.js
// Admin panel থেকে file upload করলে GitHub এ commit হবে

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  // Admin key verify
  const adminKey = event.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const { filename, content, folder, message } = JSON.parse(event.body);
    // content is base64 encoded file data

    if (!filename || !content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'filename and content required' }) };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = 'ashfakurasif-code/JOAF';
    const BRANCH = 'main';

    // Determine path based on folder type
    const folderMap = {
      img: 'img',
      members: 'members',
      press: 'img',
      video: 'video',
      docs: 'docs',
    };
    const targetFolder = folderMap[folder] || folder || 'img';
    const filePath = `${targetFolder}/${filename}`;

    // Check if file already exists (to get SHA for update)
    let sha = null;
    try {
      const checkRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }
    } catch(e) {}

    // Upload to GitHub
    const body = {
      message: message || `Admin upload: ${filename}`,
      content: content, // base64
      branch: BRANCH,
    };
    if (sha) body.sha = sha; // update existing file

    const uploadRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: uploadData.message || 'GitHub upload failed' }) };
    }

    // Return the public URL
    const publicUrl = `/${filePath}`;
    const githubUrl = uploadData.content?.download_url || publicUrl;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        path: filePath,
        url: publicUrl,
        githubUrl,
        sha: uploadData.content?.sha,
        message: `✅ ${filename} successfully uploaded to ${filePath}`,
      }),
    };

  } catch (err) {
    console.error('github-upload error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
