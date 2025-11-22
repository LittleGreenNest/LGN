// components/FlashcardManager.js
import React, { useState } from 'react';
import { useFlashcards } from '../context/FlashcardContext';
import CSVImport from './CSVImport';
import PrintFlashcards from './PrintFlashcards';

const FlashcardManager = () => {
  const {
    categories,
    flashcards,
    addCategory,
    updateCategory,
    deleteCategory,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
  } = useFlashcards();

  // UI state
  const [activeTab, setActiveTab] = useState('categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [showCSVImport, setShowCSVImport] = useState(false);

  // Form state
  const [newCategoryName, setNewCategoryName] = useState('');

  // Add-card form: common fields
  const [newFlashcardWord, setNewFlashcardWord] = useState('');
  const [newFlashcardCategory, setNewFlashcardCategory] = useState('');
  const [newFlashcardEnglish, setNewFlashcardEnglish] = useState('');
  const [newFlashcardPinyin, setNewFlashcardPinyin] = useState('');

  // NEW: card type + phrase group for add form
  const [cardType, setCardType] = useState('word'); // 'word' | 'phrase'
  const [phraseGroup, setPhraseGroup] = useState('');

  // Edit state
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [editFlashcardId, setEditFlashcardId] = useState(null);
  const [editFlashcardWord, setEditFlashcardWord] = useState('');
  const [editFlashcardCategory, setEditFlashcardCategory] = useState('');
  const [editFlashcardEnglish, setEditFlashcardEnglish] = useState('');
  const [editFlashcardPinyin, setEditFlashcardPinyin] = useState('');

  // NEW: edit-time card type + phrase group
  const [editCardType, setEditCardType] = useState('word');
  const [editPhraseGroup, setEditPhraseGroup] = useState('');

  // Message state
  const [message, setMessage] = useState({ text: '', type: '' });

  // Show message function
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // Toggle CSV import modal
  const toggleCSVImport = () => {
    setShowCSVImport(!showCSVImport);
  };

  // Export flashcards as CSV (unchanged)
  const handleExportFlashcards = () => {
    try {
      const cardsToExport = selectedCategoryId
        ? flashcards.filter((card) => card.categoryId === selectedCategoryId)
        : flashcards;

      if (cardsToExport.length === 0) {
        alert('No flashcards to export.');
        return;
      }

      const categoryIds = [...new Set(cardsToExport.map((card) => card.categoryId))];
      const categoryNames = categoryIds.map((id) => {
        const category = categories.find((c) => c.id === id);
        return category ? category.name : 'Unknown';
      });

      const csvData = {};
      categoryNames.forEach((name) => {
        csvData[name] = [];
      });

      cardsToExport.forEach((card) => {
        const category = categories.find((c) => c.id === card.categoryId);
        const categoryName = category ? category.name : 'Unknown';
        csvData[categoryName].push(card.word);
      });

      const maxLength = Math.max(...Object.values(csvData).map((arr) => arr.length));
      const csvRows = [];
      csvRows.push(Object.keys(csvData).join(','));

      for (let i = 0; i < maxLength; i++) {
        const row = Object.values(csvData).map((arr) => {
          const word = i < arr.length ? arr[i] : '';
          return word.includes(',') || word.includes('"')
            ? `"${word.replace(/"/g, '""')}"`
            : word;
        });
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = selectedCategoryId
        ? `flashcards-${categories.find((c) => c.id === selectedCategoryId)?.name || 'category'}.csv`
        : 'all-flashcards.csv';

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting flashcards:', error);
      alert('There was an error exporting the flashcards. Please try again.');
    }
  };

  // Handlers for Categories
  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    addCategory(newCategoryName);
    setNewCategoryName('');
    showMessage('Category added successfully');
  };

  const handleEditCategory = (category) => {
    setEditCategoryId(category.id);
    setEditCategoryName(category.name);
  };

  const handleUpdateCategory = (e) => {
    e.preventDefault();
    if (!editCategoryName.trim() || !editCategoryId) return;

    updateCategory(editCategoryId, editCategoryName);
    setEditCategoryId(null);
    setEditCategoryName('');
    showMessage('Category updated successfully');
  };

  const handleDeleteCategory = (categoryId) => {
    const result = deleteCategory(categoryId);

    if (result.success) {
      showMessage('Category deleted successfully');
    } else {
      showMessage(result.message, 'error');
    }
  };

  // Handlers for Flashcards
  const handleAddFlashcard = async (e) => {
    e.preventDefault();
    if (!newFlashcardWord.trim() || !newFlashcardCategory) return;

    await addFlashcard(
      newFlashcardWord.trim(),
      newFlashcardCategory,
      newFlashcardEnglish.trim(),
      newFlashcardPinyin.trim(),
      {
        cardType,
        phraseGroup: cardType === 'phrase' ? phraseGroup.trim() : '',
      }
    );

    setNewFlashcardWord('');
    setNewFlashcardEnglish('');
    setNewFlashcardPinyin('');
    setPhraseGroup('');
    // keep cardType as chosen, so you can add multiple phrases in a row

    showMessage(cardType === 'phrase' ? 'Phrase added successfully' : 'Flashcard added successfully');
  };

  const handleEditFlashcard = (flashcard) => {
    setEditFlashcardId(flashcard.id);
    setEditFlashcardWord(flashcard.word);
    setEditFlashcardCategory(flashcard.categoryId);
    setEditFlashcardEnglish(flashcard.english || '');
    setEditFlashcardPinyin(flashcard.pinyin || '');
    setEditCardType(flashcard.cardType || 'word');
    setEditPhraseGroup(flashcard.phraseGroup || '');
  };

  const handleUpdateFlashcard = async (e) => {
    e.preventDefault();
    if (!editFlashcardWord.trim() || !editFlashcardCategory || !editFlashcardId) return;

    await updateFlashcard(editFlashcardId, {
      word: editFlashcardWord.trim(),
      english: editFlashcardEnglish.trim(),
      pinyin: editFlashcardPinyin.trim(),
      categoryId: editFlashcardCategory,
      cardType: editCardType,
      phraseGroup: editCardType === 'phrase' ? editPhraseGroup.trim() : '',
    });

    setEditFlashcardId(null);
    setEditFlashcardWord('');
    setEditFlashcardCategory('');
    setEditFlashcardEnglish('');
    setEditFlashcardPinyin('');
    setEditCardType('word');
    setEditPhraseGroup('');
    showMessage('Flashcard updated successfully');
  };

  const handleDeleteFlashcard = (flashcardId) => {
    deleteFlashcard(flashcardId);
    showMessage('Flashcard deleted successfully');
  };

  return (
    <div>
      {/* CSV Import Modal */}
      {showCSVImport && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <CSVImport onClose={toggleCSVImport} />
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Buttons */}
      <div className="flex justify-end mb-4 space-x-3">
        <button
          onClick={handleExportFlashcards}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {/* ...icon omitted for brevity (unchanged)... */}
          <span className="ml-1">Export as CSV</span>
        </button>
        <button
          onClick={toggleCSVImport}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          {/* ...icon omitted for brevity (unchanged)... */}
          <span className="ml-1">Import from CSV</span>
        </button>
      </div>

      {/* Notification Message */}
      {message.text && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex mb-6 border-b">
        <button
          className={`px-4 py-2 ${
            activeTab === 'categories'
              ? 'bg-blue-100 border-b-2 border-blue-500 font-medium'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === 'flashcards'
              ? 'bg-blue-100 border-b-2 border-blue-500 font-medium'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('flashcards')}
        >
          Flashcards
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === 'print-flashcards'
              ? 'bg-blue-100 border-b-2 border-blue-500 font-medium'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('print-flashcards')}
        >
          Print Flashcards
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Add Category Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-medium mb-3">Add New Category</h3>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Category name"
                className="flex-1 border rounded-md px-3 py-2"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
              />
              <button
                type="submit"
                className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
              >
                Add
              </button>
            </form>
          </div>

          {/* Categories List (unchanged) */}
          {/* ... existing categories list code stays the same ... */}
        </div>
      )}

      {/* Flashcards Tab */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          {/* Add Flashcard / Phrase Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-medium mb-3">Add New Flashcard</h3>

            {/* Card type toggle */}
            <div className="mb-4">
              <span className="block text-sm font-medium mb-1">Card type</span>
              <div className="inline-flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCardType('word')}
                  className={`px-3 py-1 text-sm ${
                    cardType === 'word'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Single Word
                </button>
                <button
                  type="button"
                  onClick={() => setCardType('phrase')}
                  className={`px-3 py-1 text-sm ${
                    cardType === 'phrase'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Phrase / Sentence
                </button>
              </div>
            </div>

            <form onSubmit={handleAddFlashcard} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {cardType === 'word'
                    ? 'Flashcard Word'
                    : 'Phrase (Chinese)'}
                  <span className="text-gray-500 text-xs ml-1">
                    {cardType === 'word'
                      ? '(input any English or Chinese word of your choice)'
                      : '(short Chinese phrase or sentence)'}
                  </span>
                </label>
                <input
                  type="text"
                  placeholder={
                    cardType === 'word'
                      ? 'Flashcard word'
                      : 'Example: 他在喝水。'
                  }
                  className="w-full border rounded-md px-3 py-2"
                  value={newFlashcardWord}
                  onChange={(e) => setNewFlashcardWord(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  English
                  <span className="text-gray-500 text-xs ml-1">
                    (for the back of the card)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder={
                    cardType === 'word'
                      ? 'Dog'
                      : 'Example: He is drinking water.'
                  }
                  className="w-full border rounded-md px-3 py-2"
                  value={newFlashcardEnglish}
                  onChange={(e) => setNewFlashcardEnglish(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Pinyin
                  <span className="text-gray-500 text-xs ml-1">
                    (for Chinese words / phrases)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder={
                    cardType === 'word'
                      ? 'gǒu'
                      : 'tā zài hē shuǐ.'
                  }
                  className="w-full border rounded-md px-3 py-2"
                  value={newFlashcardPinyin}
                  onChange={(e) => setNewFlashcardPinyin(e.target.value)}
                />
              </div>

              {/* Phrase group only for phrases */}
              {cardType === 'phrase' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phrase Group <span className="text-gray-500 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Daily routine, Bedtime, Mealtime"
                    className="w-full border rounded-md px-3 py-2"
                    value={phraseGroup}
                    onChange={(e) => setPhraseGroup(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={newFlashcardCategory}
                  onChange={(e) => setNewFlashcardCategory(e.target.value)}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
              >
                {cardType === 'phrase' ? 'Add Phrase' : 'Add Word'}
              </button>
            </form>
          </div>

          {/* Flashcards List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-medium mb-3">Flashcards</h3>

            {/* Category Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Filter by Category
              </label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {flashcards.length === 0 ? (
              <p className="text-gray-500">
                No flashcards yet. Add one above or import from CSV.
              </p>
            ) : (
              <div className="space-y-2">
                {flashcards
                  .filter(
                    (card) =>
                      !selectedCategoryId ||
                      card.categoryId === selectedCategoryId
                  )
                  .map((flashcard) => {
                    const category = categories.find(
                      (c) => c.id === flashcard.categoryId
                    );

                    const isPhrase = flashcard.cardType === 'phrase';

                    return (
                      <div key={flashcard.id} className="border rounded-md p-3">
                        {editFlashcardId === flashcard.id ? (
                          <form
                            onSubmit={handleUpdateFlashcard}
                            className="space-y-2"
                          >
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Word / Phrase
                              </label>
                              <input
                                type="text"
                                className="w-full border rounded-md px-3 py-1"
                                value={editFlashcardWord}
                                onChange={(e) =>
                                  setEditFlashcardWord(e.target.value)
                                }
                                required
                              />
                              <label className="block text-xs text-gray-500 mt-1">
                                Type: {editCardType === 'phrase'
                                  ? 'Phrase / Sentence'
                                  : 'Single Word'}
                              </label>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1 mt-2">
                                English
                              </label>
                              <input
                                type="text"
                                value={editFlashcardEnglish}
                                onChange={(e) =>
                                  setEditFlashcardEnglish(e.target.value)
                                }
                                placeholder="English meaning"
                                className="w-full border rounded-md px-3 py-2"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1 mt-2">
                                Pinyin
                              </label>
                              <input
                                type="text"
                                value={editFlashcardPinyin}
                                onChange={(e) =>
                                  setEditFlashcardPinyin(e.target.value)
                                }
                                placeholder="Pinyin"
                                className="w-full border rounded-md px-3 py-2"
                              />
                            </div>

                            {editCardType === 'phrase' && (
                              <div>
                                <label className="block text-sm font-medium mb-1 mt-2">
                                  Phrase Group (optional)
                                </label>
                                <input
                                  type="text"
                                  value={editPhraseGroup}
                                  onChange={(e) =>
                                    setEditPhraseGroup(e.target.value)
                                  }
                                  placeholder="e.g. Daily routine"
                                  className="w-full border rounded-md px-3 py-2"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Category
                              </label>
                              <select
                                className="w-full border rounded-md px-3 py-1"
                                value={editFlashcardCategory}
                                onChange={(e) =>
                                  setEditFlashcardCategory(e.target.value)
                                }
                                required
                              >
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex gap-2 mt-2">
                              <button
                                type="submit"
                                className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="bg-gray-200 px-3 py-1 rounded-md hover:bg-gray-300"
                                onClick={() => {
                                  setEditFlashcardId(null);
                                  setEditFlashcardWord('');
                                  setEditFlashcardCategory('');
                                  setEditFlashcardEnglish('');
                                  setEditFlashcardPinyin('');
                                  setEditCardType('word');
                                  setEditPhraseGroup('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-medium">
                                  {flashcard.word}
                                </div>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                                    isPhrase
                                      ? 'border-purple-300 text-purple-700 bg-purple-50'
                                      : 'border-gray-300 text-gray-600 bg-gray-50'
                                  }`}
                                >
                                  {isPhrase ? 'Phrase' : 'Word'}
                                </span>
                                {flashcard.phraseGroup && (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] bg-purple-100 text-purple-800">
                                    {flashcard.phraseGroup}
                                  </span>
                                )}
                              </div>
                              {flashcard.english && (
                                <div className="text-xs text-gray-600 mt-1">
                                  EN: {flashcard.english}
                                </div>
                              )}
                              {flashcard.pinyin && (
                                <div className="text-xs text-gray-500">
                                  Pinyin: {flashcard.pinyin}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                Category:{' '}
                                {category ? category.name : 'Unknown'}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditFlashcard(flashcard)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteFlashcard(flashcard.id)
                                }
                                className="text-red-500 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print Flashcards Tab */}
      {activeTab === 'print-flashcards' && <PrintFlashcards />}
    </div>
  );
};

export default FlashcardManager;
