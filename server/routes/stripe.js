const express = require('express');
const Stripe = require('stripe');
const supabase = require('../lib/supabase');
const { attachUser, requireAuth } = require('../middleware/auth');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// ── Create checkout session ───────────────────────────────────────────────
router.post('/create-checkout', attachUser, requireAuth, async (req, res) => {
  try {
    if (req.user.tier === 'pro') {
      return res.status(400).json({ error: 'Already subscribed to Pro' });
    }

    // Get or create Stripe customer
    let customerId;
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single();

    if (sub?.stripe_customer_id) {
      customerId = sub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { userId: req.user.id, username: req.user.username },
      });
      customerId = customer.id;

      await supabase.from('subscriptions').upsert({
        user_id: req.user.id,
        stripe_customer_id: customerId,
        status: 'inactive',
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/profile?upgraded=true`,
      cancel_url:  `${process.env.CLIENT_URL}/profile?canceled=true`,
      metadata: { userId: req.user.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ── Create portal session (manage subscription) ───────────────────────────
router.post('/portal', attachUser, requireAuth, async (req, res) => {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single();

    if (!sub?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.CLIENT_URL}/profile`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// ── Get subscription status ───────────────────────────────────────────────
router.get('/status', attachUser, requireAuth, async (req, res) => {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    res.json({
      tier: req.user.tier,
      subscription: sub || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// ── Stripe Webhook ────────────────────────────────────────────────────────
// This must use raw body — see index.js for the express.raw() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const isActive = subscription.status === 'active';

        // Find user by customer id
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (sub) {
          // Update subscription record
          await supabase.from('subscriptions').update({
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('user_id', sub.user_id);

          // Update user tier
          await supabase.from('users').update({
            tier: isActive ? 'pro' : 'free',
          }).eq('id', sub.user_id);

          console.log(`[stripe] user ${sub.user_id} tier → ${isActive ? 'pro' : 'free'}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (sub) {
          await supabase.from('subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('user_id', sub.user_id);

          await supabase.from('users').update({ tier: 'free' }).eq('id', sub.user_id);
          console.log(`[stripe] user ${sub.user_id} canceled → free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', invoice.customer)
          .single();

        if (sub) {
          await supabase.from('subscriptions').update({ status: 'past_due' }).eq('user_id', sub.user_id);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;