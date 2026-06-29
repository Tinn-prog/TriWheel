import type { Point } from "./mapTypes";

export function pointKey(point: Point, precision = 5) {
  return `${point.lat.toFixed(precision)},${point.lng.toFixed(precision)}`;
}

export function pointsFitKey(points: Point[], precision = 5) {
  return points.map((point) => pointKey(point, precision)).join("|");
}
