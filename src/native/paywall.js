const REASON_COPY = {
  scene: 'This scene is part of Scanbass Pro.',
  advancedControls: 'The advanced tuner is part of Scanbass Pro.',
  manual: 'Unlock the full visualizer.'
};

const FEATURES = [
  'Every scene, every preset',
  'Advanced tuner: scene, preset, and overlay FX controls',
  'Save your own presets',
  'One-time purchase. No subscription.'
];

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text != null) {
    element.textContent = text;
  }
  return element;
}

export class Paywall {
  constructor(entitlements, { onUnlocked } = {}) {
    this.entitlements = entitlements;
    this.onUnlocked = onUnlocked;
    this.isBusy = false;
    this.lastFocused = null;

    this.root = createElement('div', 'paywall');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'paywall-title');
    this.root.setAttribute('aria-hidden', 'true');

    const card = createElement('div', 'paywall-card');
    const eyebrow = createElement('p', 'paywall-eyebrow', 'SCANBASS PRO');
    const title = createElement('h2', 'paywall-title', 'Unlock the full visualizer');
    title.id = 'paywall-title';
    this.reasonText = createElement('p', 'paywall-reason');

    const list = createElement('ul', 'paywall-features');
    FEATURES.forEach((feature) => list.append(createElement('li', null, feature)));

    this.buyButton = createElement('button', 'paywall-buy', 'Unlock');
    this.buyButton.type = 'button';
    this.restoreButton = createElement('button', 'paywall-secondary', 'Restore Purchase');
    this.restoreButton.type = 'button';
    this.closeButton = createElement('button', 'paywall-secondary', 'Not Now');
    this.closeButton.type = 'button';

    const secondaryRow = createElement('div', 'paywall-secondary-row');
    secondaryRow.append(this.restoreButton, this.closeButton);

    this.statusText = createElement('p', 'paywall-status');
    this.statusText.setAttribute('role', 'status');
    this.statusText.setAttribute('aria-live', 'polite');

    card.append(eyebrow, title, this.reasonText, list, this.buyButton, secondaryRow, this.statusText);
    this.root.append(card);
    document.body.append(this.root);

    this.buyButton.addEventListener('click', () => this.handlePurchase());
    this.restoreButton.addEventListener('click', () => this.handleRestore());
    this.closeButton.addEventListener('click', () => this.close());
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) {
        this.close();
      }
    });
    this.root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.close();
      }
    });

    entitlements.onChange((current, wasUnlocked) => {
      this.renderPrice();
      if (current.isProUnlocked && !wasUnlocked) {
        this.close();
        this.onUnlocked?.();
      }
    });
  }

  isOpen() {
    return this.root.classList.contains('is-open');
  }

  async open(reason = 'manual') {
    this.reasonText.textContent = REASON_COPY[reason] ?? REASON_COPY.manual;
    this.setStatus('');
    this.renderPrice();
    this.lastFocused = document.activeElement;
    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    this.buyButton.focus();

    if (!this.entitlements.product) {
      this.setBusy(true);
      try {
        await this.entitlements.refresh();
      } catch {
        // Handled by renderPrice() below.
      } finally {
        this.setBusy(false);
        this.renderPrice();
      }
    }
  }

  close() {
    if (!this.isOpen()) {
      return;
    }

    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    if (this.lastFocused instanceof HTMLElement) {
      this.lastFocused.focus();
    }
  }

  renderPrice() {
    const product = this.entitlements.product;
    if (product?.displayPrice) {
      this.buyButton.textContent = `Unlock for ${product.displayPrice}`;
      this.buyButton.disabled = this.isBusy;
      return;
    }

    this.buyButton.textContent = this.isBusy ? 'Connecting to App Store...' : 'Unavailable';
    this.buyButton.disabled = true;
    if (!this.isBusy && this.isOpen()) {
      this.setStatus('Could not reach the App Store. Check your connection and try again.', true);
    }
  }

  setBusy(isBusy) {
    this.isBusy = isBusy;
    this.restoreButton.disabled = isBusy;
    this.renderPrice();
  }

  setStatus(text, isError = false) {
    this.statusText.textContent = text;
    this.statusText.classList.toggle('is-error', isError);
  }

  async handlePurchase() {
    if (this.isBusy) {
      return;
    }

    this.setBusy(true);
    this.setStatus('');
    try {
      const outcome = await this.entitlements.purchase();
      if (outcome === 'pending') {
        this.setStatus('Purchase is pending approval. It will unlock automatically once approved.');
      }
    } catch (error) {
      this.setStatus(error?.message || 'Purchase failed. Please try again.', true);
    } finally {
      this.setBusy(false);
    }
  }

  async handleRestore() {
    if (this.isBusy) {
      return;
    }

    this.setBusy(true);
    this.setStatus('Restoring...');
    try {
      const isUnlocked = await this.entitlements.restore();
      if (!isUnlocked) {
        this.setStatus('No previous purchase found for this Apple Account.');
      }
    } catch (error) {
      this.setStatus(error?.message || 'Restore failed. Please try again.', true);
    } finally {
      this.setBusy(false);
    }
  }
}
