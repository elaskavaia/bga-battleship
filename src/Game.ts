/**
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * Battleship implementation: © Alena Laskavaia <laskava@gmail.com>
 *
 * Main client entry. Compiled to modules/js/Game.js via Rollup.
 */

import { PlayerTurnPlaceState } from "./PlayerTurnPlaceState";
import { PlayerTurnAttackState } from "./PlayerTurnAttackState";
import { getIntPart, getShipPosDir, getXYFromOffset, gridId, gridOffset, gridPosition, rowLetter, wouldViolateAdjacency } from "./grid";
import { addClass, removeClass, removeClassAll } from "./dom";
import { slideToObjectRelative } from "./animation";
import { findRandomPlacement } from "./random";

type ShipMarker = "s" | "x" | "p" | string | null;

export class Game {
  public bga: Bga;
  public gamedatas: any;

  public WIDTH = 10;
  public gridToFleet: (string | null)[] = [];
  public shipToGrid: Record<string, number | null> = {};
  public attackGrid: string | null = null;
  public bot = false;

  public player_no = 1;
  public opponent_no = 2;
  public player_color = "ffffff";
  public player_id_as: number | null = null;

  private placeState: PlayerTurnPlaceState;
  private attackState: PlayerTurnAttackState;

  constructor(bga: Bga) {
    this.bga = bga;
    this.placeState = new PlayerTurnPlaceState(this, bga);
    this.attackState = new PlayerTurnAttackState(this, bga);
    this.bga.states.register("playerTurnPlace", this.placeState);
    this.bga.states.register("playerTurnAttack", this.attackState);
  }

  // ---- BGA lifecycle ----------------------------------------------------

  setup(gamedatas: any): void {
    console.log("Starting battleship setup");
    this.gamedatas = gamedatas;
    this.WIDTH = gamedatas.width;
    this.shipToGrid = {};

    // Replace legacy view.php / .tpl with runtime HTML.
    this.bga.gameArea.getElement().innerHTML = this.buildGameArea(gamedatas);

    if (this.isSpectator()) {
      this.player_color = "ffffff";
      this.player_no = 1;
    } else {
      this.player_color = gamedatas.players[this.player_id].color;
      this.player_no = gamedatas.players[this.player_id].no;
      this.player_id_as = this.player_id;
    }
    this.opponent_no = 3 - this.player_no;

    for (const player_id in gamedatas.players) {
      const player = gamedatas.players[player_id];
      if (!this.player_id_as && player.no == 1) this.player_id_as = parseInt(player_id);
    }

    this.setupBoard(gamedatas);

    // Delegate grid clicks once; cells in markupBoard are reused, not recreated.
    const board = $("board");
    board?.addEventListener("click", (e) => {
      const cell = (e.target as HTMLElement)?.closest(".gridPlacement") as HTMLElement | null;
      if (cell) this.onGrid(cell, e);
    });

    this.bga.notifications.setupPromiseNotifications();

    this.hookBot();

    console.log("Ending battleship setup");
  }

  // ---- accessors that bridge to GameGui via the gameui global -----------

  get player_id(): number {
    return gameui.player_id;
  }

  isSpectator(): boolean {
    return this.bga.players.isCurrentPlayerSpectator();
  }

  isCurrentPlayerActive(): boolean {
    return this.bga.players.isCurrentPlayerActive();
  }

  getStateName(): string {
    return this.gamedatas.gamestate.name;
  }

  // ---- board construction ----------------------------------------------

