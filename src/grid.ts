/**
 * Pure grid math. No DOM access. Easy to unit-test.
 *
 * Conventions (ported from battleship.js):
 *   - Coordinates are 1-based.
 *   - `gpos` is a row-major offset into a width×width board: gpos = (y-1)*width + (x-1).
 *   - `own` is 0 (your board) or 1 (enemy board) — used to build cell ids "grid_{own}_{x}_{y}".
 */

const LETTERS = ["", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function gridId(own: number, x: number | string, y: number | string): string {
  return `grid_${own}_${x}_${parseInt(y as string)}`;
}

export function gridOffset(x: number | string, y: number | string, width: number): number {
  return (parseInt(y as string) - 1) * width + (parseInt(x as string) - 1);
}

export function gridPosition(id: string, width: number): number {
  const ss = id.split("_");
  return gridOffset(ss[2], ss[3], width);
}

export function getXYFromOffset(grid: number, width: number): string {
  const x = (grid % width) + 1;
  const y = Math.floor(grid / width) + 1;
  return `${x}_${y}`;
}

export function rowLetter(row: number): string {
  return LETTERS[row] || "";
}

export function getIntPart(word: string, i: number): number {
  return parseInt(word.split("_")[i]);
}

/**
 * Walk from gpos by `offset` (±1 horizontal, ±width vertical) while cells are
 * occupied by a ship marker. Returns the last occupied gpos in that direction.
 */
export function getStart(gpos: number, offset: number, width: number, isShipAt: (gpos: number) => boolean): number {
  let last = gpos;
  for (let i = 0; i < 5; i++) {
    const spos = gpos + offset * i;
    if (spos < 0) break;
    if (spos >= width * width) break;
    if (isShipAt(spos)) last = spos;
    else break;
    const x = spos % width;
    if (offset === -1 && x === 0) break;
    if (offset === 1 && x === width - 1) break;
  }
  return last;
}

export interface ShipPosDir {
  gpos: number;
  dir: number;
  len: number;
  dirid: "h" | "v";
}

/** Find the bounding box of a contiguous ship segment containing gpos. */
export function getShipPosDir(gpos: number, width: number, isShipAt: (gpos: number) => boolean): ShipPosDir {
  const xpos = getStart(gpos, -1, width, isShipAt);
  const ypos = getStart(gpos, -width, width, isShipAt);
  const xpos2 = getStart(xpos, 1, width, isShipAt);
  const ypos2 = getStart(ypos, width, width, isShipAt);
  const xlen = xpos2 - xpos + 1;
  const ylen = (ypos2 - ypos) / width + 1;
  if (xpos < ypos || xlen >= ylen) {
    return { gpos: xpos, dir: 1, len: xlen, dirid: "h" };
  }
  return { gpos: ypos, dir: width, len: ylen, dirid: "v" };
}

/**
 * True if a ship of `len` cells starting at `startGpos` (advancing by `step`)
 * would touch an already-placed `fleetship_*` per the adjacency mode.
 *   mode 0: no restriction
 *   mode 1: orthogonal contact disallowed
 *   mode 2: also disallow corner contact
 */
export function wouldViolateAdjacency(
  startGpos: number,
  len: number,
  step: number,
  width: number,
  mode: number,
  isFleetshipAt: (gpos: number) => boolean,
): boolean {
  if (mode === 0) return false;
  const diagonal = mode === 2;
  const occupied: Record<number, true> = {};
  for (let i = 0; i < len; i++) occupied[startGpos + i * step] = true;
  for (let j = 0; j < len; j++) {
    const gpos = startGpos + j * step;
    const x = gpos % width;
    const y = Math.floor(gpos / width);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (!diagonal && dx !== 0 && dy !== 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= width) continue;
        const npos = ny * width + nx;
        if (occupied[npos]) continue;
        if (isFleetshipAt(npos)) return true;
      }
    }
  }
  return false;
}
