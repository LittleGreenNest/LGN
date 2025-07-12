// components/PrintFlashcards.js
import React, { useState, useEffect } from 'react';
import { useFlashcards } from '../context/FlashcardContext';
import { jsPDF } from 'jspdf';

const PrintFlashcards = ({ onClose }) => {
  const { 
    categories,
    flashcards,
    sets,
    getFlashcardsForSet
  } = useFlashcards();

  // State for selection
  const [selectedFlashcards, setSelectedFlashcards] = useState([]);
  const [selectedSets, setSelectedSets] = useState([]);
  const [selectionMode, setSelectionMode] = useState('manual-flashcards');
  const [previewFlashcards, setPreviewFlashcards] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // State for preview pages - organized how they'll appear on A4 pages
  const [previewPages, setPreviewPages] = useState([]);

  // Effect to clear selections when changing selection mode
  useEffect(() => {
    // Clear selections when changing modes
    setSelectedFlashcards([]);
    setSelectedSets([]);
    setPreviewFlashcards([]);
    setPreviewPages([]);
  }, [selectionMode]);

  // Get flashcards based on selected category
  const getFilteredFlashcards = () => {
    if (selectedCategory === 'all') {
      return flashcards;
    } else {
      return flashcards.filter(card => card.categoryId === selectedCategory);
    }
  };

  // Toggle flashcard selection
  const toggleFlashcardSelection = (flashcardId) => {
    setSelectedFlashcards(prevSelected => {
      if (prevSelected.includes(flashcardId)) {
        return prevSelected.filter(id => id !== flashcardId);
      } else {
        return [...prevSelected, flashcardId];
      }
    });
  };

  // Toggle set selection
  const toggleSetSelection = (setId) => {
    setSelectedSets(prevSelected => {
      const newSelection = prevSelected.includes(setId)
        ? prevSelected.filter(id => id !== setId)
        : [...prevSelected, setId];
      
      // Update selected flashcards based on selected sets
      const setFlashcards = [];
      newSelection.forEach(selectedSetId => {
        const set = sets.find(s => s.id === selectedSetId);
        if (set) {
          setFlashcards.push(...set.flashcardIds);
        }
      });
      
      setSelectedFlashcards([...new Set(setFlashcards)]); // Remove duplicates
      
      return newSelection;
    });
  };

  // Clear selections
  const clearSelections = () => {
    setSelectedFlashcards([]);
    setSelectedSets([]);
    setPreviewFlashcards([]);
    setPreviewPages([]);
  };

  // Calculate font size for a word that guarantees it fits within the page
  const calculateSafeFontSize = (word, doc, maxWidth) => {
    // Start with ideal 250pt size for all words (Sprouttie recommends maximum size)
    let fontSize = 250;
    
    // Set font size and measure
    doc.setFontSize(fontSize);
    let textWidth = doc.getStringUnitWidth(word) * fontSize / doc.internal.scaleFactor;
    
    // If already too big, reduce
    if (textWidth > maxWidth) {
      // Calculate precise reduction needed
      fontSize = Math.floor((maxWidth / textWidth) * fontSize);
      doc.setFontSize(fontSize);
      textWidth = doc.getStringUnitWidth(word) * fontSize / doc.internal.scaleFactor;
      
      // Fine-tune by single points if needed
      while (textWidth > maxWidth && fontSize > 40) {
        fontSize -= 1;
        doc.setFontSize(fontSize);
        textWidth = doc.getStringUnitWidth(word) * fontSize / doc.internal.scaleFactor;
      }
    }
    
    // Apply minimal safety margins only when necessary
    // Short words (3 letters or less) - keep at max size whenever possible
    if (word.length > 3 && word.length <= 6) {
      // Medium words
      fontSize = Math.floor(fontSize * 0.995);
    } else if (word.length > 6) {
      // Longer words 
      fontSize = Math.floor(fontSize * 0.99);
    }
    
    return fontSize;
  };

  // Generate preview with accurate font sizing
  const generatePreview = () => {
    if (selectedFlashcards.length === 0) {
      setMessage('Please select at least one flashcard to print.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Create temporary PDF to calculate font sizes
    const tempDoc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = tempDoc.internal.pageSize.getWidth();
    // Use minimal 8mm margins as requested
    const marginSize = 8; // 8mm margins on each side
    const maxWidth = pageWidth - (marginSize * 2);
    
    // Get flashcard details for selected IDs with font sizes
    const flashcardsToPreview = selectedFlashcards.map(id => {
      const flashcard = flashcards.find(card => card.id === id);
      if (!flashcard) return null;
      
      const category = categories.find(cat => cat.id === flashcard.categoryId);
      
      // Calculate exact font size as it would appear in PDF
      const word = flashcard.word;
      
      // Use the improved calculation function
      const fontSize = calculateSafeFontSize(word, tempDoc, maxWidth);
      
      return {
        ...flashcard,
        categoryName: category ? category.name : 'Unknown',
        fontSize: fontSize // Store the exact font size for the preview
      };
    }).filter(Boolean);
    
    setPreviewFlashcards(flashcardsToPreview);
    
    // Organize flashcards into pages (2 per page for A4 landscape)
    const pages = [];
    for (let i = 0; i < flashcardsToPreview.length; i += 2) {
      const page = [flashcardsToPreview[i]];
      if (i + 1 < flashcardsToPreview.length) {
        page.push(flashcardsToPreview[i + 1]);
      }
      pages.push(page);
    }
    
    setPreviewPages(pages);
  };

  // Generate and download PDF
  const generatePDF = () => {
    if (previewFlashcards.length === 0) {
      setMessage('Please generate a preview first.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      // Create new PDF document in landscape orientation
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();    // A4 landscape width (297mm)
      const pageHeight = doc.internal.pageSize.getHeight();  // A4 landscape height (210mm)
      
      // Use 8mm margins as requested
      const marginSize = 8; // 8mm on each side
      const maxWidth = pageWidth - (marginSize * 2);
      
      // Create flashcards for front side (2 per page)
      previewPages.forEach((page, pageIndex) => {
        // Create a new page for every page after the first
        if (pageIndex > 0) {
          doc.addPage();
        }
        
        // Process each flashcard on the page (1 or 2)
        page.forEach((flashcard, cardIndex) => {
          // Calculate position based on which card on the page (top or bottom)
          // Ensure each word is exactly in the vertical center of its half
          // Updated: Use precise vertical center points
          const yPosition = cardIndex === 0 
            ? pageHeight / 4     // Exact center of top half
            : (pageHeight * 3) / 4;  // Exact center of bottom half
          
          // Set text properties
          doc.setTextColor(255, 0, 0); // Bright red color (Sprouttie style - #FF0000)
          doc.setFont('helvetica', 'bold');
          
          // Get the word
          const word = flashcard.word;
          
          // Use the optimized font size calculation
          let fontSize = calculateSafeFontSize(word, doc, maxWidth);
          
          doc.setFontSize(fontSize);
          
          // Add word to page - perfectly centered horizontally and vertically
          // The 'baseline: middle' option is critical for perfect vertical centering
          doc.text(word, pageWidth / 2, yPosition, { 
            align: 'center', 
            baseline: 'middle'  // This ensures true vertical centering
          });
          
          // Add a dividing line between cards (except for single-card pages)
          if (cardIndex === 0 && page.length > 1) {
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.line(0, pageHeight / 2, pageWidth, pageHeight / 2);
          }
        });
      });
      
      // Save the PDF
      doc.save('sprouttie-flashcards.pdf');
      
      setMessage('PDF generated successfully! Check your downloads folder.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setMessage('Error generating PDF. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-medium mb-4">Print Flashcards</h3>
        
        {/* Selection Mode Tabs */}
        <div className="flex mb-6 border-b">
          <button 
            className={`px-4 py-2 ${selectionMode === 'manual-flashcards' ? 'bg-blue-100 border-b-2 border-blue-500 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setSelectionMode('manual-flashcards')}
          >
            Select Flashcards
          </button>
          <button 
            className={`px-4 py-2 ${selectionMode === 'next-day-sets' ? 'bg-blue-100 border-b-2 border-blue-500 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setSelectionMode('next-day-sets')}
          >
            Next Day Sets
          </button>
        </div>
        
        {/* Selection Area */}
        <div className="mb-6">
          {selectionMode === 'manual-flashcards' && (
            <div>
              {/* Category Filter Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Select Category</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Flashcards</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <h4 className="text-sm font-medium mb-2">Select flashcards to print:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
                {getFilteredFlashcards().map(flashcard => {
                  const category = categories.find(c => c.id === flashcard.categoryId);
                  return (
                    <div 
                      key={flashcard.id}
                      className={`px-3 py-2 rounded-md border cursor-pointer ${
                        selectedFlashcards.includes(flashcard.id) 
                          ? 'bg-green-100 border-green-300' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleFlashcardSelection(flashcard.id)}
                    >
                      <div className="font-medium">{flashcard.word}</div>
                      <div className="text-xs text-gray-500">{category ? category.name : 'Unknown'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {selectionMode === 'next-day-sets' && (
            <div>
              <h4 className="text-sm font-medium mb-2">Select sets:</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {sets.map(set => (
                  <button
                    key={set.id}
                    onClick={() => toggleSetSelection(set.id)}
                    className={`px-3 py-2 rounded-md text-sm ${
                      selectedSets.includes(set.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {set.name}
                  </button>
                ))}
              </div>
              
              {/* Show selected flashcards */}
              {selectedFlashcards.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Flashcards in selected sets:</h4>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                    {selectedFlashcards.map(cardId => {
                      const card = flashcards.find(c => c.id === cardId);
                      if (!card) return null;
                      return (
                        <div 
                          key={cardId}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm border border-green-300"
                        >
                          {card.word}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Control Buttons */}
        <div className="flex justify-between">
          <button
            onClick={clearSelections}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Selections
          </button>
          
          <div className="space-x-3">
            <button
              onClick={generatePreview}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={selectedFlashcards.length === 0}
            >
              Generate Preview
            </button>
            
            <button
              onClick={generatePDF}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={previewFlashcards.length === 0}
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
      
      {/* Status Message */}
      {message && (
        <div className={`p-3 rounded ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700' 
            : message.includes('success') 
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
        }`}>
          {message}
        </div>
      )}
      
      {/* Updated Preview Section - with PDF-like styling */}
      {previewPages.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Print Preview of selected words ({previewFlashcards.length} flashcards)</h3>
            
            {previewFlashcards.length % 2 !== 0 && (
              <div className="text-yellow-600 text-sm">
                For optimal printing, select an even number of flashcards.
              </div>
            )}
          </div>
          
          <div className="mb-3 text-sm text-gray-700">
            Each card below represents how it will appear on the A4 landscape page (2 words per page, top and bottom).
          </div>
          
          {/* Show exact A4 landscape preview grid with PDF-like styling */}
          <div className="flex flex-col space-y-4">
            {previewPages.map((page, pageIndex) => (
              <div key={pageIndex} className="mx-auto w-full max-w-4xl bg-white border border-gray-300 shadow-md" style={{ aspectRatio: '1.414', maxHeight: '400px' }}>
                {/* A4 landscape has an aspect ratio of 1.414 (297mm / 210mm) */}
                <div className="h-full w-full relative bg-white">
                  {/* Dividing line in the middle */}
                  <div className="absolute top-1/2 left-0 w-full h-px bg-gray-300"></div>
                  
                  {/* Top card */}
                  <div className="absolute top-0 left-0 w-full h-1/2 flex items-center justify-center">
                    <div 
                      className="text-red-600 font-bold"
                      style={{ 
                        fontSize: `${Math.min(page[0].fontSize / 3, 100)}px`,
                        lineHeight: '1',
                        margin: '0 8mm', // Apply the same 8mm margin as in PDF
                        padding: '0' // Remove padding to ensure proper centering
                      }}
                    >
                      {page[0].word}
                    </div>
                  </div>
                  
                  {/* Bottom card (if exists) */}
                  {page.length > 1 && (
                    <div className="absolute bottom-0 left-0 w-full h-1/2 flex items-center justify-center">
                      <div 
                        className="text-red-600 font-bold"
                        style={{ 
                          fontSize: `${Math.min(page[1].fontSize / 3, 100)}px`,
                          lineHeight: '1',
                          margin: '0 8mm', // Apply the same 8mm margin as in PDF
                          padding: '0' // Remove padding to ensure proper centering
                        }}
                      >
                        {page[1].word}
                      </div>
                    </div>
                  )}
                  
                  {/* Page number */}
                  <div className="absolute top-2 right-2 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-bl">
                    Page {pageIndex + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>Notes about PDF output:</p>
            <ul className="list-disc list-inside ml-4">
              <li>Words will be printed in bright red text</li>
              <li>Each A4 landscape page will contain 2 flashcards (top and bottom)</li>
              <li>Short words (like "car", "van") will be displayed at 250pt size</li>
              <li>Longer words will be sized to fill the page width (8mm margins)</li>
              <li><span className="text-yellow-600 font-semibold">Note: 8mm margins may be too narrow for some printers</span></li>
              <li>Total pages: {previewPages.length}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintFlashcards;