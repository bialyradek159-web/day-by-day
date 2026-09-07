"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Podaj adres e-mail i hasło.");
      setLoading(false);
      return;
    }

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        window.location.href = "/";
        return;
      }

      setMessage(
        "Konto zostało utworzone. Sprawdź swoją skrzynkę e-mail i potwierdź adres."
      );
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Nieprawidłowy e-mail lub hasło.");
        setLoading(false);
        return;
      }

      window.location.href = "/";
      return;
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold tracking-[0.2em] text-blue-600">
            DAY BY DAY
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            {isSignup ? "Utwórz konto" : "Zaloguj się"}
          </h1>

          <p className="mt-2 text-slate-500">
            Twoje podróże będą dostępne na każdym urządzeniu.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                E-mail
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="twoj@email.pl"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Hasło
              </label>

              <input
                id="password"
                type="password"
                autoComplete={
                  isSignup ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 znaków"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Chwileczkę..."
                : isSignup
                ? "Utwórz konto"
                : "Zaloguj się"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-500">
              {isSignup
                ? "Masz już konto?"
                : "Nie masz jeszcze konta?"}
            </p>

            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
                setMessage("");
              }}
              className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              {isSignup
                ? "Zaloguj się"
                : "Utwórz nowe konto"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}