/**
 * Tiny dojo-API shim. dojo helpers accepted either a node or an id string;
 * these do the same so call sites stay readable.
 */
function addClass(target, cls) {
    const n = $(target);
    if (n)
        n.classList.add(cls);
}
function removeClass(target, cls) {
    const n = $(target);
    if (n)
        n.classList.remove(cls);
}
function removeClassAll(selector, cls, root = document) {
    root.querySelectorAll(selector).forEach((n) => n.classList.remove(cls));
}

class PlayerTurnPlaceState {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }
    onEnteringState(_args, isCurrentPlayerActive) {
        console.log("Entering playerTurnPlace");
        addClass("board", "playerTurnPlace");
        removeClassAll(".selected", "selected");
        if (isCurrentPlayerActive) {
            this.addButtons();
        }
    }
    onLeavingState(_args) {
        console.log("Leaving playerTurnPlace");
        removeClass("board", "playerTurnPlace");
    }
    onPlayerActivationChange(_args, isCurrentPlayerActive) {
        this.bga.statusBar.removeActionButtons();
        if (isCurrentPlayerActive)
            this.addButtons();
    }
    addButtons() {
        this.bga.statusBar.addActionButton(_("Done"), () => this.game.onDone(), { id: "button_done" });
        this.bga.statusBar.addActionButton(_("Feeling Lazy"), () => this.game.placeAllShipsRandomly(), {
            id: "button_lazy",
            color: "secondary",
        });
        this.bga.statusBar.addActionButton(_("Reset"), () => this.game.onCancel(), {
            id: "button_cancel",
            color: "alert",
        });
    }
}

class PlayerTurnAttackState {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }
    onEnteringState(_args, isCurrentPlayerActive) {
        console.log("Entering playerTurnAttack");
        addClass("board", "playerTurnAttack");
        removeClassAll(".selected", "selected");
        this.game.attackGrid = null;
        if (isCurrentPlayerActive) {
            const title = document.getElementById("fleet_title");
            if (title)
                title.innerHTML = _("ENEMY FLEET");
            if (this.game.bot)
                this.game.autoBotAction();
        }
    }
    onLeavingState(_args) {
        console.log("Leaving playerTurnAttack");
        removeClass("board", "playerTurnAttack");
    }
}

/**
 * Pure grid math. No DOM access. Easy to unit-test.
 *
 * Conventions (ported from battleship.js):
 *   - Coordinates are 1-based.
 *   - `gpos` is a row-major offset into a width×width board: gpos = (y-1)*width + (x-1).
 *   - `own` is 0 (your board) or 1 (enemy board) — used to build cell ids "grid_{own}_{x}_{y}".
 */
const LETTERS = ["", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
function gridId(own, x, y) {
    return `grid_${own}_${x}_${parseInt(y)}`;
}
function gridOffset(x, y, width) {
    return (parseInt(y) - 1) * width + (parseInt(x) - 1);
}
function gridPosition(id, width) {
    const ss = id.split("_");
    return gridOffset(ss[2], ss[3], width);
}
function getXYFromOffset(grid, width) {
    const x = (grid % width) + 1;
    const y = Math.floor(grid / width) + 1;
    return `${x}_${y}`;
}
function rowLetter(row) {
    return LETTERS[row] || "";
}
function getIntPart(word, i) {
    return parseInt(word.split("_")[i]);
}
/**
 * Walk from gpos by `offset` (±1 horizontal, ±width vertical) while cells are
 * occupied by a ship marker. Returns the last occupied gpos in that direction.
 */
function getStart(gpos, offset, width, isShipAt) {
    let last = gpos;
    for (let i = 0; i < 5; i++) {
        const spos = gpos + offset * i;
        if (spos < 0)
            break;
        if (spos >= width * width)
            break;
        if (isShipAt(spos))
            last = spos;
        else
            break;
        const x = spos % width;
        if (offset === -1 && x === 0)
            break;
        if (offset === 1 && x === width - 1)
            break;
    }
    return last;
}
/** Find the bounding box of a contiguous ship segment containing gpos. */
function getShipPosDir(gpos, width, isShipAt) {
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
function wouldViolateAdjacency(startGpos, len, step, width, mode, isFleetshipAt) {
    if (mode === 0)
        return false;
    const diagonal = mode === 2;
    const occupied = {};
    for (let i = 0; i < len; i++)
        occupied[startGpos + i * step] = true;
    for (let j = 0; j < len; j++) {
        const gpos = startGpos + j * step;
        const x = gpos % width;
        const y = Math.floor(gpos / width);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue;
                if (!diagonal && dx !== 0 && dy !== 0)
                    continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= width || ny < 0 || ny >= width)
                    continue;
                const npos = ny * width + nx;
                if (occupied[npos])
                    continue;
                if (isFleetshipAt(npos))
                    return true;
            }
        }
    }
    return false;
}

