// src/components/subscription/Plans.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import WaitlistForm from '../WaitlistForm';

const SERVER_URL = process.env.REACT_APP_BACKEND_URL;

const plans = [
  {
    name: 'Free',
    priceMonthly: '$0',
    priceYearly: '$0',
    description: 'Get started with the basics',
    features: ['100 flashcards', 'Sample story access', 'Organize flashcard folders'],
    planKey: 'free',
    buttonText: 'Select',
  },
  {
    name: 'Print Plan',
    priceMonthly: '$1',
    priceYearly: '$10',
    description: 'Perfect for offline studying',
    features: ['Everything in Free', 'Printable PDF Flashcards', 'PDF export formats'],
    planKey: 'print',
    buttonText: 'Subscribe',
  },
  {
    name: 'Pro Sprout',
    priceMonthly: '$3',
    priceYearly: '$30',
    description: 'Full access and unlimited AI stories',
    features: ['Everything in Print Plan', 'Unlimited story generation', 'Save flash history', 'Collaborate with parents'],
    planKey: 'pro',
    buttonText: 'Grow with Pro',
  }
];

export default function Plans() {
  const navigate = useNavigate();
  const [userPlan, setUserPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showWaitlist, setShowWaitlist] = useState(false);
const isCurrentPlan = (dbPlan, cardKey) => {
  const alias = { pdf: 'print', print: 'print', free: 'free', pro: 'pro' };
  return (alias[dbPlan] || dbPlan) === cardKey;
};

  useEffect(() => {
  const fetchUserPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();
    if (data) setUserPlan(data.plan);
  };
  fetchUserPlan();
}, []);

// NEW: resume checkout after login
useEffect(() => {
  const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
    if (session?.user) {
      const pending = sessionStorage.getItem('pendingPlan');
      if (pending) {
        sessionStorage.removeItem('pendingPlan');
        // now that we're logged in, resume checkout
        handleSubscribe(pending);
      }
    }
  });
  return () => sub?.subscription?.unsubscribe?.();
}, []);

  // UX niceties for modal
  useEffect(() => {
  if (showWaitlist) {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setShowWaitlist(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }
}, [showWaitlist]);

  const handleSubscribe = async (plan) => {
    try {
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  sessionStorage.setItem('pendingPlan', plan);   // remember the intent
  navigate('/login?next=/plans');                // come back here after login
  return;
}

const res = await fetch(`${SERVER_URL}/create-checkout-session`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
plan,              // 'print' (server maps to PDF price)
userId: user.id,   // becomes client_reference_id + metadata.user_id
email: user.email, // becomes customer_email (fallback)
}),
});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Something went wrong.');
    } catch (e) {
      console.error('Subscription error:', e);
      alert('Failed to start subscription.');
    }
  };

  const onPlanClick = (planKey) => {
    if (planKey === 'free') return navigate('/profile');
    if (planKey === 'print') return handleSubscribe('print');
    if (planKey === 'pro') {
      setShowWaitlist(true);
      // optional analytics
      if (window.gtag) window.gtag('event', 'open_waitlist_modal', { source: 'plans_modal' });
      if (window.fbq) window.fbq('trackCustom', 'OpenWaitlistModal', { source: 'plans_modal' });
    }
  };

  return (
    <div className="bg-gray-50 py-16 px-6 sm:px-8 lg:px-24">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-green-800 mb-4">Choose a Plan</h2>
        <p className="text-lg text-gray-600 mb-12">Start small or unlock more learning power.</p>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.planKey}
              className="bg-white rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg p-8 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="text-3xl font-bold mb-4">
                  {billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly}
                  <span className="text-lg font-normal text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg className="h-5 w-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isCurrentPlan(userPlan, plan.planKey) ? (
                <button
                  disabled
                  className="w-full py-2 rounded-md font-medium text-gray-500 bg-gray-100 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => onPlanClick(plan.planKey)}
                  className="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded-md font-medium transition-colors mt-auto"
                >
                  {plan.buttonText}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={billingCycle === 'yearly'}
              onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="form-checkbox text-green-600"
            />
            <span className="ml-2 text-gray-700">Bill yearly</span>
          </label>
        </div>
      </div>

      {/* Waitlist modal */}
      {showWaitlist && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Join Pro Plan Waitlist"
          onClick={() => setShowWaitlist(false)}
        >
          <div
            className="relative w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <WaitlistForm onClose={() => setShowWaitlist(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
