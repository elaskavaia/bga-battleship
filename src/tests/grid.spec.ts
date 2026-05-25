import { expect } from "chai";
import {
  getIntPart,
  getShipPosDir,
  getStart,
  getXYFromOffset,
  gridId,
  gridOffset,
  gridPosition,
  wouldViolateAdjacency,
} from "../grid";

const WIDTH = 10;

describe("grid", () => {
  describe("gridId / gridOffset / gridPosition / getXYFromOffset round-trip", () => {
    it("gridId formats the cell id with parsed y", () => {
      expect(gridId(0, 3, 7)).to.equal("grid_0_3_7");
      expect(gridId(1, "5", "2")).to.equal("grid_1_5_2");
    });

    it("gridOffset maps (1,1) to 0 and (10,10) to 99", () => {
      expect(gridOffset(1, 1, WIDTH)).to.equal(0);
      expect(gridOffset(10, 10, WIDTH)).to.equal(99);
    });

    it("gridPosition round-trips with getXYFromOffset", () => {
      for (let x = 1; x <= WIDTH; x++) {
        for (let y = 1; y <= WIDTH; y++) {
          const off = gridOffset(x, y, WIDTH);
          expect(getXYFromOffset(off, WIDTH)).to.equal(`${x}_${y}`);
          expect(gridPosition(gridId(0, x, y), WIDTH)).to.equal(off);
        }
      }
    });
  });


  describe("getIntPart", () => {
    it("parses the i-th int of an underscore-delimited key", () => {
      expect(getIntPart("fleet_2_fleetship_4_1_3_v", 1)).to.equal(2);
      expect(getIntPart("fleet_2_fleetship_4_1_3_v", 3)).to.equal(4);
    });
  });

  describe("getStart", () => {
    it("walks forward through occupied cells and stops at the gap", () => {
      const occupied = new Set([5, 6, 7]);
      const end = getStart(5, 1, WIDTH, (g) => occupied.has(g));
      expect(end).to.equal(7);
    });
    it("stops at the row edge when walking horizontally", () => {
      const occupied = new Set([9, 8, 7]);
      const end = getStart(9, 1, WIDTH, (g) => occupied.has(g));
      expect(end).to.equal(9);
    });
    it("walks backwards with offset = -1", () => {
      const occupied = new Set([3, 4, 5]);
      const end = getStart(5, -1, WIDTH, (g) => occupied.has(g));
      expect(end).to.equal(3);
    });
  });

  describe("getShipPosDir", () => {
    it("detects a horizontal ship of length 3", () => {
      const occupied = new Set([20, 21, 22]);
      const v = getShipPosDir(21, WIDTH, (g) => occupied.has(g));
      expect(v).to.deep.equal({ gpos: 20, dir: 1, len: 3, dirid: "h" });
    });
    it("detects a vertical ship of length 4", () => {
      const occupied = new Set([5, 15, 25, 35]);
      const v = getShipPosDir(15, WIDTH, (g) => occupied.has(g));
      expect(v).to.deep.equal({ gpos: 5, dir: WIDTH, len: 4, dirid: "v" });
    });
    it("treats a single cell as horizontal length 1", () => {
      const v = getShipPosDir(0, WIDTH, (g) => g === 0);
      expect(v.len).to.equal(1);
      expect(v.dirid).to.equal("h");
    });
  });

  describe("wouldViolateAdjacency", () => {
    it("mode 0 always returns false even when ships touch", () => {
      expect(wouldViolateAdjacency(0, 3, 1, WIDTH, 0, () => true)).to.equal(false);
    });
    it("mode 1 detects orthogonal contact", () => {
      const ships = new Set([10]); // cell directly below gpos=0
      expect(wouldViolateAdjacency(0, 1, 1, WIDTH, 1, (g) => ships.has(g))).to.equal(true);
    });
    it("mode 1 ignores diagonal contact", () => {
      const ships = new Set([11]); // diagonally adjacent to gpos=0
      expect(wouldViolateAdjacency(0, 1, 1, WIDTH, 1, (g) => ships.has(g))).to.equal(false);
    });
    it("mode 2 detects diagonal contact", () => {
      const ships = new Set([11]);
      expect(wouldViolateAdjacency(0, 1, 1, WIDTH, 2, (g) => ships.has(g))).to.equal(true);
    });
    it("does not flag cells occupied by the candidate ship itself", () => {
      const ships = new Set<number>(); // no other ships
      expect(wouldViolateAdjacency(0, 3, 1, WIDTH, 2, (g) => ships.has(g))).to.equal(false);
    });
  });
});