  buildGameArea(gamedatas: any): string {
    const width: number = gamedatas.width;
    const fleetconfig = gamedatas.fleetconfig;

    /** corner/header/edge class for a cell. */
    const cellClass = (row: number, col: number): string => {
      if (col === 0 && row === 0) return "first-cell";
      if (row === 0 && col > 0) return "cell-number";
      if (col === 0 && row > 0) return "cell-letter";
      let cls = "";
      if (row === 1) cls += "cell-first-inside-row";
      if (col === 1) cls += " cell-first-inside-col";
      if (row === 10) cls += " cell-last-inside-row";
      if (col === 10) cls += " cell-last-inside-col";
      return cls;
    };

    const buildGrid = (a: 0 | 1) => {
      const cellW = a === 1 ? 40 : 26;
      const caption = a === 0 ? _("YOUR SHIPS") : _("ENEMY SHIPS");
      let cells = "";
      for (let row = 0; row <= width; row++) {
        for (let col = 0; col <= width; col++) {
          const cls = cellClass(row, col);
          let content = "";
          if (row === 0 && col > 0) content = String(col);
          else if (col === 0 && row > 0) content = rowLetter(row);
          cells += `<div id="grid_${a}_${col}_${row}" class="${cls} table-cell gridPlacement" style="top: ${row * cellW}px; left: ${col * cellW}px;">${content}</div>`;
        }
      }
      return `
        <div class="grid_${a} grid">
          <div id="grid_${a}_ships_title" class="board_title grid_${a}_ships_title caption">${caption}</div>
          <div class="grid-body">${cells}</div>
        </div>`;
    };

    let fleetRows = "";
    for (const size in fleetconfig.nums) {
      for (let n = 1; n <= fleetconfig.nums[size]; n++) {
        const id = `fleetship_${size}_${n}`;
        const clazz = `fleetship_${size}`;
        const name = fleetconfig.name[Number(size) * 10 + n];
        fleetRows += `
          <div class="fleet-row">
            <div class="fleetship_name">${name}</div>
            <div id="slot_${id}" class="fleet-slot">
              <div id="${id}" class="fleetship ${id} ${clazz} own"></div>
              <div id="o${id}" class="fleetship ${id} ${clazz} enemy"></div>
            </div>
          </div>`;
      }
    }

    return `
      <div id="board" class="board">
        <div class="background-grids">
          ${buildGrid(0)}
          ${buildGrid(1)}
          <div class="fleet-wrap">
            <div id="fleet_title" class="board_title ships_title caption">${_("YOUR FLEET")}</div>
            <div id="fleet" class="fleet">${fleetRows}</div>
          </div>
        </div>
      </div>`;
  }

  setupBoard(gamedatas: any): void {
    this.gridToFleet = [];
    this.shipToGrid = {};
    if (this.getStateName() === "playerTurnPlace") {
      document.querySelectorAll(".fleetship").forEach((node) => {
        this.moveShipOnGrid((node as HTMLElement).id, null, null);
      });
    }
    for (const loc in gamedatas.board.board_state) {
      const state = gamedatas.board.board_state[loc];
      const sloc = loc.split("_");
      if (sloc[0] !== "board") continue;
      const grid = parseInt(sloc[1]) === this.player_no ? gridId(0, sloc[2], sloc[3]) : gridId(1, sloc[2], sloc[3]);
      console.log(`${loc} ${grid}->${state}`);
      this.changeTokenStateTo(grid, state);
      if (state == 1) {
        const gpos = gridPosition(grid, this.WIDTH);
        this.setShipOnGrid(gpos, "p");
      }
    }

    for (const key in gamedatas.board.fleet) {
      const ship_info = gamedatas.board.fleet[key];
      const loc = ship_info.location;
      console.log(`${key}->${loc} for ${this.player_no}`);
      const sloc = loc.split("_");
      const num = parseInt(sloc[1]);
      const gpos = gridPosition(loc, this.WIDTH);
      const dirid = sloc[4] as "h" | "v";
      const skey = key.split("_");
      let ship = `${skey[2]}_${skey[3]}_${skey[4]}`;

      if (num == this.player_no) {
        this.moveShipOnGrid(ship, gpos, dirid);
      } else {
        ship = "o" + ship;
        addClass(ship, "ship_" + dirid);
        slideToObjectRelative(ship, "grid_1_" + getXYFromOffset(gpos, this.WIDTH), { duration: 500 });
      }
    }

    this.markupBoard();
  }

  // ---- ship placement state (called by PlayerTurnPlaceState) ------------

  placeOrRemoveShip(id: string): void {
    const gpos = gridPosition(id, this.WIDTH);
    const ship = this.getShipOnGrid(gpos);
    if (ship) {
      if (typeof ship === "string" && ship.startsWith("fleetship")) {
        this.moveShipOnGrid(ship, null, null);
      } else if (typeof ship === "string" && ship.startsWith("x")) {
        this.setShipOnGrid(gpos, null);
      } else {
        this.completeShip(gpos);
        const after = this.getShipOnGrid(gpos);
        if (after === "s") this.setShipOnGrid(gpos, "x");
      }
    } else {
      this.setShipOnGrid(gpos, "s");
    }
    this.markupBoard();
    if (document.querySelectorAll(".preship").length > 0) {
      this.setDescriptionOnMyTurn(_("Click on ship again to complete the ship"));
    } else {
      this.setDescriptionOnMyTurn(this.gamedatas.gamestate.descriptionmyturn);
    }
  }

