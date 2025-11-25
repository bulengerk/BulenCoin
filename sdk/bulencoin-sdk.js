/**
 * Minimal BulenCoin SDK for merchants and wallets (ESM-friendly).
 * Supports payment creation, status checks and BIP21-like payment links with QR.
 */

const DEFAULT_API = process.env.BULEN_API_BASE || 'http://localhost:4100/api';

class BulenSdk {
  constructor(options = {}) {
    this.apiBase = options.apiBase || DEFAULT_API;
  }

  buildPaymentLink({ to, amount, memo }) {
    if (!to || typeof to !== 'string') {
      throw new Error('Missing destination address');
    }
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid amount');
    }
    const memoPart = memo ? `&memo=${encodeURIComponent(String(memo).slice(0, 64))}` : '';
    return `bulen:${to}?amount=${numericAmount}${memoPart}`;
  }

  async createPayment(payload) {
    const response = await fetch(`${this.apiBase}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = body.error || `HTTP ${response.status}`;
      throw new Error(`Failed to create payment: ${msg}`);
    }
    return response.json();
  }

  async getPayment(id) {
    const response = await fetch(`${this.apiBase}/payments/${id}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = body.error || `HTTP ${response.status}`;
      throw new Error(`Failed to get payment: ${msg}`);
    }
    return response.json();
  }

  async createPaymentLink({ address, amount, memo }) {
    const response = await fetch(`${this.apiBase}/payment-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, amount, memo }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = body.error || `HTTP ${response.status}`;
      throw new Error(`Failed to build payment link: ${msg}`);
    }
    return response.json();
  }

  async verifyPayment(id) {
    const payment = await this.getPayment(id);
    return {
      id: payment.id,
      status: payment.status,
      paid: payment.status === 'paid',
      transactionId: payment.transactionId || null,
      blockIndex: payment.blockIndex || null,
    };
  }
}

module.exports = { BulenSdk };
