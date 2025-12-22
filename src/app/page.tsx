"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Calendar, Heart, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pattern-overlay pointer-events-none" />

        {/* Floating decorative elements */}
        <motion.div
          className="absolute top-20 left-10 text-4xl opacity-20"
          animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 5 }}
        >
          ✨
        </motion.div>
        <motion.div
          className="absolute bottom-32 right-10 text-3xl opacity-20"
          animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, delay: 1 }}
        >
          🌍
        </motion.div>

        {/* Main content */}
        <motion.div
          className="max-w-lg mx-auto text-center relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Gift tag */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full shadow-sm mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <Heart className="w-4 h-4 text-[#D4837E]" />
            <span className="text-sm text-[#6B5344]">For Kathi, with love</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="font-serif text-5xl sm:text-6xl text-[#2C1810] mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Your Adventure
            <br />
            <span className="text-legendary">Awaits</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-lg text-[#6B5344] mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Discover magical experiences, one card at a time.
            <br />
            Each week reveals new adventures just for us.
          </motion.p>

          {/* Trip destinations */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E07B39]/10 to-[#C9A227]/10 rounded-full">
              <MapPin className="w-4 h-4 text-[#E07B39]" />
              <span className="text-[#2C1810] font-medium">Cape Town</span>
            </div>
            <div className="hidden sm:block text-[#C9A227]">→</div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-full">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="text-[#2C1810] font-medium">Bali</span>
            </div>
            <div className="hidden sm:block text-[#C9A227]">→</div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-400/10 to-red-400/10 rounded-full">
              <MapPin className="w-4 h-4 text-pink-500" />
              <span className="text-[#2C1810] font-medium">Japan</span>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: "spring" }}
          >
            <Link href="/reveal">
              <motion.button
                className="group relative px-8 py-4 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full font-medium text-lg shadow-lg overflow-hidden"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                />
                <span className="relative flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Reveal Your Cards
                </span>
              </motion.button>
            </Link>
          </motion.div>

          {/* Launch date */}
          <motion.div
            className="mt-8 flex items-center justify-center gap-2 text-sm text-[#6B5344]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <Calendar className="w-4 h-4" />
            <span>Full deck unlocks January 29, 2026</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Preview Section */}
      <section className="px-6 py-16 bg-gradient-to-b from-transparent to-white/50">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-serif text-3xl text-[#2C1810] mb-4">
            How It Works
          </h2>
          <p className="text-[#6B5344] mb-12">
            Each card holds a unique experience waiting to be discovered
          </p>

          {/* Steps */}
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center mb-4">
                <span className="text-2xl">🎴</span>
              </div>
              <h3 className="font-medium text-[#2C1810] mb-2">Draw a Card</h3>
              <p className="text-sm text-[#6B5344]">
                Tap to reveal your next adventure
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="font-medium text-[#2C1810] mb-2">Discover Rarity</h3>
              <p className="text-sm text-[#6B5344]">
                From common treats to legendary experiences
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className="font-medium text-[#2C1810] mb-2">Book & Enjoy</h3>
              <p className="text-sm text-[#6B5344]">
                Turn your card into a memory
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-sm text-[#6B5344]">
        <p>Made with love for our family adventure</p>
        <p className="mt-1 opacity-60">Cape Town → Bali → Japan 2025</p>
      </footer>
    </main>
  );
}
