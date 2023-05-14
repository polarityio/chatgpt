module.exports = {
  name: 'ChatGPT',
  acronym: 'GPT',
  defaultColor: 'light-gray',
  description: "Ask OpenAI's ChatGPT a question and get an answer",
  customTypes: [
    {
      key: 'question',
      regex: /^(?<!\n|\r\n)[ \t]*.{5,256}\?[ \t]*(?!\n|\r\n)$/
    }
  ],
  onDemandOnly: true,
  styles: ['./styles/styles.less'],
  block: {
    component: {
      file: './components/block.js'
    },
    template: {
      file: './templates/block.hbs'
    }
  },
  request: {
    // Provide the path to your certFile. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    cert: '',
    // Provide the path to your private key. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    key: '',
    // Provide the key passphrase if required.  Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    passphrase: '',
    // Provide the Certificate Authority. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    ca: '',
    // An HTTP proxy to be used. Supports proxy Auth with Basic Auth, identical to support for
    // the url parameter (by embedding the auth info in the uri)
    proxy: '',
    // If set to false, the integration will ignore SSL errors.  This will allow the integration to connect
    // to the response without valid SSL certificates.  Please note that we do NOT recommending setting this
    // to false in a production environment.
    rejectUnauthorized: true
  },
  logging: { level: 'info' },
  options: [
    {
      key: 'apiKey',
      name: 'API Key',
      description: 'An OpenAPI ChatGPT API key',
      default: '',
      type: 'password',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'model',
      name: 'OpenAI Model',
      description:
        'The ID of the model to use when accessing the OpenAI ChatGPT API.  Your API key must have access to the model or you will receive a 404 error.',
      default: {
        value: 'gpt-3.5-turbo',
        display: 'GPT 3.5 Turbo'
      },
      type: 'select',
      options: [
        {
          value: 'gpt-3.5-turbo',
          display: 'GPT 3.5 Turbo'
        },
        {
          value: 'gpt-4',
          display: 'GPT 4'
        }
      ],
      multiple: false,
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'showDisclaimer',
      name: 'Show Search Disclaimer',
      description:
        'If enabled, the integration will show a disclaimer the user must accept before running a search.',
      default: false,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'disclaimer',
      name: 'Search Disclaimer Content',
      description:
        'A disclaimer that users must review before the integration will submit questions to the ChatGPT API.',
      default:
        'Please affirm that no confidential information will be shared with your submission to ChatGPT. Click Accept to run your search.',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'disclaimerInterval',
      name: 'Disclaimer Interval',
      description:
          'How often to display the disclaimer to users. Restarting the integration will reset the interval timer.',
      default:         {
        value: 'all',
        display: 'All searches - disclaimer will be shown before every search (default)'
      },
      type: 'select',
      options: [
        {
          value: 'all',
          display: 'All searches - disclaimer will be shown before every search (default)'
        },
        {
          value: '24hours',
          display: 'Every 24 hours - disclaimer will be shown once per day'
        },
        {
          value: '7days',
          display: 'Every week - disclaimer will be shown once per week'
        },
      ],
      multiple: false,
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'logSearches',
      name: 'Log Searches',
      description:
          'If enabled, the integration will log all searches sent to ChatGPT.',
      default: false,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    },
  ]
};
