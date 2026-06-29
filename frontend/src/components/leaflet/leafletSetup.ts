import L from "leaflet";

let configured = false;

export function ensureLeafletDefaults() {
  if (configured || typeof window === "undefined") {
    return;
  }

  configured = true;

  // Leaflet's default marker assets break under Next.js bundling.
  const iconRetinaUrl = new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url,
  ).toString();
  const iconUrl = new URL(
    "leaflet/dist/images/marker-icon.png",
    import.meta.url,
  ).toString();
  const shadowUrl = new URL(
    "leaflet/dist/images/marker-shadow.png",
    import.meta.url,
  ).toString();

  L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
  });
}

export function leafletPinIcon(color: "blue" | "green" | "red" | "orange") {
  ensureLeafletDefaults();

  const colorMap = {
    blue: "#2563eb",
    green: "#16a34a",
    red: "#dc2626",
    orange: "#f97316",
  };

  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:${colorMap[color]};border:3px solid white;box-shadow:0 4px 12px rgba(15,23,42,0.25);display:grid;place-items:center;color:white;font-size:11px;font-weight:800;">${color === "blue" ? "P" : color === "red" ? "D" : color === "orange" ? "!" : "R"}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function leafletDriverIcon() {
  return L.icon({
    iconUrl: "/map-driver-tricycle.png",
    iconSize: [40, 27],
    iconAnchor: [20, 25],
  });
}
