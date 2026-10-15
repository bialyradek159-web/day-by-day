"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";

import type { ReactNode } from "react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import GoogleMap from "./GoogleMap";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// TYPES
// ============================================================

type MapLocation = {
  lat: number;
  lng: number;
};

type Place = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  time?: string;
  enabled: boolean;
};

type RoutePoint = {
  id: string;
  segmentIndex: number;
  lat: number;
  lng: number;
};

type Day = {
  id?: string;
  day: number;
  date: string;
  title: string;
  places: Place[];
  routePoints?: RoutePoint[];
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

type RouteStats = {
  distanceMeters: number;
  durationMillis: number;
  segments: {
    from: string;
    to: string;
    distanceMeters: number;
    durationMillis: number;
  }[];
};

type SupabaseDay = {
  id: string;
  trip_id: string;
  day: number | null;
  date: string | null;
  title: string | null;
};

type SupabasePlace = {
  id: string;
  day_id: string;
  place_id: string | null;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  place_order: number;
  visit_time: string | null;
  enabled: boolean | null;
};

type SupabaseRoutePoint = {
  id: string;
  day_id: string;
  point_order: number;
  lat: number;
  lng: number;
};
type Attraction = {
  id: string;
  name: string;
  region: string | null;
  category: string;
  lat: number;
  lng: number;
  importance: number;
  description: string | null;
  google_place_id: string | null;
  illustration_url: string | null;
};
const supabase = createClient();

// ============================================================
// OLD DEFAULT PLACE IDS
// ============================================================

const OLD_DEFAULT_PLACE_IDS = new Set([
  "lax",
  "santa-monica",
  "hollywood",
  "palm-springs",
  "route-66",
  "oatman",
  "grand-canyon",
  "horseshoe-bend",
  "monument-valley",
  "forrest-gump",
]);

// ============================================================
// ERROR HELPER
// ============================================================

function logSupabaseError(
  label: string,
  error: unknown
) {
  console.error(label, error);

  try {
    console.error(
      `${label} JSON:`,
      JSON.stringify(
        error,
        Object.getOwnPropertyNames(
          error as object
        )
      )
    );
  } catch {
    console.error(
      `${label} nie udało się zamienić błędu na JSON.`
    );
  }
}

// ============================================================
// UUID HELPER
// ============================================================

function createUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

// ============================================================
// DATE HELPERS
// ============================================================

function parseLocalDate(
  value: string
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDayDate(
  date: Date
): string {
  return date.toLocaleDateString(
    "pl-PL",
    {
      day: "numeric",
      month: "long",
    }
  );
}

function formatSupabaseDate(
  value: string | null
): string {
  if (!value) {
    return "";
  }

  const date =
    parseLocalDate(value);

  if (!date) {
    return value;
  }

  return formatDayDate(date);
}

// ============================================================
// GENERATE DAYS FROM TRIP DATES
// ============================================================

function generateDaysFromDates(
  startDate: string,
  endDate: string,
  existingDays: Day[] = []
): Day[] {
  const start =
    parseLocalDate(startDate);

  const end =
    parseLocalDate(endDate);

  if (
    !start ||
    !end ||
    start > end
  ) {
    return [];
  }

  const existingByDay =
    new Map<number, Day>();

  existingDays.forEach(
    (day) => {
      existingByDay.set(
        Number(day.day),
        day
      );
    }
  );

  const result: Day[] = [];

  const current =
    new Date(start);

  let dayNumber = 1;

  while (current <= end) {
    const existing =
      existingByDay.get(
        dayNumber
      );

    result.push({
      id: existing?.id,

      day: dayNumber,

      date:
        formatDayDate(
          current
        ),

      title:
        existing?.title &&
        existing.title !==
          `Dzień ${dayNumber}`
          ? existing.title
          : `Dzień ${dayNumber}`,

      places:
        existing?.places ?? [],

      routePoints:
        existing?.routePoints ??
        [],
    });

    current.setDate(
      current.getDate() + 1
    );

    dayNumber++;
  }

  return result;
}

// ============================================================
// CLEAN OLD DEFAULT DAYS
// ============================================================

function cleanOldDefaultDays(
  days: Day[]
): Day[] {
  return days.map(
    (day) => ({
      ...day,

      places:
        day.places.filter(
          (place) =>
            !OLD_DEFAULT_PLACE_IDS.has(
              place.id
            )
        ),

      routePoints:
        day.routePoints ?? [],
    })
  );
}

// ============================================================
// FORMATTERS
// ============================================================

function formatDistance(
  meters: number
): string {
  if (!meters) {
    return "0 km";
  }

  if (meters < 1000) {
    return `${Math.round(
      meters
    )} m`;
  }

  return `${(
    meters / 1000
  ).toFixed(0)} km`;
}

function formatDuration(
  milliseconds: number
): string {
  if (!milliseconds) {
    return "0 min";
  }

  const totalMinutes =
    Math.round(
      milliseconds / 60000
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

// ============================================================
// COMPONENT
// ============================================================
function SortablePlaceList({
  ids,
  onMove,
  children,
}: {
  ids: string[];
  onMove: (activeId: string, overId: string) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        onMove(String(active.id), String(over.id));
      }}
    >
      <SortableContext
        items={ids}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

function SortablePlaceItem({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative pl-8">
      {!disabled && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="absolute left-0 top-3 flex h-10 w-8 cursor-grab touch-none items-center justify-center rounded-lg text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
          aria-label="Przeciągnij, aby zmienić kolejność"
          title="Przeciągnij"
        >
          ⋮⋮
        </button>
      )}
      {children}
    </div>
  );
}
export default function TripPage() {
  const params =
    useParams();

  const tripId =
    typeof params.id ===
    "string"
      ? params.id
      : Array.isArray(
            params.id
          )
        ? params.id[0]
        : "";

  // ==========================================================
  // STATE
  // ==========================================================

  const [trip, setTrip] =
    useState<Trip | null>(
      null
    );

  const [days, setDays] =
    useState<Day[]>([]);

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(1);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    showAllDays,
    setShowAllDays,
  ] = useState(false);

  const [
    showAddPlace,
    setShowAddPlace,
  ] = useState(false);

  const [
    selectedPlace,
    setSelectedPlace,
  ] = useState<Place | null>(
    null
  );

  const [
    newPlaceTime,
    setNewPlaceTime,
  ] = useState("");

  const [
    routeStats,
    setRouteStats,
  ] = useState<RouteStats | null>(
    null
  );

  const [
    draggedPlaceId,
    setDraggedPlaceId,
  ] = useState<string | null>(
    null
  );
  const [attractions, setAttractions] =
    useState<Attraction[]>([]);

  const [showAttractions, setShowAttractions] =
    useState(true);
  const autocompleteContainerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const autocompleteRef =
    useRef<
      google.maps.places.PlaceAutocompleteElement | null
    >(null);

  // ==========================================================
  // LOAD TRIP + DAYS + PLACES + ROUTE POINTS FROM SUPABASE
  // ==========================================================

  useEffect(() => {
    if (!tripId) {
      return;
    }

    let cancelled = false;

    async function loadTrip() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (
        userError ||
        !user
      ) {
        setErrorMessage(
          "Nie jesteś zalogowany."
        );

        setLoading(false);
        return;
      }

      // --------------------------------------------------------
      // TRIP
      // --------------------------------------------------------

      const {
        data: tripData,
        error: tripError,
      } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (tripError) {
        logSupabaseError(
          "Błąd pobierania podróży:",
          tripError
        );

        setErrorMessage(
          "Nie udało się pobrać podróży."
        );

        setLoading(false);
        return;
      }

      if (!tripData) {
        setErrorMessage(
          "Nie znaleziono podróży."
        );

        setLoading(false);
        return;
      }

      const loadedTrip: Trip =
        {
          id: tripData.id,

          name:
            tripData.name ??
            "",

          country:
            tripData.country ??
            "",

          flag:
            tripData.flag ??
            "",

          startDate:
            tripData.start_date ??
            "",

          endDate:
            tripData.end_date ??
            "",

          image:
            tripData.image ??
            "",

          days: Number(
            tripData.days ?? 1
          ),

          places: Number(
            tripData.places ?? 0
          ),

          distanceMeters:
            Number(
              tripData.distance_meters ??
                0
            ),

          durationMillis:
            Number(
              tripData.duration_millis ??
                0
            ),

          mapCenter:
            tripData.map_center ??
            {
              lat: 39.8283,
              lng: -98.5795,
            },

          mapZoom:
            Number(
              tripData.map_zoom ?? 4
            ),
        };

      setTrip(
        loadedTrip
      );

      // --------------------------------------------------------
      // DAYS
      // --------------------------------------------------------

      const {
        data: daysData,
        error: daysError,
      } = await supabase
        .from("trip_days")
        .select(
          "id, trip_id, day, date, title"
        )
        .eq(
          "trip_id",
          tripId
        )
        .order("day", {
          ascending: true,
        });

      if (cancelled) {
        return;
      }

      if (daysError) {
        logSupabaseError(
          "Błąd pobierania dni:",
          daysError
        );

        setErrorMessage(
          "Nie udało się pobrać dni podróży."
        );

        setLoading(false);
        return;
      }

      const supabaseDays =
        (daysData ??
          []) as SupabaseDay[];

      // --------------------------------------------------------
      // PLACES
      // --------------------------------------------------------

      const dayIds =
        supabaseDays.map(
          (day) =>
            day.id
        );

      let supabasePlaces: SupabasePlace[] =
        [];

      if (
        dayIds.length > 0
      ) {
        const {
          data: placesData,
          error:
            placesError,
        } = await supabase
          .from("trip_places")
          .select(
            "id, day_id, place_id, name, address, lat, lng, place_order, visit_time, enabled"
          )
          .in(
            "day_id",
            dayIds
          )
          .order(
            "place_order",
            {
              ascending:
                true,
            }
          );

        if (cancelled) {
          return;
        }

        if (placesError) {
          logSupabaseError(
            "Błąd pobierania miejsc:",
            placesError
          );

          setErrorMessage(
            "Nie udało się pobrać miejsc."
          );

          setLoading(false);
          return;
        }

        supabasePlaces =
          (placesData ??
            []) as SupabasePlace[];
      }

      // --------------------------------------------------------
      // ROUTE POINTS
      // --------------------------------------------------------

      let supabaseRoutePoints: SupabaseRoutePoint[] =
        [];

      if (
        dayIds.length > 0
      ) {
        const {
          data: routeData,
          error:
            routeError,
        } = await supabase
          .from(
            "trip_route_points"
          )
          .select(
            "id, day_id, point_order, lat, lng"
          )
          .in(
            "day_id",
            dayIds
          )
          .order(
            "point_order",
            {
              ascending:
                true,
            }
          );

        if (cancelled) {
          return;
        }

        if (routeError) {
          logSupabaseError(
            "Błąd pobierania punktów trasy:",
            routeError
          );

          setErrorMessage(
            "Nie udało się pobrać punktów trasy."
          );

          setLoading(false);
          return;
        }

        supabaseRoutePoints =
          (routeData ??
            []) as SupabaseRoutePoint[];
      }

      // --------------------------------------------------------
      // BUILD DAYS
      // --------------------------------------------------------

      const loadedDays: Day[] =
        supabaseDays.map(
          (
            supabaseDay
          ) => {
            const dayNumber =
              Number(
                supabaseDay.day ??
                  0
              );

            const places =
              supabasePlaces
                .filter(
                  (place) =>
                    place.day_id ===
                    supabaseDay.id
                )
                .sort(
                  (a, b) =>
                    a.place_order -
                    b.place_order
                )
                .map(
                  (place) => ({
                    id: place.id,

                    name:
                      place.name,

                    address:
                      place.address ??
                      undefined,

                    lat: Number(
                      place.lat
                    ),

                    lng: Number(
                      place.lng
                    ),

                    time:
                      place.visit_time ??
                      undefined,

                    enabled:
                      place.enabled !==
                      false,
                  })
                );

            const routePoints =
              supabaseRoutePoints
                .filter(
                  (point) =>
                    point.day_id ===
                    supabaseDay.id
                )
                .sort(
                  (a, b) =>
                    a.point_order -
                    b.point_order
                )
                .map(
                  (
                    point,
                    index
                  ) => ({
                    id: point.id,

                    segmentIndex:
                      index,

                    lat: Number(
                      point.lat
                    ),

                    lng: Number(
                      point.lng
                    ),
                  })
                );

            return {
              id:
                supabaseDay.id,

              day:
                dayNumber,

              date:
                supabaseDay.date
                  ? formatSupabaseDate(
                      supabaseDay.date
                    )
                  : `Dzień ${dayNumber}`,

              title:
                supabaseDay.title ||
                `Dzień ${dayNumber}`,

              places,

              routePoints,
            };
          }
        );

      // --------------------------------------------------------
      // GENERATE MISSING DAYS
      // --------------------------------------------------------

      const generatedDays =
        generateDaysFromDates(
          loadedTrip.startDate,
          loadedTrip.endDate,
          loadedDays
        );

      const finalDays =
        generatedDays.length >
        0
          ? generatedDays
          : loadedDays;

      if (cancelled) {
        return;
      }

      setDays(
        cleanOldDefaultDays(
          finalDays
        )
      );

      setSelectedDay(
        Number(
          finalDays[0]?.day ??
            1
        )
      );

      setLoading(false);
    }

    void loadTrip();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // ==========================================================
  // GOOGLE PLACES AUTOCOMPLETE
  // ==========================================================

  useEffect(() => {
    if (
      !showAddPlace ||
      !autocompleteContainerRef.current
    ) {
      return;
    }

    let cancelled = false;

    async function initializeAutocomplete() {
      const apiKey =
        process.env
          .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        console.error(
          "Brakuje NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        );

        return;
      }

      try {
        setOptions({
          key: apiKey,
          v: "weekly",
        });

        const {
          PlaceAutocompleteElement,
        } =
          (await importLibrary(
            "places"
          )) as google.maps.PlacesLibrary;

        if (
          cancelled ||
          !autocompleteContainerRef.current
        ) {
          return;
        }

        autocompleteContainerRef.current.innerHTML =
          "";

        const autocomplete =
          new PlaceAutocompleteElement();

        autocomplete.placeholder =
          "Wyszukaj miejsce...";

        autocompleteRef.current =
          autocomplete;

        autocompleteContainerRef.current.appendChild(
          autocomplete
        );

        autocomplete.addEventListener(
          "gmp-select",
          async (
            event
          ) => {
            try {
              const placePrediction =
                (
                  event as google.maps.places.PlacePredictionSelectEvent
                )
                  .placePrediction;

              if (
                !placePrediction
              ) {
                return;
              }

              const place =
                placePrediction.toPlace();

              await place.fetchFields(
                {
                  fields: [
                    "displayName",
                    "formattedAddress",
                    "location",
                  ],
                }
              );

              if (
                !place.location
              ) {
                console.error(
                  "Google nie zwróciło lokalizacji."
                );

                return;
              }

              const name =
                place.displayName ??
                place.formattedAddress ??
                "Wybrane miejsce";

              const address =
                place.formattedAddress ??
                undefined;

              const newSelectedPlace: Place =
                {
                  id:
                    createUuid(),

                  name,

                  address,

                  lat:
                    place.location.lat(),

                  lng:
                    place.location.lng(),

                  enabled: true,
                };

              setSelectedPlace(
                newSelectedPlace
              );

              autocomplete.value =
                "";
            } catch (error) {
              logSupabaseError(
                "Błąd wyboru miejsca:",
                error
              );
            }
          }
        );
      } catch (error) {
        logSupabaseError(
          "Nie udało się uruchomić Google Places:",
          error
        );
      }
    }

    void initializeAutocomplete();

    return () => {
      cancelled = true;

      autocompleteRef.current =
        null;

      if (
        autocompleteContainerRef.current
      ) {
        autocompleteContainerRef.current.innerHTML =
          "";
      }
    };
  }, [showAddPlace]);

  // ==========================================================
  // CURRENT DAY
  // ==========================================================

  const currentDay =
    useMemo(() => {
      return (
        days.find(
          (day) =>
            day.day ===
            selectedDay
        ) ?? days[0]
      );
    }, [
      days,
      selectedDay,
    ]);

  // ==========================================================
  // ACTIVE PLACES
  // ==========================================================

  const activePlaces =
    useMemo(() => {
      return (
        currentDay?.places.filter(
          (place) =>
            place.enabled
        ) ?? []
      );
    }, [currentDay]);

  // ==========================================================
  // MAP DAYS
  // ==========================================================

  const mapDays =
    useMemo(() => {
      return days.map(
        (day) => ({
          ...day,

          places:
            day.places.filter(
              (place) =>
                place.enabled
            ),
        })
      );
    }, [days]);

  // ==========================================================
  // MAP PLACES
  // ==========================================================

  const mapPlaces =
    useMemo(() => {
      if (showAllDays) {
        return days.flatMap(
          (day) =>
            day.places.filter(
              (place) =>
                place.enabled
            )
        );
      }

      return activePlaces;
    }, [
      showAllDays,
      days,
      activePlaces,
    ]);

  // ==========================================================
  // TOTAL PLACES
  // ==========================================================

  const totalPlaces =
    useMemo(() => {
      return days.reduce(
        (sum, day) =>
          sum +
          day.places.length,
        0
      );
    }, [days]);

  // ==========================================================
  // TOTAL ACTIVE PLACES
  // ==========================================================

  const totalActivePlaces =
    useMemo(() => {
      return days.reduce(
        (sum, day) =>
          sum +
          day.places.filter(
            (place) =>
              place.enabled
          ).length,
        0
      );
    }, [days]);

  // ==========================================================
  // TOTAL STATS
  // ==========================================================

  const totalDistance =
    routeStats?.distanceMeters ??
    trip?.distanceMeters ??
    0;

  const totalDuration =
    routeStats?.durationMillis ??
    trip?.durationMillis ??
    0;

  // ==========================================================
  // GET REAL SUPABASE DAY ID
  // ==========================================================

  async function getOrCreateDayId(
    dayNumber: number
  ): Promise<string | null> {
    if (!tripId) {
      return null;
    }

    const localDay =
      days.find(
        (day) =>
          day.day ===
          dayNumber
      );

    // --------------------------------------------------------
    // 1. Mamy już prawdziwe ID
    // --------------------------------------------------------

    if (localDay?.id) {
      return localDay.id;
    }

    // --------------------------------------------------------
    // 2. Sprawdź Supabase
    // --------------------------------------------------------

    const {
      data,
      error,
    } =
      await supabase
        .from("trip_days")
        .select("id")
        .eq(
          "trip_id",
          tripId
        )
        .eq(
          "day",
          dayNumber
        )
        .maybeSingle();

    if (error) {
      logSupabaseError(
        "Błąd pobierania ID dnia:",
        error
      );

      return null;
    }

    if (data?.id) {
      const realDayId =
        data.id;

      setDays(
        (previousDays) =>
          previousDays.map(
            (day) =>
              day.day ===
              dayNumber
                ? {
                    ...day,
                    id: realDayId,
                  }
                : day
          )
      );

      return realDayId;
    }

    // --------------------------------------------------------
    // 3. Dnia nie ma - utwórz go
    //
    // WAŻNE:
    // Generujemy ID sami i NIE robimy .select()
    // po insert.
    // --------------------------------------------------------

    const newDayId =
      createUuid();

    const tripStartDate =
      trip?.startDate
        ? parseLocalDate(
            trip.startDate
          )
        : null;

    let isoDate:
      | string
      | null =
      null;

    if (tripStartDate) {
      const date =
        new Date(
          tripStartDate
        );

      date.setDate(
        date.getDate() +
          dayNumber -
          1
      );

      const year =
        date.getFullYear();

      const month =
        String(
          date.getMonth() + 1
        ).padStart(2, "0");

      const day =
        String(
          date.getDate()
        ).padStart(2, "0");

      isoDate =
        `${year}-${month}-${day}`;
    }

    const {
      error:
        insertError,
    } =
      await supabase
        .from("trip_days")
        .insert({
          id:
            newDayId,

          trip_id:
            tripId,

          day:
            dayNumber,

          date:
            isoDate,

          title:
            localDay?.title ??
            `Dzień ${dayNumber}`,
        });

    if (insertError) {
      logSupabaseError(
        "Błąd tworzenia dnia:",
        insertError
      );

      console.error(
        "Dane próby utworzenia dnia:",
        {
          id: newDayId,
          trip_id: tripId,
          day: dayNumber,
          date: isoDate,
          title:
            localDay?.title ??
            `Dzień ${dayNumber}`,
        }
      );

      alert(
        `Nie udało się utworzyć dnia podróży.\n\n${
          insertError.message ??
          "Nieznany błąd Supabase."
        }`
      );

      return null;
    }

    // --------------------------------------------------------
    // 4. Zapisz prawdziwe ID lokalnie
    // --------------------------------------------------------

    setDays(
      (previousDays) =>
        previousDays.map(
          (day) =>
            day.day ===
            dayNumber
              ? {
                  ...day,
                  id: newDayId,
                }
              : day
        )
    );

    return newDayId;
  }

  // ==========================================================
  // SAVE TRIP STATS
  // ==========================================================

  async function saveTripStats(
    distanceMeters: number,
    durationMillis: number
  ) {
    if (!tripId) {
      return;
    }

    const {
      error,
    } =
      await supabase
        .from("trips")
        .update({
          distance_meters:
            Math.round(
              distanceMeters
            ),

          duration_millis:
            Math.round(
              durationMillis
            ),

          days:
            days.length,

          places:
            totalPlaces,
        })
        .eq(
          "id",
          tripId
        );

    if (error) {
      logSupabaseError(
        "Błąd zapisu statystyk:",
        error
      );
    }
  }

  // ==========================================================
  // ROUTE STATS
  // ==========================================================

  function handleRouteStatsChange(
    stats: RouteStats | null
  ) {
    setRouteStats(
      stats
    );

    if (!stats) {
      return;
    }

    void saveTripStats(
      stats.distanceMeters,
      stats.durationMillis
    );
  }

  // ==========================================================
  // SAVE DAY PLACE ORDER
  // ==========================================================

  async function savePlaceOrder(
    dayNumber: number,
    places: Place[]
  ) {
    const day =
      days.find(
        (item) =>
          item.day ===
          dayNumber
      );

    if (!day) {
      return;
    }

    const dayId =
      await getOrCreateDayId(
        dayNumber
      );

    if (!dayId) {
      console.error(
        "Nie udało się znaleźć ID dnia przy zapisie kolejności."
      );

      return;
    }

    const updates =
      places.map(
        (
          place,
          index
        ) =>
          supabase
            .from("trip_places")
            .update({
              place_order:
                index,
            })
            .eq(
              "id",
              place.id
            )
            .eq(
              "day_id",
              dayId
            )
      );

    const results =
      await Promise.all(
        updates
      );

    const failed =
      results.find(
        (result) =>
          result.error
      );

    if (
      failed?.error
    ) {
      logSupabaseError(
        "Błąd zapisu kolejności miejsc:",
        failed.error
      );
    }
  }

  // ==========================================================
  // ROUTE POINT CHANGE
  // ==========================================================

  function handleRoutePointChange(
    dayNumber: number,
    segmentIndex: number,
    point: {
      lat: number;
      lng: number;
    }
  ) {
    setDays(
      (
        previousDays
      ) =>
        previousDays.map(
          (day) => {
            if (
              day.day !==
              dayNumber
            ) {
              return day;
            }

            const routePoints =
              [
                ...(day.routePoints ??
                  []),
              ];

            const existingIndex =
              routePoints.findIndex(
                (item) =>
                  item.segmentIndex ===
                  segmentIndex
              );

            const newPoint: RoutePoint =
              {
                id:
                  existingIndex >=
                  0
                    ? routePoints[
                        existingIndex
                      ].id
                    : createUuid(),

                segmentIndex,

                lat:
                  point.lat,

                lng:
                  point.lng,
              };

            if (
              existingIndex >=
              0
            ) {
              routePoints[
                existingIndex
              ] = newPoint;
            } else {
              routePoints.push(
                newPoint
              );
            }

            return {
              ...day,
              routePoints,
            };
          }
        )
    );

    void saveRoutePoint(
      dayNumber,
      segmentIndex,
      point
    );
  }

  // ==========================================================
  // SAVE ROUTE POINT
  // ==========================================================

  async function saveRoutePoint(
    dayNumber: number,
    segmentIndex: number,
    point: {
      lat: number;
      lng: number;
    }
  ) {
    const dayId =
      await getOrCreateDayId(
        dayNumber
      );

    if (!dayId) {
      console.error(
        "Nie udało się znaleźć ID dnia przy zapisie punktu trasy."
      );

      return;
    }

    const existingDay =
      days.find(
        (day) =>
          day.day ===
          dayNumber
      );

    const existingPoint =
      existingDay?.routePoints?.find(
        (routePoint) =>
          routePoint.segmentIndex ===
          segmentIndex
      );

    const pointId =
      existingPoint?.id ??
      createUuid();

    const {
      error,
    } =
      await supabase
        .from(
          "trip_route_points"
        )
        .upsert({
          id: pointId,

          day_id:
            dayId,

          point_order:
            segmentIndex,

          lat:
            point.lat,

          lng:
            point.lng,
        });

    if (error) {
      logSupabaseError(
        "Błąd zapisu punktu trasy:",
        error
      );
    }
  }

  // ==========================================================
  // REMOVE ROUTE POINT
  // ==========================================================

  function handleRoutePointRemove(
    dayNumber: number,
    segmentIndex: number
  ) {
    setDays(
      (
        previousDays
      ) =>
        previousDays.map(
          (day) => {
            if (
              day.day !==
              dayNumber
            ) {
              return day;
            }

            return {
              ...day,

              routePoints:
                (
                  day.routePoints ??
                  []
                ).filter(
                  (point) =>
                    point.segmentIndex !==
                    segmentIndex
                ),
            };
          }
        )
    );

    void removeRoutePoint(
      dayNumber,
      segmentIndex
    );
  }

  // ==========================================================
  // REMOVE ROUTE POINT FROM SUPABASE
  // ==========================================================

  async function removeRoutePoint(
    dayNumber: number,
    segmentIndex: number
  ) {
    const dayId =
      await getOrCreateDayId(
        dayNumber
      );

    if (!dayId) {
      console.error(
        "Nie udało się znaleźć ID dnia przy usuwaniu punktu trasy."
      );

      return;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "trip_route_points"
        )
        .delete()
        .eq(
          "day_id",
          dayId
        )
        .eq(
          "point_order",
          segmentIndex
        );

    if (error) {
      logSupabaseError(
        "Błąd usuwania punktu trasy:",
        error
      );
    }
  }

  // ==========================================================
  // REORDER PLACES
  // ==========================================================

  function handlePlaceReorder(
    dayNumber: number,
    fromIndex: number,
    toIndex: number
  ) {
    if (
      fromIndex ===
      toIndex
    ) {
      return;
    }

    setDays(
      (
        previousDays
      ) =>
        previousDays.map(
          (day) => {
            if (
              day.day !==
              dayNumber
            ) {
              return day;
            }

            const activePlaces =
              day.places.filter(
                (place) =>
                  place.enabled
              );

            const fromPlace =
              activePlaces[
                fromIndex
              ];

            const toPlace =
              activePlaces[
                toIndex
              ];

            if (
              !fromPlace ||
              !toPlace
            ) {
              return day;
            }

            const fromFullIndex =
              day.places.findIndex(
                (place) =>
                  place.id ===
                  fromPlace.id
              );

            const toFullIndex =
              day.places.findIndex(
                (place) =>
                  place.id ===
                  toPlace.id
              );

            if (
              fromFullIndex < 0 ||
              toFullIndex < 0
            ) {
              return day;
            }

            const places = [
              ...day.places,
            ];

            const [
              movedPlace,
            ] =
              places.splice(
                fromFullIndex,
                1
              );

            if (
              !movedPlace
            ) {
              return day;
            }

            let insertIndex =
              toFullIndex;

            if (
              fromFullIndex <
              toFullIndex
            ) {
              insertIndex--;
            }

            places.splice(
              insertIndex,
              0,
              movedPlace
            );

            return {
              ...day,

              places,

              routePoints:
                [],
            };
          }
        )
    );

    setRouteStats(
      null
    );

    const changedDay =
      days.find(
        (day) =>
          day.day ===
          dayNumber
      );

    if (changedDay) {
      const activePlaces =
        changedDay.places.filter(
          (place) =>
            place.enabled
        );

      const fromPlace =
        activePlaces[
          fromIndex
        ];

      const toPlace =
        activePlaces[
          toIndex
        ];

      if (
        fromPlace &&
        toPlace
      ) {
        const places = [
          ...changedDay.places,
        ];

        const fromFullIndex =
          places.findIndex(
            (place) =>
              place.id ===
              fromPlace.id
          );

        const toFullIndex =
          places.findIndex(
            (place) =>
              place.id ===
              toPlace.id
          );

        if (
          fromFullIndex >=
            0 &&
          toFullIndex >=
            0
        ) {
          const [
            movedPlace,
          ] =
            places.splice(
              fromFullIndex,
              1
            );

          if (
            movedPlace
          ) {
            let insertIndex =
              toFullIndex;

            if (
              fromFullIndex <
              toFullIndex
            ) {
              insertIndex--;
            }

            places.splice(
              insertIndex,
              0,
              movedPlace
            );

            void savePlaceOrder(
              dayNumber,
              places
            );
          }
        }
      }
    }

    void clearSupabaseRoutePoints(
      dayNumber
    );
  }

  // ==========================================================
  // CLEAR ROUTE POINTS AFTER REORDER
  // ==========================================================

  async function clearSupabaseRoutePoints(
    dayNumber: number
  ) {
    const dayId =
      await getOrCreateDayId(
        dayNumber
      );

    if (!dayId) {
      console.error(
        "Nie udało się znaleźć ID dnia przy czyszczeniu punktów trasy."
      );

      return;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "trip_route_points"
        )
        .delete()
        .eq(
          "day_id",
          dayId
        );

    if (error) {
      logSupabaseError(
        "Błąd czyszczenia punktów trasy:",
        error
      );
    }
  }

  // ==========================================================
  // TOGGLE PLACE
  // ==========================================================

  async function togglePlaceEnabled(
    dayNumber: number,
    placeId: string
  ) {
    const day =
      days.find(
        (item) =>
          item.day ===
          dayNumber
      );

    const place =
      day?.places.find(
        (item) =>
          item.id ===
          placeId
      );

    if (!day || !place) {
      return;
    }

    const nextEnabled =
      !place.enabled;

    // --------------------------------------------------------
    // OPTIMISTIC UI
    // --------------------------------------------------------

    setDays(
      (
        previousDays
      ) =>
        previousDays.map(
          (item) => {
            if (
              item.day !==
              dayNumber
            ) {
              return item;
            }

            return {
              ...item,

              places:
                item.places.map(
                  (currentPlace) =>
                    currentPlace.id ===
                    placeId
                      ? {
                          ...currentPlace,
                          enabled:
                            nextEnabled,
                        }
                      : currentPlace
                ),

              routePoints:
                [],
            };
          }
        )
    );

    setRouteStats(
      null
    );

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const {
      error,
    } =
      await supabase
        .from("trip_places")
        .update({
          enabled:
            nextEnabled,
        })
        .eq(
          "id",
          placeId
        );

    if (error) {
      logSupabaseError(
        "Błąd zmiany aktywności miejsca:",
        error
      );

      // Rollback
      setDays(
        (
          previousDays
        ) =>
          previousDays.map(
            (item) => {
              if (
                item.day !==
                dayNumber
              ) {
                return item;
              }

              return {
                ...item,

                places:
                  item.places.map(
                    (
                      currentPlace
                    ) =>
                      currentPlace.id ===
                      placeId
                        ? {
                            ...currentPlace,
                            enabled:
                              place.enabled,
                          }
                        : currentPlace
                  ),
              };
            }
          )
      );

      return;
    }

    await clearSupabaseRoutePoints(
      dayNumber
    );
  }

  // ==========================================================
  // OPEN ADD PLACE
  // ==========================================================
  useEffect(() => {
    async function loadAttractions() {
      const { data, error } = await supabase
        .from("attractions")
        .select(
          "id, name, region, category, lat, lng, importance, description, google_place_id, illustration_url"
        )
        .limit(1000);

      if (error) {
        logSupabaseError(
          "Błąd pobierania atrakcji:",
          error
        );
        return;
      }

      setAttractions((data ?? []) as Attraction[]);
    }

    void loadAttractions();
  }, []);

  async function addAttractionToDay(
    attraction: Attraction
  ) {
    if (!currentDay || !tripId) {
      return;
    }

    const dayId = await getOrCreateDayId(
      currentDay.day
    );

    if (!dayId) {
      return;
    }

    const newPlace: Place = {
      id: createUuid(),
      name: attraction.name,
      address: attraction.region ?? undefined,
      lat: attraction.lat,
      lng: attraction.lng,
      enabled: true,
    };

    const { error } = await supabase
      .from("trip_places")
      .insert({
        id: newPlace.id,
        day_id: dayId,
        place_id: newPlace.id,
        name: newPlace.name,
        address: newPlace.address ?? null,
        lat: newPlace.lat,
        lng: newPlace.lng,
        place_order: currentDay.places.length,
        visit_time: null,
        enabled: true,
      });

    if (error) {
      logSupabaseError(
        "Błąd dodawania atrakcji:",
        error
      );

      alert(
        `Nie udało się dodać miejsca.\n\n${
          error.message ??
          "Nieznany błąd Supabase."
        }`
      );

      return;
    }

    setDays((previousDays) =>
      previousDays.map((day) =>
        day.day === currentDay.day
          ? {
              ...day,
              places: [...day.places, newPlace],
              routePoints: [],
            }
          : day
      )
    );

    setRouteStats(null);

    await clearSupabaseRoutePoints(currentDay.day);
  }
  function openAddPlace() {
    setSelectedPlace(
      null
    );

    setNewPlaceTime(
      ""
    );

    setShowAddPlace(
      true
    );
  }

  // ==========================================================
  // ADD PLACE
  // ==========================================================

  async function addPlace() {
    if (
      !currentDay ||
      !selectedPlace ||
      !tripId
    ) {
      return;
    }

    const placeToAdd: Place =
      {
        ...selectedPlace,

        time:
          newPlaceTime ||
          undefined,

        enabled: true,
      };

    // --------------------------------------------------------
    // PRAWDZIWE ID DNIA
    // --------------------------------------------------------

    const dayId =
      await getOrCreateDayId(
        currentDay.day
      );

    if (!dayId) {
      console.error(
        "Nie udało się znaleźć ID dnia dla dodawanego miejsca."
      );

      return;
    }

    const placeOrder =
      currentDay.places.length;

    // --------------------------------------------------------
    // INSERT PLACE
    // --------------------------------------------------------

    const {
      error,
    } =
      await supabase
        .from("trip_places")
        .insert({
          id:
            placeToAdd.id,

          day_id:
            dayId,

          place_id:
            placeToAdd.id,

          name:
            placeToAdd.name,

          address:
            placeToAdd.address ??
            null,

          lat:
            placeToAdd.lat,

          lng:
            placeToAdd.lng,

          place_order:
            placeOrder,

          visit_time:
            newPlaceTime ||
            null,

          enabled:
            true,
        });

    if (error) {
      logSupabaseError(
        "Błąd dodawania miejsca:",
        error
      );

      console.error(
        "Dane miejsca:",
        {
          id:
            placeToAdd.id,
          day_id:
            dayId,
          place_id:
            placeToAdd.id,
          name:
            placeToAdd.name,
          address:
            placeToAdd.address ??
            null,
          lat:
            placeToAdd.lat,
          lng:
            placeToAdd.lng,
          place_order:
            placeOrder,
          visit_time:
            newPlaceTime ||
            null,
          enabled:
            true,
        }
      );

      alert(
        `Nie udało się zapisać miejsca.\n\n${
          error.message ??
          "Nieznany błąd Supabase."
        }`
      );

      return;
    }

    // --------------------------------------------------------
    // UPDATE UI
    // --------------------------------------------------------

    setDays(
      (
        previousDays
      ) =>
        previousDays.map(
          (day) => {
            if (
              day.day !==
              currentDay.day
            ) {
              return day;
            }

            return {
              ...day,

              places: [
                ...day.places,
                placeToAdd,
              ],

              routePoints:
                [],
            };
          }
        )
    );

    setRouteStats(
      null
    );

    setSelectedPlace(
      null
    );

    setNewPlaceTime(
      ""
    );

    setShowAddPlace(
      false
    );

    await clearSupabaseRoutePoints(
      currentDay.day
    );
  }

  // ==========================================================
  // DELETE PLACE
  // ==========================================================

  async function deletePlace(
    dayNumber: number,
    placeId: string
  ) {
    const {
      error,
    } =
      await supabase
        .from("trip_places")
        .delete()
        .eq(
          "id",
          placeId
        );

    if (error) {
      logSupabaseError(
        "Błąd usuwania miejsca:",
        error
      );

      alert(
        "Nie udało się usunąć miejsca."
      );

      return;
    }

    setDays(
      (
        previousDays
      ) =>
        previousDays.map(
          (day) => {
            if (
              day.day !==
              dayNumber
            ) {
              return day;
            }

            return {
              ...day,

              places:
                day.places.filter(
                  (place) =>
                    place.id !==
                    placeId
                ),

              routePoints:
                [],
            };
          }
        )
    );

    setRouteStats(
      null
    );

    await clearSupabaseRoutePoints(
      dayNumber
    );
  }

  // ==========================================================
  // UPDATE TIME
  // ==========================================================

  async function updatePlaceTime(
    dayNumber: number,
    placeId: string,
    time: string
  ) {
    const {
      error,
    } =
      await supabase
        .from("trip_places")
        .update({
          visit_time:
            time || null,
        })
        .eq(
          "id",
          placeId
        );

    if (error) {
      logSupabaseError(
        "Błąd zapisu godziny:",
        error
      );
    }

    setDays(
      (
        previousDays
      ) =>
        previousDays.map(
          (day) => {
            if (
              day.day !==
              dayNumber
            ) {
              return day;
            }

            return {
              ...day,

              places:
                day.places.map(
                  (place) =>
                    place.id ===
                    placeId
                      ? {
                          ...place,

                          time:
                            time ||
                            undefined,
                        }
                      : place
                ),
            };
          }
        )
    );
  }

  // ==========================================================
  // MOVE PLACE IN LIST
  // ==========================================================

  function movePlace(
    dayNumber: number,
    fromIndex: number,
    toIndex: number
  ) {
    if (
      fromIndex ===
      toIndex
    ) {
      return;
    }

    const day =
      days.find(
        (item) =>
          item.day ===
          dayNumber
      );

    if (!day) {
      return;
    }

    const places = [
      ...day.places,
    ];

    const [
      movedPlace,
    ] =
      places.splice(
        fromIndex,
        1
      );

    if (
      !movedPlace
    ) {
      return;
    }

    places.splice(
      toIndex,
      0,
      movedPlace
    );

    setDays(
      (
        previousDays
      ) =>
        previousDays.map(
          (item) =>
            item.day ===
            dayNumber
              ? {
                  ...item,

                  places,

                  routePoints:
                    [],
                }
              : item
        )
    );

    setRouteStats(
      null
    );

    void savePlaceOrder(
      dayNumber,
      places
    );

    void clearSupabaseRoutePoints(
      dayNumber
    );
  }

  // ==========================================================
  // DRAG LIST
  // ==========================================================

  function handleDragStart(
    placeId: string
  ) {
    setDraggedPlaceId(
      placeId
    );
  }

  function reorderActivePlaces(
  dayNumber: number,
  fromIndex: number,
  toIndex: number
) {
  if (fromIndex === toIndex) return;

  const day = days.find((item) => item.day === dayNumber);
  if (!day) return;

  const active = day.places.filter((place) => place.enabled);

  if (
    !active[fromIndex] ||
    toIndex < 0 ||
    toIndex >= active.length
  ) {
    return;
  }

  const reordered = [...active];
  const [moved] = reordered.splice(fromIndex, 1);
  if (!moved) return;
  reordered.splice(toIndex, 0, moved);

  let i = 0;
  const places = day.places.map((place) =>
    place.enabled ? (reordered[i++] ?? place) : place
  );

  setDays((previousDays) =>
    previousDays.map((item) =>
      item.day === dayNumber
        ? { ...item, places, routePoints: [] }
        : item
    )
  );

  setRouteStats(null);

  void savePlaceOrder(dayNumber, places);
  void clearSupabaseRoutePoints(dayNumber);
}

function handleDragEnd(
  dayNumber: number,
  targetIndex: number
) {
  if (!draggedPlaceId) return;

  const day = days.find((item) => item.day === dayNumber);
  const activeList =
    day?.places.filter((place) => place.enabled) ?? [];

  const sourceIndex = activeList.findIndex(
    (place) => place.id === draggedPlaceId
  );

  if (sourceIndex >= 0) {
    reorderActivePlaces(dayNumber, sourceIndex, targetIndex);
  }

  setDraggedPlaceId(null);
}
  function handleSortMove(activeId: string, overId: string) {
  if (!currentDay) return;

  const activeList = currentDay.places.filter(
    (place) => place.enabled
  );

  const from = activeList.findIndex((place) => place.id === activeId);
  const to = activeList.findIndex((place) => place.id === overId);

  if (from < 0 || to < 0) return;

  reorderActivePlaces(currentDay.day, from, to);
}
  function handleDragEndOld(
    dayNumber: number,
    targetIndex: number
  ) {
    if (
      !draggedPlaceId
    ) {
      return;
    }

    const day =
      days.find(
        (item) =>
          item.day ===
          dayNumber
      );

    if (!day) {
      setDraggedPlaceId(
        null
      );

      return;
    }

    const sourceIndex =
      day.places.findIndex(
        (place) =>
          place.id ===
          draggedPlaceId
      );

    if (
      sourceIndex >= 0
    ) {
      movePlace(
        dayNumber,
        sourceIndex,
        targetIndex
      );
    }

    setDraggedPlaceId(
      null
    );
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
          <p className="text-slate-600">
            Ładowanie podróży...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (!trip) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Nie znaleziono podróży
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {errorMessage}
          </p>

          <Link
            href="/"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            ← Moje podróże
          </Link>
        </div>
      </main>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="min-h-screen bg-slate-100">

      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">

          <div className="flex items-center justify-between gap-6">

            <div>

              <Link
                href="/"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                ← Moje podróże
              </Link>

              <div className="mt-2 flex items-center gap-3">

                <span className="text-4xl">
                  {trip.flag}
                </span>

                <div>

                  <h1 className="text-3xl font-bold text-slate-900">
                    {trip.name}
                  </h1>

                  <p className="mt-1 text-slate-500">

                    {trip.country}

                    {trip.startDate &&
                      trip.endDate && (
                        <>
                          {" "}
                          •{" "}
                          {
                            trip.startDate
                          }{" "}
                          –{" "}
                          {
                            trip.endDate
                          }
                        </>
                      )}

                  </p>

                </div>

              </div>

            </div>

            <button
              onClick={() =>
                setShowAllDays(
                  (value) =>
                    !value
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              {showAllDays
                ? "Widok dnia"
                : "Cała podróż"}
            </button>

          </div>

        </div>
      </header>

      {/* DAYS */}

      <div className="border-b bg-white">

        <div className="mx-auto max-w-7xl overflow-x-auto px-6">

          <div className="flex gap-2 py-4">

            {days.map(
              (day) => (

                <button
                  key={
                    day.day
                  }
                  onClick={() => {
                    setSelectedDay(
                      day.day
                    );

                    setShowAllDays(
                      false
                    );
                  }}
                  className={`min-w-[140px] rounded-xl px-4 py-3 text-left transition ${
                    !showAllDays &&
                    selectedDay ===
                      day.day
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >

                  <p className="text-xs font-medium">
                    DZIEŃ{" "}
                    {day.day}
                  </p>

                  <p className="mt-1 font-semibold">
                    {day.date}
                  </p>

                  <p
                    className={`mt-0.5 text-xs ${
                      !showAllDays &&
                      selectedDay ===
                        day.day
                        ? "text-blue-100"
                        : "text-slate-400"
                    }`}
                  >
                    {
                      day.places
                        .length
                    }{" "}
                    {day.places
                      .length ===
                    1
                      ? "miejsce"
                      : "miejsca"}
                  </p>

                </button>

              )
            )}

          </div>

        </div>

      </div>

      {/* MAIN */}

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[390px_1fr]">

        {/* LEFT */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          {showAllDays ? (

            <>
              <p className="text-sm font-medium text-blue-600">
                CAŁA PODRÓŻ
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {trip.name}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Wszystkie dni podróży
              </p>

              <div className="mt-6 space-y-5">

                {days.map(
                  (day) => (

                    <div
                      key={
                        day.day
                      }
                      className="rounded-xl border border-slate-200 p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="text-xs font-medium text-blue-600">
                            DZIEŃ{" "}
                            {day.day}
                          </p>

                          <p className="mt-1 font-semibold text-slate-900">
                            {
                              day.title
                            }
                          </p>

                          <p className="text-sm text-slate-400">
                            {
                              day.date
                            }
                          </p>

                        </div>

                        <button
                          onClick={() => {
                            setSelectedDay(
                              day.day
                            );

                            setShowAllDays(
                              false
                            );
                          }}
                          className="text-sm font-medium text-blue-600"
                        >
                          Otwórz
                        </button>

                      </div>

                      <div className="mt-4 space-y-2">

                        {day.places.length >
                        0 ? (

                          day.places.map(
                            (
                              place,
                              index
                            ) => (

                              <div
                                key={
                                  place.id
                                }
                                className={`flex items-center gap-3 rounded-lg p-3 ${
                                  place.enabled
                                    ? "bg-slate-50"
                                    : "bg-slate-50 opacity-50"
                                }`}
                              >

                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  place.enabled
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-200 text-slate-500"
                                }`}>
                                  {
                                    index +
                                    1
                                  }
                                </div>

                                <div>

                                  <p className={`text-sm font-medium ${
                                    place.enabled
                                      ? "text-slate-800"
                                      : "text-slate-500"
                                  }`}>
                                    {
                                      place.name
                                    }
                                  </p>

                                  {place.time && (
                                    <p className="text-xs text-slate-400">
                                      🕐{" "}
                                      {
                                        place.time
                                      }
                                    </p>
                                  )}

                                  {!place.enabled && (
                                    <p className="mt-0.5 text-xs font-medium text-amber-600">
                                      Opcjonalne
                                    </p>
                                  )}

                                </div>

                              </div>

                            )
                          )

                        ) : (

                          <p className="text-sm text-slate-400">
                            Brak miejsc.
                          </p>

                        )}

                      </div>

                    </div>

                  )
                )}

              </div>
            </>

          ) : (

            <>

              <p className="text-sm font-medium text-blue-600">
                DZIEŃ{" "}
                {currentDay?.day}
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {
                  currentDay?.title
                }
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {
                  currentDay?.date
                }
              </p>

              {/* PLACES */}

              <div className="mt-6 space-y-0">

  <SortablePlaceList
  ids={currentDay?.places.map((place) => place.id) ?? []}
  onMove={handleSortMove}
>

                {currentDay?.places.map(
                  (
                    place,
                    index
                  ) => {

                    const activeIndex =
                      activePlaces.findIndex(
                        (
                          activePlace
                        ) =>
                          activePlace.id ===
                          place.id
                      );

                    const nextActivePlace =
                      activePlaces[
                        activeIndex +
                          1
                      ];

                    const segment =
                      place.enabled &&
                      nextActivePlace
                        ? routeStats?.segments.find(
                            (
                              item
                            ) =>
                              item.from ===
                                place.name &&
                              item.to ===
                                nextActivePlace.name
                          )
                        : undefined;
return (
                    <SortablePlaceItem
  key={place.id}
  id={place.id}
  disabled={!place.enabled}
>

                        <div
                      
                          className={`group flex items-start gap-3 rounded-xl border p-4 transition ${
                            place.enabled
                              ? "cursor-grab border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm active:cursor-grabbing"
                              : "border-slate-200 bg-slate-50 opacity-60"
                          }`}
                        >

                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                            place.enabled
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-200 text-slate-500"
                          }`}>
                            {place.enabled ? activeIndex + 1 : "–"}
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0">

                                <p className={`font-semibold ${
                                  place.enabled
                                    ? "text-slate-900"
                                    : "text-slate-500"
                                }`}>
                                  {
                                    place.name
                                  }
                                </p>

                                {place.address && (
                                  <p className="mt-1 text-sm text-slate-400">
                                    {
                                      place.address
                                    }
                                  </p>
                                )}

                                {!place.enabled && (
                                  <p className="mt-1 text-xs font-medium text-amber-600">
                                    Opcjonalne — nie jest uwzględniane w trasie
                                  </p>
                                )}

                              </div>

                              <div className="flex shrink-0 items-center gap-2">

                                <button
                                  onClick={() =>
                                    togglePlaceEnabled(
                                      currentDay.day,
                                      place.id
                                    )
                                  }
                                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                    place.enabled
                                      ? "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  }`}
                                  title={
                                    place.enabled
                                      ? "Wyłącz z trasy"
                                      : "Włącz do trasy"
                                  }
                                >
                                  {place.enabled
                                    ? "Opcjonalne"
                                    : "Włącz"}
                                </button>

                                <button
                                  onClick={() =>
                                    deletePlace(
                                      currentDay.day,
                                      place.id
                                    )
                                  }
                                  className="opacity-0 text-xl text-slate-400 transition hover:text-red-500 group-hover:opacity-100"
                                  title="Usuń miejsce"
                                >
                                  ×
                                </button>

                              </div>

                            </div>

                            {place.time && (
                              <div className="mt-3">

                                <span className="rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-600">
                                  🕐{" "}
                                  {
                                    place.time
                                  }
                                </span>

                              </div>
                            )}

                          </div>

                        </div>

                        {/* ROUTE TO NEXT ACTIVE PLACE */}

                        {place.enabled &&
                          nextActivePlace && (

                          <div className="ml-4 flex items-stretch gap-3">

                            <div className="flex w-9 justify-center">

                              <div className="h-full min-h-[72px] border-l-2 border-dashed border-slate-300" />

                            </div>

                            <div className="flex-1 py-2">

                              <div className="rounded-lg bg-slate-50 px-3 py-2">

                                {segment ? (

                                  <div className="flex items-center gap-2 text-sm">

                                    <span>
                                      🚗
                                    </span>

                                    <span className="font-semibold text-slate-700">
                                      {formatDistance(
                                        segment.distanceMeters
                                      )}
                                    </span>

                                    <span className="text-slate-300">
                                      •
                                    </span>

                                    <span className="text-slate-500">
                                      {formatDuration(
                                        segment.durationMillis
                                      )}
                                    </span>

                                  </div>

                                ) : (

                                  <p className="text-xs text-slate-400">
                                    Obliczanie trasy...
                                  </p>

                                )}

                                <p className="mt-1 text-xs text-slate-400">
                                  {
                                    place.name
                                  }{" "}
                                  →{" "}
                                  {
                                    nextActivePlace.name
                                  }
                                </p>

                              </div>

                            </div>

                          </div>

                        )}

                      </SortablePlaceItem>
                    );
                  }
                )}
</SortablePlaceList>
                {currentDay?.places
                  .length ===
                  0 && (

                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">

                    <p className="text-sm text-slate-400">
                      Brak miejsc
                      w tym dniu.
                    </p>

                  </div>

                )}

              </div>

              {/* ADD PLACE */}

              <button
                onClick={
                  openAddPlace
                }
                className="mt-5 w-full rounded-xl border-2 border-dashed border-slate-300 py-3 font-medium text-slate-500 hover:bg-slate-50"
              >
                + Dodaj miejsce
              </button>

              <button
                onClick={() =>
                  setShowAttractions((value) => !value)
                }
                className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {showAttractions
                  ? "Ukryj atrakcje na mapie"
                  : "Pokaż atrakcje na mapie"}
              </button>
              {/* ROUTE INFO */}

              <div className="mt-5 rounded-xl bg-amber-50 p-4">

                <p className="text-sm font-semibold text-amber-800">
                  🚗 Trasa dnia
                </p>

                <p className="mt-1 text-sm text-amber-700">

                  {routeStats
                    ? `${formatDistance(
                        routeStats.distanceMeters
                      )} • ${formatDuration(
                        routeStats.durationMillis
                      )}`
                    : activePlaces.length <
                      2
                    ? "Włącz co najmniej dwa miejsca, aby obliczyć trasę."
                    : "Trasa zostanie obliczona automatycznie."}

                </p>

              </div>

            </>

          )}

        </section>

        {/* MAP */}

        <section className="min-h-[700px] overflow-hidden rounded-2xl bg-white shadow-sm">

          <GoogleMap
            places={
              mapPlaces
            }

            allDays={
              mapDays
            }

            showAllDays={
              showAllDays
            }

            selectedDay={
              selectedDay
            }

            routePoints={
              currentDay?.routePoints ??
              []
            }

            initialCenter={
              trip.mapCenter
            }

            initialZoom={
              trip.mapZoom
            }

            onRouteStatsChange={
              handleRouteStatsChange
            }

            onRoutePointChange={
              handleRoutePointChange
            }

            onRoutePointRemove={
              handleRoutePointRemove
            }
            attractions={
              attractions
            }

            showAttractions={
              showAttractions
            }

            onAttractionAdd={
              addAttractionToDay
            }
            onPlaceReorder={
              reorderActivePlaces
            }
          />

        </section>

      </div>

      {/* FOOTER */}

      <div className="mx-auto max-w-7xl px-6 pb-8">

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-xl bg-white p-5">

            <p className="text-sm text-slate-400">
              Dystans
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatDistance(
                totalDistance
              )}
            </p>

          </div>

          <div className="rounded-xl bg-white p-5">

            <p className="text-sm text-slate-400">
              Czas jazdy
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatDuration(
                totalDuration
              )}
            </p>

          </div>

          <div className="rounded-xl bg-white p-5">

            <p className="text-sm text-slate-400">
              Miejsca
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalActivePlaces}

              {totalPlaces !==
                totalActivePlaces && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  /{" "}
                  {totalPlaces}
                </span>
              )}
            </p>

          </div>

        </div>

      </div>

      {/* ADD PLACE MODAL */}

      {showAddPlace && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

            <div className="flex items-center justify-between">

              <div>

                <h3 className="text-xl font-bold text-slate-900">
                  Dodaj miejsce
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Dzień{" "}
                  {
                    currentDay?.day
                  }
                </p>

              </div>

              <button
                onClick={() =>
                  setShowAddPlace(
                    false
                  )
                }
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>

            </div>

            {/* GOOGLE SEARCH */}

            <div className="mt-6">

              <label className="text-sm font-medium text-slate-700">
                Wyszukaj miejsce
              </label>

              <div
                ref={
                  autocompleteContainerRef
                }
                className="mt-2"
              />

            </div>

            {/* SELECTED PLACE */}

            {selectedPlace && (

              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    ✓
                  </div>

                  <div className="min-w-0">

                    <p className="text-xs font-medium text-green-700">
                      WYBRANE MIEJSCE
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {
                        selectedPlace.name
                      }
                    </p>

                    {selectedPlace.address && (
                      <p className="mt-1 text-sm text-slate-500">
                        {
                          selectedPlace.address
                        }
                      </p>
                    )}

                  </div>

                </div>

              </div>

            )}

            {/* TIME */}

            <div className="mt-4">

              <label className="text-sm font-medium text-slate-700">

                Godzina{" "}

                <span className="font-normal text-slate-400">
                  (opcjonalnie)
                </span>

              </label>

              <input
                type="time"
                value={
                  newPlaceTime
                }
                onChange={(
                  event
                ) =>
                  setNewPlaceTime(
                    event.target
                      .value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
              />

            </div>

            {/* BUTTONS */}

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() =>
                  setShowAddPlace(
                    false
                  )
                }
                className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Anuluj
              </button>

              <button
                onClick={
                  addPlace
                }
                disabled={
                  !selectedPlace
                }
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Dodaj miejsce
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}
