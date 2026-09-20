import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { TYPE_COLOR, TYPE_LABEL } from "./colors";

type CandidateSite = {
  parcel_id: string;
  centroid: [number, number];
  type: string;
  area_ha?: number;
};

type Props = {
  hazard: GeoJSON.FeatureCollection | null;
  candidates: CandidateSite[];
  selectedIds: Set<string>;
  onSelect: (id: string | null) => void;
  observed?: GeoJSON.FeatureCollection | null;
  modeled?: GeoJSON.FeatureCollection | null;
  overlay: "none" | "observed" | "modeled" | "both";
};

type Basemap = "satellite" | "terrain" | "data";

// Warm sequential ramp for expected people-risk that reads on satellite + dark.
function ealColor(eal: number, max: number) {
  const t = max <= 0 ? 0 : Math.min(1, Math.sqrt(eal / max));
  const r = 255;
  const g = Math.round(224 - t * 190);
  const b = Math.round(130 - t * 120);
  return `rgb(${r},${g},${b})`;
}

function baseStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      sat: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
      },
      labels: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
      },
      terrain: {
        type: "raster",
        tiles: [
          "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 17,
        attribution: "© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors",
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#0a0f1c" } },
      { id: "sat", type: "raster", source: "sat", layout: { visibility: "visible" } },
      {
        id: "labels",
        type: "raster",
        source: "labels",
        paint: { "raster-opacity": 0.85 },
        layout: { visibility: "visible" },
      },
      { id: "terrain", type: "raster", source: "terrain", layout: { visibility: "none" } },
    ],
  };
}

