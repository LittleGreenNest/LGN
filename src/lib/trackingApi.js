// lib/trackingApi.js
import { supabase } from '../supabaseClient';

// Helper: get the logged-in user
async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('[trackingApi] getUser error:', error);
    return null;
  }

  return user;
}

// Get tracking row for a specific date (YYYY-MM-DD)
export async function getDailyTrackingForDate(date) {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('daily_tracking')
    .select('*')
    .eq('user_id', user.id) // 👈 filter by user
    .eq('date', date)
    .single();

  if (error) {
    // PGRST116 = "Results contain 0 rows" for .single()
    if (error.code === 'PGRST116') return null;
    console.error('[trackingApi] getDailyTrackingForDate error:', error);
    return null;
  }

  return data;
}

// Save or update a row for a date
export async function saveDailyTrackingForDate(date, payload) {
  const user = await getUser();
  if (!user) return;

  const row = {
    user_id: user.id, // 👈 attach user for RLS
    date,
    selected_sets: payload.selectedSets ?? [],
    set_usage: payload.setUsage ?? {},
    engagement: payload.engagement ?? 0,
    time_of_day: payload.timeOfDay ?? '',
    notes: payload.notes ?? '',
  };

  const { data, error } = await supabase
    .from('daily_tracking')
    .upsert(row, {
      onConflict: 'user_id,date', // 👈 needs a unique index on (user_id, date)
    })
    .select()
    .single();

  if (error) {
    console.error('[trackingApi] saveDailyTrackingForDate error:', error);
    return null;
  }

  return data;
}

// Get multiple days in a range
export async function getDailyTrackingRange(startStr, endStr) {
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('daily_tracking')
    .select('*')
    .eq('user_id', user.id) // 👈 filter per-user
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date', { ascending: true });

  if (error) {
    console.error('[trackingApi] getDailyTrackingRange error:', error);
    return [];
  }

  return data || [];
}
