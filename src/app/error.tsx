"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold mb-2">Etwas ist schiefgegangen</h1>
        <p className="text-stone-600 mb-6 text-sm">
          {error.message === "FORBIDDEN" || error.message === "CROSS_TENANT_FORBIDDEN"
            ? "Kein Zugriff auf diesen Bereich."
            : "Wir konnten die Anfrage nicht verarbeiten. Bitte versuche es erneut."}
        </p>
        {error.digest && (
          <p className="text-xs text-stone-400 mb-4">Fehler-ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-700 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
