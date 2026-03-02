"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForTokens, parseJwt, storeTokens } from "@/lib/keycloak";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      setError(errorDescription ?? errorParam);
      return;
    }

    if (!code) {
      setError("Chybí autorizační kód.");
      return;
    }

    exchangeCodeForTokens(code)
      .then((tokens) => {
        storeTokens(tokens);
        const user = parseJwt(tokens.access_token);
        console.log("Přihlášen:", user?.preferred_username ?? user?.email);
        // Redirect to home or wherever the user came from
        router.replace("/");
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Přihlášení se nezdařilo.";
        setError(message);
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Chyba přihlášení</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="px-6 py-2 text-white font-semibold rounded-md"
            style={{ background: "linear-gradient(90deg, #B1475C 0%, #857AD2 100%)" }}
          >
            Zpět na hlavní stránku
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Přihlašování…</p>
      </div>
    </div>
  );
}
