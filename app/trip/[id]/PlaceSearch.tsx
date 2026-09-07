"use client";

import { useEffect, useRef, useState } from "react";
import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";

export type SelectedPlace = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
};

type PlaceSearchProps = {
  onSelect: (place: SelectedPlace) => void;
};

export default function PlaceSearch({
  onSelect,
}: PlaceSearchProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const autocompleteRef =
    useRef<google.maps.places.PlaceAutocompleteElement | null>(
      null
    );

  const onSelectRef =
    useRef(onSelect);

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    onSelectRef.current =
      onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const apiKey =
        process.env
          .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        console.error(
          "Brak NEXT_PUBLIC_GOOGLE_MAPS_API_KEY w .env.local"
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
        } = await importLibrary(
          "places"
        );

        if (
          cancelled ||
          !containerRef.current
        ) {
          return;
        }

        if (autocompleteRef.current) {
          return;
        }

        const autocomplete =
          new PlaceAutocompleteElement();

        autocomplete.placeholder =
          "Wyszukaj miejsce...";

        autocompleteRef.current =
          autocomplete;

        const handleSelect = async (
          event: Event
        ) => {
          const placeEvent =
            event as google.maps.places.PlacePredictionSelectEvent;

          const placePrediction =
            placeEvent.placePrediction;

          if (!placePrediction) {
            return;
          }

          try {
            const place =
              placePrediction.toPlace();

            await place.fetchFields({
              fields: [
                "displayName",
                "formattedAddress",
                "location",
              ],
            });

            if (!place.location) {
              console.error(
                "Google nie zwróciło lokalizacji wybranego miejsca."
              );

              return;
            }

            const selectedPlace: SelectedPlace =
              {
                name:
                  place.displayName ??
                  place.formattedAddress ??
                  "Wybrane miejsce",

                address:
                  place.formattedAddress ??
                  undefined,

                lat:
                  place.location.lat(),

                lng:
                  place.location.lng(),
              };

            onSelectRef.current(
              selectedPlace
            );

            autocomplete.value = "";
          } catch (error) {
            console.error(
              "Błąd pobierania miejsca:",
              error
            );
          }
        };

        autocomplete.addEventListener(
          "gmp-select",
          handleSelect
        );

        containerRef.current.innerHTML =
          "";

        containerRef.current.appendChild(
          autocomplete
        );

        setReady(true);

        return () => {
          autocomplete.removeEventListener(
            "gmp-select",
            handleSelect
          );
        };
      } catch (error) {
        console.error(
          "Nie udało się uruchomić Google Places:",
          error
        );
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="w-full"
      />

      {!ready && (
        <div className="absolute inset-0 flex h-[48px] items-center rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-400">
          Ładowanie wyszukiwarki...
        </div>
      )}
    </div>
  );
}