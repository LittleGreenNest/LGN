// context/FlashcardContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

// Create context
const FlashcardContext = createContext();

// Default categories (local-only; not in Supabase yet)
const defaultCategories = [
  { id: 'cat1', name: 'Animals' },
  { id: 'cat2', name: 'Vehicles' },
  { id: 'cat3', name: 'Household' },
  { id: 'cat4', name: 'Nature' },
  { id: 'cat5', name: 'Body Parts' },
];

// Default flashcards (local-only seed)
const defaultFlashcards = [
  // Animals
  { id: 'f1',  word: '狗',   english: 'Dog',     pinyin: 'gǒu',     categoryId: 'cat1' },
  { id: 'f2',  word: '猫',   english: 'Cat',     pinyin: 'māo',     categoryId: 'cat1' },
  { id: 'f3',  word: '马',   english: 'Horse',   pinyin: 'mǎ',      categoryId: 'cat1' },
  { id: 'f4',  word: '狮子', english: 'Lion',    pinyin: 'shīzi',   categoryId: 'cat1' },
  { id: 'f5',  word: '老虎', english: 'Tiger',   pinyin: 'lǎohǔ',   categoryId: 'cat1' },

  // Vehicles
  { id: 'f6',  word: '汽车', english: 'Car',      pinyin: 'qìchē',   categoryId: 'cat2' },
  { id: 'f7',  word: '卡车', english: 'Truck',    pinyin: 'kǎchē',   categoryId: 'cat2' },
  { id: 'f8',  word: '公共汽车', english: 'Bus',  pinyin: 'gōnggòng qìchē', categoryId: 'cat2' },
  { id: 'f9',  word: '火车', english: 'Train',    pinyin: 'huǒchē',  categoryId: 'cat2' },
  { id: 'f10', word: '飞机', english: 'Airplane', pinyin: 'fēijī',   categoryId: 'cat2' },

  // Furniture
  { id: 'f11', word: '椅子', english: 'Chair',    pinyin: 'yǐzi',    categoryId: 'cat3' },
  { id: 'f12', word: '桌子', english: 'Table',    pinyin: 'zhuōzi',  categoryId: 'cat3' },
  { id: 'f13', word: '床',   english: 'Bed',      pinyin: 'chuáng',  categoryId: 'cat3' },
  { id: 'f14', word: '灯',   english: 'Lamp',     pinyin: 'dēng',    categoryId: 'cat3' },
  { id: 'f15', word: '沙发', english: 'Sofa',     pinyin: 'shāfā',   categoryId: 'cat3' },

  // Nature
  { id: 'f16', word: '树',   english: 'Tree',     pinyin: 'shù',     categoryId: 'cat4' },
  { id: 'f17', word: '花',   english: 'Flower',   pinyin: 'huā',     categoryId: 'cat4' },
  { id: 'f18', word: '河流', english: 'River',    pinyin: 'héliú',   categoryId: 'cat4' },
  { id: 'f19', word: '山',   english: 'Mountain', pinyin: 'shān',    categoryId: 'cat4' },
  { id: 'f20', word: '太阳', english: 'Sun',      pinyin: 'tàiyáng', categoryId: 'cat4' },

  // Body parts
  { id: 'f21', word: '手',   english: 'Hand',     pinyin: 'shǒu',    categoryId: 'cat5' },
  { id: 'f22', word: '脚',   english: 'Foot',     pinyin: 'jiǎo',    categoryId: 'cat5' },
  { id: 'f23', word: '头',   english: 'Head',     pinyin: 'tóu',     categoryId: 'cat5' },
  { id: 'f24', word: '耳朵', english: 'Ear',      pinyin: 'ěrduo',   categoryId: 'cat5' },
  { id: 'f25', word: '眼睛', english: 'Eye',      pinyin: 'yǎnjing', categoryId: 'cat5' },
];

