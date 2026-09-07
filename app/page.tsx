"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MapLocation = {
  lat: number;
  lng: number;
};

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
  mapCenter: MapLocation;
  mapZoom: number;
};

type CountryData = {
  flag: string;
  image: string;
  mapCenter: MapLocation;
  mapZoom: number;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1600&q=80";

const COUNTRY_DATA: Record<string, CountryData> = {
  USA: {
    flag: "🇺🇸",
    image:
      "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 39.8283,
      lng: -98.5795,
    },
    mapZoom: 4,
  },

  Polska: {
    flag: "🇵🇱",
    image:
      "https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 52.069,
      lng: 19.4803,
    },
    mapZoom: 6,
  },

  Japonia: {
    flag: "🇯🇵",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 36.2048,
      lng: 138.2529,
    },
    mapZoom: 5,
  },

  Włochy: {
    flag: "🇮🇹",
    image:
      "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 41.8719,
      lng: 12.5674,
    },
    mapZoom: 5,
  },

  Francja: {
    flag: "🇫🇷",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 46.2276,
      lng: 2.2137,
    },
    mapZoom: 5,
  },

  Hiszpania: {
    flag: "🇪🇸",
    image:
      "https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 40.4637,
      lng: -3.7492,
    },
    mapZoom: 5,
  },

  Portugalia: {
    flag: "🇵🇹",
    image:
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 39.3999,
      lng: -8.2245,
    },
    mapZoom: 6,
  },

  Norwegia: {
    flag: "🇳🇴",
    image:
      "https://images.unsplash.com/photo-1520769945061-0a448c463865?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 60.472,
      lng: 8.4689,
    },
    mapZoom: 5,
  },

  Islandia: {
    flag: "🇮🇸",
    image:
      "https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 64.9631,
      lng: -19.0208,
    },
    mapZoom: 6,
  },

  Grecja: {
    flag: "🇬🇷",
    image:
      "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 39.0742,
      lng: 21.8243,
    },
    mapZoom: 6,
  },

  Chorwacja: {
    flag: "🇭🇷",
    image:
      "https://images.unsplash.com/photo-1555990538-1e6c6c2b2d5f?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 45.1,
      lng: 15.2,
    },
    mapZoom: 6,
  },

  Australia: {
    flag: "🇦🇺",
    image:
      "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: -25.2744,
      lng: 133.7751,
    },
    mapZoom: 4,
  },

  Kanada: {
    flag: "🇨🇦",
    image:
      "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 56.1304,
      lng: -106.3468,
    },
    mapZoom: 4,
  },

  Meksyk: {
    flag: "🇲🇽",
    image:
      "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 23.6345,
      lng: -102.5528,
    },
    mapZoom: 5,
  },

  Tajlandia: {
    flag: "🇹🇭",
    image:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 15.87,
      lng: 100.9925,
    },
    mapZoom: 5,
  },

  Wietnam: {
    flag: "🇻🇳",
    image:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 14.0583,
      lng: 108.2772,
    },
    mapZoom: 5,
  },

  Kostaryka: {
    flag: "🇨🇷",
    image:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 9.7489,
      lng: -83.7534,
    },
    mapZoom: 7,
  },

  ZEA: {
    flag: "🇦🇪",
    image:
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80",
    mapCenter: {
      lat: 23.4241,
      lng: 53.8478,
    },
    mapZoom: 6,
  },
};

function getCountryData(country: string): CountryData {
  return (
    COUNTRY_DATA[country] ?? {
      flag: "🌍",
      image: FALLBACK_IMAGE,
      mapCenter: {
        lat: 20,
        lng: 0,
      },
      mapZoom: 2,
    }
  );
}

function formatDistance(meters: number): string {
  if (!meters || meters <= 0) {
    return "0 km";
  }

  return `${Math.round(
    meters / 1000
  ).toLocaleString("pl-PL")} km`;
}

