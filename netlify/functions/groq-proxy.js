// groq-proxy.js — Gemini primary + Groq fallback (stable queue version)

let lastGeminiCall = 0;
let geminiCooldownUntil = 0;

const delay = (ms) =>
  new Promise(r => setTimeout(r, ms));

exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const GEMINI_KEY =
    process.env.GEMINI_API_KEY;

  const GROQ_KEY =
    process.env.GROQ_API_KEY;

  let body;

  try {

    body = JSON.parse(
      event.body || '{}'
    );

  } catch {

    return {
      statusCode: 400,
      body: 'Invalid JSON'
    };
  }

  // ─────────────────────────────────────────────
  // GEMINI PRIMARY
  // ─────────────────────────────────────────────

  let useGroq = false;

  if (GEMINI_KEY) {

    try {

      // cooldown check
      if (Date.now() < geminiCooldownUntil) {

        console.log(
          'Gemini cooldown active → Groq fallback'
        );

        useGroq = true;
      }

      if (!useGroq) {

        // strict sequential queue
        const waitNeeded =
          5000 - (
            Date.now() - lastGeminiCall
          );

        if (waitNeeded > 0) {

          console.log(
            'Queue wait:',
            waitNeeded
          );

          await delay(waitNeeded);
        }

        lastGeminiCall = Date.now();

        // OpenAI → Gemini transform
        const geminiContents =
          body.messages
            .filter(
              m => m.role !== 'system'
            )
            .map(msg => {

              const parts =
                Array.isArray(msg.content)

                  ? msg.content.map(part => {

                      if (
                        part.type === 'text'
                      ) {

                        return {
                          text: part.text
                        };
                      }

                      if (
                        part.type === 'image_url'
                      ) {

                        const url =
                          part.image_url?.url || '';

                        // base64 image
                        if (
                          url.startsWith('data:')
                        ) {

                          const [
                            meta,
                            data
                          ] = url.split(',');

                          const mimeType =
                            meta
                              .replace(
                                'data:',
                                ''
                              )
                              .replace(
                                ';base64',
                                ''
                              );

                          return {
                            inlineData: {
                              mimeType,
                              data
                            }
                          };
                        }

                        return {
                          text:
                            `[image: ${url}]`
                        };
                      }

                      return {
                        text:
                          JSON.stringify(part)
                      };

                    })

                  : [{
                      text:
                        String(
                          msg.content || ''
                        )
                    }];

              return {

                role:
                  msg.role === 'assistant'
                    ? 'model'
                    : 'user',

                parts
              };
            });

        // safer system handling
        const systemMsg =
          body.messages.find(
            m => m.role === 'system'
          );

        if (
          systemMsg &&
          geminiContents[0]
        ) {

          const systemText =

            typeof systemMsg.content === 'string'

              ? systemMsg.content

              : JSON.stringify(
                  systemMsg.content
                );

          geminiContents[0]
            .parts
            .unshift({

              text:
                '[SYSTEM INSTRUCTION]\n' +
                systemText +
                '\n\n'
            });
        }

        const geminiModel =
          'gemini-2.0-flash';

        const geminiUrl =
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_KEY}`;

        const gRes = await fetch(
          geminiUrl,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({

              contents:
                geminiContents,

              generationConfig: {

                maxOutputTokens:
                  body.max_tokens || 1000,

                temperature:
                  body.temperature || 0.7
              }
            })
          }
        );

        // ─────────────────────────────────────
        // 429 → INSTANT GROQ FALLBACK
        // ─────────────────────────────────────

        if (gRes.status === 429) {

          console.log(
            'Gemini 429 → Groq fallback'
          );

          // 60 sec cooldown
          geminiCooldownUntil =
            Date.now() + 60000;

          useGroq = true;

        } else if (gRes.ok) {

          const gData =
            await gRes.json();

          // merge all Gemini parts
          const text =

            gData.candidates
              ?.flatMap(
                c =>
                  c.content?.parts || []
              )
              ?.map(
                p => p.text || ''
              )
              ?.join('\n')

            || '';

          // OpenAI-compatible wrapper
          const openaiCompat = {

            choices: [
              {
                message: {
                  role: 'assistant',
                  content: text
                },

                finish_reason:
                  'stop',

                index: 0
              }
            ],

            model:
              geminiModel,

            usage:
              gData.usageMetadata || {}
          };

          return {

            statusCode: 200,

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(
                openaiCompat
              )
          };

        } else {

          console.log(
            'Gemini failed:',
            gRes.status
          );

          useGroq = true;
        }
      }

    } catch (e) {

      console.log(
        'Gemini error:',
        e.message
      );

      useGroq = true;
    }
  }

  // ─────────────────────────────────────────────
  // GROQ FALLBACK
  // ─────────────────────────────────────────────

  if (!GROQ_KEY) {

    return {

      statusCode: 500,

      body:
        'No AI key configured'
    };
  }

  try {

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',

        headers: {

          'Content-Type':
            'application/json',

          Authorization:
            'Bearer ' + GROQ_KEY
        },

        body:
          JSON.stringify(body)
      }
    );

    const data =
      await response.json();

    return {

      statusCode:
        response.status,

      headers: {
        'Content-Type':
          'application/json'
      },

      body:
        JSON.stringify(data)
    };

  } catch (e) {

    return {

      statusCode: 500,

      headers: {
        'Content-Type':
          'application/json'
      },

      body:
        JSON.stringify({
          error: e.message
        })
    };
  }
};