// Default sets (local-only)
const defaultSets = [
  { id: 1, name: 'Set 1', flashcardIds: ['f1', 'f6', 'f11', 'f16', 'f21'] },
  { id: 2, name: 'Set 2', flashcardIds: ['f2', 'f7', 'f12', 'f17', 'f22'] },
  { id: 3, name: 'Set 3', flashcardIds: ['f3', 'f8', 'f13', 'f18', 'f23'] },
  { id: 4, name: 'Set 4', flashcardIds: ['f4', 'f9', 'f14', 'f19', 'f24'] },
  { id: 5, name: 'Set 5', flashcardIds: ['f5', 'f10', 'f15', 'f20', 'f25'] },
];

// Helper: ensure every flashcard has english, pinyin, cardType, phraseGroup
const normalizeFlashcards = (cards) =>
  cards.map((fc) => ({
    english: '',
    pinyin: '',
    cardType: 'word',
    phraseGroup: '',
    ...fc,
  }));

export const FlashcardProvider = ({ children }) => {
  const { user } = useAuth();   // 🔹 add this
  const [categories, setCategories] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [sets, setSets] = useState([]);
  const [history, setHistory] = useState([]);

  // --- INITIAL LOAD (localStorage + Supabase flashcards) ---
  useEffect(() => {
    const loadData = async () => {
      try {
        // Categories & sets: still from localStorage (with defaults)
        const savedCategories = localStorage.getItem('categories');
        setCategories(savedCategories ? JSON.parse(savedCategories) : defaultCategories);

        const savedSets = localStorage.getItem('sets');
        setSets(savedSets ? JSON.parse(savedSets) : defaultSets);

        const savedHistory = localStorage.getItem('history');
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }

       
      } catch (err) {
        console.error('[Flashcards] Unexpected error loading data:', err);
        // Hard fallback to defaults
        setCategories(defaultCategories);
        setFlashcards(normalizeFlashcards(defaultFlashcards));
        setSets(defaultSets);
      }
    };

    loadData();
  }, []);

// LOAD flashcards for this user from Supabase
useEffect(() => {
  if (!user) {
    setFlashcards([]);
    return;
  }

  const load = async () => {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Flashcards] load error:', error);
      setFlashcards([]);
      return;
    }

    const mapped = (data || []).map((row) => ({
      id: row.id,
      word: row.word,
      english: row.english || '',
      pinyin: row.pinyin || '',
      categoryId: row.category_id || '',
      cardType: row.card_type || 'word',
      phraseGroup: row.phrase_group || '',
    }));

    setFlashcards(mapped);
  };

  load();
}, [user]);


  // Persist categories / flashcards / sets / history to localStorage
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('categories', JSON.stringify(categories));
    }
  }, [categories]);

  useEffect(() => {
    if (flashcards.length > 0) {
      localStorage.setItem('flashcards', JSON.stringify(flashcards));
    }
  }, [flashcards]);

  useEffect(() => {
    if (sets.length > 0) {
      localStorage.setItem('sets', JSON.stringify(sets));
    }
  }, [sets]);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('history', JSON.stringify(history));
    }
  }, [history]);

  // --- CATEGORY CRUD (local only for now) ---

  const addCategory = (name) => {
    const newCategory = {
      id: `cat${Date.now()}`,
      name,
    };
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  };

  const updateCategory = (id, name) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name } : cat)),
    );
  };

  const deleteCategory = (id) => {
    const hasFlashcards = flashcards.some((card) => card.categoryId === id);

    if (hasFlashcards) {
      return { success: false, message: 'Cannot delete category with flashcards. Remove flashcards first.' };
    }

    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    return { success: true };
  };

  // --- FLASHCARD CRUD (Supabase + local) ---

  // options: { cardType?: 'word' | 'phrase', phraseGroup?: string }
