"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2, X, CheckCircle2, AlertTriangle } from "lucide-react";

interface ResetQuickActionProps {
  journeyId: string;
  revealedCount: number;
  treatsRevealedCount?: number;
}

export function ResetQuickAction({ journeyId, revealedCount, treatsRevealedCount = 0 }: ResetQuickActionProps) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const totalRevealed = revealedCount + treatsRevealedCount;
  const canReset = confirmText.toLowerCase() === "confirm";

  const handleReset = async () => {
    if (!canReset) return;

    setShowConfirm(false);
    setConfirmText("");
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

      const result = await res.json();

      // Show success message
      const successText = result.message ||
        `Reset complete! ${result.stats.cardsReset} cards reset, ${result.stats.treatsReset || 0} treats reset`;
      setMessage({ type: 'success', text: successText });

      // Hard refresh the page to ensure all data is reloaded
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Reset failed";
      setMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    setShowConfirm(false);
    setConfirmText("");
  };

  return (
    <>
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#2C1810] mb-2">
                  Reset Entire Journey?
                </h3>
                <div className="text-sm text-[#6B5344] space-y-2">
                  <p>This will reset the entire journey:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Reset {revealedCount} revealed {revealedCount === 1 ? 'card' : 'cards'} to hidden</li>
                    {treatsRevealedCount > 0 && (
                      <li>Reset {treatsRevealedCount} revealed {treatsRevealedCount === 1 ? 'treat' : 'treats'} to hidden</li>
                    )}
                    <li>Clear all reveal history</li>
                    <li>Clear all treat reveal history</li>
                    <li>Preserve all memories and notes</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Confirm input */}
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800 mb-3">
                Type <strong>confirm</strong> to reset this journey. This cannot be undone.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type 'confirm' here"
                className="w-full px-4 py-2 rounded-lg border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                autoFocus
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 rounded-lg border border-[#E5DDD5] text-[#6B5344] hover:bg-[#FAF0E6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={!canReset}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
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
        className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-[#E5DDD5] text-left disabled:opacity-50 w-full"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            {isResetting ? (
              <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
            ) : (
              <RotateCcw className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[#2C1810] break-words">
              {isResetting ? "Resetting..." : "Reset All Reveals and Treats"}
            </h3>
            {totalRevealed > 0 && (
              <p className="text-xs text-red-600 break-words">
                {revealedCount} {revealedCount === 1 ? 'card' : 'cards'}
                {treatsRevealedCount > 0 && `, ${treatsRevealedCount} ${treatsRevealedCount === 1 ? 'treat' : 'treats'}`} revealed
              </p>
            )}
          </div>
        </div>
        <p className="text-sm text-[#6B5344] break-words">
          Start over with new reveal schedule
        </p>
      </button>
    </>
  );
}
