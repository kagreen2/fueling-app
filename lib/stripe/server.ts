import Stripe from 'stripe'

function getStripeInstance() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    // Return a placeholder during build time — will be available at runtime
    return null as unknown as Stripe
  }
  return new Stripe(key, {
    apiVersion: '2025-02-24.acacia' as any,
    typescript: true,
  })
}

export const stripe = getStripeInstance()
