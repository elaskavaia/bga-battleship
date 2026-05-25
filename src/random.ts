/**
 * Random ship placement. Pure (no DOM), driven by an `isFleetshipAt`
 * occupancy predicate so the same logic powers both the live placement
 * and unit tests.
 */

import { wouldViolateAdjacency } from "./grid";

export type Dirid = "h" | "v";

export interface Placement {
  gpos: number;
  dirid: Dirid;
}

/**
 * Try to find a random (in-bounds, non-overlapping, adjacency-respecting)
 * placement for a ship of `size`. Returns null if no spot found within
 * `maxAttempts` tries.
 */
export function findRandomPlacement(
  width: number,
  mode: number,
  size: number,
  isFleetshipAt: (gpos: number) => boolean,
  rand: () => number = Math.random,
  maxAttempts = 500
): Placement | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const dirid: Dirid = rand() < 0.5 ? "h" : "v";
    const step = dirid === "h" ? 1 : width;
    const xMax = dirid === "h" ? width - size : width - 1;
    const yMax = dirid === "v" ? width - size : width - 1;
    if (xMax < 0 || yMax < 0) continue;
    const x = Math.floor(rand() * (xMax + 1));
    const y = Math.floor(rand() * (yMax + 1));
    const gpos = y * width + x;

    let overlap = false;
    for (let i = 0; i < size; i++) {
      if (isFleetshipAt(gpos + i * step)) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    if (wouldViolateAdjacency(gpos, size, step, width, mode, isFleetshipAt)) continue;

    return { gpos, dirid };
  }
  return null;
}
