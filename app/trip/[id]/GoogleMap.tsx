"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";

// ============================================================
// TYPES
// ============================================================

type Place = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  time?: string;
};

type RoutePoint = {
  id: string;
  segmentIndex: number;
  lat: number;
  lng: number;
};

type Day = {
  day: number;
  date: string;
  title: string;
  places: Place[];
  routePoints?: RoutePoint[];
};

type SegmentStats = {
  from: string;
  to: string;
  distanceMeters: number;
  durationMillis: number;
};

type RouteStats = {
  distanceMeters: number;
  durationMillis: number;
  segments: SegmentStats[];
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
type GoogleMapProps = {
  places: Place[];

  allDays: Day[];

  showAllDays: boolean;

  selectedDay?: number;

  routePoints?: RoutePoint[];

  initialCenter?: {
    lat: number;
    lng: number;
  };

  initialZoom?: number;

  onRouteStatsChange: (
    stats: RouteStats | null
  ) => void;

  onRoutePointChange?: (
    dayNumber: number,
    segmentIndex: number,
    point: {
      lat: number;
      lng: number;
    }
  ) => void;

  onRoutePointRemove?: (
    dayNumber: number,
    segmentIndex: number
  ) => void;

    attractions?: Attraction[];

  showAttractions?: boolean;

  onAttractionAdd?: (
    attraction: Attraction
  ) => void;
  onPlaceReorder?: (
    dayNumber: number,
    fromIndex: number,
    toIndex: number
  ) => void;
};

// ============================================================
// CONSTANTS
// ============================================================

const DAY_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#db2778",
];

const DEFAULT_CENTER = {
  lat: 20,
  lng: 0,
};

const DEFAULT_ZOOM = 2;

// Odległość w pikselach, w której przeciągnięcie
// jednego miejsca na drugie oznacza zmianę kolejności.
const REORDER_DISTANCE_PX = 90;

// ============================================================
// HELPERS
// ============================================================

function getDayColor(day: number) {
  return DAY_COLORS[
    (day - 1) % DAY_COLORS.length
  ];
}

// ============================================================
// COMPONENT
// ============================================================