  private completeShip(gpos: number): void {
    const vector = getShipPosDir(gpos, this.WIDTH, (g) => {
      const s = this.getShipOnGrid(g);
      return s === "s" || s === "x";
    });
    const size = vector.len;
    const f = this.findFreeShip1(size);
    const adjBlocked =
      f != null &&
      wouldViolateAdjacency(vector.gpos, vector.len, vector.dir, this.WIDTH, this.gamedatas.ship_adjacency | 0, (g) => {
        const s = this.gridToFleet[g];
        return !!s && typeof s === "string" && s.startsWith("fleetship");
      });
    if (f == null || adjBlocked) {
      for (let i = 0; i < vector.len; i++) this.setShipOnGrid(vector.gpos + i * vector.dir, "x");
      if (adjBlocked) {
        const mode = this.gamedatas.ship_adjacency | 0;
        (gameui as any).showMessage(
          mode === 2
            ? _("Ships cannot touch, not even at the corners. Place this ship further away.")
            : _("Ships cannot touch on the sides. Leave at least one empty cell between ships."),
          "error",
        );
      } else {
        (gameui as any).showMessage(_("No ship of this size remains in your fleet."), "error");
      }
      return;
    }
    this.moveShipOnGrid(f, vector.gpos, vector.dirid);
  }

  findFreeShip1(num: number): string | null {
    const res = document.querySelectorAll(`.fleet .own.fleetship_${num}`);
    if (res.length > 0) return (res[0] as HTMLElement).id;
    return null;
  }

  /**
   * "Feeling Lazy": auto-place every ship still in the fleet panel into a
   * random valid spot. Keeps any ship already on the board (server or WIP),
   * clears in-progress 's'/'x' temp markers, then fills the rest largest-first.
   *
   * When pressed with every ship already placed, returns the whole fleet to
   * its slots first — effectively a "reshuffle" on repeated clicks.
   */
  placeAllShipsRandomly(): void {
    const allSizes = Object.keys(this.gamedatas.fleetconfig.nums).map(Number);
    const anyFree = allSizes.some((size) => this.findFreeShip1(size) != null);
    if (!anyFree) {
      for (const ship of Object.keys(this.shipToGrid)) {
        if (this.shipToGrid[ship] != null) this.moveShipOnGrid(ship, null, null);
      }
    }

    for (let i = 0; i < this.WIDTH * this.WIDTH; i++) {
      const m = this.gridToFleet[i];
      if (m === "s" || m === "x") this.gridToFleet[i] = null;
    }

    const mode = this.gamedatas.ship_adjacency | 0;
    const isFleetshipAt = (g: number): boolean => {
      const s = this.gridToFleet[g];
      return !!s && typeof s === "string" && s.startsWith("fleetship");
    };

    const sizes = Object.keys(this.gamedatas.fleetconfig.nums)
      .map(Number)
      .sort((a, b) => b - a);

    for (const size of sizes) {
      while (true) {
        const ship = this.findFreeShip1(size);
        if (!ship) break;
        const placement = findRandomPlacement(this.WIDTH, mode, size, isFleetshipAt);
        if (!placement) {
          (gameui as any).showMessage(_("Couldn't find a random arrangement. Try again or place the rest manually."), "error");
          this.markupBoard();
          return;
        }
        this.moveShipOnGrid(ship, placement.gpos, placement.dirid);
      }
    }
    this.markupBoard();
  }

  markupBoard(): void {
    removeClassAll(".ship", "ship");
    removeClassAll(".error", "error");
    removeClassAll(".used", "used");
    for (let i = 0; i < this.WIDTH * this.WIDTH; i++) {
      const ship = this.getShipOnGrid(i);
      const nid = gridId(0, (i % this.WIDTH) + 1, Math.floor(i / this.WIDTH) + 1);
      if (!$(nid)) {
        console.error("Unknown grid " + nid);
      }
      if (ship) {
        addClass(nid, "ship");
        removeClass(nid, "preship");
        if (typeof ship === "string" && ship.startsWith("x")) {
          addClass(nid, "error");
        } else if ($(ship as string)) {
          addClass("slot_" + ship, "used");
        } else if (ship === "s") {
          addClass(nid, "preship");
        }
      }
    }
  }

