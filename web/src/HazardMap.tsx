import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

type Props = {
  hazard: GeoJSON.FeatureCollection | null;
  candidates: { parcel_id: string; centroid: [number, number]; type: string }[];
  selectedIds: Set<string>;
  onSelect: (id: string | null) => void;
};

function colorFor(eal: number, max: number) {
  const t = max <= 0 ? 0 : Math.min(1, eal / max);
  const r = Math.round(20 + t * 200);
  const g = Math.round(80 + (1 - t) * 80);
  const b = Math.round(140 - t * 80);
  return `rgb(${r},${g},${b})`;
}

export default function HazardMap({ hazard, candidates, selectedIds, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "bg", type: "background", paint: { "background-color": "#070b14" } }],
      },
      center: [86.47, 27.86],
      zoom: 11.4,
      attributionControl: false,
    });
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(ref.current);
    map.on("load", () => map.resize());
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hazard) return;

    const maxEal = Math.max(
      ...hazard.features.map((f) => Number((f.properties as { eal_people?: number })?.eal_people || 0)),
      1
    );
    const colored: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: hazard.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          fill: colorFor(Number((f.properties as { eal_people?: number })?.eal_people || 0), maxEal),
        },
      })),
    };

    const pts: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: candidates.map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: c.centroid },
        properties: { id: c.parcel_id, selected: selectedIds.has(c.parcel_id) ? 1 : 0, type: c.type },
      })),
    };

    const paint = () => {
      if (!map.getStyle()) return;
      if (map.getSource("hazard")) {
        (map.getSource("hazard") as maplibregl.GeoJSONSource).setData(colored);
      } else {
        map.addSource("hazard", { type: "geojson", data: colored });
        map.addLayer({
          id: "hazard-fill",
          type: "fill",
          source: "hazard",
          paint: { "fill-color": ["get", "fill"], "fill-opacity": 0.72, "fill-outline-color": "#1b283f" },
        });
        map.resize();
        map.fitBounds(
          [
            [86.444, 27.834],
            [86.504, 27.894],
          ],
          { padding: 28, duration: 0 }
        );
      }
      if (map.getSource("parcels")) {
        (map.getSource("parcels") as maplibregl.GeoJSONSource).setData(pts);
      } else {
        map.addSource("parcels", { type: "geojson", data: pts });
        map.addLayer({
          id: "parcels",
          type: "circle",
          source: "parcels",
          paint: {
            "circle-radius": ["case", ["==", ["get", "selected"], 1], 6.5, 3.5],
            "circle-color": ["case", ["==", ["get", "selected"], 1], "#3ee0c0", "#8fa0b8"],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#070b14",
          },
        });
        map.on("click", "parcels", (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          onSelect(id || null);
        });
        map.on("click", (e) => {
          const feats = map.queryRenderedFeatures(e.point, { layers: ["parcels"] });
          if (!feats.length) onSelect(null);
        });
      }
    };

    const kick = () => paint();
    if (map.loaded()) kick();
    else map.once("load", kick);
    map.once("idle", kick);
  }, [hazard, candidates, selectedIds, onSelect]);

  return <div id="map" ref={ref} />;
}
