const KOSHI = { west: 85.7, east: 87.8, south: 25.7, north: 27.6 };

function firstPoint(fc: GeoJSON.FeatureCollection | null | undefined): [number, number] | null {
  const geom = fc?.features?.[0]?.geometry;
  if (!geom) return null;
  if (geom.type === "Point") return geom.coordinates as [number, number];
  if (geom.type === "Polygon") return geom.coordinates[0]?.[0] as [number, number];
  if (geom.type === "MultiPolygon") return geom.coordinates[0]?.[0]?.[0] as [number, number];
  return null;
}

export function looksLikeKoshiFlood(fc: GeoJSON.FeatureCollection | null | undefined): boolean {
  const point = firstPoint(fc);
  if (!point) return false;
  const [lng, lat] = point;
  return lng >= KOSHI.west && lng <= KOSHI.east && lat >= KOSHI.south && lat <= KOSHI.north;
}

/** Refuse Koshi UNOSAT polygons when a non-Koshi pack's API loader silently fell back. */
export function cityOwnedFlood(
  fc: GeoJSON.FeatureCollection | null | undefined,
  city: string
): GeoJSON.FeatureCollection | null {
  if (!fc?.features?.length) return null;
  if (city === "koshi") return fc;
  if (looksLikeKoshiFlood(fc)) return null;
  return fc;
}

export function hasProofValidation(backtest: { validation?: unknown } | null | undefined): boolean {
  return Boolean(backtest?.validation);
}
