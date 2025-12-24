"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({ fullScreen = true, className = "" }: LoadingSpinnerProps) {
  const spinner = (
    <motion.div
      className={`text-[#C9A227] ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <Heart className="w-8 h-8" />
    </motion.div>
  );

  if (fullScreen) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
        {spinner}
      </main>
    );
  }

  return spinner;
}