  getShipOnGrid(gpos: number): ShipMarker {
    const mark = this.gridToFleet[gpos];
    const linked = mark != null ? this.shipToGrid[mark] : null;
    if (mark != null && $(mark) && linked != null) return this.gridToFleet[linked];
    return mark;
  }

  moveShipOnGrid(ship: string, gpos: number | null, dirid: "h" | "v" | null): void {
    if (!dirid) dirid = "h";
    let inc = 1;
    if (dirid === "v") inc = this.WIDTH;
    const size = getIntPart(ship, 1);
    removeClass(ship, "ship_h");
    removeClass(ship, "ship_v");
    console.log(`${ship}-move->${gpos} ${dirid}`);

    if (gpos == null) {
      const loc = "slot_" + ship;
      if ($(loc)) slideToObjectRelative(ship, loc, { duration: 500 });
      this.shipToGrid[ship] = null;
      // Clear every cell still pointing at this ship — direction-independent,
      // since the caller may not know whether it was placed h or v.
      for (let i = 0; i < this.gridToFleet.length; i++) {
        if (this.gridToFleet[i] === ship) this.gridToFleet[i] = null;
      }
    } else {
      addClass(ship, "ship_" + dirid);
      this.shipToGrid[ship] = gpos;
      slideToObjectRelative(ship, "grid_0_" + getXYFromOffset(gpos, this.WIDTH), { duration: 500 });
      for (let x = 0; x < size; x++) this.gridToFleet[gpos + x * inc] = ship;
    }
  }

  setShipOnGrid(gpos: number, ship: ShipMarker): void {
    this.gridToFleet[gpos] = ship as string | null;
  }

  // ---- title rendering --------------------------------------------------

  setMainTitle(text: string): void {
    const main = $("pagemaintitletext");
    if (main) main.innerHTML = text;
  }

  divYou(): string {
    const me = this.gamedatas.players[this.player_id];
    const color = me?.color ?? "";
    let color_bg = "";
    if (me?.color_back) color_bg = `background-color:#${me.color_back};`;
    return `<span style="font-weight:bold;color:#${color};${color_bg}">${_("You")}</span>`;
  }

  setDescriptionOnMyTurn(text: string | null): void {
    this.gamedatas.gamestate.descriptionmyturn = text;
    const tpl = structuredClone(this.gamedatas.gamestate.args) ?? {};
    let title = "";
    if (this.isCurrentPlayerActive() && text !== null) {
      tpl.you = this.divYou();
      title = (gameui as any).format_string_recursive(text, tpl);
    }
    if (title === "") this.setMainTitle("&nbsp;");
    else this.setMainTitle(title);
  }

  // ---- grid click dispatch ---------------------------------------------

  onGrid(cell: HTMLElement, event: Event): void {
    const id = cell.id;
    console.log("onGrid " + id);
    event.preventDefault();
    event.stopPropagation();

    const ss = id.split("_");
    const x = ss[2];
    const y = ss[3];
    if (x == "0" || y == "0") {
      (gameui as any).showMessage(_("Invalid grid location"), "error");
      return;
    }
    if (this.getStateName() === "playerTurnPlace") {
      if (ss[1] !== "0") {
        (gameui as any).showMessage(_("This is not your board!"), "error");
        return;
      }
      this.placeOrRemoveShip(id);
    } else {
      if (ss[1] !== "1") {
        (gameui as any).showMessage(_("This is your own board silly!"), "error");
        return;
      }
      const gpos = gridPosition(id, this.WIDTH);
      const grid = getXYFromOffset(gpos, this.WIDTH);
      if (this.attackGrid == null || this.attackGrid !== grid) {
        this.attackGrid = grid;
        removeClassAll(".selected", "selected");
        addClass(id, "selected");
        this.setDescriptionOnMyTurn(_("Click on grid again to confirm"));
        return;
      }
      this.bga.actions.performAction("playAttack", { grid });
    }
  }

