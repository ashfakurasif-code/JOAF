// Appwrite Function: github-upload
// HTTP trigger — POST only (admin only)
// Commits file uploads from admin panel to GitHub

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  const adminKey = req.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.json({ error: 'Unauthorized' }, 401);
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.json({ error: 'Invalid JSON' }, 400); }

  const { filename, content, folder, message } = body;
  if (!filename || !content) return res.json({ error: 'filename and content required' }, 400);

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO   = 'ashfakurasif-code/JOAF';
  const BRANCH = 'main';

  const folderMap = { img: 'img', members: 'members', press: 'img', video: 'video', docs: 'docs' };
  const targetFolder = folderMap[folder] || folder || 'img';
  const filePath = `${targetFolder}/${filename}`;

  // Check if file exists (to get SHA for update)
  let sha = null;
  try {
    const checkRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' },
    });
    if (checkRes.ok) { const existing = await checkRes.json(); sha = existing.sha; }
  } catch (_) {}

  const uploadBody = { message: message || `Admin upload: ${filename}`, content, branch: BRANCH };
  if (sha) uploadBody.sha = sha;

  try {
    const uploadRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(uploadBody),
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) return res.json({ error: uploadData.message || 'GitHub upload failed' }, 500);

    const githubUrl = uploadData.content?.download_url || `/${filePath}`;
    log(`github-upload: ${filename} → ${filePath}`);
    return res.json({ success: true, path: filePath, url: `/${filePath}`, githubUrl, sha: uploadData.content?.sha, message: `✅ ${filename} uploaded to ${filePath}` });
  } catch (err) {
    error('github-upload error: ' + err.message);
    return res.json({ error: err.message }, 500);
  }
};
