import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

type Station = {
  station: string;
  name?: string;
  begin?: number;
  end?: number;
  elev_m?: string | number;
};

/**
 * The real NOAA ISD stations behind the rainfall fit. Served as a static file because the
 * API has no route for it — the coordinates are the genuine archive ones, not sampled points.
 */
export default function StationMap({ height = 380 }: { height?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    let map: maplibregl.Map | undefined;
    try {
      map = new maplibregl.Map({
        container: host.current,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            base: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "base", type: "raster", source: "base", paint: { "raster-opacity": 0.55 } }],
        },
        center: [85.5, 27.2],
        zoom: 5.1,
        dragRotate: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    const instance = map;
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    instance.on("load", async () => {
      try {
        const res = await fetch("/stations_nepal.geojson");
        const data = (await res.json()) as GeoJSON.FeatureCollection;
        setCount(data.features.length);
        instance.addSource("stations", { type: "geojson", data });
        instance.addLayer({
          id: "stations-glow",
          type: "circle",
          source: "stations",
          paint: {
            "circle-radius": 9,
            "circle-color": "#1f5c4a",
            "circle-opacity": 0.14,
          },
        });
        instance.addLayer({
          id: "stations-dot",
          type: "circle",
          source: "stations",
          paint: {
            "circle-radius": 4.5,
            "circle-color": "#1f5c4a",
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
          },
        });

        const popup = new maplibregl.Popup({ closeButton: false, offset: 10 });
        instance.on("mouseenter", "stations-dot", (event) => {
          instance.getCanvas().style.cursor = "pointer";
          const props = event.features?.[0]?.properties as Station | undefined;
          if (!props) return;
          const years = props.begin && props.end ? `${props.begin}–${props.end}` : "period unavailable";
          popup
            .setLngLat((event.features![0].geometry as GeoJSON.Point).coordinates as [number, number])
            .setHTML(
              `<div class="pop"><b>${props.name || props.station}</b><br/>${years}<br/>ID ${props.station}</div>`
            )
            .addTo(instance);
        });
        instance.on("mouseleave", "stations-dot", () => {
          instance.getCanvas().style.cursor = "";
          popup.remove();
        });
      } catch {
        setFailed(true);
      }
    });

    return () => instance.remove();
  }, []);

  return (
    <div className="map-wrap station-map" style={{ height }}>
      <div ref={host} id="station-map-root" />
      {failed && (
        <div className="map-fallback" role="status">
          <b>Map unavailable</b>
          <p>The station list still drives every rainfall number on this page.</p>
        </div>
      )}
      {count != null && (
        <div className="map-status">{count} stations · hover one for its record</div>
      )}
    </div>
  );
}