  // ---- button handlers (called by state classes) ------------------------

  onDone(): void {
    let choices = "";
    document.querySelectorAll(".grid .fleetship").forEach((nodeRaw) => {
      const node = nodeRaw as HTMLElement;
      const grid = node.parentElement?.id;
      if (!grid) return;
      const dirid = node.classList.contains("ship_v") ? "v" : "h";
      choices += " " + node.id + "_at_" + grid + "_" + dirid;
    });
    console.log("sending " + choices);
    this.bga.actions.performAction("playPlace", { ships: choices.trim() });
  }

  onCancel(): void {
    this.setupBoard(this.gamedatas);
  }

  // ---- token state class swap (notification handler helper) -------------

  changeTokenStateTo(token: string, newState: number | string): void {
    const node = $(token);
    if (!node) return;
    const classes = Array.from(node.classList);
    for (const cl of classes) {
      if (cl.startsWith("state_")) node.classList.remove(cl);
    }
    node.classList.add("state_" + parseInt(newState as string));
  }

  // ---- debug bot helpers ------------------------------------------------

  private hookBot(): void {
    const root = $("debug_load3");
    if (!root) return;
    const sep1 = document.createElement("span");
    sep1.textContent = " • ";
    root.insertAdjacentElement("afterend", sep1);

    const takeOver = document.createElement("a");
    takeOver.href = "blank:";
    takeOver.textContent = "Take Over Bot";
    takeOver.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.bot = false;
      console.log("bot disable");
    });
    sep1.insertAdjacentElement("afterend", takeOver);

    const sep2 = document.createElement("span");
    sep2.textContent = " • ";
    takeOver.insertAdjacentElement("afterend", sep2);

    const runBot = document.createElement("a");
    runBot.href = "blank:";
    runBot.textContent = "Run Bot";
    runBot.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.bot = true;
      console.log("bot enabled");
      this.autoBotAction();
    });
    sep2.insertAdjacentElement("afterend", runBot);
  }

  autoBotAction(): void {
    if (!this.bot) return;
    if (typeof g_replayFrom !== "undefined") {
      console.log("reply on");
      return;
    }
    console.log("bot called " + (this.player_id - 2300662));
    setTimeout(() => {
      this.bga.actions.performAction("playBot", {});
    }, 100);
  }

  // ---- notification handlers (auto-wired by setupPromiseNotifications) --

  notif_revealShips(args: any): Promise<void> | void {
    console.log("notif_revealShips", args);
    this.gamedatas.board = args.board;
    this.setupBoard(this.gamedatas);
  }

  notif_playAttack(args: any): void {
    console.log("notif_playAttack", args);
    const state = parseInt(args.state);
    const grid: string = args.grid;
    const sgrid = grid.split("_");
    const myShot = args.player_id == this.player_id_as;
    const own = myShot ? 1 : 0;
    const loc = gridId(own, sgrid[0], sgrid[1]);
    this.changeTokenStateTo(loc, state);

    let message = "";
    let clazz = "fire_missed";
    switch (state) {
      case 2:
        message = _("Missed!");
        break;
      case 3:
        message = _("Hit!");
        clazz = "fire_hit";
        break;
      case 7:
        message = _("Sunk!");
        clazz = "fire_hit";
        if (args.ship) {
          // $shiptoken = "fleet_${pos}_fleetship_${size}_${num}_${i}_${vert}"
          const sship: string[] = args.ship.split("_");
          if (parseInt(sship[5]) === 1) {
            const playernum = getIntPart(args.ship, 1);
            if (this.player_no === playernum) {
              if (this.isSpectator()) {
                const ship = `fleetship_${sship[3]}_${sship[4]}`;
                const dirid = sship[6];
                const ogrid = "grid_0_" + grid;
                addClass(ship, "ship_" + dirid);
                slideToObjectRelative(ship, ogrid, { duration: 500 });
              }
            } else {
              const ship = `ofleetship_${sship[3]}_${sship[4]}`;
              const dirid = sship[6];
              const ogrid = "grid_1_" + grid;
              addClass(ship, "ship_" + dirid);
              slideToObjectRelative(ship, ogrid, { duration: 500 });
            }
          }
        }
        break;
    }
    if (args.log && message) (gameui as any).showBubble(loc, message, 0, 700, clazz);
  }
}
