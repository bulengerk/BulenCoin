export interface BulenSdkOptions {
  apiBase?: string;
}

export interface PaymentPayload {
  to: string;
  amount: number | string;
  memo?: string;
  webhookUrl?: string;
  expiresInSeconds?: number;
}

export interface PaymentSummary {
  id: string;
  to: string;
  amount: number;
  memo?: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  transactionId: string | null;
  blockIndex: number | null;
  webhookUrl?: string | null;
}

export interface PaymentLinkResponse {
  ok: boolean;
  link: string;
  qrDataUrl?: string | null;
}

export class BulenSdk {
  constructor(options?: BulenSdkOptions);
  buildPaymentLink(params: { to: string; amount: number | string; memo?: string }): string;
  createPayment(payload: PaymentPayload): Promise<PaymentSummary>;
  getPayment(id: string): Promise<PaymentSummary>;
  createPaymentLink(params: {
    address: string;
    amount: number | string;
    memo?: string;
  }): Promise<PaymentLinkResponse>;
  verifyPayment(id: string): Promise<{
    id: string;
    status: string;
    paid: boolean;
    transactionId: string | null;
    blockIndex: number | null;
  }>;
}
