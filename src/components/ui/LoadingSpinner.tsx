"use client";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({ fullScreen = true, className = "" }: LoadingSpinnerProps) {
  const spinner = (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="w-10 h-10 border-3 border-[#E5DDD5] border-t-[#C9A227] rounded-full animate-spin" />
      <p className="text-sm text-[#6B5344]">Loading...</p>
    </div>
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