function formatDuration(milliseconds: number): string {
  if (!milliseconds || milliseconds <= 0) {
    return "0 h";
  }

  const totalMinutes = Math.round(
    milliseconds / 60000
  );

  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

function formatDatabaseDate(date: string | null): string {
  if (!date) {
    return "";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(
    "pl-PL",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function createTripId(): string {
  return crypto.randomUUID();
}

export default function HomePage() {
  const supabase = createClient();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [showCreate, setShowCreate] =
    useState(false);

  const [name, setName] = useState("");
  const [country, setCountry] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [customImage, setCustomImage] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    try {
      setLoaded(false);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Błąd użytkownika Supabase:",
          userError
        );

        setLoaded(true);
        return;
      }

      if (!user) {
        console.log(
          "Brak zalogowanego użytkownika."
        );

        setTrips([]);
        setLoaded(true);
        return;
      }

      const { data, error } =
        await supabase
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: true,
          });

      if (error) {
        console.error(
          "BŁĄD SUPABASE - POBIERANIE PODRÓŻY"
        );

        console.error(
          "message:",
          error.message
        );

        console.error(
          "details:",
          error.details
        );

        console.error(
          "hint:",
          error.hint
        );

        console.error(
          "code:",
          error.code
        );

        alert(
          `Błąd pobierania podróży:\n\n` +
            `Kod: ${
              error.code ?? "brak"
            }\n` +
            `Message: ${
              error.message ?? "brak"
            }\n` +
            `Details: ${
              error.details ?? "brak"
            }\n` +
            `Hint: ${
              error.hint ?? "brak"
            }`
        );

        setTrips([]);
        setLoaded(true);
        return;
      }

      const mappedTrips: Trip[] =
        (data ?? []).map(
          (trip: any) => {
            const tripCountry =
              trip.country ?? "";

            const countryData =
              getCountryData(
                tripCountry
              );

            return {
              id: trip.id,

              name:
                trip.name?.trim() ||
                tripCountry ||
                "Nowa podróż",

              country:
                tripCountry,

              flag:
                trip.flag ??
                countryData.flag,

              startDate:
                trip.start_date ??
                "",

              endDate:
                trip.end_date ??
                "",

              image:
                trip.image?.trim() ||
                countryData.image ||
                FALLBACK_IMAGE,

              days: Number(
                trip.days ?? 0
              ),

              places: Number(
                trip.places ?? 0
              ),

              distanceMeters:
                Number(
                  trip.distance_meters ??
                    0
                ),

              durationMillis:
                Number(
                  trip.duration_millis ??
                    0
                ),

              mapCenter:
                trip.map_center ??
                countryData.mapCenter,

              mapZoom:
                Number(
                  trip.map_zoom ??
                    countryData.mapZoom
                ),
            };
          }
        );

      setTrips(mappedTrips);
    } catch (error: any) {
      console.error(
        "NIEOCZEKIWANY BŁĄD:",
        error
      );

      alert(
        `Nieoczekiwany błąd:\n\n${
          error?.message ??
          String(error)
        }`
      );

      setTrips([]);
    } finally {
      setLoaded(true);
    }
  }

  async function createTrip() {
    if (!country) {
      alert("Wybierz kraj.");
      return;
    }

    const finalName =
      name.trim() || country;

    try {
      setCreating(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Błąd pobierania użytkownika:",
          userError
        );

        alert(
          `Błąd użytkownika:\n\n${userError.message}`
        );

        return;
      }

      if (!user) {
        alert(
          "Musisz być zalogowany."
        );

        return;
      }

      const tripId =
        createTripId();

      const countryData =
        getCountryData(country);

      const finalImage =
        customImage.trim() ||
        countryData.image ||
        FALLBACK_IMAGE;

      const newTrip: Trip = {
        id: tripId,

        name: finalName,

        country,

        flag: countryData.flag,

        startDate,

        endDate,

        image: finalImage,

        days: 1,

        places: 0,

        distanceMeters: 0,

        durationMillis: 0,

        mapCenter:
          countryData.mapCenter,

        mapZoom:
          countryData.mapZoom,
      };

      const { error } =
        await supabase
          .from("trips")
          .insert({
            id: tripId,

            user_id: user.id,

            name: finalName,

            country,

            flag: countryData.flag,

            start_date:
              startDate || null,

            end_date:
              endDate || null,

            image: finalImage,

            days: 1,

            places: 0,

            distance_meters: 0,

            duration_millis: 0,

            map_center:
              countryData.mapCenter,

            map_zoom:
              countryData.mapZoom,
          });

      if (error) {
        console.error(
          "BŁĄD SUPABASE - TWORZENIE PODRÓŻY",
          error
        );

        alert(
          `Nie udało się utworzyć podróży.\n\n` +
            `Kod: ${
              error.code ?? "brak"
            }\n` +
            `Message: ${
              error.message ?? "brak"
            }\n` +
            `Details: ${
              error.details ?? "brak"
            }\n` +
            `Hint: ${
              error.hint ?? "brak"
            }`
        );

        return;
      }

      setTrips(
        (current) => [
          ...current,
          newTrip,
        ]
      );

      setShowCreate(false);

      setName("");
      setCountry("");
      setStartDate("");
      setEndDate("");
      setCustomImage("");
    } catch (error: any) {
      console.error(
        "NIEOCZEKIWANY BŁĄD TWORZENIA:",
        error
      );

      alert(
        `Nieoczekiwany błąd:\n\n${
          error?.message ??
          String(error)
        }`
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteTrip(id: string) {
    const trip =
      trips.find(
        (item) =>
          item.id === id
      );

    if (!trip) {
      return;
    }

    const confirmed =
      window.confirm(
        `Czy na pewno chcesz usunąć podróż "${trip.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("trips")
          .delete()
          .eq("id", id);

      if (error) {
        console.error(
          "Błąd usuwania podróży:",
          error
        );

        alert(
          `Nie udało się usunąć podróży:\n\n${error.message}`
        );

        return;
      }

      setTrips(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );
    } catch (error: any) {
      console.error(
        "Niespodziewany błąd usuwania:",
        error
      );

      alert(
        `Nie udało się usunąć podróży:\n\n${
          error?.message ??
          String(error)
        }`
      );
    }
  }

  async function editTripImage(id: string) {
    const trip =
      trips.find(
        (item) =>
          item.id === id
      );

    if (!trip) {
      return;
    }

    const newImage =
      window.prompt(
        "Podaj adres zdjęcia:",
        trip.image
      );

    if (!newImage) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("trips")
          .update({
            image: newImage,
          })
          .eq("id", id);

      if (error) {
        console.error(
          "Błąd zmiany zdjęcia:",
          error
        );

        alert(
          `Nie udało się zmienić zdjęcia:\n\n${error.message}`
        );

        return;
      }

      setTrips(
        (current) =>
          current.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    image:
                      newImage,
                  }
                : item
          )
      );
    } catch (error: any) {
      console.error(
        "Błąd zmiany zdjęcia:",
        error
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-blue-600">
                DAY BY DAY
              </p>

              <h1 className="mt-1 text-4xl font-bold text-slate-900">
                Moje podróże
              </h1>

              <p className="mt-2 text-slate-500">
                Zaplanuj swoją kolejną podróż.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCreate(true)
              }
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              ＋ Nowa podróż
            </button>
          </div>
        </div>
      </header>

      {/* TRIPS */}

      <section className="mx-auto max-w-7xl px-6 py-8">
        {!loaded ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">
              Ładowanie podróży...
            </p>
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="text-5xl">
              ✈️
            </div>

            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              Nie masz jeszcze żadnej podróży
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-slate-500">
              Utwórz pierwszą podróż i zacznij planować trasę dzień po dniu.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowCreate(true)
              }
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              ＋ Utwórz podróż
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {trips.map(
              (trip) => (
                <article
                  key={
                    trip.id
                  }
                  className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-56">
                    <img
                      src={
                        trip.image ||
                        FALLBACK_IMAGE
                      }
                      alt={
                        trip.name
                      }
                      className="h-full w-full object-cover"
                      onError={(
                        event
                      ) => {
                        const img =
                          event.currentTarget;

                        if (
                          img.src !==
                          FALLBACK_IMAGE
                        ) {
                          img.src =
                            FALLBACK_IMAGE;
                        }
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xl shadow">
                      {
                        trip.flag
                      }
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteTrip(
                          trip.id
                        )
                      }
                      className="absolute right-4 top-4 rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-red-600 shadow hover:bg-white"
                    >
                      Usuń
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editTripImage(
                          trip.id
                        )
                      }
                      className="absolute bottom-4 right-4 rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-white"
                    >
                      Edytuj zdjęcie
                    </button>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h2 className="text-2xl font-bold text-white">
                        {
                          trip.name
                        }
                      </h2>

                      <p className="mt-1 text-sm text-white/90">
                        {
                          trip.country
                        }
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          Termin
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {trip.startDate
                            ? formatDatabaseDate(
                                trip.startDate
                              )
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          Dni
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {
                            trip.days
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          Miejsca
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {
                            trip.places
                          }
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs text-slate-400">
                          Dystans
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {formatDistance(
                            trip.distanceMeters
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs text-slate-400">
                          Czas jazdy
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {formatDuration(
                            trip.durationMillis
                          )}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`/trip/${trip.id}`}
                      className="mt-5 block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
                    >
                      Otwórz podróż →
                    </a>
                  </div>
                </article>
              )
            )}

            <button
              type="button"
              onClick={() =>
                setShowCreate(true)
              }
              className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-600"
            >
              <span className="text-5xl">
                ＋
              </span>

              <span className="mt-4 text-lg font-semibold">
                Dodaj nową podróż
              </span>

              <span className="mt-1 text-sm">
                Utwórz nowy plan podróży
              </span>
            </button>
          </div>
        )}
      </section>

      {/* CREATE TRIP MODAL */}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Nowa podróż
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Utwórz podróż i zacznij ją planować.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(
                      false
                    )
                  }
                  className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {/* NAME */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Nazwa podróży{" "}
                  <span className="font-normal text-slate-400">
                    (opcjonalnie)
                  </span>
                </label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target
                        .value
                    )
                  }
                  placeholder="np. USA Road Trip 2026"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Jeśli zostawisz puste, tytułem będzie nazwa kraju.
                </p>
              </div>

              {/* COUNTRY */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Kraj
                </label>

                <select
                  value={country}
                  onChange={(event) =>
                    setCountry(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Wybierz kraj
                  </option>

                  {Object.keys(
                    COUNTRY_DATA
                  ).map(
                    (countryName) => (
                      <option
                        key={
                          countryName
                        }
                        value={
                          countryName
                        }
                      >
                        {
                          COUNTRY_DATA[
                            countryName
                          ].flag
                        }{" "}
                        {
                          countryName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* DATES */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Data rozpoczęcia
                  </label>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Data zakończenia
                  </label>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) =>
                      setEndDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* IMAGE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Zdjęcie podróży
                </label>

                <input
                  value={
                    customImage
                  }
                  onChange={(event) =>
                    setCustomImage(
                      event.target
                        .value
                    )
                  }
                  placeholder="Opcjonalnie: adres zdjęcia"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Jeśli zostawisz puste, zostanie użyte zdjęcie domyślne dla kraju.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setShowCreate(
                    false
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Anuluj
              </button>

              <button
                type="button"
                onClick={
                  createTrip
                }
                disabled={
                  creating ||
                  !country
                }
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Tworzenie..."
                  : "Utwórz podróż"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}