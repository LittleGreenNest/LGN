import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';

// Env / server URL (CRA proxy in dev)
const isLocal = window.location.hostname === 'localhost';
const SERVER_URL = isLocal ? '' : process.env.REACT_APP_SERVER_URL;

export default function Profile() {
  const { currentUser, signOut } = useAuth();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const userId = currentUser?.id || null;

  const planLabel = useMemo(() => {
    switch (profile?.plan) {
      case 'pro': return 'Pro Sprout';
      case 'print': return 'Print Plan';
      default: return 'Free Plan';
    }
  }, [profile?.plan]);

const isCancelled = profile?.cancel_at_period_end;

  const periodEnd = profile?.current_period_end
    ? new Date(profile.current_period_end)
    : null;

  async function fetchProfile() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
  .from('profiles')
  .select('plan, subscription_status, current_period_end, cancel_at_period_end')
  .eq('id', userId)
  .single();
    if (!error) setProfile(data || null);
    setLoading(false);
  }

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Refresh after successful checkout redirect (?payment=success)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  async function openBillingPortal() {
  if (!userId) return;
  try {
    // ✅ NEW: get JWT
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Missing auth token');

    const resp = await fetch(`${SERVER_URL}/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ IMPORTANT: send JWT so server can verify user
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, email: currentUser?.email }),
    });

    const data = await resp.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert(data?.error || 'Unable to open billing portal');
    }
  } catch (e) {
    alert('Unable to open billing portal');
  }
}


  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile card */}
      <div className="bg-white border rounded-xl shadow-sm mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">User Profile</h2>
          <p className="text-sm text-gray-500">Personal details and preferences</p>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Full name</span>
            <span>Not provided</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email address</span>
            <span>{currentUser?.email || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Account created</span>
<span>
  {currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString()
    : '—'}
</span>
          </div>
          <div className="pt-2">
            <button
              onClick={signOut}
              className="px-3 py-2 rounded border text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Subscription card */}
      <div className="bg-white border rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Subscription Plan</h3>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <p className="text-gray-500">Loading subscription…</p>
          ) : (
            <>
              <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 mb-2">
                {planLabel}
              </span>

              {profile?.plan === 'free' && (
                <p className="text-gray-700">
                  You&apos;re currently on the Free plan. Upgrade to access more features like printable PDF flashcards and unlimited AI stories.
                </p>
              )}

              {(profile?.plan === 'print' || profile?.plan === 'pro') && (
                <div>
                  <p className="text-gray-700">
                    {profile.plan === 'pro'
                      ? 'You’re on the Pro plan with full access.'
                      : 'You’re on the Print plan with access to printable PDF flashcards.'}
                  </p>

                  {periodEnd && (
  <p className="text-sm text-gray-500 mt-1">
    {profile?.cancel_at_period_end
      ? `Ends on ${periodEnd.toLocaleDateString()}`
      : `Renews on ${periodEnd.toLocaleDateString()}`}
  </p>
)}

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={openBillingPortal}
                      className="px-3 py-2 rounded bg-slate-800 text-white text-sm"
                    >
                      Manage Billing
                    </button>
                  </div>
                </div>
              )}

              {profile?.plan === 'free' && (
                <div className="mt-4">
                  <a
                    href="/plans"
                    className="inline-block px-3 py-2 rounded bg-emerald-600 text-white text-sm"
                  >
                    Upgrade Plan
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
