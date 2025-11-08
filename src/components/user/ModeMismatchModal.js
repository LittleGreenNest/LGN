import React from "react";

export default function ModeMismatchModal({ show, onClose, onReactivate }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
        <h2 className="text-lg font-semibold mb-3">Re-activate your plan</h2>
        <p className="text-sm text-gray-600 mb-6">
          Your billing record was created in a different Stripe environment
          during development. Please re-activate your plan on our live system
          to manage billing.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onReactivate}
            className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
          >
            Re-activate Now
          </button>
        </div>
      </div>
    </div>
  );
}
