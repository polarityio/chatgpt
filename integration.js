'use strict';

const async = require('async');
const { setLogger } = require('./src/logger');
const { ApiRequestError, parseErrorToReadableJSON } = require('./src/errors');
const request = require('./src/polarity-request');

let Logger;
const disclaimerCache = {};
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
      if (shouldShowDisclaimer(options)) {
        disclaimerCache[options._request.user.id] = new Date();
        lookupResults.push({
          entity: {
            ...entity,
            value: 'ChatGPT'
          },
          data: {
            summary: [entity.value],
            details: {
              question: entity.value,
              username: options._request.user.username,
              showDisclaimer: options.showDisclaimer,
              disclaimer: options.disclaimer,
              response: {
                choices: [
                  {
                    message: {
                      role: 'user',
                      content: entity.value
                    }
                  }
                ]
              }
            }
          }
        });
      } else {
        maybeLogSearch(entity.value, options);
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
      }
    });
    Logger.trace({ lookupResults }, 'Lookup Results');
    cb(null, lookupResults);
  } catch (error) {
    const errorAsPojo = parseErrorToReadableJSON(error);
    Logger.error({ error: errorAsPojo }, 'Error in doLookup');
    return cb(errorAsPojo);
  }
}

function shouldShowDisclaimer(options) {
  if (!options.showDisclaimer) {
    return false;
  }

  const { _request } = options;
  const { user } = _request;
  const { id } = user;

  if (options.disclaimerInterval.value === 'all' || !disclaimerCache[id]) {
    return true;
  }

  const cachedDisclaimerTime = disclaimerCache[id];

  const days = getTimeDifferenceInDaysFromNow(cachedDisclaimerTime);
  return days >= options.disclaimerInterval;
}

function getTimeDifferenceInDaysFromNow(date) {
  const diffInMs = Math.abs(new Date() - date);
  return diffInMs / (1000 * 60 * 60 * 24);
}

function getTimeDifferenceInHours(date1, date2) {
  const diffInMs = Math.abs(date2 - date1);
  return diffInMs / (1000 * 60 * 60);
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
      model: options.model.value,
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

function maybeLogSearch(search, options) {
  if (options.logSearches) {
    Logger.info(
      {
        search,
        username: options._request.user.username,
        userId: options._request.user.id
      },
      'ChatGPT Search'
    );
  }
}

async function onMessage(payload, options, cb) {
  switch (payload.action) {
    case 'question':
      try {
        const messages = payload.choices.map((choice) => choice.message);
        maybeLogSearch(messages[messages.length - 1].content, options);
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
      break;
    case 'declineDisclaimer':
      Logger.info('disclaimer declined');
      delete disclaimerCache[options._request.user.id];
      cb(null, {
        declined: true
      });
      break;
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
