"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  Save,
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
}

export default function PersonalNotesPage() {
  const params = useParams();
  const router = useRouter();
  const journeyId = params.id as string;
  const supabase = createClient();

  const [notes, setNotes] = useState<LoveLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteForm | null>(null);
  const [showForm, setShowForm] = useState(false);

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
    if (!confirm("Delete this note?")) return;

    await supabase.from("love_letters").delete().eq("id", noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  const startEditing = (note: LoveLetter) => {
    setEditingNote({
      id: note.id,
      title: note.title,
      content: note.content,
      display_on: note.display_on || "intro",
    });
    setShowForm(true);
  };

  const startNew = () => {
    setEditingNote({
      title: "",
      content: "",
      display_on: "intro",
    });
    setShowForm(true);
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
                Title
              </label>
              <input
                type="text"
                value={editingNote.title}
                onChange={(e) =>
                  setEditingNote({ ...editingNote, title: e.target.value })
                }
                placeholder="A special message..."
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
                placeholder="Write your personal message here..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-1">
                When to show
              </label>
              <select
                value={editingNote.display_on}
                onChange={(e) =>
                  setEditingNote({
                    ...editingNote,
                    display_on: e.target.value as DisplayOn,
                  })
                }
                className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none"
              >
                {DISPLAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} - {opt.description}
                  </option>
                ))}
              </select>
            </div>

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
