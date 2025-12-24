"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UseJourneyAuthOptions {
  slug: string;
  redirectOnFail?: boolean;
}

export function useJourneyAuth({ slug, redirectOnFail = true }: UseJourneyAuthOptions) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const authenticated = sessionStorage.getItem(`journey-${slug}-authenticated`);
    const isAuth = authenticated === "true";
    setIsAuthenticated(isAuth);

    if (!isAuth && redirectOnFail) {
      router.replace(`/j/${slug}`);
    }
  }, [slug, router, redirectOnFail]);

  const authenticate = () => {
    sessionStorage.setItem(`journey-${slug}-authenticated`, "true");
    setIsAuthenticated(true);
  };

  const logout = () => {
    sessionStorage.removeItem(`journey-${slug}-authenticated`);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading: isAuthenticated === null,
    authenticate,
    logout,
  };
}
