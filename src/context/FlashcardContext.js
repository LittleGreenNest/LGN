// context/FlashcardContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';

const FlashcardContext = createContext();

// ----- Defaults (same as your old version) -----
const defaultCategories = [
  { id: 'cat1', name: 'Animals' },
  { id: 'cat2', name: 'Vehicles' },
  { id: 'cat3', name: 'Household' },
  { id: 'cat4', name: 'Nature' },
  { id: 'cat5', name: 'Body Parts' },
];

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

  // Household
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

const defaultSets = [
  { id: 1, name: 'Set 1', flashcardIds: ['f1', 'f6', 'f11', 'f16', 'f21'] },
  { id: 2, name: 'Set 2', flashcardIds: ['f2', 'f7', 'f12', 'f17', 'f22'] },
  { id: 3, name: 'Set 3', flashcardIds: ['f3', 'f8', 'f13', 'f18', 'f23'] },
  { id: 4, name: 'Set 4', flashcardIds: ['f4', 'f9', 'f14', 'f19', 'f24'] },
  { id: 5, name: 'Set 5', flashcardIds: ['f5', 'f10', 'f15', 'f20', 'f25'] },
];

// helper: make sure every card has consistent fields
const normalize = (cards) =>
  cards.map((c) => ({
    english: '',
    pinyin: '',
    cardType: 'word',
    phraseGroup: '',
    ...c,
  }));

export const FlashcardProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [sets, setSets] = useState([]);
  const [history, setHistory] = useState([]);

  // ---------- INITIAL LOAD ----------
  useEffect(() => {
    const load = async () => {
      try {
        // categories / sets from localStorage (or defaults)
        const savedCategories = localStorage.getItem('categories');
        setCategories(savedCategories ? JSON.parse(savedCategories) : defaultCategories);

        const savedSets = localStorage.getItem('sets');
        setSets(savedSets ? JSON.parse(savedSets) : defaultSets);

        const savedHistory = localStorage.getItem('history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));

        // try Supabase flashcards
        const { data, error } = await supabase
          .from('flashcards')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('[Flashcards] Supabase error, falling back to defaults/localStorage:', error.message);
          const saved = localStorage.getItem('flashcards');
          const fallback = saved ? JSON.parse(saved) : defaultFlashcards;
          setFlashcards(normalize(fallback));
          return;
        }

        if (!data || data.length === 0) {
          // Table empty -> just show defaults
          const saved = localStorage.getItem('flashcards');
          const fallback = saved ? JSON.parse(saved) : defaultFlashcards;
          setFlashcards(normalize(fallback));
          return;
        }

        const fromDb = data.map((row) => ({
          id: row.id,
          word: row.word,
          english: row.english || '',
          pinyin: row.pinyin || '',
          categoryId: row.category_id || '',
          cardType: row.card_type || 'word',
          phraseGroup: row.phrase_group || '',
        }));

        setFlashcards(normalize(fromDb));
      } catch (err) {
        console.error('[Flashcards] Unexpected load error:', err);
        setCategories(defaultCategories);
        setFlashcards(normalize(defaultFlashcards));
        setSets(defaultSets);
      }
    };

    load();
  }, []);

  // ---------- LOCAL PERSIST ----------
  useEffect(() => {
    if (categories.length) {
      localStorage.setItem('categories', JSON.stringify(categories));
    }
  }, [categories]);

  useEffect(() => {
    if (flashcards.length) {
      localStorage.setItem('flashcards', JSON.stringify(flashcards));
    }
  }, [flashcards]);

  useEffect(() => {
    if (sets.length) {
      localStorage.setItem('sets', JSON.stringify(sets));
    }
  }, [sets]);

  useEffect(() => {
    if (history.length) {
      localStorage.setItem('history', JSON.stringify(history));
    }
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
      return { success: false, message: 'Cannot delete category with flashcards. Remove flashcards first.' };
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    return { success: true };
  };

  // ---------- FLASHCARD CRUD (UI-first, Supabase second) ----------
  const addFlashcard = async (word, categoryId, english = '', pinyin = '', options = {}) => {
    const { cardType = 'word', phraseGroup = '' } = options;

    console.log('[addFlashcard] called with', { word, categoryId, english, pinyin, cardType, phraseGroup });

    // optimistic local add first so UI always updates
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

    try {
      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          word,
          english,
          pinyin,
          category_id: categoryId,
          card_type: cardType,
          phrase_group: phraseGroup,
        })
        .select()
        .single();

      console.log('[addFlashcard] Supabase result', { data, error });

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

      // replace temp card with real one
      setFlashcards((prev) =>
        prev.map((c) => (c.id === tempId ? realCard : c)),
      );
      return realCard;
    } catch (err) {
      console.error('[Flashcards] Error inserting into Supabase, keeping local-only card:', err);
      // keep temp card as-is
      return tempCard;
    }
  };

  const updateFlashcard = async (id, updates) => {
    setFlashcards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );

    const isUuid = typeof id === 'string' && id.includes('-');
    if (!isUuid) return;

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

      const { error } = await supabase.from('flashcards').update(payload).eq('id', id);
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
      })),
    );
    setFlashcards((prev) => prev.filter((c) => c.id !== id));

    const isUuid = typeof id === 'string' && id.includes('-');
    if (!isUuid) return;

    try {
      const { error } = await supabase.from('flashcards').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('[Flashcards] Error deleting Supabase flashcard:', err);
    }
  };

  // ---------- SETS ----------
  const updateSetFlashcards = (setId, flashcardIds) => {
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, flashcardIds } : s)),
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

  // ---------- DAILY TRACKING (unchanged) ----------
  const saveTrackingData = (data) => {
    const idx = history.findIndex((h) => h.date === data.date);
    if (idx >= 0) {
      const next = [...history];
      next[idx] = data;
      setHistory(next);
    } else {
      setHistory((prev) => [...prev, data]);
    }
  };

  const getTrackingData = (date) =>
    history.find((h) => h.date === date) || null;

  const getFlashcardStats = () => {
    const stats = {};
    history.forEach((day) => {
      Object.entries(day.setUsage || {}).forEach(([setId, count]) => {
        if (count > 0) {
          const set = sets.find((s) => s.id === parseInt(setId, 10));
          if (set) {
            set.flashcardIds.forEach((fid) => {
              stats[fid] = (stats[fid] || 0) + count;
              const card = flashcards.find((c) => c.id === fid);
              if (card) {
                stats[card.categoryId] =
                  (stats[card.categoryId] || 0) + count;
              }
            });
          }
        }
      });
    });
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
