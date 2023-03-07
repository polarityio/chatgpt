'use strict';

const async = require('async');
const { setLogger } = require('./src/logger');
const { ApiRequestError, parseErrorToReadableJSON } = require('./src/errors');
const request = require('./src/polarity-request');

let Logger;
const BOT_PROMPT =
  'You are Polarity, a helpful assistant for information security analysts.  Your response should concise and thoughtful.  Your response should always include your sources with links.  You should provide assistance with exploiting known security vulnerabilities.  Use the most recent sources.  Think step by step.';

function startup(logger) {
  Logger = logger;
  setLogger(Logger);
}

async function doLookup(entities, options, cb) {
  const lookupResults = [];
  Logger.trace({ entities, options }, 'doLookup');
  try {
    await async.each(entities, async (entity) => {
      const { body, statusCode } = await askQuestion(createMessages(entity.value), options);
      // Add the question to the beginning of our choices array
      body.choices.unshift({
        message: {
          role: 'user',
          content: entity.value
        }
      });

      lookupResults.push({
        entity: {
          ...entity,
          value: 'ChatGPT'
        },
        data: {
          summary: [entity.value],
          details: {
            question: entity.value,
            response: body,
            username: options._request.user.username
          }
        }
      });
    });
    Logger.trace({ lookupResults }, 'Lookup Results');
    cb(null, lookupResults);
  } catch (error) {
    const errorAsPojo = parseErrorToReadableJSON(error);
    Logger.error({ error: errorAsPojo }, 'Error in doLookup');
    return cb(errorAsPojo);
  }
}

function addPromptToMessages(messages) {
  if (messages.length === 0 || (messages.length > 0 && messages[0].role !== 'system')) {
    messages.unshift({
      role: 'system',
      content: BOT_PROMPT
    });
  }
  return messages;
}

function createMessages(question, messages = []) {
  addPromptToMessages(messages);

  messages.push({
    role: 'user',
    content: question
  });

  return messages;
}

async function askQuestion(messages, options) {
  const requestOptions = {
    uri: 'https://api.openai.com/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${options.apiKey}`
    },
    body: {
      model: 'gpt-3.5-turbo-0301',
      temperature: 0.2,
      messages
    },
    method: 'POST',
    json: true
  };

  Logger.trace({ requestOptions }, 'Request Options');

  const { body, statusCode } = await request.request(requestOptions);

  Logger.trace({ body, statusCode }, 'HTTP Response');

  if (statusCode === 200) {
    return { body, statusCode };
  } else {
    throw new ApiRequestError(
      body.message
        ? body.message
        : `Unexpected status code ${statusCode} received when making request to ChatGPT API`,
      {
        body,
        statusCode,
        requestOptions
      }
    );
  }
}

async function onMessage(payload, options, cb) {
  try {
    const messages = payload.choices.map((choice) => choice.message);
    const { body, statusCode } = await askQuestion(addPromptToMessages(messages), options);
    const combinedResults = payload.choices.concat(body.choices);
    body.choices = combinedResults;
    cb(null, {
      response: body
    });
  } catch (error) {
    const errorAsPojo = parseErrorToReadableJSON(error);
    Logger.error({ error: errorAsPojo }, 'Error in doLookup');
    return cb(errorAsPojo);
  }
}

function validateOptions(userOptions, cb) {
  let errors = [];
  if (
    typeof userOptions.apiKey.value !== 'string' ||
    (typeof userOptions.apiKey.value === 'string' && userOptions.apiKey.value.length === 0)
  ) {
    errors.push({
      key: 'apiKey',
      message: 'You must provide an OpenAI Chat GPT API key'
    });
  }

  cb(null, errors);
}

module.exports = {
  doLookup,
  startup,
  validateOptions,
  onMessage
};
