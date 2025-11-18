// components/DailyTracker.js
import React, { useState, useEffect } from 'react';
import { useFlashcards } from '../context/FlashcardContext';
import {
  getDailyTrackingForDate,
  saveDailyTrackingForDate,
} from '../lib/trackingApi';

const MAX_WORDS_PER_SET = 5;

const DailyTracker = () => {
  const {
    sets,
    categories,
    flashcards,
    getFlashcardsForSet,
    addFlashcard,
    updateSetFlashcards,
  } = useFlashcards();

  // Current date formatted as YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  // State for today's tracking
  const [selectedSets, setSelectedSets] = useState([]);
  const [setUsage, setSetUsage] = useState({});
  const [engagement, setEngagement] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Manage-words modal state
  const [showFlashcardManager, setShowFlashcardManager] = useState(false);
  const [selectedSetForManage, setSelectedSetForManage] = useState(null);

  // Search + filter for manage-words view
  const [manageSearchTerm, setManageSearchTerm] = useState('');
  const [manageActiveCategoryId, setManageActiveCategoryId] = useState('all');

  // Create-new-word form state (in manage-words modal)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFlashcardWord, setNewFlashcardWord] = useState('');
  const [newFlashcardEnglish, setNewFlashcardEnglish] = useState('');
  const [newFlashcardPinyin, setNewFlashcardPinyin] = useState('');
  const [newFlashcardCategory, setNewFlashcardCategory] = useState('');

  // Load today's data from Supabase if it exists
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const todayData = await getDailyTrackingForDate(today);
        if (!todayData || !isMounted) return;

        const setIds = todayData.selected_sets || [];
        setSelectedSets(
          setIds.map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
        );

        const usage = {};
        Object.entries(todayData.set_usage || {}).forEach(
          ([setId, count]) => {
            usage[parseInt(setId, 10)] = count;
          }
        );

        setSetUsage(usage);
        setEngagement(todayData.engagement || 0);
        setTimeOfDay(todayData.time_of_day || '');
        setNotes(todayData.notes || '');
      } catch (err) {
        console.error('Error loading today tracking:', err);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [today]);

  // Toggle a set's selection
  const toggleSet = (setId) => {
    if (selectedSets.includes(setId)) {
      setSelectedSets(selectedSets.filter((id) => id !== setId));
      const newUsage = { ...setUsage };
      delete newUsage[setId];
      setSetUsage(newUsage);
    } else {
      setSelectedSets([...selectedSets, setId]);
      setSetUsage({ ...setUsage, [setId]: 0 });
    }
  };

  // Increment usage count for a set
  const incrementCount = (setId) => {
    setSetUsage({
      ...setUsage,
      [setId]: (setUsage[setId] || 0) + 1,
    });
  };

  // Decrement usage count for a set
  const decrementCount = (setId) => {
    if (setUsage[setId] && setUsage[setId] > 0) {
      setSetUsage({
        ...setUsage,
        [setId]: setUsage[setId] - 1,
      });
    }
  };

  // Save today's data to Supabase
