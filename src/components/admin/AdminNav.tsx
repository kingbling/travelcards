"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, LogOut, Menu, X, Plus, Map } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

interface AdminNavProps {
  user: SupabaseUser;
}

export function AdminNav({ user }: AdminNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  const navLinks = [
    { href: "/admin", label: "Journeys", icon: Map },
  ];

  // Get user initials for avatar
  const userInitials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-[#E5DDD5]/50 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/admin"
            className="flex items-center gap-2 group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#E07B39] to-[#C9A227] rounded-lg blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-gradient-to-br from-[#E07B39] to-[#C9A227] p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="font-serif text-xl text-[#2C1810] tracking-tight">
              Katl<span className="text-[#C9A227]">.</span>in
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-[#FAF0E6] text-[#2C1810]"
                      : "text-[#6B5344] hover:bg-[#FAF0E6]/50 hover:text-[#2C1810]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}

            {/* New Journey CTA */}
            <Link
              href="/admin/journeys/new"
              className="flex items-center gap-2 ml-2 px-4 py-2 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium hover:shadow-md hover:shadow-[#E07B39]/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Journey
            </Link>
          </div>

          {/* User menu - Desktop */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#FAF0E6]/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center text-sm font-medium text-[#2C1810]">
                  {userInitials}
                </div>
                <span className="text-sm text-[#6B5344] max-w-[150px] truncate">
                  {user.email}
                </span>
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsUserMenuOpen(false)}
                    />

                    {/* Dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#E5DDD5] overflow-hidden z-20"
                    >
                      <div className="px-4 py-3 border-b border-[#E5DDD5]">
                        <p className="text-xs text-[#6B5344]">Signed in as</p>
                        <p className="text-sm text-[#2C1810] font-medium truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#6B5344] hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#6B5344] hover:bg-[#FAF0E6]/50 transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2 border-t border-[#E5DDD5]">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? "bg-[#FAF0E6] text-[#2C1810]"
                          : "text-[#6B5344] hover:bg-[#FAF0E6]/50"
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  );
                })}

                <Link
                  href="/admin/journeys/new"
                  className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Plus className="w-5 h-5" />
                  New Journey
                </Link>

                <div className="pt-4 mt-4 border-t border-[#E5DDD5]">
                  <div className="flex items-center gap-3 px-4 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center text-sm font-medium text-[#2C1810]">
                      {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#2C1810] font-medium truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