export default function GoogleMap({
  places,
  allDays,
  showAllDays,
  selectedDay,
  routePoints = [],
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  onRouteStatsChange,
  onRoutePointChange,
  onRoutePointRemove,
  onPlaceReorder,
    attractions = [],
  showAttractions = true,
  onAttractionAdd,
}: GoogleMapProps) {
  // ==========================================================
  // STATE
  // ==========================================================

  const [mapReady, setMapReady] =
    useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<google.maps.Map | null>(null);

  const polylinesRef =
    useRef<google.maps.Polyline[]>([]);

  const markersRef =
    useRef<
      google.maps.marker.AdvancedMarkerElement[]
    >([]);

  const routePointMarkersRef =
    useRef<
      google.maps.marker.AdvancedMarkerElement[]
    >([]);

  const calculationIdRef =
    useRef(0);

  const fittedViewRef =
    useRef<string>("");

  // ==========================================================
  // CALLBACK REFS
  // ==========================================================

  const onRouteStatsChangeRef =
    useRef(onRouteStatsChange);

  const onRoutePointChangeRef =
    useRef(onRoutePointChange);

  const onRoutePointRemoveRef =
    useRef(onRoutePointRemove);

    const onAttractionAddRef =
    useRef(onAttractionAdd);

  useEffect(() => {
    onAttractionAddRef.current =
      onAttractionAdd;
  }, [onAttractionAdd]);
  const onPlaceReorderRef =
    useRef(onPlaceReorder);

  useEffect(() => {
    onRouteStatsChangeRef.current =
      onRouteStatsChange;
  }, [onRouteStatsChange]);

  useEffect(() => {
    onRoutePointChangeRef.current =
      onRoutePointChange;
  }, [onRoutePointChange]);

  useEffect(() => {
    onRoutePointRemoveRef.current =
      onRoutePointRemove;
  }, [onRoutePointRemove]);

  useEffect(() => {
    onPlaceReorderRef.current =
      onPlaceReorder;
  }, [onPlaceReorder]);

  // ==========================================================
  // CLEANUP
  // ==========================================================

  const clearMapObjects =
    useCallback(() => {
      for (
        const polyline of
        polylinesRef.current
      ) {
        polyline.setMap(null);
      }

      polylinesRef.current = [];

      for (
        const marker of
        markersRef.current
      ) {
        marker.map = null;
      }

      markersRef.current = [];

      for (
        const marker of
        routePointMarkersRef.current
      ) {
        marker.map = null;
      }

      routePointMarkersRef.current = [];
    }, []);

  // ==========================================================
  // INITIALIZE MAP
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
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

        const { Map } =
          (await importLibrary(
            "maps"
          )) as google.maps.MapsLibrary;

        await importLibrary(
          "marker"
        );

        if (
          cancelled ||
          !mapContainerRef.current
        ) {
          return;
        }

        if (mapRef.current) {
          return;
        }

        const map =
          new Map(
            mapContainerRef.current,
            {
              center:
                initialCenter,

              zoom:
                initialZoom,

              mapId:
                "DEMO_MAP_ID",

              mapTypeControl:
                false,

              streetViewControl:
                false,

              fullscreenControl:
                true,

              zoomControl:
                true,

              scrollwheel:
                true,

              gestureHandling:
                "greedy",

              minZoom:
                2,

              maxZoom:
                21,

              draggable:
                true,
            }
          );

        if (cancelled) {
          return;
        }

        mapRef.current =
          map;

        setMapReady(true);
      } catch (error) {
        console.error(
          "Nie udało się uruchomić Google Maps:",
          error
        );
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
    };
  }, [
    initialCenter.lat,
    initialCenter.lng,
    initialZoom,
  ]);

  // ==========================================================
  // DRAW MAP
  // ==========================================================

  useEffect(() => {
    if (
      !mapReady ||
      !mapRef.current
    ) {
      return;
    }

    let cancelled = false;

    const currentCalculationId =
      ++calculationIdRef.current;

    async function drawMap() {
      try {
        const [
          { Route },
          {
            AdvancedMarkerElement,
            PinElement,
          },
        ] = await Promise.all([
          importLibrary(
            "routes"
          ) as Promise<
            google.maps.RoutesLibrary
          >,

          importLibrary(
            "marker"
          ) as Promise<
            google.maps.MarkerLibrary
          >,
        ]);

        if (
          cancelled ||
          !mapRef.current
        ) {
          return;
        }

        // ======================================================
        // ROUTE SEGMENT
        // ======================================================

        type RouteSegment = {
          dayNumber: number;
          segmentIndex: number;
          from: Place;
          to: Place;
          color: string;
          routePoint?: RoutePoint;
        };

        const routeSegments:
          RouteSegment[] = [];

        // ======================================================
        // BUILD ROUTES
        // ======================================================

        if (showAllDays) {
          for (
            const day of allDays
          ) {
            const dayRoutePoints =
              day.routePoints ?? [];

            for (
              let i = 0;
              i <
              day.places.length - 1;
              i++
            ) {
              const from =
                day.places[i];

              const to =
                day.places[i + 1];

              if (!from || !to) {
                continue;
              }

              const routePoint =
                dayRoutePoints.find(
                  (point) =>
                    point.segmentIndex ===
                    i
                );

              routeSegments.push({
                dayNumber:
                  day.day,

                segmentIndex:
                  i,

                from,

                to,

                color:
                  getDayColor(
                    day.day
                  ),

                routePoint,
              });
            }
          }
        } else {
          const day =
            allDays.find(
              (item) =>
                item.day ===
                selectedDay
            );

          const dayPlaces =
            day?.places ?? places;

          const dayNumber =
            selectedDay ??
            day?.day ??
            1;

          for (
            let i = 0;
            i <
            dayPlaces.length - 1;
            i++
          ) {
            const from =
              dayPlaces[i];

            const to =
              dayPlaces[i + 1];

            if (!from || !to) {
              continue;
            }

            const routePoint =
              routePoints.find(
                (point) =>
                  point.segmentIndex ===
                  i
              );

            routeSegments.push({
              dayNumber,

              segmentIndex:
                i,

              from,

              to,

              color:
                getDayColor(
                  dayNumber
                ),

              routePoint,
            });
          }
        }

        // ======================================================
        // PREPARE
        // ======================================================

        const preparedPolylines:
          google.maps.Polyline[] =
          [];

        const preparedMarkers:
          google.maps.marker.AdvancedMarkerElement[] =
          [];

        const preparedRoutePointMarkers:
          google.maps.marker.AdvancedMarkerElement[] =
          [];

        const segmentStats:
          SegmentStats[] = [];

        const bounds =
          new google.maps.LatLngBounds();

        // ======================================================
        // PLACE MARKERS
        // ======================================================

        const placesToShow =
          showAllDays
            ? allDays.flatMap(
                (day) =>
                  day.places.map(
                    (
                      place,
                      index
                    ) => ({
                      place,
                      day:
                        day.day,
                      index,
                    })
                  )
              )
            : places.map(
                (
                  place,
                  index
                ) => ({
                  place,
                  day:
                    selectedDay ??
                    1,
                  index,
                })
              );

        for (
          const item of
          placesToShow
        ) {
          if (cancelled) {
            return;
          }

          const color =
            getDayColor(
              item.day
            );

          const pin =
            new PinElement({
              glyphText:
                String(
                  item.index + 1
                ),

              glyphColor:
                "white",

              background:
                color,

              borderColor:
                color,

              scale:
                1,
            });

          // ====================================================
          // PLACE MARKER
          // ====================================================

          const marker =
            new AdvancedMarkerElement({
              map:
                mapRef.current,

              position: {
                lat:
                  item.place.lat,

                lng:
                  item.place.lng,
              },

              title:
                `${item.index + 1}. ${item.place.name}`,

              content:
                pin.element,

              gmpDraggable:
                !showAllDays,
            });

          // ====================================================
          // DRAG PLACE MARKER
          // ====================================================

          if (!showAllDays) {
            marker.addListener(
              "dragend",
              (
                event:
                  google.maps.MapMouseEvent
              ) => {
                if (
                  !event.latLng ||
                  !mapRef.current
                ) {
                  return;
                }

                const callback =
                  onPlaceReorderRef
                    .current;

                if (!callback) {
                  return;
                }

                const draggedIndex =
                  item.index;

                const draggedPosition =
                  event.latLng;

                let closestIndex =
                  -1;

                let closestDistance =
                  Number.POSITIVE_INFINITY;

                // Szukamy miejsca,
                // na które przeciągnięto marker.
                for (
                  const other of
                  places
                ) {
                  const otherIndex =
                    places.findIndex(
                      (place) =>
                        place.id ===
                        other.id
                    );

                  if (
                    otherIndex ===
                    draggedIndex
                  ) {
                    continue;
                  }

                  const projection =
                    mapRef.current
                      ?.getProjection();

                  if (!projection) {
                    continue;
                  }

                  const zoom =
                    mapRef.current.getZoom() ??
                    0;

                  const scale =
                    Math.pow(
                      2,
                      zoom
                    );

                  const worldDragged =
                    projection.fromLatLngToPoint(
                      draggedPosition
                    );

                  const worldOther =
                    projection.fromLatLngToPoint(
                      new google.maps.LatLng(
                        other.lat,
                        other.lng
                      )
                    );

                  if (
                    !worldDragged ||
                    !worldOther
                  ) {
                    continue;
                  }

                  const dx =
                    (worldDragged.x -
                      worldOther.x) *
                    scale;

                  const dy =
                    (worldDragged.y -
                      worldOther.y) *
                    scale;

                  const distance =
                    Math.sqrt(
                      dx * dx +
                        dy * dy
                    );

                  if (
                    distance <
                    closestDistance
                  ) {
                    closestDistance =
                      distance;

                    closestIndex =
                      otherIndex;
                  }
                }

                // Jeśli marker został
                // przeciągnięty na inne miejsce
                if (
                  closestIndex >= 0 &&
                  closestDistance <=
                    REORDER_DISTANCE_PX
                ) {
                  callback(
                    selectedDay ?? 1,
                    draggedIndex,
                    closestIndex
                  );
                }

                // Marker ma wrócić na
                // prawdziwą lokalizację miejsca.
                marker.position = {
                  lat:
                    item.place.lat,

                  lng:
                    item.place.lng,
                };
              }
            );
          }

          preparedMarkers.push(
            marker
          );

          bounds.extend({
            lat:
              item.place.lat,

            lng:
              item.place.lng,
          });
        }

        // ======================================================
        // CALCULATE ROUTES
        // ======================================================

        for (
          const segment of
          routeSegments
        ) {
          if (
            cancelled ||
            currentCalculationId !==
              calculationIdRef.current
          ) {
            return;
          }

          try {
            const request:
              google.maps.routes.ComputeRoutesRequest =
              {
                origin: {
                  lat:
                    segment.from.lat,

                  lng:
                    segment.from.lng,
                },

                destination: {
                  lat:
                    segment.to.lat,

                  lng:
                    segment.to.lng,
                },

                travelMode:
                  "DRIVING",

                units:
                  google.maps.UnitSystem
                    .METRIC,

                fields: [
                  "distanceMeters",
                  "durationMillis",
                  "path",
                ],
              };

            if (
              segment.routePoint
            ) {
              request.intermediates =
                [
                  {
                    location: {
                      lat:
                        segment.routePoint
                          .lat,

                      lng:
                        segment.routePoint
                          .lng,
                    },

                    via:
                      true,
                  },
                ];
            }

            const result =
              await Route.computeRoutes(
                request
              );

            if (
              cancelled ||
              currentCalculationId !==
                calculationIdRef.current
            ) {
              return;
            }

            if (
              !result.routes ||
              result.routes.length === 0
            ) {
              continue;
            }

            const route =
              result.routes[0];

            // ==================================================
            // STATS
            // ==================================================

            segmentStats.push({
              from:
                segment.from.name,

              to:
                segment.to.name,

              distanceMeters:
                route.distanceMeters ??
                0,

              durationMillis:
                route.durationMillis ??
                0,
            });

            // ==================================================
            // DRAW ROUTE
            // ==================================================

            let lines:
              google.maps.Polyline[] =
              [];

            try {
              lines =
                route.createPolylines({
                  polylineOptions: {
                    strokeColor:
                      segment.color,

                    strokeOpacity:
                      0.9,

                    strokeWeight:
                      6,

                    clickable:
                      true,

                    zIndex:
                      10,
                  },
                });
            } catch {
              lines = [];
            }

            // ==================================================
            // FALLBACK
            // ==================================================

            if (
              lines.length === 0 &&
              route.path &&
              route.path.length > 1
            ) {
              const fallbackLine =
                new google.maps.Polyline({
                  path:
                    route.path.map(
                      (point) => ({
                        lat:
                          point.lat,

                        lng:
                          point.lng,
                      })
                    ),

                  strokeColor:
                    segment.color,

                  strokeOpacity:
                    0.9,

                  strokeWeight:
                    6,

                  clickable:
                    true,

                  zIndex:
                    10,

                  map:
                    mapRef.current,
                });

              lines = [
                fallbackLine,
              ];
            }

            // ==================================================
            // ADD ROUTE LINES
            // ==================================================

            for (
              const line of
              lines
            ) {
              if (cancelled) {
                return;
              }

              line.setOptions({
                strokeColor:
                  segment.color,

                strokeOpacity:
                  0.9,

                strokeWeight:
                  6,

                clickable:
                  true,

                zIndex:
                  10,
              });

              line.setMap(
                mapRef.current
              );

              preparedPolylines.push(
                line
              );

              line.addListener(
                "click",
                (
                  event:
                    google.maps.MapMouseEvent
                ) => {
                  if (
                    showAllDays ||
                    !event.latLng
                  ) {
                    return;
                  }

                  const callback =
                    onRoutePointChangeRef
                      .current;

                  callback?.(
                    segment.dayNumber,

                    segment.segmentIndex,

                    {
                      lat:
                        event.latLng.lat(),

                      lng:
                        event.latLng.lng(),
                    }
                  );
                }
              );
            }

            // ==================================================
            // BOUNDS
            // ==================================================

            if (
              route.path &&
              route.path.length > 0
            ) {
              for (
                const point of
                route.path
              ) {
                const lat =
                  point.lat;

                const lng =
                  point.lng;

                if (
                  Number.isFinite(lat) &&
                  Number.isFinite(lng)
                ) {
                  bounds.extend({
                    lat,
                    lng,
                  });
                }
              }
            }

            // ==================================================
            // ORANGE ROUTE POINT
            // ==================================================

            if (
              segment.routePoint &&
              !showAllDays
            ) {
              const point =
                segment.routePoint;

              const pin =
                new PinElement({
                  glyphText:
                    "",

                  background:
                    "#f97316",

                  borderColor:
                    "#ea580c",

                  scale:
                    0.65,
                });

              const marker =
                new AdvancedMarkerElement({
                  map:
                    mapRef.current,

                  position: {
                    lat:
                      point.lat,

                    lng:
                      point.lng,
                  },

                  title:
                    "Przeciągnij, aby zmienić trasę",

                  content:
                    pin.element,

                  gmpDraggable:
                    true,
                });

              marker.addListener(
                "dragend",
                (
                  event:
                    google.maps.MapMouseEvent
                ) => {
                  if (
                    !event.latLng
                  ) {
                    return;
                  }

                  onRoutePointChangeRef
                    .current?.(
                      segment.dayNumber,

                      segment.segmentIndex,

                      {
                        lat:
                          event.latLng.lat(),

                        lng:
                          event.latLng.lng(),
                      }
                    );
                }
              );

              marker.addListener(
                "dblclick",
                () => {
                  onRoutePointRemoveRef
                    .current?.(
                      segment.dayNumber,

                      segment.segmentIndex
                    );
                }
              );

              preparedRoutePointMarkers.push(
                marker
              );

              bounds.extend({
                lat:
                  point.lat,

                lng:
                  point.lng,
              });
            }
          } catch (error) {
            console.error(
              "Błąd obliczania trasy:",
              error
            );
          }
        }

        // ======================================================
        // TOTAL STATS
        // ======================================================

        const totalDistance =
          segmentStats.reduce(
            (
              sum,
              segment
            ) =>
              sum +
              segment.distanceMeters,
            0
          );

        const totalDuration =
          segmentStats.reduce(
            (
              sum,
              segment
            ) =>
              sum +
              segment.durationMillis,
            0
          );

        if (
          cancelled ||
          currentCalculationId !==
            calculationIdRef.current
        ) {
          return;
        }

        // ======================================================
        // ATOMIC SWAP
        // ======================================================

        const oldPolylines =
          polylinesRef.current;

        const oldMarkers =
          markersRef.current;

        const oldRoutePointMarkers =
          routePointMarkersRef.current;

        polylinesRef.current =
          preparedPolylines;

        markersRef.current =
          preparedMarkers;

        routePointMarkersRef.current =
          preparedRoutePointMarkers;

        // ======================================================
        // REMOVE OLD
        // ======================================================

        for (
          const polyline of
          oldPolylines
        ) {
          polyline.setMap(null);
        }

        for (
          const marker of
          oldMarkers
        ) {
          marker.map = null;
        }

        for (
          const marker of
          oldRoutePointMarkers
        ) {
          marker.map = null;
        }

        // ======================================================
        // FIT BOUNDS
        // ======================================================

        const viewKey =
          showAllDays
            ? `all-${allDays
                .map(
                  (day) =>
                    `${day.day}:${day.places
                      .map(
                        (place) =>
                          place.id
                      )
                      .join(",")}`
                )
                .join("|")}`
            : `day-${selectedDay}-${places
                .map(
                  (place) =>
                    place.id
                )
                .join(",")}`;

        if (
          !bounds.isEmpty() &&
          fittedViewRef.current !==
            viewKey
        ) {
          mapRef.current.fitBounds(
            bounds,
            70
          );

          fittedViewRef.current =
            viewKey;
        }

        // ======================================================
        // STATS
        // ======================================================

        onRouteStatsChangeRef.current({
          distanceMeters:
            totalDistance,

          durationMillis:
            totalDuration,

          segments:
            segmentStats,
        });
      } catch (error) {
        console.error(
          "Błąd podczas rysowania mapy:",
          error
        );

        onRouteStatsChangeRef.current(
          null
        );
      }
    }

    void drawMap();

    return () => {
      cancelled = true;
    };
  }, [
    mapReady,
    places,
    allDays,
    showAllDays,
    selectedDay,
    routePoints,
  ]);

    // ==========================================================
  // ATTRACTIONS LAYER
  // ==========================================================

  useEffect(() => {
    const map = mapRef.current;

    if (!mapReady || !map) {
      return;
    }

    let cancelled = false;
    let infoWindow: google.maps.InfoWindow | null = null;
    let zoomListener: google.maps.MapsEventListener | null = null;

    const created: google.maps.marker.AdvancedMarkerElement[] = [];

    const CATEGORY_ICONS: Record<string, string> = {
      nature: "🏞️",
      viewpoint: "🔭",
      museum: "🏛️",
      beach: "🏖️",
      city: "🏙️",
      sight: "📍",
    };

    function minZoomFor(importance: number) {
      if (importance <= 1) return 0;
      if (importance === 2) return 6;
      return 8;
    }

    async function drawAttractions() {
      if (!showAttractions || attractions.length === 0) {
        return;
      }

      const { AdvancedMarkerElement } =
        (await importLibrary(
          "marker"
        )) as google.maps.MarkerLibrary;

      if (cancelled || !map) {
        return;
      }

      infoWindow = new google.maps.InfoWindow();

      const entries: {
        marker: google.maps.marker.AdvancedMarkerElement;
        minZoom: number;
      }[] = [];

      for (const attraction of attractions) {
        const el = document.createElement("div");

        el.style.cssText =
          "width:40px;height:40px;border-radius:9999px;background:white;" +
          "border:3px solid #f59e0b;box-shadow:0 2px 6px rgba(0,0,0,.35);" +
          "display:flex;align-items:center;justify-content:center;" +
          "font-size:20px;overflow:hidden;cursor:pointer;";

        if (attraction.illustration_url) {
          const img = document.createElement("img");
          img.src = attraction.illustration_url;
          img.alt = attraction.name;
          img.style.cssText =
            "width:100%;height:100%;object-fit:cover;";
          el.appendChild(img);
        } else {
          el.textContent =
            CATEGORY_ICONS[attraction.category] ?? "📍";
        }

        const marker = new AdvancedMarkerElement({
          map,
          position: {
            lat: attraction.lat,
            lng: attraction.lng,
          },
          title: attraction.name,
          content: el,
          zIndex: 1,
        });

        marker.addListener("click", () => {
          if (!infoWindow) return;

          const card = document.createElement("div");
          card.style.cssText =
            "max-width:240px;font-family:system-ui,sans-serif;";

          const title = document.createElement("div");
          title.textContent = attraction.name;
          title.style.cssText =
            "font-weight:700;font-size:15px;color:#0f172a;";
          card.appendChild(title);

          if (attraction.region) {
            const region = document.createElement("div");
            region.textContent = attraction.region;
            region.style.cssText =
              "font-size:12px;color:#64748b;margin-top:2px;";
            card.appendChild(region);
          }

          if (attraction.description) {
            const desc = document.createElement("p");
            desc.textContent = attraction.description;
            desc.style.cssText =
              "font-size:13px;color:#334155;margin:8px 0 0;";
            card.appendChild(desc);
          }

          if (!showAllDays && onAttractionAddRef.current) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "+ Dodaj do dnia";
            button.style.cssText =
              "margin-top:10px;width:100%;padding:8px 12px;border:0;" +
              "border-radius:8px;background:#2563eb;color:white;" +
              "font-weight:600;cursor:pointer;";
            button.addEventListener("click", () => {
              onAttractionAddRef.current?.(attraction);
              infoWindow?.close();
            });
            card.appendChild(button);
          }

          infoWindow.setContent(card);
          infoWindow.open({ map, anchor: marker });
        });

        created.push(marker);

        entries.push({
          marker,
          minZoom: minZoomFor(attraction.importance),
        });
      }

      function updateVisibility() {
        const zoom = map?.getZoom() ?? 0;

        for (const entry of entries) {
          entry.marker.map =
            zoom >= entry.minZoom ? map : null;
        }
      }

      updateVisibility();

      zoomListener = map.addListener(
        "zoom_changed",
        updateVisibility
      );
    }

    void drawAttractions();

    return () => {
      cancelled = true;

      zoomListener?.remove();
      infoWindow?.close();

      for (const marker of created) {
        marker.map = null;
      }
    };
  }, [
    mapReady,
    attractions,
    showAttractions,
    showAllDays,
  ]);
  // ==========================================================
  // UNMOUNT
  // ==========================================================

  useEffect(() => {
    return () => {
      calculationIdRef.current++;

      clearMapObjects();

      mapRef.current = null;

      setMapReady(false);
    };
  }, [clearMapObjects]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative h-full min-h-[700px] w-full">
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
      />

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-sm font-semibold text-slate-800">
          🗺️ Mapa podróży
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Przeciągnij marker na inne miejsce,
          aby zmienić kolejność.
        </p>
      </div>
    </div>
  );
}
