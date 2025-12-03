// src/context/FlashcardContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const FlashcardContext = createContext();

// ----- Defaults (categories/sets only – NO default flashcards) -----
const defaultCategories = [
  { id: 'cat1', name: 'Animals' },
  { id: 'cat2', name: 'Vehicles' },
  { id: 'cat3', name: 'Household' },
  { id: 'cat4', name: 'Nature' },
  { id: 'cat5', name: 'Body Parts' },
];

const defaultSets = [
  { id: 1, name: 'Set 1', flashcardIds: [] },
  { id: 2, name: 'Set 2', flashcardIds: [] },
  { id: 3, name: 'Set 3', flashcardIds: [] },
  { id: 4, name: 'Set 4', flashcardIds: [] },
  { id: 5, name: 'Set 5', flashcardIds: [] },
];

// helper kept for future, even if unused right now
const normalize = (cards) =>
  cards.map((c) => ({
    english: '',
    pinyin: '',
    cardType: 'word',
    phraseGroup: '',
    ...c,
  }));

export const FlashcardProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const user = currentUser;

  const [categories, setCategories] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [sets, setSets] = useState([]);
  const [history, setHistory] = useState([]);

  // ---------- INITIAL LOAD ----------
  useEffect(() => {
    const load = async () => {
      try {
        // categories / sets / history from localStorage (or defaults)
        const savedCategories = localStorage.getItem('categories');
        setCategories(savedCategories ? JSON.parse(savedCategories) : defaultCategories);

        const savedSets = localStorage.getItem('sets');
        setSets(savedSets ? JSON.parse(savedSets) : defaultSets);

        const savedHistory = localStorage.getItem('history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));

        // If not signed in yet, just use local flashcards (no Supabase query)
        if (!user) {
          console.log('[Flashcards] No user yet, using localStorage only');
          const saved = localStorage.getItem('flashcards');
          const fallback = saved ? JSON.parse(saved) : [];
          setFlashcards(fallback);
          return;
        }

        // Load only this user's flashcards from Supabase (RLS-friendly)
        const { data, error } = await supabase
          .from('flashcards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn(
            '[Flashcards] Supabase error, falling back to localStorage:',
            error.message
          );
          const saved = localStorage.getItem('flashcards');
          const fallback = saved ? JSON.parse(saved) : [];
          setFlashcards(fallback);
          return;
        }

        if (!data || data.length === 0) {
          const saved = localStorage.getItem('flashcards');
          const fallback = saved ? JSON.parse(saved) : [];
          setFlashcards(fallback);
          return;
        }

        // map DB rows → UI format
        const mapped = data.map((row) => ({
          id: row.id,
          word: row.word,
          english: row.english || '',
          pinyin: row.pinyin || '',
          categoryId: row.category_id || '',
          cardType: row.card_type || 'word',
          phraseGroup: row.phrase_group || '',
        }));

        setFlashcards(mapped);
        localStorage.setItem('flashcards', JSON.stringify(mapped));
      } catch (err) {
        console.error('[Flashcards] Unexpected load error:', err);
        const saved = localStorage.getItem('flashcards');
        const fallback = saved ? JSON.parse(saved) : [];
        setFlashcards(fallback);
      }
    };

    load();
  }, [user]);

  // ---------- LOCAL PERSIST ----------
  useEffect(() => {
    if (categories.length) {
      localStorage.setItem('categories', JSON.stringify(categories));
    }
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('flashcards', JSON.stringify(flashcards));
  }, [flashcards]);

  useEffect(() => {
    if (sets.length) {
      localStorage.setItem('sets', JSON.stringify(sets));
    }
  }, [sets]);

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);

  // ---------- CATEGORY CRUD ----------
  const addCategory = (name) => {
    const newCategory = { id: `cat${Date.now()}`, name };
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  };

  const updateCategory = (id, name) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const deleteCategory = (id) => {
    const hasCards = flashcards.some((c) => c.categoryId === id);
    if (hasCards) {
      return {
        success: false,
        message: 'Cannot delete category with flashcards. Remove flashcards first.',
      };
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    return { success: true };
  };

  // ---------- FLASHCARD CRUD (UI-first, Supabase second) ----------
  const addFlashcard = async (word, categoryId, english = '', pinyin = '', options = {}) => {
    const { cardType = 'word', phraseGroup = '' } = options;

    const tempId = `f${Date.now()}`;
    const tempCard = {
      id: tempId,
      word,
      english,
      pinyin,
      categoryId,
      cardType,
      phraseGroup,
    };
    setFlashcards((prev) => [...prev, tempCard]);

    // If not logged in, keep card local-only (no Supabase / RLS)
    if (!user) {
      console.warn('[addFlashcard] No user logged in; keeping flashcard local-only');
      return tempCard;
    }

    try {
      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          user_id: user.id,
          word,
          english,
          pinyin,
          category_id: categoryId,
          card_type: cardType,
          phrase_group: phraseGroup,
        })
        .select()
        .single();

      if (error) throw error;

      const realCard = {
        id: data.id,
        word: data.word,
        english: data.english || '',
        pinyin: data.pinyin || '',
        categoryId: data.category_id || '',
        cardType: data.card_type || 'word',
        phraseGroup: data.phrase_group || '',
      };

      setFlashcards((prev) => prev.map((c) => (c.id === tempId ? realCard : c)));
      return realCard;
    } catch (err) {
      console.error(
        '[Flashcards] Error inserting into Supabase, keeping local-only card:',
        err
      );
      // keep temp card in local state
      return tempCard;
    }
  };

  const updateFlashcard = async (id, updates) => {
    // Update locally first
    setFlashcards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

    const isUuid = typeof id === 'string' && id.includes('-');
    if (!isUuid || !user) return;

    try {
      const payload = {
        word: updates.word,
        english: updates.english,
        pinyin: updates.pinyin,
        category_id: updates.categoryId,
        card_type: updates.cardType,
        phrase_group: updates.phraseGroup,
      };
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const { error } = await supabase
        .from('flashcards')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('[Flashcards] Error updating Supabase flashcard:', err);
    }
  };

  const deleteFlashcard = async (id) => {
    setSets((prevSets) =>
      prevSets.map((s) => ({
        ...s,
        flashcardIds: s.flashcardIds.filter((fid) => fid !== id),
      }))
    );
    setFlashcards((prev) => prev.filter((c) => c.id !== id));

    const isUuid = typeof id === 'string' && id.includes('-');
    if (!isUuid || !user) return;

    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('[Flashcards] Error deleting Supabase flashcard:', err);
    }
  };

  // ---------- SETS ----------
  const updateSetFlashcards = (setId, flashcardIds) => {
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, flashcardIds } : s))
    );
  };

  const getFlashcardsByCategory = (categoryId) =>
    flashcards.filter((c) => c.categoryId === categoryId);

  const getFlashcardsForSet = (setId) => {
    const set = sets.find((s) => s.id === setId);
    if (!set) return [];
    return set.flashcardIds
      .map((id) => flashcards.find((c) => c.id === id))
      .filter(Boolean);
  };

  // ---------- DAILY TRACKING (local side, tagged per-user when possible) ----------
  const saveTrackingData = (data) => {
    const userId = user?.id || data.userId || data.user_id || null;
    const record = userId ? { ...data, userId } : { ...data };

    setHistory((prev) => {
      let base = prev;

      if (userId) {
        base = prev.filter(
          (h) =>
            (h.userId && h.userId === userId) ||
            (h.user_id && h.user_id === userId)
        );
      }

      const idx = base.findIndex((h) => h.date === record.date);
      if (idx >= 0) {
        const next = [...base];
        next[idx] = record;
        return next;
      }

      return [...base, record];
    });
  };

  const getTrackingData = (date) => {
    const userId = user?.id;

    if (!userId) {
      return history.find((h) => h.date === date) || null;
    }

    return (
      history.find(
        (h) =>
          h.date === date &&
          (
            (h.userId && h.userId === userId) ||
            (h.user_id && h.user_id === userId) ||
            (!h.userId && !h.user_id) // backward compat
          )
      ) || null
    );
  };

  const getFlashcardStats = () => {
    const userId = user?.id;
    const stats = {};

    const relevantHistory = userId
      ? history.filter(
          (h) =>
            (h.userId && h.userId === userId) ||
            (h.user_id && h.user_id === userId) ||
            (!h.userId && !h.user_id)
        )
      : history;

    relevantHistory.forEach((day) => {
      Object.entries(day.setUsage || {}).forEach(([setId, count]) => {
        if (count > 0) {
          const set = sets.find((s) => s.id === parseInt(setId, 10));
          if (set) {
            set.flashcardIds.forEach((fid) => {
              stats[fid] = (stats[fid] || 0) + count;
              const card = flashcards.find((c) => c.id === fid);
              if (card) {
                stats[card.categoryId] = (stats[card.categoryId] || 0) + count;
              }
            });
          }
        }
      });
    });

    // you can expand this later (averageEngagement etc.)
    return stats;
  };

  const value = {
    categories,
    flashcards,
    sets,
    history,
    addCategory,
    updateCategory,
    deleteCategory,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    updateSetFlashcards,
    getFlashcardsByCategory,
    getFlashcardsForSet,
    saveTrackingData,
    getTrackingData,
    getFlashcardStats,
  };

  return (
    <FlashcardContext.Provider value={value}>
      {children}
    </FlashcardContext.Provider>
  );
};

export const useFlashcards = () => useContext(FlashcardContext);
