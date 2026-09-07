"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Trip = {
  id: string;
  name: string;
  country: string;
  flag: string;
  startDate: string;
  endDate: string;
  image: string;
  days: number;
  places: number;
  distanceMeters: number;
  durationMillis: number;
};

const USA_TRIP_ID = "usa-road-trip-2026";

const DEFAULT_TRIPS: Trip[] = [
  {
    id: USA_TRIP_ID,
    name: "USA Road Trip 2026",
    country: "USA",
    flag: "🇺🇸",
    startDate: "9 września 2026",
    endDate: "28 września 2026",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80",
    days: 4,
    places: 10,
    distanceMeters: 0,
    durationMillis: 0,
  },
];

function formatDistance(
  meters: number
) {
  if (!meters || meters <= 0) {
    return "0 km";
  }

  const km = meters / 1000;

  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }

  return `${Math.round(km)} km`;
}

function getFlag(
  countryName: string
) {
  const normalized =
    countryName
      .trim()
      .toLowerCase();

  const flags: Record<
    string,
    string
  > = {
    usa: "🇺🇸",
    "stany zjednoczone": "🇺🇸",
    "united states": "🇺🇸",

    polska: "🇵🇱",
    poland: "🇵🇱",

    japonia: "🇯🇵",
    japan: "🇯🇵",

    włochy: "🇮🇹",
    wlochy: "🇮🇹",
    italy: "🇮🇹",

    francja: "🇫🇷",
    france: "🇫🇷",

    hiszpania: "🇪🇸",
    spain: "🇪🇸",

    portugalia: "🇵🇹",
    portugal: "🇵🇹",

    meksyk: "🇲🇽",
    mexico: "🇲🇽",

    kanada: "🇨🇦",
    canada: "🇨🇦",

    australia: "🇦🇺",

    wietnam: "🇻🇳",
    vietnam: "🇻🇳",

    tajlandia: "🇹🇭",
    thailand: "🇹🇭",

    grecja: "🇬🇷",
    greece: "🇬🇷",

    chorwacja: "🇭🇷",
    croatia: "🇭🇷",

    islandia: "🇮🇸",
    iceland: "🇮🇸",

    norwegia: "🇳🇴",
    norway: "🇳🇴",

    szwajcaria: "🇨🇭",
    switzerland: "🇨🇭",

    austria: "🇦🇹",

    niemcy: "🇩🇪",
    germany: "🇩🇪",

    "wielka brytania": "🇬🇧",
    "united kingdom": "🇬🇧",
    uk: "🇬🇧",

    irlandia: "🇮🇪",
    ireland: "🇮🇪",

    indonezja: "🇮🇩",
    indonesia: "🇮🇩",

    "nowa zelandia": "🇳🇿",
    "new zealand": "🇳🇿",

    "kostaryka": "🇨🇷",
    "costa rica": "🇨🇷",
  };

  return (
    flags[normalized] ||
    "🌎"
  );
}

function getDefaultImage(
  countryName: string
) {
  const normalized =
    countryName
      .trim()
      .toLowerCase();

  const images: Record<
    string,
    string
  > = {
    usa:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80",

    japonia:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=80",

    japan:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=80",

    włochy:
      "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=80",

    wlochy:
      "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=80",

    italy:
      "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=80",

    francja:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",

    france:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",

    hiszpania:
      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80",

    spain:
      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80",

    australia:
      "https://images.unsplash.com/photo-1506973035872-a4f3f6b0c5d6?auto=format&fit=crop&w=1200&q=80",

    wietnam:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",

    vietnam:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",

    tajlandia:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",

    thailand:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",

    grecja:
      "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=1200&q=80",

    greece:
      "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=1200&q=80",

    polska:
      "https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=1200&q=80",

    poland:
      "https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=1200&q=80",
  };

  return (
    images[normalized] ||
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80"
  );
}

