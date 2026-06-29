"use client";

import { reverseGeocode, searchPlaces } from "@/lib/mapClient";
import { type PlaceSuggestion, type Point } from "@/lib/mapTypes";
import { useCallback } from "react";

export type PlaceSearchResult = {
  source: "places" | "geocode";
  suggestions: PlaceSuggestion[];
};

export function looksLikeCoordinates(value: string) {
  return /^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(value.trim());
}

export function useGeocoder() {
  const searchWithPlacesApi = useCallback(async (query: string) => {
    const response = await fetch(
      `/api/directions?mode=search&q=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      return [] as PlaceSuggestion[];
    }

    const data = (await response.json()) as { results?: PlaceSuggestion[] };
    return data.results ?? [];
  }, []);

  const searchPlacesApi = useCallback(async (query: string) => {
    return searchPlaces(query);
  }, []);

  const resolvePlaceDetails = useCallback(
    async (placeId: string): Promise<{ address: string; point: Point }> => {
      const response = await fetch(
        `/api/directions?mode=place-details&placeId=${encodeURIComponent(placeId)}`,
      );

      if (response.ok) {
        const data = (await response.json()) as {
          address?: string;
          point?: Point;
        };

        if (data.address && data.point) {
          return { address: data.address, point: data.point };
        }
      }

      const [latText, lngText] = placeId.split(",");
      const lat = Number(latText);
      const lng = Number(lngText);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const address = await reverseGeocode({ lat, lng });
        return { address, point: { lat, lng } };
      }

      throw new Error("Unable to load details for this place.");
    },
    [],
  );

  const searchPlacesCombined = useCallback(
    async (query: string): Promise<PlaceSearchResult> => {
      const normalizedQuery = query.trim();

      if (normalizedQuery.length < 2) {
        return { source: "places", suggestions: [] };
      }

      const placesSuggestions = await searchWithPlacesApi(normalizedQuery);

      if (placesSuggestions.length > 0) {
        return { source: "places", suggestions: placesSuggestions };
      }

      const geocodeSuggestions = await searchPlacesApi(normalizedQuery);

      return {
        source: "geocode",
        suggestions: geocodeSuggestions,
      };
    },
    [searchPlacesApi, searchWithPlacesApi],
  );

  return {
    isReady: true,
    isGeocoderReady: true,
    isPlacesReady: true,
    resolvePlaceDetails,
    reverseGeocode,
    searchPlaces: searchPlacesCombined,
  };
}
