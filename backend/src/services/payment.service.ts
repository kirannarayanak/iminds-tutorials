/**
 * Payment Service Abstraction
 *
 * Currently uses mock payment flow.
 * To activate real gateway:
 *   - Set PAYMENT_GATEWAY=stripe or PAYMENT_GATEWAY=telr in .env
 *   - Add gateway credentials to .env
 *   - Implement the gateway branch below
 */

export type PaymentGateway = 'mock' | 'stripe' | 'telr';

export interface PaymentIntent {
  gatewayTransactionId: string;
  clientSecret?: string;    // Stripe
  paymentUrl?: string;      // Telr redirect URL
  status: 'pending' | 'paid' | 'failed';
  gateway: PaymentGateway;
}

export interface PaymentVerification {
  success: boolean;
  gatewayTransactionId: string;
  status: 'paid' | 'failed';
  gatewayResponse: Record<string, any>;
}

const GATEWAY = (process.env.PAYMENT_GATEWAY || 'mock') as PaymentGateway;

export async function createPaymentIntent(
  amount: number,
  currency: string,
  metadata: Record<string, string>
): Promise<PaymentIntent> {
  if (GATEWAY === 'mock') {
    return {
      gatewayTransactionId: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      status: 'pending',
      gateway: 'mock',
    };
  }

  if (GATEWAY === 'stripe') {
    // TODO: npm install stripe
    // const Stripe = require('stripe');
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const intent = await stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100), // Stripe uses smallest currency unit
    //   currency: currency.toLowerCase(),
    //   metadata,
    // });
    // return { gatewayTransactionId: intent.id, clientSecret: intent.client_secret, status: 'pending', gateway: 'stripe' };
    throw new Error('Stripe not yet configured — add STRIPE_SECRET_KEY to .env');
  }

  if (GATEWAY === 'telr') {
    // TODO: Telr hosted payment page
    // POST to https://secure.telr.com/gateway/order.json
    // with store_id, auth_key, amount, currency, return URL
    throw new Error('Telr not yet configured — add TELR_STORE_ID and TELR_AUTH_KEY to .env');
  }

  throw new Error(`Unknown payment gateway: ${GATEWAY}`);
}

export async function verifyPayment(gatewayTransactionId: string): Promise<PaymentVerification> {
  if (GATEWAY === 'mock') {
    // Mock: always succeeds
    return {
      success: true,
      gatewayTransactionId,
      status: 'paid',
      gatewayResponse: { mock: true, verified_at: new Date().toISOString() },
    };
  }

  // TODO: implement for Stripe webhook verification and Telr return URL verification
  throw new Error(`Payment verification not implemented for gateway: ${GATEWAY}`);
}