function formatDate(
  date: string
) {
  const [year, month, day] =
    date.split("-");

  const dateObject =
    new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

  return dateObject.toLocaleDateString(
    "pl-PL",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function loadTrips(): Trip[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return DEFAULT_TRIPS;
  }

  try {
    const saved =
      localStorage.getItem(
        "trip-planner-trips"
      );

    if (!saved) {
      return DEFAULT_TRIPS;
    }

    const parsed =
      JSON.parse(saved);

    if (
      !Array.isArray(parsed)
    ) {
      return DEFAULT_TRIPS;
    }

    /*
     * MIGRACJA STARYCH DANYCH
     *
     * Jeżeli wcześniejsza wersja aplikacji
     * zapisała np. 5500 km dla nowej
     * podróży, usuwamy takie dane.
     *
     * Każda podróż ma teraz własny
     * dystans i czas.
     */

    const migrated =
      parsed.map(
        (trip: Partial<Trip>) => ({
          id:
            trip.id ||
            `${Date.now()}-${Math.random()}`,

          name:
            trip.name ||
            "Nowa podróż",

          country:
            trip.country ||
            "",

          flag:
            trip.flag ||
            "🌎",

          startDate:
            trip.startDate ||
            "Brak daty",

          endDate:
            trip.endDate ||
            "",

          image:
            trip.image ||
            getDefaultImage(
              trip.country ||
                ""
            ),

          days:
            typeof trip.days ===
            "number"
              ? trip.days
              : 0,

          places:
            typeof trip.places ===
            "number"
              ? trip.places
              : 0,

          /*
           * STARYM NOWYM PODRÓŻOM
           * zerujemy dystans.
           *
           * Wyjątkiem jest USA,
           * które później pobierze
           * prawdziwe dane z trasy.
           */

          distanceMeters:
            trip.id ===
            USA_TRIP_ID
              ? typeof trip.distanceMeters ===
                "number"
                ? trip.distanceMeters
                : 0
              : 0,

          durationMillis:
            trip.id ===
            USA_TRIP_ID
              ? typeof trip.durationMillis ===
                "number"
                ? trip.durationMillis
                : 0
              : 0,
        })
      );

    return migrated;
  } catch {
    return DEFAULT_TRIPS;
  }
}

export default function HomePage() {
  const [trips, setTrips] =
    useState<Trip[]>([]);

  const [showNewTrip, setShowNewTrip] =
    useState(false);

  const [tripName, setTripName] =
    useState("");

  const [country, setCountry] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [image, setImage] =
    useState("");

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    const loadedTrips =
      loadTrips();

    setTrips(
      loadedTrips
    );

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    localStorage.setItem(
      "trip-planner-trips",
      JSON.stringify(trips)
    );
  }, [
    trips,
    loaded,
  ]);

  function createTrip() {
    if (
      !tripName.trim() ||
      !country.trim()
    ) {
      return;
    }

    const newTrip: Trip = {
      id:
        `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,

      name:
        tripName.trim(),

      country:
        country.trim(),

      flag:
        getFlag(country),

      startDate:
        startDate
          ? formatDate(startDate)
          : "Brak daty",

      endDate:
        endDate
          ? formatDate(endDate)
          : "",

      image:
        image.trim() ||
        getDefaultImage(
          country
        ),

      days: 0,

      places: 0,

      /*
       * KAŻDA NOWA PODRÓŻ
       * ZACZYNA OD ZERA.
       */

      distanceMeters: 0,

      durationMillis: 0,
    };

    setTrips(
      (currentTrips) => [
        ...currentTrips,
        newTrip,
      ]
    );

    setTripName("");
    setCountry("");
    setStartDate("");
    setEndDate("");
    setImage("");

    setShowNewTrip(false);
  }

  function deleteTrip(
    tripId: string
  ) {
    const confirmed =
      window.confirm(
        "Czy na pewno chcesz usunąć tę podróż?"
      );

    if (!confirmed) {
      return;
    }

    setTrips(
      (currentTrips) =>
        currentTrips.filter(
          (trip) =>
            trip.id !==
            tripId
        )
    );

    localStorage.removeItem(
      `trip-${tripId}`
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                TRIP PLANNER
              </p>

              <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
                Moje podróże
              </h1>

              <p className="mt-2 text-slate-500">
                Planuj, zapisuj i organizuj
                wszystkie swoje podróże w jednym
                miejscu.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowNewTrip(true)
              }
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              ＋ Nowa podróż
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {trips.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="text-6xl">
              🌎
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Nie masz jeszcze żadnej podróży
            </h2>

            <p className="mx-auto mt-2 max-w-md text-slate-500">
              Utwórz pierwszą podróż i zacznij
              planować trasę, miejsca oraz
              atrakcje.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowNewTrip(true)
              }
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              ＋ Utwórz podróż
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Twoje podróże
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {trips.length}{" "}
                  {trips.length === 1
                    ? "podróż"
                    : "podróży"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map(
                (trip) => (
                  <div
                    key={trip.id}
                    className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <Link
                      href={
                        trip.id ===
                        USA_TRIP_ID
                          ? "/trip"
                          : `/trip/${trip.id}`
                      }
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={
                            trip.image
                          }
                          alt={
                            trip.name
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold shadow">
                          {trip.flag}{" "}
                          {trip.country}
                        </div>

                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-2xl font-bold text-white">
                            {trip.name}
                          </h3>

                          <p className="mt-1 text-sm text-white/85">
                            {trip.startDate}

                            {trip.endDate &&
                              ` – ${trip.endDate}`}
                          </p>
                        </div>
                      </div>
                    </Link>

                    <div className="p-5">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Dni
                          </p>

                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {trip.days}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Miejsca
                          </p>

                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {trip.places}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Trasa
                          </p>

                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {formatDistance(
                              trip.distanceMeters
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <Link
                          href={
                            trip.id ===
                            USA_TRIP_ID
                              ? "/trip"
                              : `/trip/${trip.id}`
                          }
                          className="flex-1 rounded-xl bg-blue-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Otwórz podróż
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            deleteTrip(
                              trip.id
                            )
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2.5 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          title="Usuń podróż"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              <button
                type="button"
                onClick={() =>
                  setShowNewTrip(true)
                }
                className="flex min-h-[390px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center text-slate-400 transition hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-600"
              >
                <div className="text-5xl">
                  ＋
                </div>

                <p className="mt-4 text-lg font-bold">
                  Nowa podróż
                </p>

                <p className="mt-1 text-sm">
                  Dodaj kolejną wyprawę
                </p>
              </button>
            </div>
          </>
        )}
      </section>

      {showNewTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() =>
            setShowNewTrip(false)
          }
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Nowa podróż
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Dodaj podstawowe informacje
                  o podróży.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowNewTrip(false)
                }
                className="rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nazwa podróży
                </label>

                <input
                  value={tripName}
                  onChange={(event) =>
                    setTripName(
                      event.target.value
                    )
                  }
                  placeholder="np. Japonia 2027"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Kraj
                </label>

                <input
                  value={country}
                  onChange={(event) =>
                    setCountry(
                      event.target.value
                    )
                  }
                  placeholder="np. Japonia"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                {country && (
                  <p className="mt-2 text-sm text-slate-500">
                    {getFlag(
                      country
                    )}{" "}
                    Grafika i flaga zostaną
                    dobrane automatycznie.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Początek
                  </label>

                  <input
                    type="date"
                    value={
                      startDate
                    }
                    onChange={(
                      event
                    ) =>
                      setStartDate(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Koniec
                  </label>

                  <input
                    type="date"
                    value={
                      endDate
                    }
                    onChange={(
                      event
                    ) =>
                      setEndDate(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Własna grafika
                  <span className="ml-1 text-slate-400">
                    (opcjonalnie)
                  </span>
                </label>

                <input
                  value={image}
                  onChange={(event) =>
                    setImage(
                      event.target.value
                    )
                  }
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {country && (
              <div className="mt-5 overflow-hidden rounded-xl">
                <div className="relative h-32">
                  <img
                    src={
                      image ||
                      getDefaultImage(
                        country
                      )
                    }
                    alt=""
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute inset-0 bg-black/20" />

                  <div className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-sm font-semibold">
                    {getFlag(
                      country
                    )}{" "}
                    {country}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowNewTrip(
                    false
                  )
                }
                className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Anuluj
              </button>

              <button
                type="button"
                onClick={
                  createTrip
                }
                disabled={
                  !tripName.trim() ||
                  !country.trim()
                }
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Utwórz podróż
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}