// src/lib/trackingApi.js
import { supabase } from "../supabaseClient";

// Helper to format DB payload consistently
function buildDbPayload(userId, date, payload) {
  return {
    user_id: userId,
    date, // YYYY-MM-DD
    selected_sets: payload.selectedSets || [],
    set_usage: payload.setUsage || {},
    engagement: payload.engagement ?? 0,
    time_of_day: payload.timeOfDay || "",
    notes: payload.notes || "",
  };
}

// Load one day's tracking for a user
export async function getDailyTrackingForDate(userId, date) {
  if (!userId) throw new Error("getDailyTrackingForDate: userId is required");

  const { data, error } = await supabase
    .from("daily_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.error("[trackingApi] getDailyTrackingForDate error", error);
    throw error;
  }

  return data;
}

// Save or update one day's tracking (idempotent per user+date)
export async function saveDailyTrackingForDate(userId, date, payload) {
  if (!userId) throw new Error("saveDailyTrackingForDate: userId is required");

  const dbPayload = buildDbPayload(userId, date, payload);

  const { data, error } = await supabase
    .from("daily_tracking")
    .upsert(dbPayload, {
      onConflict: "user_id,date",
    })
    .select()
    .single();

  if (error) {
    console.error("[trackingApi] saveDailyTrackingForDate error", error);
    throw error;
  }

  return data;
}

// Get month history for HistoryView (per user)
export async function getTrackingHistoryForMonth(userId, startDate, endDate) {
  if (!userId) throw new Error("getTrackingHistoryForMonth: userId is required");

  const { data, error } = await supabase
    .from("daily_tracking")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) {
    console.error("[trackingApi] getTrackingHistoryForMonth error", error);
    throw error;
  }

  return data || [];
}
