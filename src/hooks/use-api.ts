"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface FetchOptions extends RequestInit {
  successMessage?: string;
  errorMessage?: string;
}

export function useApi() {
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    async <T>(url: string, options: FetchOptions = {}): Promise<T | null> => {
      const { successMessage, errorMessage, ...fetchOptions } = options;
      setLoading(true);
      try {
        const response = await fetch(url, {
          headers: { "Content-Type": "application/json", ...fetchOptions.headers },
          ...fetchOptions,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || errorMessage || "Erro na requisição");
        }

        if (successMessage) toast.success(successMessage);
        return data as T;
      } catch (error) {
        const message = error instanceof Error ? error.message : errorMessage || "Erro interno";
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, request };
}