const saveData = async () => {
  setSaveStatus('Saving...');

  try {
    await saveDailyTrackingForDate({
      date: today,                 // YYYY-MM-DD
      selected_sets: selectedSets, // array of set IDs
      set_usage: setUsage,         // { [setId]: count }
      engagement,
      time_of_day: timeOfDay,
      notes,
    });

    setSaveStatus('Saved successfully!');
  } catch (error) {
    console.error('Error saving data:', error);
    setSaveStatus('Error saving data');
  } finally {
    setTimeout(() => setSaveStatus(''), 3000);
  }
};


  // Get category name for a flashcard
  const getCategoryForFlashcard = (flashcardId) => {
    const flashcard = flashcards.find((f) => f.id === flashcardId);
    if (!flashcard) return 'Unknown';

    const category = categories.find((c) => c.id === flashcard.categoryId);
    return category ? category.name : 'Unknown';
  };

  const getCategoryNameForCardObj = (card) => {
    const category = categories.find((c) => c.id === card.categoryId);
    return category ? category.name : 'Unknown';
  };

  // Find the oldest flashcard in a set (first in array)
  const getOldestFlashcardId = (setId) => {
    const set = sets.find((s) => s.id === setId);
    if (!set || !set.flashcardIds || set.flashcardIds.length === 0) return null;
    return set.flashcardIds[0];
  };

  const getOldestFlashcardObj = (setId) => {
    const oldestId = getOldestFlashcardId(setId);
    if (!oldestId) return null;
    return flashcards.find((c) => c.id === oldestId) || null;
  };

  // Open / close manage-words modal
  const openFlashcardManager = (setId) => {
    setSelectedSetForManage(setId);
    setShowFlashcardManager(true);
    setManageSearchTerm('');
    setManageActiveCategoryId('all');
    setShowCreateForm(false);
    setNewFlashcardWord('');
    setNewFlashcardEnglish('');
    setNewFlashcardPinyin('');
    setNewFlashcardCategory('');
  };

  const closeFlashcardManager = () => {
    setSelectedSetForManage(null);
    setShowFlashcardManager(false);
    setManageSearchTerm('');
    setShowCreateForm(false);
    setNewFlashcardWord('');
    setNewFlashcardEnglish('');
    setNewFlashcardPinyin('');
    setNewFlashcardCategory('');
  };

  // Toggle a flashcard into / out of the current set
  const toggleFlashcardInSet = (flashcardId) => {
    if (!selectedSetForManage) return;

    const set = sets.find((s) => s.id === selectedSetForManage);
    if (!set) return;

    const isInSet = set.flashcardIds.includes(flashcardId);

    if (isInSet) {
      const updatedIds = set.flashcardIds.filter((id) => id !== flashcardId);
      updateSetFlashcards(set.id, updatedIds);
      return;
    }

    if (set.flashcardIds.length >= MAX_WORDS_PER_SET) {
      alert(`You can only have up to ${MAX_WORDS_PER_SET} words in this set.`);
      return;
    }

    const updatedIds = [...set.flashcardIds, flashcardId];
    updateSetFlashcards(set.id, updatedIds);
  };

  // Explicit remove function (used for "Remove" buttons)
  const removeFlashcardFromSet = (setId, flashcardId) => {
    const set = sets.find((s) => s.id === setId);
    if (!set) return;
    const updatedIds = set.flashcardIds.filter((id) => id !== flashcardId);
    updateSetFlashcards(setId, updatedIds);
  };

  // Create-new-word handler (Create and Add to Set)
  const handleAddFlashcardToSet = (e) => {
    e.preventDefault();

    if (
      !newFlashcardWord.trim() ||
      !newFlashcardCategory ||
      !selectedSetForManage
    ) {
      alert('Please fill in the word and category.');
      return;
    }

    const set = sets.find((s) => s.id === selectedSetForManage);
    if (!set) return;

    if (set.flashcardIds.length >= MAX_WORDS_PER_SET) {
      alert(`You can only have up to ${MAX_WORDS_PER_SET} words in this set.`);
      return;
    }

    try {
      const newCard = addFlashcard(
        newFlashcardWord.trim(),
        newFlashcardCategory,
        newFlashcardEnglish.trim() || '',
        newFlashcardPinyin.trim() || ''
      );

      const updatedIds = [...set.flashcardIds, newCard.id];
      updateSetFlashcards(selectedSetForManage, updatedIds);

      setShowCreateForm(false);
      setManageSearchTerm('');
      setNewFlashcardWord('');
      setNewFlashcardEnglish('');
      setNewFlashcardPinyin('');
      setNewFlashcardCategory('');
    } catch (error) {
      console.error('Error adding flashcard:', error);
      alert('Error adding flashcard');
    }
  };

  // Helpers for modal lists
  const currentSet =
    selectedSetForManage != null
      ? sets.find((s) => s.id === selectedSetForManage)
      : null;
  const currentSetCards =
    selectedSetForManage != null
      ? getFlashcardsForSet(selectedSetForManage)
      : [];

  const wordsInCurrentSetCount = currentSet?.flashcardIds?.length || 0;

  const filteredFlashcards = flashcards.filter((card) => {
    const matchesSearch =
      !manageSearchTerm.trim() ||
      card.word.toLowerCase().includes(manageSearchTerm.toLowerCase()) ||
      (card.english &&
        card.english.toLowerCase().includes(manageSearchTerm.toLowerCase()));

    const matchesCategory =
      manageActiveCategoryId === 'all' ||
      card.categoryId === manageActiveCategoryId;

    return matchesSearch && matchesCategory;
  });

  const categoryCounts = categories.reduce(
    (acc, cat) => ({
      ...acc,
      [cat.id]: flashcards.filter((f) => f.categoryId === cat.id).length,
    }),
    {}
  );

  // Group filtered flashcards by category (for "All" view)
  const groupedByCategory = categories
    .map((cat) => ({
      categoryId: cat.id,
      name: cat.name,
      cards: filteredFlashcards.filter((c) => c.categoryId === cat.id),
    }))
    .filter((group) => group.cards.length > 0);

  const formatCreatedDate = (card) => {
    const dateValue = card?.created_at || card?.createdAt;
    if (!dateValue) return null;
    try {
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <div>
      {/* Set Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="font-medium mb-3">Select sets for today:</h3>
        <div className="flex flex-wrap gap-2">
          {sets.map((set) => (
            <button
              key={set.id}
              onClick={() => toggleSet(set.id)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedSets.includes(set.id)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {set.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tracking Selected Sets */}
      {selectedSets.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-medium mb-3">Track flashes:</h3>
          <div className="space-y-4">
            {sets
              .filter((set) => selectedSets.includes(set.id))
              .map((set) => {
                const setCards = getFlashcardsForSet(set.id);
                const oldestFlashcardId = getOldestFlashcardId(set.id);

                return (
                  <div key={set.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{set.name}</h4>
                      <div className="flex items-center">
                        <div className="text-gray-500 text-sm mr-4">
                          {setCards.length} words
                        </div>
                        <button
                          onClick={() => openFlashcardManager(set.id)}
                          className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Manage Words
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-2">
                      {setCards.map((card, index) => (
                        <span
                          key={card.id}
                          className={`${
                            oldestFlashcardId === card.id
                              ? 'text-yellow-600 font-medium'
                              : ''
                          } ${index !== 0 ? 'ml-1' : ''}`}
                        >
                          {card.word}
                          <span className="text-xs text-gray-400">
                            ({getCategoryForFlashcard(card.id)})
                          </span>
                          {oldestFlashcardId === card.id && (
                            <span className="text-xs text-yellow-600 ml-1">
                              (oldest)
                            </span>
                          )}
                          {index < setCards.length - 1 && ', '}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => decrementCount(set.id)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                      >
                        -
                      </button>

                      <span className="mx-3 text-xl font-medium">
                        {setUsage[set.id] || 0}
                      </span>

                      <button
                        onClick={() => incrementCount(set.id)}
                        className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Engagement Tracking */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="font-medium mb-3">Track Child&apos;s Engagement</h3>

        {/* Engagement Rating */}
        <div className="mb-4">
          <div className="text-sm mb-2">
            How engaged was your child today?
          </div>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setEngagement(rating)}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  rating <= engagement
                    ? 'bg-yellow-400 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {rating <= 2 ? '😐' : rating <= 4 ? '😊' : '😃'}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            1 = Minimal Interest • 5 = Highly Engaged
          </div>
        </div>

        {/* Time of Day */}
        <div className="mb-4">
          <div className="text-sm mb-2">
            When was your child most engaged?
          </div>
          <div className="flex flex-wrap gap-2">
            {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
              <button
                key={time}
                onClick={() => setTimeOfDay(time)}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeOfDay === time
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {time}{' '}
                {time === 'Morning'
                  ? '🌅'
                  : time === 'Afternoon'
                  ? '☀️'
                  : time === 'Evening'
                  ? '🌆'
                  : '🌙'}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label
            className="block text-sm font-medium mb-2"
            htmlFor="notes"
          >
            Notes for Today
          </label>
          <textarea
            id="notes"
            rows="3"
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Record observations, words recognized, special moments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-4 flex justify-end">
        {saveStatus && (
          <div
            className={`mr-4 py-2 px-4 rounded ${
              saveStatus.includes('Error')
                ? 'bg-red-100 text-red-700'
                : saveStatus === 'Saving...'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {saveStatus}
          </div>
        )}
        <button
          onClick={saveData}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          Save Today&apos;s Records
        </button>
      </div>

      {/* Manage Words Modal */}
      {showFlashcardManager && currentSet && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              <div className="bg-slate-50 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Manage Words ({wordsInCurrentSetCount}/{MAX_WORDS_PER_SET})
                  </h3>
                  <button
                    className="text-gray-500 hover:text-gray-700 text-sm"
                    onClick={closeFlashcardManager}
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tap words to add or remove them from this set.
                </p>
              </div>

              <div className="px-6 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Oldest card summary */}
                {currentSetCards.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Current Words In Set
                    </div>
                    <div className="border rounded-lg bg-emerald-50 p-3 flex justify-between items-center">
                      <div>
                        <div className="inline-flex items-center gap-2 mb-1">
                          <span className="text-xs uppercase font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Oldest
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {getOldestFlashcardObj(currentSet.id)?.word}
                          </span>
                        </div>
                        {(() => {
                          const oldest = getOldestFlashcardObj(currentSet.id);
                          if (!oldest) return null;
                          const created = formatCreatedDate(oldest);
                          return (
                            <div className="text-xs text-gray-600">
                              {oldest.english && (
                                <span className="mr-2">
                                  ({oldest.english})
                                </span>
                              )}
                              {created && (
                                <span className="text-gray-400">
                                  Added: {created}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {getOldestFlashcardObj(currentSet.id) && (
                        <button
                          onClick={() =>
                            removeFlashcardFromSet(
                              currentSet.id,
                              getOldestFlashcardObj(currentSet.id).id
                            )
                          }
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {currentSetCards.length > 1 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {currentSetCards.slice(1).map((card) => (
                          <button
                            key={card.id}
                            onClick={() =>
                              removeFlashcardFromSet(currentSet.id, card.id)
                            }
                            className="px-2 py-1 rounded-full bg-white border border-gray-200 text-xs flex items-center gap-1"
                          >
                            <span>{card.word}</span>
                            <span className="text-gray-400">
                              ({getCategoryNameForCardObj(card)})
                            </span>
                            <span className="text-red-500 text-[10px] ml-1">
                              ✕
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Search input */}
                <div className="mb-3">
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Search words..."
                    value={manageSearchTerm}
                    onChange={(e) => {
                      setManageSearchTerm(e.target.value);
                      setShowCreateForm(false);
                    }}
                  />
                </div>

                {/* Category chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setManageActiveCategoryId('all')}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      manageActiveCategoryId === 'all'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    All ({flashcards.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setManageActiveCategoryId(cat.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        manageActiveCategoryId === cat.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-700'
                      }`}
                    >
                      {cat.name} ({categoryCounts[cat.id] || 0})
                    </button>
                  ))}
                </div>

                {/* Word list */}
                {filteredFlashcards.length === 0 && !showCreateForm && (
                  <div className="text-center text-sm text-gray-500 py-6">
                    <div className="mb-2">
                      No matches for{' '}
                      <span className="font-semibold">
                        &quot;{manageSearchTerm}&quot;
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowCreateForm(true);
                        setNewFlashcardWord(manageSearchTerm);
                        setNewFlashcardEnglish('');
                        setNewFlashcardPinyin('');
                        setNewFlashcardCategory(
                          manageActiveCategoryId === 'all'
                            ? categories[0]?.id || ''
                            : manageActiveCategoryId
                        );
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                    >
                      + Create &quot;{manageSearchTerm}&quot;
                    </button>
                  </div>
                )}

                {filteredFlashcards.length > 0 && (
                  <div className="space-y-4">
                    {manageActiveCategoryId === 'all'
                      ? groupedByCategory.map((group) => (
                          <div key={group.categoryId}>
                            <div className="text-xs font-semibold text-gray-500 mb-2">
                              {group.name}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {group.cards.map((card) => {
                                const inSet =
                                  currentSet?.flashcardIds?.includes(card.id) ||
                                  false;
                                return (
                                  <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => toggleFlashcardInSet(card.id)}
                                    className={`text-left rounded-lg border px-4 py-3 text-sm transition ${
                                      inSet
                                        ? 'bg-emerald-50 border-emerald-400'
                                        : 'bg-white border-gray-200 hover:border-emerald-400'
                                    }`}
                                  >
                                    <div className="font-medium text-gray-900">
                                      {card.word}
                                    </div>
                                    {card.english && (
                                      <div className="text-xs text-gray-500">
                                        {card.english}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      : (() => {
                          const cat = categories.find(
                            (c) => c.id === manageActiveCategoryId
                          );
                          return (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-2">
                                {cat?.name || 'Category'}
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredFlashcards.map((card) => {
                                  const inSet =
                                    currentSet?.flashcardIds?.includes(
                                      card.id
                                    ) || false;
                                  return (
                                    <button
                                      key={card.id}
                                      type="button"
                                      onClick={() =>
                                        toggleFlashcardInSet(card.id)
                                      }
                                      className={`text-left rounded-lg border px-4 py-3 text-sm transition ${
                                        inSet
                                          ? 'bg-emerald-50 border-emerald-400'
                                          : 'bg-white border-gray-200 hover:border-emerald-400'
                                      }`}
                                    >
                                      <div className="font-medium text-gray-900">
                                        {card.word}
                                      </div>
                                      {card.english && (
                                        <div className="text-xs text-gray-500">
                                          {card.english}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                  </div>
                )}

                {/* Create new word form */}
                {showCreateForm && (
                  <div className="mt-6 border-t pt-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">
                      Create New Word
                    </div>
                    <form
                      onSubmit={handleAddFlashcardToSet}
                      className="space-y-3"
                    >
                      <div>
                        <input
                          type="text"
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          placeholder="Word"
                          value={newFlashcardWord}
                          onChange={(e) =>
                            setNewFlashcardWord(e.target.value)
                          }
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          placeholder="English translation"
                          value={newFlashcardEnglish}
                          onChange={(e) =>
                            setNewFlashcardEnglish(e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          placeholder="Pinyin"
                          value={newFlashcardPinyin}
                          onChange={(e) =>
                            setNewFlashcardPinyin(e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <select
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          value={newFlashcardCategory}
                          onChange={(e) =>
                            setNewFlashcardCategory(e.target.value)
                          }
                          required
                        >
                          <option value="">Select category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                        >
                          Create and Add to Set
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Done Editing */}
              <div className="bg-slate-50 px-6 py-4 border-t flex justify-end">
                <button
                  onClick={closeFlashcardManager}
                  className="w-full sm:w-auto px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Done Editing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTracker;
