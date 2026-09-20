import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { RankedPlace } from "./liveApi";

type Props = {
  cursor?: { lat: number; lng: number } | null;
  pinned?: { lat: number; lng: number } | null;
  cities?: RankedPlace[];
  metric?: string;
  onMove: (lat: number, lng: number) => void;
  onPin: (lat: number, lng: number) => void;
  onCity: (city: RankedPlace) => void;
};

function scoreColor(score: number) {
  const t = Math.max(0, Math.min(1, score / 100));
  const r = Math.round(62 + t * 193);
  const g = Math.round(224 - t * 160);
  const b = Math.round(192 - t * 120);
  return `rgb(${r},${g},${b})`;
}

function citiesCollection(cities: RankedPlace[], metric: string): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cities.map((row) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [row.lng, row.lat] },
      properties: {
        id: row.id,
        name: row.name,
        color: scoreColor(metric === "composite" ? row.composite : row.metric_score),
      },
    })),
  };
}

export default function WorldMap({ cursor, pinned, cities = [], metric = "composite", onMove, onPin, onCity }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const cityLookup = useRef(new Map<string, RankedPlace>());
  const citiesRef = useRef(cities);
  const metricRef = useRef(metric);
  const moveRef = useRef(onMove);
  const pinRef = useRef(onPin);
  const cityRef = useRef(onCity);
  citiesRef.current = cities;
  metricRef.current = metric;
  moveRef.current = onMove;
  pinRef.current = onPin;
  cityRef.current = onCity;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          dark: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri",
          },
          labels: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#070b14" } },
          { id: "dark", type: "raster", source: "dark", paint: { "raster-opacity": 0.95 } },
          { id: "labels", type: "raster", source: "labels" },
        ],
      },
      center: [20, 18],
      zoom: 1.7,
      minZoom: 1.2,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    const kickResize = () => {
      if (!mapRef.current) return;
      map.resize();
    };
    const ro = new ResizeObserver(kickResize);
    ro.observe(ref.current);
    requestAnimationFrame(kickResize);

    const hoverCapable = window.matchMedia("(hover: hover)").matches;
    map.on("mousemove", (event) => {
      if (!hoverCapable) return;
      if (event.originalEvent.buttons) return;
      if (map.isMoving()) return;
      moveRef.current(event.lngLat.lat, event.lngLat.lng);
    });
    map.on("click", (event) => {
      if (map.getLayer("v2-cities")) {
        const hits = map.queryRenderedFeatures(event.point, { layers: ["v2-cities"] });
        if (hits.length) {
          const city = cityLookup.current.get(String(hits[0].properties?.id || ""));
          if (city) {
            cityRef.current(city);
            return;
          }
        }
      }
      pinRef.current(event.lngLat.lat, event.lngLat.lng);
    });

    const paintCities = () => {
      const source = map.getSource("v2-cities") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData(citiesCollection(citiesRef.current, metricRef.current));
    };

    map.on("load", () => {
      map.addSource("v2-cities", { type: "geojson", data: citiesCollection(citiesRef.current, metricRef.current) });
      map.addLayer({
        id: "v2-cities-halo",
        type: "circle",
        source: "v2-cities",
        paint: {
          "circle-radius": 11,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.22,
          "circle-blur": 0.4,
        },
      });
      map.addLayer({
        id: "v2-cities",
        type: "circle",
        source: "v2-cities",
        paint: {
          "circle-radius": 5.5,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 1.2,
          "circle-stroke-color": "#070b14",
        },
      });
      map.on("mouseenter", "v2-cities", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "v2-cities", () => {
        map.getCanvas().style.cursor = "";
      });
      paintCities();
      kickResize();
    });

    return () => {
      ro.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    cityLookup.current = new Map(cities.map((row) => [row.id, row]));
    const map = mapRef.current;
    const source = map?.getSource("v2-cities") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(citiesCollection(cities, metric));
  }, [cities, metric]);

  useEffect(() => {
    const map = mapRef.current;
    const point = pinned || cursor;
    if (!map || !point) return;
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = "v2-pin";
      markerRef.current = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([point.lng, point.lat]).addTo(map);
    } else {
      markerRef.current.setLngLat([point.lng, point.lat]);
    }
  }, [cursor, pinned]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pinned) return;
    const zoom = Math.max(map.getZoom(), 4.2);
    map.easeTo({ center: [pinned.lng, pinned.lat], zoom, duration: 700 });
  }, [pinned]);

  return <div className="v2-map" ref={ref} />;
}
