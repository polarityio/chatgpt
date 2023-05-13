'use strict';

polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  question: '',
  isRunning: false,
  errorMessage: '',
  // If the user's chat message reaches this number of tokens, we will display a warning
  // suggesting they clear their chat.
  tokenWarningAmount: 3500,
  init() {
    let array = new Uint32Array(5);
    this.set('uniqueIdPrefix', window.crypto.getRandomValues(array).join(''));

    this._super(...arguments);
  },
  actions: {
    clearChat: function () {
      this.set('details.response.choices', []);
      this.set('details.response.usage.total_tokens', 0);
    },
    copyData: function () {
      Ember.run.scheduleOnce(
        'afterRender',
        this,
        this.copyElementToClipboard,
        `chatgpt-${this.get('uniqueIdPrefix')}`
      );

      Ember.run.scheduleOnce('destroy', this, this.restoreCopyState);
    },
    submitQuestion: function () {
      this.submitQuestion();
    },
    acceptDisclaimer: function () {
      this.set('details.showDisclaimer', false);
      this.submitQuestion();
    },
    closeError: function () {
      this.set('errorMessage', '');
    }
  },
  submitQuestion() {
    if (this.get('isRunning') === true) {
      return;
    }

    this.set('isRunning', true);
    let choices = this.get('details.response.choices');

    // If we're showing the dislaimer then there will be no question
    // and we don't need to add anything to the choices array.
    if (this.get('question')) {
      choices.push({
        message: {
          role: 'user',
          content: this.get('question')
        }
      });
    }

    this.get('block').notifyPropertyChange('data');

    Ember.run.scheduleOnce('afterRender', this, this.scrollToElementRunningIndicator);

    const payload = {
      action: 'question',
      choices
    };

    this.set('question', '');

    this.sendIntegrationMessage(payload)
      .then((result) => {
        this.set('details.response', result.response);
        const choices = this.get('details.response.choices');
        Ember.run.scheduleOnce('afterRender', this, this.scrollToChoiceIndex, choices.length - 1);
      })
      .catch((error) => {
        console.error(error);
        this.set('errorMessage', JSON.stringify(error, null, 2));
        Ember.run.scheduleOnce('afterRender', this, this.scrollToErrorMessage);
      })
      .finally(() => {
        this.set('isRunning', false);
      });
  },
  scrollToChoiceIndex(index) {
    let doc = document.getElementById(`chatgpt-choice-${index}-${this.get('uniqueIdPrefix')}`);
    if (doc) {
      doc.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  },
  scrollToElementRunningIndicator() {
    let doc = document.getElementById(`chatgpt-running-indicator-${this.get('uniqueIdPrefix')}`);
    if (doc) {
      doc.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  },
  scrollToErrorMessage() {
    let doc = document.getElementById(`chatgpt-error-message-${this.get('uniqueIdPrefix')}`);
    if (doc) {
      doc.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  },
  copyElementToClipboard(element) {
    // Prevents avatar images from being copied as they don't display right in MS Word
    let images = document.getElementById(element).getElementsByTagName('img');
    for (let i = 0; i < images.length; i++) {
      images[i].style.display = 'none';
    }

    window.getSelection().removeAllRanges();
    let range = document.createRange();

    range.selectNode(typeof element === 'string' ? document.getElementById(element) : element);
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();

    for (let i = 0; i < images.length; i++) {
      images[i].style.display = 'block';
    }
  },
  restoreCopyState() {
    this.set('showCopyMessage', true);

    setTimeout(() => {
      if (!this.isDestroyed) {
        this.set('showCopyMessage', false);
      }
    }, 2000);
  }
});
