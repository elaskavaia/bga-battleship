import { expect } from "chai";
import { findRandomPlacement, type Placement } from "../random";
import { wouldViolateAdjacency } from "../grid";

const WIDTH = 10;

/** Deterministic RNG: returns the next value from `seq` (wrapping). */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

/** Mark every cell of a placement as a fleet ship. */
function commit(occupied: Set<number>, p: Placement, size: number): void {
  const step = p.dirid === "h" ? 1 : WIDTH;
  for (let i = 0; i < size; i++) occupied.add(p.gpos + i * step);
}

describe("findRandomPlacement", () => {
  it("finds a horizontal spot in the top-left corner from a leading-zero RNG", () => {
    // rand sequence: dir-pick (0 → 'h'), x-roll, y-roll
    const r = seq([0, 0, 0]);
    const placement = findRandomPlacement(WIDTH, 0, 4, () => false, r);
    expect(placement).to.deep.equal({ gpos: 0, dirid: "h" });
  });

  it("finds a vertical spot when first roll is >= 0.5", () => {
    const r = seq([0.5, 0, 0]);
    const placement = findRandomPlacement(WIDTH, 0, 4, () => false, r);
    expect(placement).to.deep.equal({ gpos: 0, dirid: "v" });
  });

  it("rejects overlap and finds the next spot", () => {
    // First attempt picks gpos 0 horizontal (overlaps cell 0); next picks gpos 2 horizontal.
    const occupied = new Set([0]);
    const r = seq([0, 0, 0, 0, 0.21, 0]); // x = 0.21 * 7 = 1.47 → 1? Use simpler:
    // Force two attempts: (h, x=0, y=0) → overlap on cell 0; (h, x=0.3*7=2.1→2, y=0) ok.
    const r2 = seq([0, 0, 0, 0, 0.3, 0]);
    const placement = findRandomPlacement(WIDTH, 0, 4, (g) => occupied.has(g), r2);
    expect(placement).to.deep.equal({ gpos: 2, dirid: "h" });
  });

  it("respects adjacency mode 1 (orthogonal contact disallowed)", () => {
    // Ship at gposes {10,11,12,13}. Candidate at gpos 0 (horiz, len 4) would touch via cell 10–13.
    const occupied = new Set([10, 11, 12, 13]);
    // Force the first proposal to be gpos 0 horizontal; should be rejected and try again.
    const r = seq([0, 0, 0, 0, 0.9, 0.9]); // second attempt: x near max, y near max
    const placement = findRandomPlacement(WIDTH, 1, 4, (g) => occupied.has(g), r);
    expect(placement).to.not.be.null;
    // The returned placement must not be the bad one.
    expect(placement).to.not.deep.equal({ gpos: 0, dirid: "h" });
  });

  it("returns null when the board has no room for the requested size", () => {
    // Fill the entire 10x10 board so nothing fits.
    const full = new Set<number>();
    for (let i = 0; i < WIDTH * WIDTH; i++) full.add(i);
    const placement = findRandomPlacement(WIDTH, 1, 2, (g) => full.has(g), Math.random, 50);
    expect(placement).to.be.null;
  });

  it("can fill a fleet without overlap or adjacency violations (mode 1)", () => {
    // Place a small fleet sequentially: 4, 3, 3, 2, 2, 2.
    const occupied = new Set<number>();
    const sizes = [4, 3, 3, 2, 2, 2];
    const isAt = (g: number) => occupied.has(g);
    for (const size of sizes) {
      const p = findRandomPlacement(WIDTH, 1, size, isAt, Math.random, 2000);
      expect(p, `failed to place size ${size}`).to.not.be.null;
      expect(wouldViolateAdjacency(p!.gpos, size, p!.dirid === "h" ? 1 : WIDTH, WIDTH, 1, isAt)).to.equal(false);
      commit(occupied, p!, size);
    }
    expect(occupied.size).to.equal(sizes.reduce((a, b) => a + b, 0));
  });
});
