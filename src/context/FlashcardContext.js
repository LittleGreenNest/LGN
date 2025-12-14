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
  const [categories, setCategories] = useState([]); // [{ id, name }]
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Local storage key for guests
  const LOCAL_KEY = "sprouttie_flashcards_v1";

  // ---------- Helpers -------------------------------------------------

  // Normalise one card to the shape the UI expects
  const normalizeCard = (row) => {
    if (!row) return row;

    // category is stored as a simple string in Supabase
    const rawCategory =
      row.categoryId ??
      row.category ??
      ""; // we treat the category *name* as the ID too
    const safeCategory = rawCategory?.trim() || "Unsorted";

    const rawType = row.cardType ?? row.card_type ?? "word";
    const normalisedType =
      String(rawType).toLowerCase() === "phrase" ? "phrase" : "word";

    const phraseGroup = row.phraseGroup ?? row.phrase_group ?? "";

    return {
      ...row,
      category: safeCategory,
      categoryId: safeCategory, // UI uses this as the “id”
      cardType: normalisedType,
      phraseGroup,
    };
  };

  const normalizeMany = (rows) => (rows || []).map((r) => normalizeCard(r));

  const loadFromLocalStorage = () => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) {
        setFlashcards([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setFlashcards(Array.isArray(parsed) ? normalizeMany(parsed) : []);
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

  // ---------- Initial load when user changes --------------------------

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
            setFlashcards([]);
          }
          return;
        }

        if (!cancelled) {
          setFlashcards(normalizeMany(data));
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

  // ---------- Derive categories + sets whenever flashcards change -----

  useEffect(() => {
    // Merge existing categories with any categories used by flashcards.
    // Category "id" is just the category name string.
    setCategories((prev) => {
      const map = new Map();
      prev.forEach((c) => {
        if (c && c.id) map.set(c.id, c);
      });

      flashcards.forEach((card) => {
        const name = card.category || card.categoryId;
        if (name && !map.has(name)) {
          map.set(name, { id: name, name });
        }
      });

      return Array.from(map.values());
    });

    // Simple 5 sets, chunked evenly
    const setsArr = [];
    const total = flashcards.length;
    const chunkSize = total > 0 ? Math.ceil(total / 5) : 0;

    for (let i = 0; i < 5; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      const setCards = chunkSize > 0 ? flashcards.slice(start, end) : [];
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
    if (!filterCategory || filterCategory === "All Categories") {
      return flashcards;
    }
    return flashcards.filter((card) => card.categoryId === filterCategory);
  }, [flashcards, filterCategory]);

  // ---------- Category CRUD (front-end only, backed by flashcards) ----

  // Note: category “id” === category name string
  const addCategory = (name) => {
    const trimmed = name?.trim();
    if (!trimmed) return { success: false, message: "Name is required" };

    setCategories((prev) => {
      if (prev.some((c) => c.id === trimmed)) {
        return prev;
      }
      return [...prev, { id: trimmed, name: trimmed }];
    });

    return { success: true };
  };

  const updateCategory = async (id, newName) => {
    const trimmed = newName?.trim();
    if (!trimmed) {
      return { success: false, message: "Name is required" };
    }

    // Update categories state
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { id: trimmed, name: trimmed } : c))
    );

    // Update flashcards in state
    setFlashcards((prev) =>
      prev.map((card) =>
        card.categoryId === id
          ? normalizeCard({
              ...card,
              category: trimmed,
              categoryId: trimmed,
            })
          : card
      )
    );

    // Guest mode → update local storage only
    if (!user) {
      const updatedCards = flashcards.map((card) =>
        card.categoryId === id
          ? normalizeCard({
              ...card,
              category: trimmed,
              categoryId: trimmed,
            })
          : card
      );
      saveToLocalStorage(updatedCards);
      return { success: true };
    }

    // Logged in → update Supabase (flashcards table stores category string)
    try {
      const { error } = await supabase
        .from("flashcards")
        .update({ category: trimmed, user_id: user.id })
        .eq("user_id", user.id)
        .eq("category", id);

      if (error) {
        console.error("[updateCategory] Supabase error", error);
        return {
          success: false,
          message: "Error updating category in database.",
        };
      }
    } catch (err) {
      console.error("[updateCategory] Unexpected error", err);
      return { success: false, message: "Unexpected error updating category." };
    }

    return { success: true };
  };

  const deleteCategory = (id) => {
    const hasCards = flashcards.some((card) => card.categoryId === id);
    if (hasCards) {
      return {
        success: false,
        message: "You can’t delete a category that still has flashcards.",
      };
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    // No DB writes needed here because categories are derived from flashcards
    return { success: true };
  };

  // ---------- Flashcard CRUD -----------------------------------------

  // Backwards-compatible addFlashcard:
  //  - addFlashcard({ word, english, pinyin, category, card_type, phrase_group })
  //  - addFlashcard(word, categoryId, english, pinyin, { cardType, phraseGroup })
  const addFlashcard = async (...args) => {
    let payload;

    if (args.length === 1 && typeof args[0] === "object" && !Array.isArray(args[0])) {
      // New style: object payload
      payload = args[0];
    } else {
      // Old style from FlashcardManager
      const [word, categoryId, english, pinyin, extra = {}] = args;
      payload = {
        word,
        english,
        pinyin,
        categoryId,
        cardType: extra.cardType,
        phraseGroup: extra.phraseGroup,
      };
    }

    const {
      word,
      english = "",
      pinyin = "",
      category,
      categoryId,
      card_type,
      cardType,
      phrase_group,
      phraseGroup,
    } = payload;

    if (!word?.trim()) return;

    // Decide final category name (id === name)
    const finalCategoryName =
      (categoryId ?? category)?.trim() || "Unsorted";

    const finalType =
      (cardType ?? card_type)?.toLowerCase() === "phrase" ? "phrase" : "word";

    const finalPhraseGroup = (phraseGroup ?? phrase_group)?.trim() || "";

    const baseCard = {
      word: word.trim(),
      english: english?.trim() || "",
      pinyin: pinyin?.trim() || "",
      category: finalCategoryName,
      card_type: finalType,
      phrase_group: finalPhraseGroup,
    };

    // Guest mode → just localStorage
    if (!user) {
      console.warn(
        "[addFlashcard] No user logged in; saving to localStorage only."
      );
      const newCard = normalizeCard({ id: Date.now(), ...baseCard });
      const updated = [...flashcards, newCard];
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
      setFlashcards((prev) => [...prev, normalizeCard(data)]);
    } catch (err) {
      console.error("[addFlashcard] Unexpected error", err);
      alert("Unexpected error saving flashcard.");
    }
  };

  const updateFlashcard = async (id, updates) => {
    // Build DB-shaped updates
    const dbUpdates = {};

    if (updates.word !== undefined) dbUpdates.word = updates.word;
    if (updates.english !== undefined) dbUpdates.english = updates.english;
    if (updates.pinyin !== undefined) dbUpdates.pinyin = updates.pinyin;

    if (updates.categoryId !== undefined || updates.category !== undefined) {
      const catName = (updates.categoryId ?? updates.category)?.trim();
      if (catName) {
        dbUpdates.category = catName;
      }
    }

    if (updates.cardType !== undefined || updates.card_type !== undefined) {
      const t = (updates.cardType ?? updates.card_type)?.toLowerCase();
      dbUpdates.card_type = t === "phrase" ? "phrase" : "word";
    }

    if (
      updates.phraseGroup !== undefined ||
      updates.phrase_group !== undefined
    ) {
      dbUpdates.phrase_group = updates.phraseGroup ?? updates.phrase_group ?? "";
    }

    // Optimistic UI: normalise back into UI shape
    setFlashcards((prev) =>
      prev.map((card) =>
        card.id === id ? normalizeCard({ ...card, ...updates }) : card
      )
    );

    if (!user) {
      const updated = flashcards.map((card) =>
        card.id === id ? normalizeCard({ ...card, ...updates }) : card
      );
      saveToLocalStorage(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from("flashcards")
        .update({ ...dbUpdates, user_id: user.id })
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
    // NEW: exposed category helpers for FlashcardManager
    addCategory,
    updateCategory,
    deleteCategory,
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
