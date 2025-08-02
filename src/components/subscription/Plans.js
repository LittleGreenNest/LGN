import React, { useEffect, useState } from 'react';
import '../../App.css';
import WaitlistForm from '../components/WaitlistForm';
import { supabase } from '../../supabaseClient';

const Plans = () => {
  const [userPlan, setUserPlan] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUserPlan = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      setUserEmail(user.email);

      const { data, error } = await supabase
        .from('users')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (data?.plan) {
        setUserPlan(data.plan);
      }
    };

    fetchUserPlan();
  }, []);

  const renderCTA = (planKey) => {
    if (userPlan === planKey) {
      return <span className="plan-current">Current Plan</span>;
    }

    if (planKey === 'pro') {
      return (
        <div className="plan-waitlist">
          <p className="plan-note">Coming Soon!</p>
          <WaitlistForm source="plans-page" />
        </div>
      );
    }

    const checkoutUrl =
      planKey === 'pdf'
        ? 'https://sprouttie-server.onrender.com/create-checkout-session?plan=print'
        : '#';

    return (
      <a href={checkoutUrl}>
        <button className="plan-cta">
          {planKey === 'pdf' ? 'Unlock Printing' : 'Start for Free'}
        </button>
      </a>
    );
  };

  const plans = [
    {
      key: 'free',
      name: 'Free Sprout',
      price: '$0/month',
      features: ['Use our AI flashcard generator', 'Save 20 cards per set'],
    },
    {
      key: 'pdf',
      name: 'PDF Sprout',
      price: '$1/month',
      features: ['All Free features', 'Print flashcards as PDFs'],
    },
    {
      key: 'pro',
      name: 'Pro Sprout',
      price: '?',
      features: ['All PDF features', 'Upload media', 'Multilingual support'],
    },
  ];

  return (
    <div className="plans-container">
      <h1 className="plans-title">Choose Your Sprout Plan</h1>
      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.key} className="plan-card">
            <h2>{plan.name}</h2>
            <p className="plan-price">{plan.price}</p>
            <ul className="plan-features">
              {plan.features.map((feature, index) => (
                <li key={index}>🌱 {feature}</li>
              ))}
            </ul>
            <div className="plan-action">{renderCTA(plan.key)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Plans;
