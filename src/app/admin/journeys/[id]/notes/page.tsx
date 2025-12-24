"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { LoveLetter, DisplayOn } from "@/types/database";

const DISPLAY_OPTIONS: { value: DisplayOn; label: string; description: string }[] = [
  { value: "intro", label: "Journey Intro", description: "Shown when journey first opens" },
  { value: "destination_start", label: "Destination Start", description: "Shown when entering a destination" },
  { value: "chapter_start", label: "Chapter Start", description: "Shown when a chapter begins" },
  { value: "card_reveal", label: "Card Reveal", description: "Shown when a card is revealed" },
];

interface NoteForm {
  id?: string;
  title: string;
  content: string;
  display_on: DisplayOn;
  coreMessage?: string;
}

export default function PersonalNotesPage() {
  const params = useParams();
  const router = useRouter();
  const journeyId = params.id as string;
  const supabase = createClient();

  const [notes, setNotes] = useState<LoveLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteForm | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  // Load notes
  useEffect(() => {
    const loadNotes = async () => {
      const { data, error } = await supabase
        .from("love_letters")
        .select("*")
        .eq("journey_id", journeyId)
        .order("order_index");

      if (!error && data) {
        setNotes(data as LoveLetter[]);
      }
      setIsLoading(false);
    };

    loadNotes();
  }, [journeyId, supabase]);

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSave = async () => {
    if (!editingNote || !editingNote.title.trim() || !editingNote.content.trim()) return;

    setIsSaving(true);
    try {
      if (editingNote.id) {
        // Update existing
        await supabase
          .from("love_letters")
          .update({
            title: editingNote.title,
            content: editingNote.content,
            display_on: editingNote.display_on,
          })
          .eq("id", editingNote.id);
      } else {
        // Create new
        await supabase.from("love_letters").insert({
          journey_id: journeyId,
          title: editingNote.title,
          content: editingNote.content,
          display_on: editingNote.display_on,
          order_index: notes.length,
        });
      }

      // Reload notes
      const { data } = await supabase
        .from("love_letters")
        .select("*")
        .eq("journey_id", journeyId)
        .order("order_index");

      if (data) setNotes(data as LoveLetter[]);
      setEditingNote(null);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    await supabase.from("love_letters").delete().eq("id", noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  const startEditing = (note: LoveLetter) => {
    setEditingNote({
      id: note.id,
      title: note.title,
      content: note.content,
      display_on: (note.display_on as DisplayOn) || "intro",
    });
    setShowForm(true);
  };

  const startNew = () => {
    setEditingNote({
      title: "",
      content: "",
      display_on: "intro",
      coreMessage: "I've been planning this gift for months, imagining your face as you discover each surprise...",
    });
    setShowForm(true);
  };

  const generatePlaceholder = async () => {
    if (!editingNote) return;

    setIsGenerating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/journeys/${journeyId}/generate-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayOn: editingNote.display_on,
          coreMessage: editingNote.coreMessage?.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEditingNote({
          ...editingNote,
          title: data.title,
          content: data.content,
        });

        // Show appropriate feedback based on whether fallback was used
        if (data.usedFallback) {
          setMessage({
            type: 'warning',
            text: `AI unavailable - using your message as-is. ${data.fallbackReason || ''}`,
          });
        } else {
          setMessage({
            type: 'success',
            text: 'Note generated successfully',
          });
        }
      } else {
        const error = await res.json();
        setMessage({
          type: 'error',
          text: `Failed to generate: ${error.error || 'Unknown error'}`,
        });
      }
    } catch (error) {
      console.error("Failed to generate placeholder:", error);
      setMessage({
        type: 'error',
        text: 'Network error - please try again',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A227]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast Message */}
      {message && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-md ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : message.type === 'warning'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : message.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-sm ${
              message.type === 'success'
                ? 'text-green-800'
                : message.type === 'warning'
                ? 'text-yellow-800'
                : 'text-red-800'
            }`}>
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

      {/* Back link */}
      <Link
        href={`/admin/journeys/${journeyId}`}
        className="inline-flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to journey
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-[#2C1810] mb-2">Personal Notes</h1>
          <p className="text-[#6B5344]">
            Add personal messages that appear at special moments
          </p>
        </div>
        {!showForm && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && editingNote && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="font-serif text-xl text-[#2C1810] mb-6">
            {editingNote.id ? "Edit Note" : "New Note"}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-1">
                When to show
              </label>
              <select
                value={editingNote.display_on}
                onChange={(e) => {
                  const newDisplayOn = e.target.value as DisplayOn;
                  const exampleMessages = {
                    intro: "I've been planning this gift for months, imagining your face as you discover each surprise...",
                    destination_start: "I can't wait to explore this place with you, it's been on my bucket list forever...",
                    chapter_start: "Get ready for something different, this next part is going to be special...",
                    card_reveal: "This experience reminds me of our first date, I know you're going to love it...",
                  };
                  setEditingNote({
                    ...editingNote,
                    display_on: newDisplayOn,
                    coreMessage: editingNote.coreMessage || exampleMessages[newDisplayOn],
                  });
                }}
                className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none"
              >
                {DISPLAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} - {opt.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Core Message - always show if no title/content yet */}
            {!editingNote.title && !editingNote.content && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#2C1810] mb-1">
                    Your Message
                  </label>
                  <textarea
                    value={editingNote.coreMessage || ""}
                    onChange={(e) =>
                      setEditingNote({ ...editingNote, coreMessage: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none resize-none"
                  />
                </div>

                <button
                  onClick={generatePlaceholder}
                  disabled={isGenerating}
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-[#E5DDD5] text-[#6B5344] rounded-lg hover:border-[#C9A227] hover:text-[#C9A227] hover:bg-[#FDF8F3] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Edit Fields - show after generating */}
            {(editingNote.title || editingNote.content) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2C1810] mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingNote.title}
                    onChange={(e) =>
                      setEditingNote({ ...editingNote, title: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C1810] mb-1">
                    Message
                  </label>
                  <textarea
                    value={editingNote.content}
                    onChange={(e) =>
                      setEditingNote({ ...editingNote, content: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving || !editingNote.title.trim() || !editingNote.content.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
              <button
                onClick={() => {
                  setEditingNote(null);
                  setShowForm(false);
                }}
                className="flex items-center gap-2 px-6 py-2 border border-[#E5DDD5] rounded-lg text-[#6B5344]"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length > 0 ? (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-[#E5DDD5]"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-[#2C1810]">{note.title}</h3>
                  <span className="text-xs text-[#6B5344] bg-[#FDF8F3] px-2 py-1 rounded-full">
                    {DISPLAY_OPTIONS.find((o) => o.value === note.display_on)?.label || note.display_on}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditing(note)}
                    className="p-2 text-[#6B5344] hover:text-[#2C1810] hover:bg-[#FDF8F3] rounded-lg"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-[#6B5344] text-sm whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
            <h2 className="font-serif text-xl text-[#2C1810] mb-2">No notes yet</h2>
            <p className="text-[#6B5344] mb-6">
              Add personal messages that will appear at special moments during the journey.
            </p>
            <button
              onClick={startNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Your First Note
            </button>
          </div>
        )
      )}
    </div>
  );
}
