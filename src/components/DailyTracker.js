import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useFlashcards } from "../context/FlashcardContext";
import {
  getDailyTrackingForDate,
  saveDailyTrackingForDate,
} from "../lib/trackingApi";

const MAX_WORDS_PER_SET = 5;

const DailyTracker = () => {
  const { currentUser } = useAuth();
  const { sets } = useFlashcards();

  const today = new Date().toISOString().split("T")[0];

  const [selectedSets, setSelectedSets] = useState([]);
  const [setUsage, setSetUsage] = useState({});
  const [engagement, setEngagement] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState("");
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  // lightbox for /manage-flashcards
  const [showManageLightbox, setShowManageLightbox] = useState(false);

  // Load today's data
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    async function load() {
      try {
        const todayData = await getDailyTrackingForDate(today);
        if (!todayData || !isMounted) return;

        const setIds = todayData.selected_sets || [];
        setSelectedSets(
          setIds.map((id) =>
            typeof id === "string" ? parseInt(id, 10) : id
          )
        );

        const usage = {};
        Object.entries(todayData.set_usage || {}).forEach(
          ([setId, count]) => {
            usage[parseInt(setId, 10)] = count;
          }
        );

        setSetUsage(usage);
        setEngagement(todayData.engagement || 0);
        setTimeOfDay(todayData.time_of_day || "");
        setNotes(todayData.notes || "");
      } catch (err) {
        console.error("Error loading today tracking:", err);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [currentUser, today]);

  // Toggle a set's selection
  const toggleSet = (setId) => {
    if (selectedSets.includes(setId)) {
      const newSelected = selectedSets.filter((id) => id !== setId);
      const newUsage = { ...setUsage };
      delete newUsage[setId];
      setSelectedSets(newSelected);
      setSetUsage(newUsage);
    } else {
      setSelectedSets([...selectedSets, setId]);
      setSetUsage((prev) => ({
        ...prev,
        [setId]: prev[setId] || 0,
      }));
    }
  };

  // Increment / decrement usage count for a set
  const incrementCount = (setId) => {
    setSetUsage((prev) => ({
      ...prev,
      [setId]: (prev[setId] || 0) + 1,
    }));
  };

  const decrementCount = (setId) => {
    setSetUsage((prev) => {
      const current = prev[setId] || 0;
      const next = current > 0 ? current - 1 : 0;
      return { ...prev, [setId]: next };
    });
  };

  // Save today's data
  const saveData = async () => {
    if (!currentUser) {
      alert("Please log in to save your tracking.");
      return;
    }

    setSaveStatus("Saving...");

    try {
      await saveDailyTrackingForDate(currentUser.id, today, {
        selectedSets,
        setUsage,
        engagement,
        timeOfDay,
        notes,
      });

      setSaveStatus("Saved successfully!");
    } catch (error) {
      console.error("Error saving data:", error);
      setSaveStatus("Error saving data");
    } finally {
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Daily Flashcard Tracker
          </h1>
          <div className="text-sm text-gray-500">Today: {today}</div>
        </div>

        {/* Set Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Select sets for today:</h3>
            <button
              type="button"
              onClick={() => setShowManageLightbox(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 underline"
            >
              Manage flashcards
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Choose the sets you used today. Each set usually has about{" "}
            {MAX_WORDS_PER_SET} words.
          </p>
          <div className="flex flex-wrap gap-2">
            {sets.map((set) => (
              <button
                key={set.id}
                onClick={() => toggleSet(set.id)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedSets.includes(set.id)
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {set.name}
              </button>
            ))}
            {sets.length === 0 && (
              <p className="text-sm text-gray-500">
                No sets yet — add some flashcards first.
              </p>
            )}
          </div>
        </div>

        {/* Tracking Selected Sets */}
        {selectedSets.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-medium mb-3">Track flashes:</h3>
            <p className="text-xs text-gray-500 mb-3">
              Tap + once each time you flash the whole set.
            </p>
            <div className="space-y-4">
              {sets
                .filter((set) => selectedSets.includes(set.id))
                .map((set) => {
                  const setCards = Array.isArray(set.cards) ? set.cards : [];
                  return (
                    <div key={set.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{set.name}</h4>
                        <div className="text-gray-500 text-sm">
                          {setCards.length} words in this set
                        </div>
                      </div>

                      {/* Words preview */}
                      {setCards.length > 0 && (
                        <div className="text-xs text-gray-500 mb-3">
                          {setCards.map((card, index) => (
                            <span key={card.id || index}>
                              {card.word}
                              {index < setCards.length - 1 && ", "}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Counter */}
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
                      ? "bg-yellow-400 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {rating <= 2 ? "😐" : rating <= 4 ? "😊" : "😃"}
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
              {["Morning", "Afternoon", "Evening", "Night"].map((time) => (
                <button
                  key={time}
                  onClick={() => setTimeOfDay(time)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    timeOfDay === time
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {time}{" "}
                  {time === "Morning"
                    ? "🌅"
                    : time === "Afternoon"
                    ? "☀️"
                    : time === "Evening"
                    ? "🌆"
                    : "🌙"}
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
              placeholder="Record observations, words recognised, special moments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-4 flex justify-end">
          {saveStatus && (
            <div
              className={`mr-4 py-2 px-4 rounded text-sm ${
                saveStatus.includes("Error")
                  ? "bg-red-100 text-red-700"
                  : saveStatus === "Saving..."
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
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
      </div>

      {/* Lightbox with /manage-flashcards in an iframe */}
      {showManageLightbox && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-5xl h-[80vh]">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h2 className="text-sm font-semibold text-gray-800">
                Manage flashcards
              </h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-700 text-lg leading-none"
                onClick={() => setShowManageLightbox(false)}
              >
                ✕
              </button>
            </div>
            <iframe
              src="/manage-flashcards"
              title="Manage flashcards"
              className="w-full h-[calc(100%-40px)] border-0 rounded-b-lg"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default DailyTracker;
