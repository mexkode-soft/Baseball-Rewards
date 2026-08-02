"use client";

import { LocateFixed, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./MapLocationPicker.module.css";

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  latitude: number;
  longitude: number;
  onChange: (
    latitude: number,
    longitude: number,
    label?: string
  ) => void;
}

const DEFAULT_LATITUDE = 19.432608;
const DEFAULT_LONGITUDE = -99.133209;

export default function MapLocationPicker({
  latitude,
  longitude,
  onChange,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const selectedResultRef = useRef(false);
  const locationRequestedRef = useRef(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  function moveMap(lat: number, lng: number, zoom = 16) {
    markerRef.current?.setLatLng([lat, lng]);
    mapRef.current?.setView([lat, lng], zoom);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        moveMap(lat, lng, 17);
        onChange(lat, lng, "Mi ubicación actual");
        setLocating(false);
      },
      (error) => {
        console.warn("No fue posible obtener la ubicación actual:", error);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }

  useEffect(() => {
    function handleOutside(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setResults([]);
    }
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!mapElementRef.current || mapRef.current) return;

      const L = await import("leaflet");

      if (cancelled || !mapElementRef.current) return;

      const map = L.map(mapElementRef.current, {
        zoomControl: true,
      }).setView([latitude, longitude], 15);

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "© OpenStreetMap",
        }
      ).addTo(map);

      const rewardIcon = L.divIcon({
        className: styles.rewardMarker,
        html: `
          <div aria-label="Ubicación del premio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="8" width="18" height="13" rx="2" />
              <path d="M12 8v13" />
              <path d="M3 12h18" />
              <path d="M7.5 8C5.6 8 4 6.9 4 5.5S5.1 3 6.5 3C9 3 12 8 12 8" />
              <path d="M16.5 8C18.4 8 20 6.9 20 5.5S18.9 3 17.5 3C15 3 12 8 12 8" />
            </svg>
          </div>
        `,
        iconSize: [46, 46],
        iconAnchor: [23, 42],
      });

      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: rewardIcon,
      }).addTo(map);

      marker.on("dragend", () => {
        const point = marker.getLatLng();
        onChange(point.lat, point.lng);
      });

      map.on("click", (event: any) => {
        setResults([]);
        marker.setLatLng(event.latlng);
        onChange(event.latlng.lat, event.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;

      window.setTimeout(() => map.invalidateSize(), 100);

      const usingDefaultCoordinates =
        Math.abs(latitude - DEFAULT_LATITUDE) < 0.00001 &&
        Math.abs(longitude - DEFAULT_LONGITUDE) < 0.00001;

      if (
        usingDefaultCoordinates &&
        !locationRequestedRef.current
      ) {
        locationRequestedRef.current = true;
        useCurrentLocation();
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    markerRef.current.setLatLng([latitude, longitude]);
    mapRef.current.setView(
      [latitude, longitude],
      Math.max(mapRef.current.getZoom(), 15)
    );
  }, [latitude, longitude]);

  async function performSearch(searchTerm: string) {
    const normalized = searchTerm.trim();

    if (normalized.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=mx&q=${encodeURIComponent(normalized)}`,
        {
          headers: {
            "Accept-Language": "es-MX,es",
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Búsqueda ${response.status}`);
      }

      const data = (await response.json()) as SearchResult[];
      setResults(data);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.warn("No fue posible buscar la ubicación:", error);
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setSearching(false);
      }
    }
  }

  useEffect(() => {
    if (selectedResultRef.current) {
      selectedResultRef.current = false;
      return;
    }

    const normalized = query.trim();

    if (normalized.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      void performSearch(normalized);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [query]);

  function selectResult(result: SearchResult) {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    selectedResultRef.current = true;
    setQuery(result.display_name);
    setResults([]);
    moveMap(lat, lng, 17);
    onChange(lat, lng, result.display_name);
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.searchRow}>
        <div className={styles.searchInputWrap}>
          <Search />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void performSearch(query);
              }
            }}
            placeholder="Escribe un estadio, sucursal o dirección"
            autoComplete="off"
          />

          {searching && <span>Buscando…</span>}
        </div>

        <button
          type="button"
          className={styles.locationButton}
          onClick={useCurrentLocation}
          disabled={locating}
        >
          <LocateFixed />
          {locating ? "Ubicando" : "Mi ubicación"}
        </button>
      </div>

      {results.length > 0 && (
        <div className={styles.results}>
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => selectResult(result)}
            >
              <MapPinIcon />
              <span>{result.display_name}</span>
            </button>
          ))}
        </div>
      )}

      <div ref={mapElementRef} className={styles.map} />

      <small>
        Los resultados aparecen mientras escribes. También puedes tocar el
        mapa, arrastrar el marcador o usar tu ubicación actual.
      </small>
    </div>
  );
}

function MapPinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