/**
 * Sliding-element animation helpers. Ported 1:1 from the legacy
 * slideToObjectRelative/Absolute (which were the BGA dojo-era helpers).
 * Keeping behavior identical so we don't introduce visual regressions
 * during the framework migration.
 */
function setTransition(node, value) {
    node.style.transition = value;
}
function stripTransition(node) {
    setTransition(node, "");
}
function stripPosition(node) {
    node.style.display = "";
    node.style.top = "";
    node.style.left = "";
    node.style.position = "";
}
function placeOnObjectDirect(mobile, x, y) {
    mobile.style.left = `${x}px`;
    mobile.style.top = `${y}px`;
}
/** dojo.position parity: page-coords + size. Suitable for absolute placement math. */
function pagePosition(target) {
    const n = $(target);
    if (!n)
        return { x: 0, y: 0, w: 0, h: 0 };
    const r = n.getBoundingClientRect();
    return {
        x: r.left + window.scrollX,
        y: r.top + window.scrollY,
        w: r.width,
        h: r.height,
    };
}
/**
 * Attach `mobile` to `newParent` without destroying event handlers, keeping
 * its current visual position via absolute positioning. Returns the
 * margin-box of the moved node (for the caller to read l/t/w/h).
 */
function attachToNewParentNoDestroy(mobile, newParent) {
    const src = pagePosition(mobile);
    mobile.style.position = "absolute";
    newParent.appendChild(mobile);
    const tgt = pagePosition(mobile);
    // Modern boxes: marginBox ≈ contentBox for our use; we only need l/t/w/h.
    const box = { l: 0, t: 0, w: tgt.w, h: tgt.h };
    const left = box.l + src.x - tgt.x;
    const top = box.t + src.y - tgt.y;
    mobile.style.left = `${left}px`;
    mobile.style.top = `${top}px`;
    return box;
}
function delayedExec(onStart, onEnd, duration, delay, instant) {
    if (instant) {
        delay = Math.min(1, delay);
        duration = Math.min(1, duration);
    }
    const run = () => {
        onStart();
        if (onEnd)
            setTimeout(onEnd, duration);
    };
    if (delay)
        setTimeout(run, delay);
    else
        run();
}
/**
 * Slide a token so it ends up centered on `finalPlace`. Works on elements
 * that don't use inline positioning; reparents before the animation so
 * later position math uses the new parent.
 */
function slideToObjectRelative(token, finalPlace, opts = {}) {
    const node = typeof token === "string" ? $(token) : token;
    const target = typeof finalPlace === "string" ? $(finalPlace) : finalPlace;
    if (!node || !target)
        return;
    const duration = opts.duration ?? 500;
    const delay = opts.delay ?? 0;
    delayedExec(() => {
        stripTransition(node);
        stripPosition(node);
        const box = attachToNewParentNoDestroy(node, target);
        setTransition(node, `all ${duration}ms ease-in-out`);
        placeOnObjectDirect(node, box.l, box.t);
    }, () => {
        stripTransition(node);
        stripPosition(node);
        opts.onEnd?.(node);
    }, duration, delay, opts.instant ?? false);
}
function slideToObjectAbsolute(token, finalPlace, x, y, opts = {}) {
    const node = typeof token === "string" ? $(token) : token;
    const target = typeof finalPlace === "string" ? $(finalPlace) : finalPlace;
    if (!node || !target)
        return;
    const duration = opts.duration ?? 500;
    const delay = opts.delay ?? 0;
    delayedExec(() => {
        stripTransition(node);
        attachToNewParentNoDestroy(node, target);
        setTransition(node, `all ${duration}ms ease-in-out`);
        placeOnObjectDirect(node, x, y);
    }, () => {
        stripTransition(node);
        opts.onEnd?.(node);
    }, duration, delay, opts.instant ?? false);
}