const addFlashcard = async (
  word,
  categoryId,
  english = '',
  pinyin = '',
  options = {}
) => {
  if (!user) {
    throw new Error('Must be logged in to add flashcards');
  }

  const { cardType = 'word', phraseGroup = '' } = options;

  // Try to write to Supabase first
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        user_id: user.id,          // 🔹 attach user_id
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

    const newFlashcard = {
      id: data.id,
      word: data.word,
      english: data.english || '',
      pinyin: data.pinyin || '',
      categoryId: data.category_id || '',
      cardType: data.card_type || 'word',
      phraseGroup: data.phrase_group || '',
    };

    setFlashcards((prev) => [...prev, newFlashcard]);
    return newFlashcard;
  } catch (err) {
    console.error(
      '[Flashcards] Error saving to Supabase, keeping local-only card:',
      err
    );

    // Fallback: local-only card (useful if offline)
    const newFlashcard = {
      id: `f${Date.now()}`,
      word,
      english,
      pinyin,
      categoryId,
      cardType,
      phraseGroup,
    };
    setFlashcards((prev) => [...prev, newFlashcard]);
    return newFlashcard;
  }
};


  const updateFlashcard = async (id, updates) => {
  setFlashcards((prev) =>
    prev.map((card) => (card.id === id ? { ...card, ...updates } : card))
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

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    const { error } = await supabase
      .from('flashcards')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);    // 🔥 required for RLS

    if (error) throw error;
  } catch (err) {
    console.error('[Flashcards] Error updating Supabase record:', err);
  }
};


  const deleteFlashcard = async (id) => {
  setSets((prevSets) =>
    prevSets.map((set) => ({
      ...set,
      flashcardIds: set.flashcardIds.filter((cardId) => cardId !== id),
    }))
  );

  setFlashcards((prev) => prev.filter((card) => card.id !== id));

  const isUuid = typeof id === 'string' && id.includes('-');
  if (!isUuid || !user) return;

  try {
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);   // 🔥 required for RLS

    if (error) throw error;
  } catch (err) {
    console.error('[Flashcards] Error deleting Supabase record:', err);
  }
};

  // --- SETS ---

  const updateSetFlashcards = (setId, flashcardIds) => {
    setSets((prev) =>
      prev.map((set) => (set.id === setId ? { ...set, flashcardIds } : set)),
    );
  };

  const getFlashcardsByCategory = (categoryId) =>
    flashcards.filter((card) => card.categoryId === categoryId);

  const getFlashcardsForSet = (setId) => {
    const set = sets.find((s) => s.id === setId);
    if (!set) return [];
    return set.flashcardIds
      .map((id) => flashcards.find((card) => card.id === id))
      .filter(Boolean);
  };

  // --- DAILY TRACKING (unchanged, still localStorage + trackingApi) ---

  const saveTrackingData = (data) => {
    const existingIndex = history.findIndex((item) => item.date === data.date);

    if (existingIndex >= 0) {
      const updatedHistory = [...history];
      updatedHistory[existingIndex] = data;
      setHistory(updatedHistory);
    } else {
      setHistory((prev) => [...prev, data]);
    }
  };

  const getTrackingData = (date) =>
    history.find((item) => item.date === date) || null;

  const getFlashcardStats = () => {
    const stats = {};

    history.forEach((day) => {
      Object.entries(day.setUsage || {}).forEach(([setId, count]) => {
        if (count > 0) {
          const set = sets.find((s) => s.id === parseInt(setId, 10));
          if (set) {
            set.flashcardIds.forEach((flashcardId) => {
              stats[flashcardId] = (stats[flashcardId] || 0) + count;

              const card = flashcards.find((c) => c.id === flashcardId);
              if (card) {
                stats[card.categoryId] = (stats[card.categoryId] || 0) + count;
              }
            });
          }
        }
      });
    });

    return stats;
  };

  const contextValue = {
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
    <FlashcardContext.Provider value={contextValue}>
      {children}
    </FlashcardContext.Provider>
  );
};

export const useFlashcards = () => useContext(FlashcardContext);
