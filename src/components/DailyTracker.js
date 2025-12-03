// src/components/DailyTracker.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import {
  getDailyTrackingForDate,
  saveDailyTrackingForDate,
} from '../lib/trackingApi';

const MAX_WORDS_PER_SET = 5;

const DailyTracker = () => {
  const { currentUser } = useAuth();

  const {
    sets,
    categories,
    flashcards,
    getFlashcardsForSet,
    addFlashcard,
    updateSetFlashcards,
    saveTrackingData,
  } = useFlashcards();

  const today = new Date().toISOString().split('T')[0];

  const [selectedSets, setSelectedSets] = useState([]);
  const [setUsage, setSetUsage] = useState({});
  const [engagement, setEngagement] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const [showFlashcardManager, setShowFlashcardManager] = useState(false);
  const [selectedSetForManage, setSelectedSetForManage] = useState(null);

  const [manageSearchTerm, setManageSearchTerm] = useState('');
  const [manageActiveCategoryId, setManageActiveCategoryId] = useState('all');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFlashcardWord, setNewFlashcardWord] = useState('');
  const [newFlashcardEnglish, setNewFlashcardEnglish] = useState('');
  const [newFlashcardPinyin, setNewFlashcardPinyin] = useState('');
  const [newFlashcardCategory, setNewFlashcardCategory] = useState('');

  // -------------------------------------------------------------
  // 🔄 Load today's data from Supabase via trackingApi
  // -------------------------------------------------------------
  useEffect(() => {
    if (!currentUser) return;

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
        Object.entries(todayData.set_usage || {}).forEach(([setId, count]) => {
          usage[parseInt(setId, 10)] = count;
        });

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
  }, [currentUser, today]);

  // -------------------------------------------------------------
  // 💾 Save today's data (Supabase + local history)
  // -------------------------------------------------------------
  const handleSave = async () => {
    if (!currentUser) {
      setSaveStatus('Please log in to save your tracking.');
      return;
    }

    setSaveStatus('Saving...');

    // IMPORTANT: match trackingApi's expected shape
    const payload = {
      selectedSets,
      setUsage,
      engagement,
      timeOfDay,
      notes,
    };

    try {
      await saveDailyTrackingForDate(today, payload);

      // keep local history in sync
      saveTrackingData({
        date: today,
        selectedSets,
        setUsage,
        engagement,
        timeOfDay,
        notes,
      });

      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error('Error saving tracking:', err);
      setSaveStatus('Error saving. Please try again.');
    }
  };

  // -------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------
  const toggleSetSelection = (setId) => {
    setSelectedSets((prev) =>
      prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]
    );
  };

  const handleSetUsageChange = (setId, value) => {
    const count = parseInt(value || '0', 10);
    setSetUsage((prev) => ({
      ...prev,
      [setId]: Number.isNaN(count) ? 0 : count,
    }));
  };

  const handleCreateFlashcard = async (e) => {
    e.preventDefault();
    if (!newFlashcardWord || !newFlashcardCategory) return;

    const card = await addFlashcard(
      newFlashcardWord,
      newFlashcardCategory,
      newFlashcardEnglish,
      newFlashcardPinyin
    );

    if (selectedSetForManage) {
      const currentIds =
        sets.find((s) => s.id === selectedSetForManage)?.flashcardIds || [];
      updateSetFlashcards(selectedSetForManage, [...currentIds, card.id]);
    }

    setNewFlashcardWord('');
    setNewFlashcardEnglish('');
    setNewFlashcardPinyin('');
    setNewFlashcardCategory('');
    setShowCreateForm(false);
  };

  const filteredFlashcards = flashcards.filter((card) => {
    if (
      manageActiveCategoryId !== 'all' &&
      card.categoryId !== manageActiveCategoryId
    ) {
      return false;
    }
    if (!manageSearchTerm.trim()) return true;
    const term = manageSearchTerm.toLowerCase();
    return (
      card.word.toLowerCase().includes(term) ||
      (card.english || '').toLowerCase().includes(term) ||
      (card.pinyin || '').toLowerCase().includes(term)
    );
  });

  // -------------------------------------------------------------
  // JSX (same structure as you have now)
  // -------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Daily Flashcard Tracker
        </h1>
        <div className="text-sm text-gray-500">Today: {today}</div>
      </div>

      {/* Sets Selection */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Flashcard Sets Used
          </h2>
          <button
            type="button"
            className="text-sm text-indigo-600 hover:text-indigo-700"
            onClick={() => setShowFlashcardManager((prev) => !prev)}
          >
            {showFlashcardManager ? 'Hide Flashcard Manager' : 'Manage Flashcards'}
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Select the sets you used today and record how many times you flashed
          each set. Each set usually has about {MAX_WORDS_PER_SET} words.
        </p>

        <div className="space-y-2">
          {sets.map((set) => {
            const cards = getFlashcardsForSet(set.id);
            const count = setUsage[set.id] || 0;
            return (
              <div
                key={set.id}
                className="flex items-center justify-between border rounded-md px-3 py-2"
              >
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedSets.includes(set.id)}
                    onChange={() => toggleSetSelection(set.id)}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{set.name}</div>
                    <div className="text-xs text-gray-500">
                      {cards.length} cards in this set
                    </div>
                  </div>
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Times flashed</span>
                  <input
                    type="number"
                    min="0"
                    className="w-16 border rounded px-2 py-1 text-sm"
                    value={count}
                    onChange={(e) =>
                      handleSetUsageChange(set.id, e.target.value)
                    }
                  />
                </div>
              </div>
            );
          })}
          {sets.length === 0 && (
            <p className="text-sm text-gray-500">
              You don&apos;t have any sets yet. Create flashcards and group them
              into sets first.
            </p>
          )}
        </div>
      </div>

      {/* Engagement + Time of Day + Notes */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Session Details</h2>

        {/* Engagement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Engagement Rating (1–5)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={engagement}
              onChange={(e) => setEngagement(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <span className="text-lg font-semibold text-gray-900">
              {engagement}/5
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            0 = skipped, 5 = super engaged and happy.
          </p>
        </div>

        {/* Time of day */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time of Day
          </label>
          <select
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything special about today's session? Meltdowns, new words, favourite card, etc."
          />
        </div>

        {/* Save button + status */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Save Today&apos;s Tracking
          </button>
          {saveStatus && (
            <div className="text-sm text-gray-600">{saveStatus}</div>
          )}
        </div>
      </div>

      {/* Flashcard Manager (simple) */}
      {showFlashcardManager && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">
            Flashcard Manager
          </h2>

          {/* Choose set to manage */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Manage set:</span>
            <select
              className="border-gray-300 rounded-md text-sm"
              value={selectedSetForManage || ''}
              onChange={(e) =>
                setSelectedSetForManage(
                  e.target.value ? parseInt(e.target.value, 10) : null
                )
              }
            >
              <option value="">None</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="flex-1 border rounded-md px-2 py-1 text-sm"
              placeholder="Search flashcards..."
              value={manageSearchTerm}
              onChange={(e) => setManageSearchTerm(e.target.value)}
            />
            <select
              className="border-gray-300 rounded-md text-sm"
              value={manageActiveCategoryId}
              onChange={(e) => setManageActiveCategoryId(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="text-sm text-indigo-600 hover:text-indigo-700"
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              {showCreateForm ? 'Cancel' : 'Add New Flashcard'}
            </button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateFlashcard}
              className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2"
            >
              <input
                type="text"
                className="border rounded-md px-2 py-1 text-sm"
                placeholder="Chinese word"
                value={newFlashcardWord}
                onChange={(e) => setNewFlashcardWord(e.target.value)}
                required
              />
              <input
                type="text"
                className="border rounded-md px-2 py-1 text-sm"
                placeholder="English"
                value={newFlashcardEnglish}
                onChange={(e) => setNewFlashcardEnglish(e.target.value)}
              />
              <input
                type="text"
                className="border rounded-md px-2 py-1 text-sm"
                placeholder="Pinyin"
                value={newFlashcardPinyin}
                onChange={(e) => setNewFlashcardPinyin(e.target.value)}
              />
              <select
                className="border rounded-md px-2 py-1 text-sm"
                value={newFlashcardCategory}
                onChange={(e) => setNewFlashcardCategory(e.target.value)}
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="md:col-span-4 flex justify-end mt-2">
                <button
                  type="submit"
                  className="px-3 py-1 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          )}

          {/* Flashcards list */}
          <div className="mt-3 max-h-64 overflow-y-auto border rounded-md divide-y">
            {filteredFlashcards.map((card) => (
              <div
                key={card.id}
                className="px-3 py-2 flex items-center justify-between text-sm"
              >
                <div>
                  <div className="font-medium text-gray-900">{card.word}</div>
                  <div className="text-xs text-gray-500">
                    {(card.english || '') +
                      (card.pinyin ? ` · ${card.pinyin}` : '')}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {
                    categories.find((c) => c.id === card.categoryId)?.name ||
                    'Uncategorised'
                  }
                </div>
              </div>
            ))}
            {filteredFlashcards.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No flashcards match your filters yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTracker;
