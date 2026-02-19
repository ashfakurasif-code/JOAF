// A simple in-memory "database" to store poll results
const pollData = {
    'poll-1': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-2': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-3': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-4': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-5': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-6': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-7': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-8': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-9': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-10': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-11': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-12': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-13': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-14': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-15': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-16': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-17': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-18': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-19': { 'a': 0, 'b': 0, 'c': 0 },
    'poll-20': { 'a': 0, 'b': 0, 'c': 0 }
};

// Store IPs of users who have voted on a specific poll
// This is for demonstration. For a real app, use a persistent database.
const votedIps = {};

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const { action, pollId, option } = body;
        const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';

        if (action === 'getVotes') {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, votes: pollData })
            };
        }

        if (action === 'vote') {
            if (!pollId || !option) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, message: 'Invalid request. Poll ID and option are required.' })
                };
            }

            // Check if IP has already voted on this poll
            if (votedIps[pollId] && votedIps[pollId].has(ip)) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({ success: false, message: 'আপনি ইতিমধ্যেই এই পোলে ভোট দিয়েছেন।' })
                };
            }

            // Validate the poll ID and option
            if (!pollData[pollId] || !pollData[pollId].hasOwnProperty(option)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, message: 'Invalid poll or option.' })
                };
            }

            // Increment the vote count
            pollData[pollId][option]++;

            // Store the IP to prevent multiple votes from the same person
            if (!votedIps[pollId]) {
                votedIps[pollId] = new Set();
            }
            votedIps[pollId].add(ip);

            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: 'Vote submitted successfully.', votes: pollData[pollId] })
            };
        }

        return {
            statusCode: 400,
            body: JSON.stringify({ success: false, message: 'Invalid action specified.' })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'Internal Server Error' })
        };
    }
};