/**
 * Random ship placement. Pure (no DOM), driven by an `isFleetshipAt`
 * occupancy predicate so the same logic powers both the live placement
 * and unit tests.
 */
/**
 * Try to find a random (in-bounds, non-overlapping, adjacency-respecting)
 * placement for a ship of `size`. Returns null if no spot found within
 * `maxAttempts` tries.
 */
function findRandomPlacement(width, mode, size, isFleetshipAt, rand = Math.random, maxAttempts = 500) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const dirid = rand() < 0.5 ? "h" : "v";
        const step = dirid === "h" ? 1 : width;
        const xMax = dirid === "h" ? width - size : width - 1;
        const yMax = dirid === "v" ? width - size : width - 1;
        if (xMax < 0 || yMax < 0)
            continue;
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
        if (overlap)
            continue;
        if (wouldViolateAdjacency(gpos, size, step, width, mode, isFleetshipAt))
            continue;
        return { gpos, dirid };
    }
    return null;
}

/**
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * Battleship implementation: © Alena Laskavaia <laskava@gmail.com>
 *
 * Main client entry. Compiled to modules/js/Game.js via Rollup.
 */
class Game {
    constructor(bga) {
        this.WIDTH = 10;
        this.gridToFleet = [];
        this.shipToGrid = {};
        this.attackGrid = null;
        this.bot = false;
        this.player_no = 1;
        this.opponent_no = 2;
        this.player_color = "ffffff";
        this.player_id_as = null;
        this.bga = bga;
        this.placeState = new PlayerTurnPlaceState(this, bga);
        this.attackState = new PlayerTurnAttackState(this, bga);
        this.bga.states.register("playerTurnPlace", this.placeState);
        this.bga.states.register("playerTurnAttack", this.attackState);
    }
    // ---- BGA lifecycle ----------------------------------------------------
    setup(gamedatas) {
        console.log("Starting battleship setup");
        this.gamedatas = gamedatas;
        this.WIDTH = gamedatas.width;
        this.shipToGrid = {};
        // Replace legacy view.php / .tpl with runtime HTML.
        this.bga.gameArea.getElement().innerHTML = this.buildGameArea(gamedatas);
        if (this.isSpectator()) {
            this.player_color = "ffffff";
            this.player_no = 1;
        }
        else {
            this.player_color = gamedatas.players[this.player_id].color;
            this.player_no = Number(gamedatas.players[this.player_id].no);
            this.player_id_as = this.player_id;
        }
        this.opponent_no = 3 - this.player_no;
        for (const player_id in gamedatas.players) {
            const player = gamedatas.players[player_id];
            if (!this.player_id_as && player.no == 1)
                this.player_id_as = parseInt(player_id);
        }
        this.setupBoard(gamedatas);
        // Delegate grid clicks once; cells in markupBoard are reused, not recreated.
        const board = $("board");
        board?.addEventListener("click", (e) => {
            const cell = e.target?.closest(".gridPlacement");
            if (cell)
                this.onGrid(cell, e);
        });
        this.bga.notifications.setupPromiseNotifications();
        this.hookBot();
        console.log("Ending battleship setup");
    }
    // ---- accessors that bridge to GameGui via the gameui global -----------
    get player_id() {
        return gameui.player_id;
    }
    isSpectator() {
        return this.bga.players.isCurrentPlayerSpectator();
    }
    isCurrentPlayerActive() {
        return this.bga.players.isCurrentPlayerActive();
    }
    getStateName() {
        return this.gamedatas.gamestate.name;
    }
    // ---- board construction ----------------------------------------------
    buildGameArea(gamedatas) {
        const width = gamedatas.width;
        const fleetconfig = gamedatas.fleetconfig;
        /** corner/header/edge class for a cell. */
        const cellClass = (row, col) => {
            if (col === 0 && row === 0)
                return "first-cell";
            if (row === 0 && col > 0)
                return "cell-number";
            if (col === 0 && row > 0)
                return "cell-letter";
            let cls = "";
            if (row === 1)
                cls += "cell-first-inside-row";
            if (col === 1)
                cls += " cell-first-inside-col";
            if (row === 10)
                cls += " cell-last-inside-row";
            if (col === 10)
                cls += " cell-last-inside-col";
            return cls;
        };
        // Spectators have no "you", so label boards with the players' names instead.
        // A spectator views player_no 1 on grid 0 and player_no 2 on grid 1 (see setup()).
        const spectating = this.isSpectator();
        const nameByNo = (no) => {
            const player = this.bga.players.getPlayerByNo(no);
            return player ? this.bga.players.getFormattedPlayerName(player.id) : "";
        };
        const buildGrid = (a) => {
            const cellW = a === 1 ? 40 : 26;
            let caption = a === 0 ? _("YOUR SHIPS") : _("ENEMY SHIPS");
            if (spectating)
                caption = nameByNo(a + 1);
            let cells = "";
            for (let row = 0; row <= width; row++) {
                for (let col = 0; col <= width; col++) {
                    const cls = cellClass(row, col);
                    let content = "";
                    if (row === 0 && col > 0)
                        content = String(col);
                    else if (col === 0 && row > 0)
                        content = rowLetter(row);
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
            <div id="fleet_title" class="board_title ships_title caption">${spectating ? _("FLEET") : _("YOUR FLEET")}</div>
            <div id="fleet" class="fleet">${fleetRows}</div>
          </div>
        </div>
      </div>`;
    }
    setupBoard(gamedatas) {
        this.gridToFleet = [];
        this.shipToGrid = {};
        if (this.getStateName() === "playerTurnPlace") {
            document.querySelectorAll(".fleetship").forEach((node) => {
                this.moveShipOnGrid(node.id, null, null);
            });
        }
        for (const loc in gamedatas.board.board_state) {
            const state = gamedatas.board.board_state[loc];
            const sloc = loc.split("_");
            if (sloc[0] !== "board")
                continue;
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
            const dirid = sloc[4];
            const skey = key.split("_");
            let ship = `${skey[2]}_${skey[3]}_${skey[4]}`;
            if (num == this.player_no) {
                this.moveShipOnGrid(ship, gpos, dirid);
            }
            else {
                ship = "o" + ship;
                addClass(ship, "ship_" + dirid);
                slideToObjectRelative(ship, "grid_1_" + getXYFromOffset(gpos, this.WIDTH), { duration: 500 });
            }
        }
        this.markupBoard();
    }
    // ---- ship placement state (called by PlayerTurnPlaceState) ------------
    placeOrRemoveShip(id) {
        const gpos = gridPosition(id, this.WIDTH);
        const ship = this.getShipOnGrid(gpos);
        if (ship) {
            if (typeof ship === "string" && ship.startsWith("fleetship")) {
                this.moveShipOnGrid(ship, null, null);
            }
            else if (typeof ship === "string" && ship.startsWith("x")) {
                this.setShipOnGrid(gpos, null);
            }
            else {
                this.completeShip(gpos);
                const after = this.getShipOnGrid(gpos);
                if (after === "s")
                    this.setShipOnGrid(gpos, "x");
            }
        }
        else {
            this.setShipOnGrid(gpos, "s");
        }
        this.markupBoard();
        if (document.querySelectorAll(".preship").length > 0) {
            this.setDescriptionOnMyTurn(_("Click on ship again to complete the ship"));
        }
        else {
            this.setDescriptionOnMyTurn(this.gamedatas.gamestate.descriptionmyturn);
        }
    }
    completeShip(gpos) {
        const vector = getShipPosDir(gpos, this.WIDTH, (g) => {
            const s = this.getShipOnGrid(g);
            return s === "s" || s === "x";
        });
        const size = vector.len;
        const f = this.findFreeShip1(size);
        const adjBlocked = f != null &&
            wouldViolateAdjacency(vector.gpos, vector.len, vector.dir, this.WIDTH, this.gamedatas.ship_adjacency | 0, (g) => {
                const s = this.gridToFleet[g];
                return !!s && typeof s === "string" && s.startsWith("fleetship");
            });
        if (f == null || adjBlocked) {
            for (let i = 0; i < vector.len; i++)
                this.setShipOnGrid(vector.gpos + i * vector.dir, "x");
            if (adjBlocked) {
                const mode = this.gamedatas.ship_adjacency | 0;
                gameui.showMessage(mode === 2
                    ? _("Ships cannot touch, not even at the corners. Place this ship further away.")
                    : _("Ships cannot touch on the sides. Leave at least one empty cell between ships."), "error");
            }
            else {
                gameui.showMessage(_("No ship of this size remains in your fleet."), "error");
            }
            return;
        }
        this.moveShipOnGrid(f, vector.gpos, vector.dirid);
    }
    findFreeShip1(num) {
        const res = document.querySelectorAll(`.fleet .own.fleetship_${num}`);
        if (res.length > 0)
            return res[0].id;
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
    placeAllShipsRandomly() {
        const allSizes = Object.keys(this.gamedatas.fleetconfig.nums).map(Number);
        const anyFree = allSizes.some((size) => this.findFreeShip1(size) != null);
        if (!anyFree) {
            for (const ship of Object.keys(this.shipToGrid)) {
                if (this.shipToGrid[ship] != null)
                    this.moveShipOnGrid(ship, null, null);
            }
        }
        for (let i = 0; i < this.WIDTH * this.WIDTH; i++) {
            const m = this.gridToFleet[i];
            if (m === "s" || m === "x")
                this.gridToFleet[i] = null;
        }
        const mode = this.gamedatas.ship_adjacency | 0;
        const isFleetshipAt = (g) => {
            const s = this.gridToFleet[g];
            return !!s && typeof s === "string" && s.startsWith("fleetship");
        };
        const sizes = Object.keys(this.gamedatas.fleetconfig.nums)
            .map(Number)
            .sort((a, b) => b - a);
        for (const size of sizes) {
            while (true) {
                const ship = this.findFreeShip1(size);
                if (!ship)
                    break;
                const placement = findRandomPlacement(this.WIDTH, mode, size, isFleetshipAt);
                if (!placement) {
                    gameui.showMessage(_("Couldn't find a random arrangement. Try again or place the rest manually."), "error");
                    this.markupBoard();
                    return;
                }
                this.moveShipOnGrid(ship, placement.gpos, placement.dirid);
            }
        }
        this.markupBoard();
    }
    markupBoard() {
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
                }
                else if ($(ship)) {
                    addClass("slot_" + ship, "used");
                }
                else if (ship === "s") {
                    addClass(nid, "preship");
                }
            }
        }
    }
    getShipOnGrid(gpos) {
        const mark = this.gridToFleet[gpos];
        const linked = mark != null ? this.shipToGrid[mark] : null;
        if (mark != null && $(mark) && linked != null)
            return this.gridToFleet[linked];
        return mark;
    }
    moveShipOnGrid(ship, gpos, dirid) {
        if (!dirid)
            dirid = "h";
        let inc = 1;
        if (dirid === "v")
            inc = this.WIDTH;
        const size = getIntPart(ship, 1);
        removeClass(ship, "ship_h");
        removeClass(ship, "ship_v");
        console.log(`${ship}-move->${gpos} ${dirid}`);
        if (gpos == null) {
            const loc = "slot_" + ship;
            if ($(loc))
                slideToObjectRelative(ship, loc, { duration: 500 });
            this.shipToGrid[ship] = null;
            // Clear every cell still pointing at this ship — direction-independent,
            // since the caller may not know whether it was placed h or v.
            for (let i = 0; i < this.gridToFleet.length; i++) {
                if (this.gridToFleet[i] === ship)
                    this.gridToFleet[i] = null;
            }
        }
        else {
            addClass(ship, "ship_" + dirid);
            this.shipToGrid[ship] = gpos;
            slideToObjectRelative(ship, "grid_0_" + getXYFromOffset(gpos, this.WIDTH), { duration: 500 });
            for (let x = 0; x < size; x++)
                this.gridToFleet[gpos + x * inc] = ship;
        }
    }
    setShipOnGrid(gpos, ship) {
        this.gridToFleet[gpos] = ship;
    }
    // ---- title rendering --------------------------------------------------
    setMainTitle(text) {
        const main = $("pagemaintitletext");
        if (main)
            main.innerHTML = text;
    }
    divYou() {
        const me = this.gamedatas.players[this.player_id];
        const color = me?.color ?? "";
        let color_bg = "";
        if (me?.color_back)
            color_bg = `background-color:#${me.color_back};`;
        return `<span style="font-weight:bold;color:#${color};${color_bg}">${_("You")}</span>`;
    }
    setDescriptionOnMyTurn(text) {
        this.gamedatas.gamestate.descriptionmyturn = text;
        const tpl = structuredClone(this.gamedatas.gamestate.args) ?? {};
        let title = "";
        if (this.isCurrentPlayerActive() && text !== null) {
            tpl.you = this.divYou();
            title = gameui.format_string_recursive(text, tpl);
        }
        if (title === "")
            this.setMainTitle("&nbsp;");
        else
            this.setMainTitle(title);
    }
    // ---- grid click dispatch ---------------------------------------------
    onGrid(cell, event) {
        const id = cell.id;
        console.log("onGrid " + id);
        event.preventDefault();
        event.stopPropagation();
        if (this.isSpectator())
            return; // spectators only watch, no firing/placing
        const ss = id.split("_");
        const x = ss[2];
        const y = ss[3];
        if (x == "0" || y == "0") {
            gameui.showMessage(_("Invalid grid location"), "error");
            return;
        }
        if (this.getStateName() === "playerTurnPlace") {
            if (ss[1] !== "0") {
                gameui.showMessage(_("This is not your board!"), "error");
                return;
            }
            this.placeOrRemoveShip(id);
        }
        else {
            if (ss[1] !== "1") {
                gameui.showMessage(_("This is your own board silly!"), "error");
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
    onDone() {
        let choices = "";
        document.querySelectorAll(".grid .fleetship").forEach((nodeRaw) => {
            const node = nodeRaw;
            const grid = node.parentElement?.id;
            if (!grid)
                return;
            const dirid = node.classList.contains("ship_v") ? "v" : "h";
            choices += " " + node.id + "_at_" + grid + "_" + dirid;
        });
        console.log("sending " + choices);
        this.bga.actions.performAction("playPlace", { ships: choices.trim() });
    }
    onCancel() {
        this.setupBoard(this.gamedatas);
    }
    // ---- token state class swap (notification handler helper) -------------
    changeTokenStateTo(token, newState) {
        const node = $(token);
        if (!node)
            return;
        const classes = Array.from(node.classList);
        for (const cl of classes) {
            if (cl.startsWith("state_"))
                node.classList.remove(cl);
        }
        node.classList.add("state_" + parseInt(newState));
    }
    // ---- debug bot helpers ------------------------------------------------
    hookBot() {
        const root = $("debug_load3");
        if (!root)
            return;
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
    autoBotAction() {
        if (!this.bot)
            return;
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
    notif_revealShips(args) {
        console.log("notif_revealShips", args);
        this.gamedatas.board = args.board;
        this.setupBoard(this.gamedatas);
    }
    notif_playAttack(args) {
        console.log("notif_playAttack", args);
        const state = parseInt(args.state);
        const grid = args.grid;
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
                    const sship = args.ship.split("_");
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
                        }
                        else {
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
        if (args.log && message)
            gameui.showBubble(loc, message, 0, 700, clazz);
    }
}

export { Game };
