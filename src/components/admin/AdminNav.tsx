"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, LogOut, Menu, X, User } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface AdminNavProps {
  user: SupabaseUser;
}

export function AdminNav({ user }: AdminNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-[#E5DDD5] sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C9A227]" />
            <span className="font-serif text-xl text-[#2C1810]">TravelCards</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/admin"
              className="text-sm font-medium text-[#6B5344] hover:text-[#2C1810] transition-colors"
            >
              Journeys
            </Link>
            <Link
              href="/admin/journeys/new"
              className="text-sm font-medium text-[#6B5344] hover:text-[#2C1810] transition-colors"
            >
              New Journey
            </Link>
          </div>

          {/* User menu */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[#6B5344]">
              <User className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#6B5344] hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-[#6B5344]"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#E5DDD5]">
            <div className="space-y-4">
              <Link
                href="/admin"
                className="block text-sm font-medium text-[#6B5344] hover:text-[#2C1810]"
                onClick={() => setIsMenuOpen(false)}
              >
                Journeys
              </Link>
              <Link
                href="/admin/journeys/new"
                className="block text-sm font-medium text-[#6B5344] hover:text-[#2C1810]"
                onClick={() => setIsMenuOpen(false)}
              >
                New Journey
              </Link>
              <div className="pt-4 border-t border-[#E5DDD5]">
                <div className="text-sm text-[#6B5344] mb-2">{user.email}</div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
