"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Heart, Sparkles, Gift, Users, Plane } from "lucide-react";

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
          <Plane className="w-10 h-10 text-[#C9A227]" />
        </motion.div>
        <motion.div
          className="absolute bottom-32 right-10 text-3xl opacity-20"
          animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, delay: 1 }}
        >
          <Gift className="w-8 h-8 text-[#E07B39]" />
        </motion.div>

        {/* Main content */}
        <motion.div
          className="max-w-lg mx-auto text-center relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo/Brand */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full shadow-sm mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <Sparkles className="w-4 h-4 text-[#C9A227]" />
            <span className="text-sm font-medium text-[#2C1810]">Katl.in</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="font-serif text-5xl sm:text-6xl text-[#2C1810] mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Journeys Worth
            <br />
            <span className="text-legendary">Revealing</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-lg text-[#6B5344] mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Craft personalized travel experiences for the ones you love.
            <br />
            Curated adventures, revealed one magical moment at a time.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link href="/login">
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
                  <Heart className="w-5 h-5" />
                  Create a Journey
                </span>
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
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
            Curate magical travel experiences, revealed over time
          </p>

          {/* Steps */}
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7 text-[#E07B39]" />
              </div>
              <h3 className="font-medium text-[#2C1810] mb-2">Plan Destinations</h3>
              <p className="text-sm text-[#6B5344]">
                Add the places you'll visit together
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-[#C9A227]" />
              </div>
              <h3 className="font-medium text-[#2C1810] mb-2">Generate Cards</h3>
              <p className="text-sm text-[#6B5344]">
                AI creates personalized experience cards
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center mb-4">
                <Gift className="w-7 h-7 text-[#E07B39]" />
              </div>
              <h3 className="font-medium text-[#2C1810] mb-2">Gift & Reveal</h3>
              <p className="text-sm text-[#6B5344]">
                Share the magic, one card at a time
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Profiles Section */}
      <section className="px-6 py-16">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-serif text-3xl text-[#2C1810] mb-4">
            For Every Traveler
          </h2>
          <p className="text-[#6B5344] mb-12">
            Cards tailored for different travel styles
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white/60 rounded-xl shadow-sm">
              <span className="text-2xl mb-2 block">👩</span>
              <span className="text-sm font-medium text-[#2C1810]">Solo</span>
            </div>
            <div className="p-4 bg-white/60 rounded-xl shadow-sm">
              <span className="text-2xl mb-2 block">💑</span>
              <span className="text-sm font-medium text-[#2C1810]">Couple</span>
            </div>
            <div className="p-4 bg-white/60 rounded-xl shadow-sm">
              <span className="text-2xl mb-2 block">👨‍👩‍👧‍👦</span>
              <span className="text-sm font-medium text-[#2C1810]">Family</span>
            </div>
            <div className="p-4 bg-white/60 rounded-xl shadow-sm">
              <span className="text-2xl mb-2 block">👧</span>
              <span className="text-sm font-medium text-[#2C1810]">Kids</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Rarity Section */}
      <section className="px-6 py-16 bg-gradient-to-b from-white/50 to-transparent">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-serif text-3xl text-[#2C1810] mb-4">
            Discover Rarities
          </h2>
          <p className="text-[#6B5344] mb-8">
            From everyday delights to legendary once-in-a-lifetime experiences
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
              Common
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
              Uncommon
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              Rare
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-amber-100 text-amber-700 border border-amber-300">
              Legendary
            </span>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-sm text-[#6B5344]">
        <p>Katl.in - Journeys worth revealing</p>
        <p className="mt-2">
          <Link href="/login" className="text-[#E07B39] hover:underline">
            Curator Login
          </Link>
        </p>
      </footer>
    </main>
  );
}
