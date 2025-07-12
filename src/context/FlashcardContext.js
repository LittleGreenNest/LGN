// context/FlashcardContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';

// Create context
const FlashcardContext = createContext();

// Default categories
const defaultCategories = [
  { id: 'cat1', name: 'Animals' },
  { id: 'cat2', name: 'Vehicles' },
  { id: 'cat3', name: 'Household' },
  { id: 'cat4', name: 'Nature' },
  { id: 'cat5', name: 'Body Parts' }
];

// Default flashcards
const defaultFlashcards = [
  { id: 'f1', word: 'Dog', categoryId: 'cat1' },
  { id: 'f2', word: 'Cat', categoryId: 'cat1' },
  { id: 'f3', word: 'Horse', categoryId: 'cat1' },
  { id: 'f4', word: 'Lion', categoryId: 'cat1' },
  { id: 'f5', word: 'Tiger', categoryId: 'cat1' },
  { id: 'f6', word: 'Car', categoryId: 'cat2' },
  { id: 'f7', word: 'Truck', categoryId: 'cat2' },
  { id: 'f8', word: 'Bus', categoryId: 'cat2' },
  { id: 'f9', word: 'Train', categoryId: 'cat2' },
  { id: 'f10', word: 'Airplane', categoryId: 'cat2' },
  { id: 'f11', word: 'Chair', categoryId: 'cat3' },
  { id: 'f12', word: 'Table', categoryId: 'cat3' },
  { id: 'f13', word: 'Bed', categoryId: 'cat3' },
  { id: 'f14', word: 'Lamp', categoryId: 'cat3' },
  { id: 'f15', word: 'Sofa', categoryId: 'cat3' },
  { id: 'f16', word: 'Tree', categoryId: 'cat4' },
  { id: 'f17', word: 'Flower', categoryId: 'cat4' },
  { id: 'f18', word: 'River', categoryId: 'cat4' },
  { id: 'f19', word: 'Mountain', categoryId: 'cat4' },
  { id: 'f20', word: 'Sun', categoryId: 'cat4' },
  { id: 'f21', word: 'Hand', categoryId: 'cat5' },
  { id: 'f22', word: 'Foot', categoryId: 'cat5' },
  { id: 'f23', word: 'Head', categoryId: 'cat5' },
  { id: 'f24', word: 'Ear', categoryId: 'cat5' },
  { id: 'f25', word: 'Eye', categoryId: 'cat5' }
];

// Default sets
const defaultSets = [
  { id: 1, name: 'Set 1', flashcardIds: ['f1', 'f6', 'f11', 'f16', 'f21'] },
  { id: 2, name: 'Set 2', flashcardIds: ['f2', 'f7', 'f12', 'f17', 'f22'] },
  { id: 3, name: 'Set 3', flashcardIds: ['f3', 'f8', 'f13', 'f18', 'f23'] },
  { id: 4, name: 'Set 4', flashcardIds: ['f4', 'f9', 'f14', 'f19', 'f24'] },
  { id: 5, name: 'Set 5', flashcardIds: ['f5', 'f10', 'f15', 'f20', 'f25'] }
];

