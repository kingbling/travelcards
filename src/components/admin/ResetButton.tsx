"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";

interface ResetButtonProps {
  journeyId: string;
  variant?: "danger" | "primary" | "inline";
  onResetComplete?: () => void;
  className?: string;
}

interface ResetResult {
  success: boolean;
  stats: {
    cardsReset: number;
    revealsCleared: number;
    revealDatesAssigned: number;
    journeyDateRange?: {
      start: string;
      end: string;
    };
  };
  message?: string;
}

export function ResetButton({
  journeyId,
  variant = "danger",
  onResetComplete,
  className,
}: ResetButtonProps) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleReset = async () => {
    setShowConfirm(false);
    setIsResetting(true);

    try {
      const res = await fetch(`/api/admin/journeys/${journeyId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reset failed");
      }

      const result: ResetResult = await res.json();

      console.log("[RESET] Success:", result);

      // Success - refresh the page data
      router.refresh();
      onResetComplete?.();

      // Show success message
      const successText = result.message ||
        `Reset complete! ${result.stats.cardsReset} cards reset, ${result.stats.revealsCleared} reveals cleared`;
      setMessage({ type: 'success', text: successText });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Reset failed";
      setMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsResetting(false);
    }
  };

  const getVariantStyles = () => {
    const base = "flex items-center gap-2 transition-colors rounded-lg font-medium";

    switch (variant) {
      case "danger":
        return `${base} px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed`;
      case "primary":
        return `${base} px-4 py-2 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed`;
      case "inline":
        return `${base} px-3 py-1.5 text-sm border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed`;
      default:
        return base;
    }
  };

  return (
    <>
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#2C1810] mb-2">
                  Reset All Reveals and Treats?
                </h3>
                <div className="text-sm text-[#6B5344] space-y-2">
                  <p>This will:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Reset all revealed cards to hidden</li>
                    <li>Reset all revealed treats to hidden</li>
                    <li>Clear all reveal history</li>
                    <li>Preserve all memories and notes</li>
                  </ul>
                  <p className="font-medium text-red-600 mt-3">This cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#E5DDD5] text-[#6B5344] hover:bg-[#FAF0E6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Reset Journey
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {message && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-md ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowConfirm(true)}
        disabled={isResetting}
        className={className || getVariantStyles()}
      >
        {isResetting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Resetting...
          </>
        ) : (
          <>
            <RotateCcw className="w-4 h-4" />
            Reset All Reveals and Treats
          </>
        )}
      </button>
    </>
  );
}
