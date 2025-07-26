import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const WaitlistForm = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Store source + timestamp
    const source = 'plans_modal';

    const { error } = await supabase.from('waitlist').insert([{ email, source }]);
    setLoading(false);

    if (error) {
      toast.error('Something went wrong. Please try again.');
    } else {
      toast.success('You’re on the waitlist! 🎉');
      setEmail('');
    }

    // Meta Pixel tracking
    if (window.fbq) {
      window.fbq('track', 'Lead', {
        content_name: 'Waitlist Signup',
        source,
      });
    }

    // GA4 Event tracking
    if (window.gtag) {
      window.gtag('event', 'waitlist_signup', {
        event_category: 'engagement',
        event_label: source,
      });
    }
  };

  return (
    <div className="waitlist-modal">
      <div className="modal-content">
        <h3 style={{ marginBottom: '1rem' }}>Join the Pro Plan Waitlist</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            className="subscribe-btn"
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            {loading ? <div className="spinner"></div> : 'Join Waitlist'}
          </button>
        </form>
        <button onClick={onClose} className="close-btn">
          Close
        </button>
      </div>
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
};

export default WaitlistForm;