// Provider component
export const FlashcardProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [sets, setSets] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Load data from localStorage on initial render
  useEffect(() => {
    const loadData = () => {
      try {
        // Load categories or use defaults if none found
        const savedCategories = localStorage.getItem('categories');
        setCategories(savedCategories ? JSON.parse(savedCategories) : defaultCategories);
        
        // Load flashcards or use defaults if none found
        const savedFlashcards = localStorage.getItem('flashcards');
        setFlashcards(savedFlashcards ? JSON.parse(savedFlashcards) : defaultFlashcards);
        
        // Load sets or use defaults if none found
        const savedSets = localStorage.getItem('sets');
        setSets(savedSets ? JSON.parse(savedSets) : defaultSets);
        
        // Load history if available
        const savedHistory = localStorage.getItem('history');
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error("Error loading data from localStorage:", error);
        
        // Fallback to defaults if error
        setCategories(defaultCategories);
        setFlashcards(defaultFlashcards);
        setSets(defaultSets);
      }
    };
    
    loadData();
  }, []);
  
  // Save data to localStorage whenever it changes
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
  
  // Category CRUD operations
  const addCategory = (name) => {
    const newCategory = {
      id: `cat${Date.now()}`,
      name
    };
    setCategories([...categories, newCategory]);
    return newCategory;
  };
  
  const updateCategory = (id, name) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, name } : cat
    ));
  };
  
  const deleteCategory = (id) => {
    // First check if there are flashcards using this category
    const hasFlashcards = flashcards.some(card => card.categoryId === id);
    
    if (hasFlashcards) {
      return { success: false, message: 'Cannot delete category with flashcards. Remove flashcards first.' };
    }
    
    setCategories(categories.filter(cat => cat.id !== id));
    return { success: true };
  };
  
  // Flashcard CRUD operations
  const addFlashcard = (word, categoryId) => {
    const newFlashcard = {
      id: `f${Date.now()}`,
      word,
      categoryId
    };
    setFlashcards([...flashcards, newFlashcard]);
    return newFlashcard;
  };
  
  const updateFlashcard = (id, updates) => {
    setFlashcards(flashcards.map(card => 
      card.id === id ? { ...card, ...updates } : card
    ));
  };
  
  const deleteFlashcard = (id) => {
    // First check if this flashcard is in any sets
    const inSets = sets.some(set => set.flashcardIds.includes(id));
    
    if (inSets) {
      // Remove from all sets first
      setSets(sets.map(set => ({
        ...set,
        flashcardIds: set.flashcardIds.filter(cardId => cardId !== id)
      })));
    }
    
    // Then delete the flashcard
    setFlashcards(flashcards.filter(card => card.id !== id));
  };
  
  // Set operations
  const updateSetFlashcards = (setId, flashcardIds) => {
    setSets(sets.map(set => 
      set.id === setId ? { ...set, flashcardIds } : set
    ));
  };
  
  // Get flashcards by category
  const getFlashcardsByCategory = (categoryId) => {
    return flashcards.filter(card => card.categoryId === categoryId);
  };
  
  // Get flashcards for a set
  const getFlashcardsForSet = (setId) => {
    const set = sets.find(s => s.id === setId);
    if (!set) return [];
    
    return set.flashcardIds
      .map(id => flashcards.find(card => card.id === id))
      .filter(Boolean); // Remove any undefined entries
  };
  
  // Record daily tracking data
  const saveTrackingData = (data) => {
    const existingIndex = history.findIndex(item => item.date === data.date);
    
    if (existingIndex >= 0) {
      // Update existing record
      const updatedHistory = [...history];
      updatedHistory[existingIndex] = data;
      setHistory(updatedHistory);
    } else {
      // Add new record
      setHistory([...history, data]);
    }
  };
  
  // Get tracking data for a specific date
  const getTrackingData = (date) => {
    return history.find(item => item.date === date) || null;
  };
  
  // Get flashcard usage statistics
  const getFlashcardStats = () => {
    // Initialize counter object
    const stats = {};
    
    // Count appearances in history for each flashcard and category
    history.forEach(day => {
      // For each set used that day
      Object.entries(day.setUsage || {}).forEach(([setId, count]) => {
        if (count > 0) {
          // Get the flashcards in this set
          const setObj = sets.find(s => s.id === parseInt(setId));
          if (setObj) {
            setObj.flashcardIds.forEach(flashcardId => {
              // Initialize or increment flashcard count
              stats[flashcardId] = (stats[flashcardId] || 0) + count;
              
              // Find the category for this flashcard
              const card = flashcards.find(c => c.id === flashcardId);
              if (card) {
                // Initialize or increment category count
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
    getFlashcardStats
  };
  
  return (
    <FlashcardContext.Provider value={contextValue}>
      {children}
    </FlashcardContext.Provider>
  );
};

// Custom hook for using the flashcard context
export const useFlashcards = () => {
  return useContext(FlashcardContext);
};
