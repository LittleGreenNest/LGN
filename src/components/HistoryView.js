// src/components/HistoryView.js
import React, { useState, useMemo } from 'react';
import { useFlashcards } from '../context/FlashcardContext';
import { useAuth } from '../context/AuthContext';

const HistoryView = () => {
  const [selectedMonth, setSelectedMonth] = useState('April 2025');
  const { history, getFlashcardStats } = useFlashcards();
  const { currentUser } = useAuth();

  // Always coerce history to an array so .some/.filter/.map are safe
  const filteredHistory = useMemo(() => {
    const baseHistory = Array.isArray(history) ? history : [];

    // If not logged in, just show whatever history we have (probably empty)
    if (!currentUser) return baseHistory;

    const userId = currentUser.id;

    // Check if any entries actually store a user id
    const anyHaveUserId = baseHistory.some((h) => h?.userId || h?.user_id);

    // If nothing has user_id yet (older local data), just return all
    if (!anyHaveUserId) return baseHistory;

    // Otherwise filter by current user
    return baseHistory.filter(
      (h) =>
        (h.userId && h.userId === userId) ||
        (h.user_id && h.user_id === userId)
    );
  }, [history, currentUser]);

  const stats = getFlashcardStats?.() ?? {};

  const handleExport = () => {
    try {
      const baseHistory = Array.isArray(filteredHistory)
        ? filteredHistory
        : [];

      const dataToExport =
        selectedMonth === 'All History'
          ? baseHistory
          : baseHistory.filter((item) => {
              const itemDate = new Date(item.date);
              const monthYear = itemDate.toLocaleString('en-US', {
                month: 'long',
                year: 'numeric',
              });
              return monthYear === selectedMonth;
            });

      if (dataToExport.length === 0) {
        alert('No data to export for the selected period.');
        return;
      }

      const csvRows = [];

      csvRows.push(
        [
          'Date',
          'Day of Week',
          'Sets Used',
          'Total Flashes',
          'Engagement Rating',
          'Time of Day',
          'Notes',
        ].join(',')
      );

      dataToExport.forEach((day) => {
        const date = new Date(day.date);
        const formattedDate = date.toLocaleDateString('en-US');
        const dayOfWeek = date.toLocaleDateString('en-US', {
          weekday: 'long',
        });
        const setsUsed = (day.selectedSets || []).join(', ');
        const totalFlashes = Object.values(day.setUsage || {}).reduce(
          (sum, count) => sum + count,
          0
        );

        const escapedNotes = day.notes
          ? `"${day.notes.replace(/"/g, '""')}"`
          : '';

        csvRows.push(
          [
            formattedDate,
            dayOfWeek,
            setsUsed,
            totalFlashes,
            day.engagement || 0,
            day.timeOfDay || '',
            escapedNotes,
          ].join(',')
        );
      });

      const csvContent = csvRows.join('\n');

      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      const filename = `flashcard-history-${selectedMonth.replace(' ', '-')}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('There was an error exporting the data. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Flashcard History</h2>
        <div className="flex items-center space-x-3">
          <select
            className="bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option>April 2025</option>
            <option>March 2025</option>
            <option>February 2025</option>
            <option>January 2025</option>
            <option>All History</option>
          </select>
          <button
            className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            onClick={handleExport}
          >
            Export
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sets Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flashcards
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((day) => (
                <tr key={day.date} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {day.date}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      {(day.selectedSets || []).map((setId) => (
                        <span
                          key={setId}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          Set {setId}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {Object.keys(day.setUsage || {}).length > 0
                        ? 'Flashcards used'
                        : 'No cards recorded'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Object.keys(day.setUsage || {}).reduce(
                        (total, key) => total + (day.setUsage[key] || 0),
                        0
                      )}{' '}
                      flashes total
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-2 ${
                          day.engagement >= 4
                            ? 'bg-green-500'
                            : day.engagement >= 2
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <span className="text-sm text-gray-900">
                        {day.engagement}/5
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {(day.engagementTimes || []).map((time) => (
                        <span key={time} className="mr-1">
                          {time === 'morning' ? (
                            <>
                              Morning <span>☀️</span>
                            </>
                          ) : time === 'afternoon' ? (
                            <>
                              Afternoon <span>🌤️</span>
                            </>
                          ) : time === 'evening' ? (
                            <>
                              Evening <span>🌆</span>
                            </>
                          ) : (
                            <>
                              Night <span>🌙</span>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {day.notes}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-green-600 hover:text-green-900 mr-3">
                      View
                    </button>
                    <button className="text-blue-600 hover:text-blue-900">
                      Print
                    </button>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No tracking data found for this user yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Card – still mostly static for now */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Monthly Summary
        </h3>
        <div className="grid grid-cols-1 sm-grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Total Sessions
            </h4>
            <p className="text-2xl font-bold text-gray-900">
              {filteredHistory.length}
            </p>
            <p className="text-sm text-gray-500">This month</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Avg. Engagement
            </h4>
            <p className="text-2xl font-bold text-gray-900">{0}/5</p>
            <p className="text-sm text-gray-500">
              <span className="text-green-500">↑ 0.0</span> from last month
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Cards Learned
            </h4>
            <p className="text-2xl font-bold text-gray-900">45</p>
            <p className="text-sm text-gray-500">
              <span className="text-green-500">↑ 8</span> from last month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
