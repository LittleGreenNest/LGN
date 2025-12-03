// src/components/CSVImport.js
import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';

export default function CSVImport() {
  const { user } = useAuth();
  const { flashcards, setFlashcards } = useFlashcards();
  const [importing, setImporting] = useState(false);

  const handleCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;

        if (!user) {
          alert("Please sign in before importing.");
          setImporting(false);
          return;
        }

        // Convert CSV rows → DB-ready format
        const formatted = rows.map((row) => ({
          user_id: user.id,                              // 👈 REQUIRED
          word: row.word,
          english: row.english || "",
          pinyin: row.pinyin || "",
          category_id: row.category_id || row.categoryId || "",
          card_type: row.card_type || row.cardType || "word",
          phrase_group: row.phrase_group || row.phraseGroup || "",
        }));

        try {
          // Insert into Supabase
          const { data, error } = await supabase
            .from("flashcards")
            .insert(formatted)
            .select("*");

          if (error) throw error;

          // Map DB rows → UI format
          const mapped = data.map((row) => ({
            id: row.id,
            word: row.word,
            english: row.english || "",
            pinyin: row.pinyin || "",
            categoryId: row.category_id || "",
            cardType: row.card_type || "word",
            phraseGroup: row.phrase_group || "",
          }));

          // Update UI
          setFlashcards([...flashcards, ...mapped]);
          alert("CSV imported successfully!");
        } catch (err) {
          console.error("[CSV Import] Error:", err);
          alert("Import failed. Check console.");
        }

        setImporting(false);
      },
    });
  };

  return (
    <div className="csv-import">
      <label className="upload-label">
        <input
          type="file"
          accept=".csv"
          onChange={handleCSV}
          disabled={importing}
        />
        {importing ? "Importing..." : "Upload CSV"}
      </label>
    </div>
  );
}