export default function HazardMap({
  hazard,
  candidates,
  selectedIds,
  onSelect,
  observed,
  modeled,
  overlay,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [basemap, setBasemap] = useState<Basemap>(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "data" : "satellite"
  );

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: baseStyle(),
      center: [86.9, 26.75],
      zoom: 8.2,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(ref.current);
    map.on("load", () => map.resize());
    map.on("error", (event) => {
      const detail = event as { sourceId?: string; error?: Error };
      const message = detail.error?.message || "";
      if (
        detail.sourceId === "sat" ||
        detail.sourceId === "labels" ||
        detail.sourceId === "terrain" ||
        /arcgis|opentopomap|raster tile/i.test(message)
      ) {
        setBasemap("data");
      }
    });
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Basemap switching.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer("sat")) return;
      map.setLayoutProperty("sat", "visibility", basemap === "satellite" ? "visible" : "none");
      map.setLayoutProperty("labels", "visibility", basemap === "satellite" ? "visible" : "none");
      map.setLayoutProperty("terrain", "visibility", basemap === "terrain" ? "visible" : "none");
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hazard) return;

    const maxEal = Math.max(
      ...hazard.features.map((f) => {
        const properties = f.properties as {
          people_risk_eal?: number;
          eal_people?: number;
        };
        return Number(properties?.people_risk_eal ?? properties?.eal_people ?? 0);
      }),
      1
    );
    const colored: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: hazard.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          fill: ealColor(
            Number(
              (f.properties as { people_risk_eal?: number; eal_people?: number })
                ?.people_risk_eal ??
                (f.properties as { eal_people?: number })?.eal_people ??
                0
            ),
            maxEal
          ),
        },
      })),
    };

    const pts: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: candidates.map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: c.centroid },
        properties: {
          id: c.parcel_id,
          selected: selectedIds.has(c.parcel_id) ? 1 : 0,
          type: c.type,
          color: TYPE_COLOR[c.type] || "#9fb2cc",
          label: TYPE_LABEL[c.type] || c.type,
          area: c.area_ha ?? 0,
        },
      })),
    };

    const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

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
          paint: { "fill-color": ["get", "fill"], "fill-opacity": 0.4 },
        });
        map.addLayer({
          id: "hazard-line",
          type: "line",
          source: "hazard",
          paint: { "line-color": "rgba(255,255,255,0.12)", "line-width": 0.5 },
        });
        map.resize();

        map.on("mousemove", "hazard-fill", (e) => {
          const p = e.features?.[0]?.properties as
            | {
                population?: number;
                people_risk_eal?: number;
                eal_people?: number;
                landslide_prob?: number;
                scenario?: string;
              }
            | undefined;
          if (!p) return;
          map.getCanvas().style.cursor = "pointer";
          popupRef.current
            ?.setLngLat(e.lngLat)
            .setHTML(
              `<div class="pop"><b>Grid cell</b><br/>Population ${Math.round(
                Number(p.population || 0)
              ).toLocaleString()}<br/>People-risk/yr ${Number(
                p.people_risk_eal ?? p.eal_people ?? 0
              ).toFixed(2)}<br/>Scenario ${p.scenario || "current_risk_model"}<br/>Landslide prob ${(
                Number(p.landslide_prob || 0) * 100
              ).toFixed(0)}%</div>`
            )
            .addTo(map);
        });
        map.on("mouseleave", "hazard-fill", () => {
          map.getCanvas().style.cursor = "";
          popupRef.current?.remove();
        });
      }

      // Flood overlays as native MapLibre layers (added once, above hazard).
      if (!map.getSource("obs")) {
        map.addSource("obs", { type: "geojson", data: empty });
        map.addLayer({
          id: "obs-fill",
          type: "fill",
          source: "obs",
          paint: { "fill-color": "#38bdf8", "fill-opacity": 0.4, "fill-outline-color": "#7dd3fc" },
        });
      }
      if (!map.getSource("mod")) {
        map.addSource("mod", { type: "geojson", data: empty });
        map.addLayer({
          id: "mod-line",
          type: "line",
          source: "mod",
          paint: { "line-color": "#f0c14b", "line-width": 1.6, "line-opacity": 0.9 },
        });
      }
      const showObs = overlay === "observed" || overlay === "both";
      const showMod = overlay === "modeled" || overlay === "both";
      (map.getSource("obs") as maplibregl.GeoJSONSource).setData(showObs && observed ? observed : empty);
      (map.getSource("mod") as maplibregl.GeoJSONSource).setData(showMod && modeled ? modeled : empty);

      if (map.getSource("parcels")) {
        (map.getSource("parcels") as maplibregl.GeoJSONSource).setData(pts);
      } else {
        map.addSource("parcels", { type: "geojson", data: pts });
        map.addLayer({
          id: "parcels-all",
          type: "circle",
          source: "parcels",
          filter: ["==", ["get", "selected"], 0],
          paint: { "circle-radius": 2.6, "circle-color": "#dbe6f5", "circle-opacity": 0.4 },
        });
        map.addLayer({
          id: "parcels-halo",
          type: "circle",
          source: "parcels",
          filter: ["==", ["get", "selected"], 1],
          paint: {
            "circle-radius": 11,
            "circle-color": ["get", "color"],
            "circle-opacity": 0.2,
            "circle-blur": 0.6,
          },
        });
        map.addLayer({
          id: "parcels-sel",
          type: "circle",
          source: "parcels",
          filter: ["==", ["get", "selected"], 1],
          paint: {
            "circle-radius": 5.5,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 1.4,
            "circle-stroke-color": "#0a0f1c",
          },
        });
        for (const lyr of ["parcels-sel", "parcels-all"]) {
          map.on("click", lyr, (e) => onSelect((e.features?.[0]?.properties?.id as string) || null));
          map.on("mouseenter", lyr, (e) => {
            map.getCanvas().style.cursor = "pointer";
            const p = e.features?.[0]?.properties as
              | { id?: string; label?: string; area?: number; selected?: number }
              | undefined;
            if (!p) return;
            popupRef.current
              ?.setLngLat((e.features?.[0]?.geometry as GeoJSON.Point).coordinates as [number, number])
              .setHTML(
                `<div class="pop"><b>${p.label}</b><br/>${p.id}<br/>${Number(p.area || 0).toFixed(1)} ha ${
                  p.selected ? "· selected preventive measure" : "· candidate intervention site"
                }</div>`
              )
              .addTo(map);
          });
          map.on("mouseleave", lyr, () => {
            map.getCanvas().style.cursor = "";
            popupRef.current?.remove();
          });
        }
        map.on("click", (e) => {
          const feats = map.queryRenderedFeatures(e.point, { layers: ["parcels-sel", "parcels-all"] });
          if (!feats.length) onSelect(null);
        });
      }

      const b = new maplibregl.LngLatBounds();
      for (const f of hazard.features) {
        const g = f.geometry as GeoJSON.Polygon | undefined;
        if (!g || g.type !== "Polygon") continue;
        for (const pt of g.coordinates[0]) b.extend(pt as [number, number]);
      }
      const overlayFc = [observed, modeled];
      for (const fc of overlayFc) {
        for (const f of fc?.features || []) {
          const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined;
          if (!g) continue;
          const rings = g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
          for (const ring of rings) {
            for (const pt of ring) b.extend(pt as [number, number]);
          }
        }
      }
      if (!b.isEmpty()) map.fitBounds(b, { padding: 36, duration: 700 });
    };

    const kick = () => paint();
    if (map.loaded()) kick();
    else map.once("load", kick);
    map.once("idle", kick);
  }, [hazard, candidates, selectedIds, onSelect, observed, modeled, overlay]);

  const usedTypes = Array.from(
    new Set(candidates.filter((c) => selectedIds.has(c.parcel_id)).map((c) => c.type))
  );

  return (
    <div id="map-root">
      <div id="map" ref={ref} />
      <div className="basemap-switch">
        {(["satellite", "terrain", "data"] as Basemap[]).map((b) => (
          <button key={b} className={basemap === b ? "on" : ""} onClick={() => setBasemap(b)}>
            {b === "data" ? "data only" : b}
          </button>
        ))}
      </div>
      {basemap === "data" && (
        <div className="map-status">Data-only map · no network tiles required</div>
      )}
      {usedTypes.length > 0 && (
        <div className="parcel-legend">
          <div className="pl-title">Selected preventive measures</div>
          {usedTypes.map((t) => (
            <div key={t} className="pl-row">
              <span className="pl-dot" style={{ background: TYPE_COLOR[t] || "#9fb2cc" }} />
              {TYPE_LABEL[t] || t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
