// lib/trackingApi.js
import { supabase } from '../supabaseClient';

// Get tracking row for a specific date (YYYY-MM-DD)
// Returns null if nothing saved yet.
export async function getDailyTrackingForDate(date) {
  const { data, error } = await supabase
    .from('daily_tracking')
    .select('*')
    .eq('date', date)
    .limit(1)
    .single();

  // PGRST116 = no rows found
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error loading daily_tracking:', error);
    throw error;
  }

  return data;
}

// Upsert tracking row for a specific date
export async function saveDailyTrackingForDate(payload) {
  const { error } = await supabase
    .from('daily_tracking')
    .upsert(payload, { onConflict: 'date' });

  if (error) {
    console.error('Error saving daily_tracking:', error);
    throw error;
  }
}

// Get a range of days (for Dashboard)
export async function getDailyTrackingRange(daysBack = 30) {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - (daysBack - 1));

  const startStr = start.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_tracking')
    .select('*')
    .gte('date', startStr)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error loading daily_tracking range:', error);
    throw error;
  }

  return data || [];
}
