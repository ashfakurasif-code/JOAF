// Appwrite Function: vote
// HTTP trigger — POST only
// Handles poll voting (frontend manages display via localStorage)

export default async ({ req, res, log, error }) => {
  const headers = { 'Access-Control-Allow-Origin': 'https://www.julyforum.com' };

  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  try {
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.json({ success: false, message: 'Invalid JSON' }, 400); }

    const { action, pollId, option } = body;

    if (action === 'getVotes') {
      return res.json({ success: true, message: 'Votes are tracked client-side via localStorage', votes: {} });
    }

    if (action === 'vote') {
      if (!pollId || !option) {
        return res.json({ success: false, message: 'pollId এবং option দরকার' }, 400);
      }
      log(`Vote recorded: poll=${pollId} option=${option}`);
      return res.json({ success: true, message: 'ভোট গৃহীত হয়েছে' });
    }

    return res.json({ success: false, message: 'Invalid action' }, 400);
  } catch (err) {
    error('vote error: ' + err.message);
    return res.json({ success: false, message: 'Server error' }, 500);
  }
};
