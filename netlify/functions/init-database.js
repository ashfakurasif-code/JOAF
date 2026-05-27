const { initDatabase } = require('./aw-utils');

exports.handler = async () => {
  try {
    const result = await initDatabase();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('initDatabase bootstrap failure', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error.message,
      }),
    };
  }
};
