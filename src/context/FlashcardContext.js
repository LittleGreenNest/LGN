// src/context/FlashcardContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

const FlashcardContext = createContext();

export function FlashcardProvider({ children }) {
  const { currentUser } = useAuth();
  const user = currentUser;

  const [flashcards, setFlashcards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Local storage key for guests
  const LOCAL_KEY = "sprouttie_flashcards_v1";

  const loadFromLocalStorage = () => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) {
        setFlashcards([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setFlashcards(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.error("[Flashcards] Error reading localStorage", err);
      setFlashcards([]);
    }
  };

  const saveToLocalStorage = (cards) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(cards));
    } catch (err) {
      console.error("[Flashcards] Error writing localStorage", err);
    }
  };

  // -----------------------------------------------------------
  // Initial load when user changes
  // -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // 1) Not logged in → guest mode → localStorage
      if (!user) {
        console.log("[Flashcards] No user; using localStorage only");
        loadFromLocalStorage();
        setLoading(false);
        return;
      }

      // 2) Logged in → Supabase
      try {
        const { data, error } = await supabase
          .from("flashcards")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("[Flashcards] Supabase select error", error);
          if (!cancelled) {
            // fall back to empty (or local if you want)
            setFlashcards([]);
          }
          return;
        }

        if (!cancelled) {
          setFlashcards(data || []);
          // once we’re in Supabase mode, clear any old local guest data
          localStorage.removeItem(LOCAL_KEY);
        }
      } catch (err) {
        console.error("[Flashcards] Unexpected load error", err);
        if (!cancelled) setFlashcards([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // -----------------------------------------------------------
  // Derive categories + sets whenever flashcards change
  // -----------------------------------------------------------
  useEffect(() => {
    // Categories are just unique category strings
    const catSet = new Set();
    flashcards.forEach((card) => {
      if (card.category) catSet.add(card.category);
    });
    setCategories(Array.from(catSet));

    // Simple 5 sets, chunked evenly
    const setsArr = [];
    const total = flashcards.length;
    const chunkSize = total > 0 ? Math.ceil(total / 5) : 0;

    for (let i = 0; i < 5; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      const setCards =
        chunkSize > 0 ? flashcards.slice(start, end) : [];
      setsArr.push({
        id: i + 1,
        name: `Set ${i + 1}`,
        cards: setCards,
      });
    }

    setSets(setsArr);
  }, [flashcards]);

  // Filtered list for any list views
  const filteredFlashcards = useMemo(() => {
    if (filterCategory === "All Categories") return flashcards;
    return flashcards.filter((card) => card.category === filterCategory);
  }, [flashcards, filterCategory]);

  // -----------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------

  // ✅ This version ALWAYS writes to Supabase for logged-in users
  const addFlashcard = async ({
    word,
    english,
    pinyin,
    category,
    card_type,
    phrase_group,
  }) => {
    if (!word?.trim()) return;

    const baseCard = {
      word: word.trim(),
      english: english?.trim() || "",
      pinyin: pinyin?.trim() || "",
      category: category?.trim() || "Unknown",
      card_type: card_type || "Word",
      phrase_group: phrase_group || "",
    };

    // Guest mode → just localStorage
    if (!user) {
      console.warn(
        "[addFlashcard] No user logged in; saving to localStorage only."
      );
      const updated = [...flashcards, { id: Date.now(), ...baseCard }];
      setFlashcards(updated);
      saveToLocalStorage(updated);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("flashcards")
        .insert({
          ...baseCard,
          user_id: user.id,
        })
        .select("*")
        .single();

      if (error) {
        console.error("[addFlashcard] Supabase insert error", error);
        alert("Could not save flashcard to the server.");
        return;
      }

      // Append new row from Supabase (has real uuid)
      setFlashcards((prev) => [...prev, data]);
    } catch (err) {
      console.error("[addFlashcard] Unexpected error", err);
      alert("Unexpected error saving flashcard.");
    }
  };

  const updateFlashcard = async (id, updates) => {
    // Optimistic UI
    setFlashcards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, ...updates } : card))
    );

    if (!user) {
      // update localStorage only
      const updated = flashcards.map((card) =>
        card.id === id ? { ...card, ...updates } : card
      );
      saveToLocalStorage(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from("flashcards")
        .update({ ...updates, user_id: user.id })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("[updateFlashcard] Supabase update error", error);
      }
    } catch (err) {
      console.error("[updateFlashcard] Unexpected error", err);
    }
  };

  const deleteFlashcard = async (id) => {
    // Optimistic UI
    setFlashcards((prev) => prev.filter((card) => card.id !== id));

    if (!user) {
      const updated = flashcards.filter((card) => card.id !== id);
      saveToLocalStorage(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("[deleteFlashcard] Supabase delete error", error);
      }
    } catch (err) {
      console.error("[deleteFlashcard] Unexpected error", err);
    }
  };

  const value = {
    flashcards,
    categories,
    sets,
    filterCategory,
    setFilterCategory,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    loading,
    filteredFlashcards,
  };

  return (
    <FlashcardContext.Provider value={value}>
      {children}
    </FlashcardContext.Provider>
  );
}

export function useFlashcards() {
  return useContext(FlashcardContext);
}
