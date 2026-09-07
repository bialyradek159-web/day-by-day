"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LocalPlace = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
};

type LocalRoutePoint = {
  id: string;
  segmentIndex?: number;
  lat: number;
  lng: number;
};

type LocalDay = {
  day: number;
  date: string;
  title: string;
  places: LocalPlace[];
  routePoints: LocalRoutePoint[];
};

const TRIP_ID = "54df1cec-5a28-4431-896e-aeff7d8ed863";
const LOCAL_STORAGE_TRIP_ID = "usa-road-trip-2026";

function parsePolishDate(value: string): string | null {
  const months: Record<string, string> = {
    stycznia: "01",
    lutego: "02",
    marca: "03",
    kwietnia: "04",
    maja: "05",
    czerwca: "06",
    lipca: "07",
    sierpnia: "08",
    września: "09",
    października: "10",
    listopada: "11",
    grudnia: "12",
  };

  const match = value
    .trim()
    .match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})$/i);

  if (!match) {
    return null;
  }

  const day = match[1].padStart(2, "0");
  const month = months[match[2].toLowerCase()];
  const year = match[3];

  if (!month) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function addDaysToDate(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00`);

  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatSupabaseError(error: unknown): string {
  if (!error) {
    return "Nieznany błąd.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object") {
    const e = error as {
      code?: string;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
      status?: number;
      statusText?: string;
    };

    const parts: string[] = [];

    if (e.code) {
      parts.push(`code: ${e.code}`);
    }

    if (e.message) {
      parts.push(`message: ${e.message}`);
    }

    if (e.details) {
      parts.push(`details: ${e.details}`);
    }

    if (e.hint) {
      parts.push(`hint: ${e.hint}`);
    }

    if (e.status) {
      parts.push(`status: ${e.status}`);
    }

    if (e.statusText) {
      parts.push(`statusText: ${e.statusText}`);
    }

    if (parts.length > 0) {
      return parts.join("\n");
    }

    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return "Nie udało się odczytać szczegółów błędu.";
    }
  }

  return String(error);
}

export default function MigrationPage() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<string[]>([]);

  async function migrate() {
    if (running) {
      return;
    }

    setRunning(true);
    setMessage("");
    setDetails([]);

    try {
      const supabase = createClient();

      /*
       * ==========================================
       * 1. LOCAL STORAGE
       * ==========================================
       */

      setDetails((prev) => [
        ...prev,
        "1. Odczytywanie danych z localStorage...",
      ]);

      const raw = localStorage.getItem(
        `trip-days-${LOCAL_STORAGE_TRIP_ID}`
      );

      if (!raw) {
        throw new Error(
          `Nie znaleziono danych: trip-days-${LOCAL_STORAGE_TRIP_ID}`
        );
      }

      const localDays = JSON.parse(raw) as LocalDay[];

      if (!Array.isArray(localDays) || localDays.length === 0) {
        throw new Error("Dane podróży są puste.");
      }

      setDetails((prev) => [
        ...prev,
        `Znaleziono ${localDays.length} dni.`,
      ]);

      /*
       * ==========================================
       * 2. USER
       * ==========================================
       */

      setDetails((prev) => [
        ...prev,
        "2. Sprawdzanie zalogowanego użytkownika...",
      ]);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Nie jesteś zalogowany w Supabase.");
      }

      setDetails((prev) => [
        ...prev,
        "Użytkownik jest zalogowany.",
      ]);

      /*
       * ==========================================
       * 3. TRIP
       * ==========================================
       */

      setDetails((prev) => [
        ...prev,
        "3. Sprawdzanie podróży USA w Supabase...",
      ]);

      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("id, name, user_id, start_date, end_date")
        .eq("id", TRIP_ID)
        .eq("user_id", user.id)
        .maybeSingle();

      if (tripError) {
        throw tripError;
      }

      if (!trip) {
        throw new Error(
          `Nie znaleziono podróży o ID ${TRIP_ID}.`
        );
      }

      if (!trip.start_date) {
        throw new Error(
          "Podróż nie ma ustawionej daty rozpoczęcia w tabeli trips."
        );
      }

      setDetails((prev) => [
        ...prev,
        `Znaleziono podróż: ${trip.name}`,
      ]);

      setDetails((prev) => [
        ...prev,
        `Data rozpoczęcia podróży: ${trip.start_date}`,
      ]);

      /*
       * ==========================================
       * 4. DAYS
       * ==========================================
       */

      setDetails((prev) => [
        ...prev,
        "4. Przygotowywanie dni...",
      ]);

      const dayRows = localDays.map((localDay) => {
        /*
         * Najpierw próbujemy wykorzystać datę
         * znajdującą się w localStorage.
         *
         * Jeżeli jest to np.
         * "9 września 2026"
         * zostanie wykorzystana bez zmian.
         *
         * Jeżeli localStorage zawiera np.
         * "Dzień 2", używamy daty rozpoczęcia
         * podróży + numer dnia.
         */

        const parsedLocalDate = parsePolishDate(
          localDay.date
        );

        const calculatedDate =
          parsedLocalDate ??
          addDaysToDate(
            trip.start_date,
            localDay.day - 1
          );

        return {
          id: `${TRIP_ID}-day-${localDay.day}`,
          trip_id: TRIP_ID,

          // Istniejąca kolumna w tabeli
          day: localDay.day,

          // Dodana kolumna
          day_number: localDay.day,

          date: calculatedDate,

          title:
            localDay.title ||
            `Dzień ${localDay.day}`,
        };
      });

      console.log("DAY ROWS:", dayRows);

      setDetails((prev) => [
        ...prev,
        `Przygotowano ${dayRows.length} dni.`,
      ]);

      dayRows.forEach((day) => {
        setDetails((prev) => [
          ...prev,
          `Dzień ${day.day}: ${day.date}`,
        ]);
      });

      setDetails((prev) => [
        ...prev,
        "Próba zapisania dni do Supabase...",
      ]);

      const { error: daysError } = await supabase
        .from("trip_days")
        .upsert(dayRows);

      if (daysError) {
        console.error(
          "PEŁNY BŁĄD trip_days:",
          daysError
        );

        throw daysError;
      }

      setDetails((prev) => [
        ...prev,
        `✓ Zapisano ${dayRows.length} dni.`,
      ]);

      /*
       * ==========================================
       * 5. PLACES
       * ==========================================
       */

      setDetails((prev) => [
        ...prev,
        "5. Przygotowywanie miejsc...",
      ]);

      const placeRows = localDays.flatMap((day) =>
        (day.places ?? []).map((place, index) => ({
          id: place.id,
          day_id: `${TRIP_ID}-day-${day.day}`,
          place_id: place.id,
          name: place.name,
          address: place.address ?? null,
          lat: place.lat,
          lng: place.lng,
          place_order: index,
          visit_time: null,
        }))
      );

      setDetails((prev) => [
        ...prev,
        `Przygotowano ${placeRows.length} miejsc.`,
      ]);

      if (placeRows.length > 0) {
        const { error: placesError } = await supabase
          .from("trip_places")
          .upsert(placeRows);

        if (placesError) {
          console.error(
            "PEŁNY BŁĄD trip_places:",
            placesError
          );

          throw placesError;
        }
      }

      setDetails((prev) => [
        ...prev,
        `✓ Zapisano ${placeRows.length} miejsc.`,
      ]);

      /*
       * ==========================================
       * 6. ROUTE POINTS
       * ==========================================
       */

      setDetails((prev) => [
        ...prev,
        "6. Przygotowywanie punktów trasy...",
      ]);

      const routeRows = localDays.flatMap((day) =>
        (day.routePoints ?? []).map((point, index) => ({
          id: point.id,
          day_id: `${TRIP_ID}-day-${day.day}`,
          point_order: index,
          lat: point.lat,
          lng: point.lng,
        }))
      );

      setDetails((prev) => [
        ...prev,
        `Przygotowano ${routeRows.length} punktów trasy.`,
      ]);

      if (routeRows.length > 0) {
        const { error: routeError } = await supabase
          .from("trip_route_points")
          .upsert(routeRows);

        if (routeError) {
          console.error(
            "PEŁNY BŁĄD trip_route_points:",
            routeError
          );

          throw routeError;
        }
      }

      setDetails((prev) => [
        ...prev,
        `✓ Zapisano ${routeRows.length} punktów trasy.`,
      ]);

      /*
       * ==========================================
       * SUCCESS
       * ==========================================
       */

      setMessage(
        `Migracja zakończona pomyślnie. Dni: ${dayRows.length}, miejsca: ${placeRows.length}, punkty trasy: ${routeRows.length}.`
      );
    } catch (error) {
      console.error("BŁĄD MIGRACJI:", error);

      const errorMessage =
        formatSupabaseError(error);

      setMessage(
        `BŁĄD:\n${errorMessage}`
      );

      setDetails((prev) => [
        ...prev,
        `❌ ${errorMessage}`,
      ]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">

          <p className="text-sm font-medium text-blue-600">
            DAY BY DAY
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Migracja podróży USA
          </h1>

          <p className="mt-3 text-slate-500">
            Przeniesiemy istniejące dane podróży z
            localStorage do Supabase.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">
              ID podróży w Supabase
            </p>

            <p className="mt-1 break-all font-mono text-sm text-slate-500">
              {TRIP_ID}
            </p>
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">
              Dane źródłowe
            </p>

            <p className="mt-1 break-all font-mono text-sm text-slate-500">
              trip-days-{LOCAL_STORAGE_TRIP_ID}
            </p>
          </div>

          <button
            onClick={migrate}
            disabled={running}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running
              ? "Migracja w toku..."
              : "Przenieś dane do Supabase"}
          </button>

          {message && (
            <div
              className={`mt-6 whitespace-pre-wrap rounded-xl p-4 ${
                message.startsWith("BŁĄD")
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              <p className="font-medium">
                {message}
              </p>
            </div>
          )}

          {details.length > 0 && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">
                Szczegóły
              </p>

              <div className="mt-3 space-y-2">
                {details.map((detail, index) => (
                  <p
                    key={`${index}-${detail}`}
                    className="whitespace-pre-wrap text-sm text-slate-600"
                  >
                    {detail}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <strong>Ważne:</strong> dane w localStorage
            nie zostaną usunięte.
          </div>

        </div>
      </div>
    </main>
  );
}