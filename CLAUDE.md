# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A classic Battleship implementation for the **Board Game Arena Studio** platform (BGA). It is uploaded to BGA's servers. The PHP files have no local build (`battleship.game.php` etc. are uploaded as-is); the JS client is compiled from TypeScript via Rollup into `modules/js/Game.js` (checked in). Eclipse PDT project files (`.project`, `.settings/`, `.buildpath`) are checked in; ignore them.

This codebase has been modernized for the new BGA framework: no `mysql_fetch_assoc`, no `extends APP_DbObject`, no `extends \Table`, no `.view.php`/`.tpl`, no `ajaxcall`, no `self::_()`, no Dojo / AMD on the client side. JSON metadata files replace the legacy `gameoptions.inc.php` / `stats.inc.php`. `exception_on_warning` is on. See [TODO.md](TODO.md) for status (currently empty — all warnings cleared).

## Tests

Two suites — PHPUnit for server, mocha + chai + jsdom for client. Both wired through npm scripts in [package.json](package.json).

PHPUnit (configured via [phpunit.xml](phpunit.xml)): bootstrap [tests/_bootstrap.php](tests/_bootstrap.php) loads BGA framework stubs from `~/git/bga-sharedcode/misc/php/stubs/BgaFrameworkStubs.php` (override path via `APP_GAMEMODULE_PATH`).

- `npm run tests` — run the full PHP suite with --testdox
- `npm run test -- --filter testFoo tests/SomeTest.php` — run one
- `npm run tests:cov` — coverage report (needs xdebug)

JS tests: mocha specs under [src/tests/](src/tests/) — `setup.ts` boots JSDOM and stubs `$`, `_`, `__`, `gameui`, `ebg`. Run with `npm run jstests`. [src/tests/grid.spec.ts](src/tests/grid.spec.ts) covers the pure helpers in [src/grid.ts](src/grid.ts).

Build the client: `npm run build:ts` (compiles [src/Game.ts](src/Game.ts) → [modules/js/Game.js](modules/js/Game.js) via [rollup.config.mjs](rollup.config.mjs)). `npm run watch:ts` rebuilds on save during development.

`npm run predeploy` chains the whole pre-ship checklist: `build` + `lint:php` + `tests` + `jstests`.

Test infra:
- [tests/Stubs/TokensInMem.php](tests/Stubs/TokensInMem.php) — in-memory drop-in for `Tokens` (overrides only DB-touching methods; inherits the rest)
- [tests/Stubs/BattleShipUT.php](tests/Stubs/BattleShipUT.php) — extends `BattleShip`; loads `material.inc.php` + `states.inc.php`, swaps in `TokensInMem`, sets active/current player so framework reads don't trip type hints

## File layout (BGA convention — names are load-bearing)

- [battleship.game.php](battleship.game.php) — server-side game logic. `class BattleShip extends APP_Extended`. Defines `BattleShipAlreadyFiredException extends UserException` at the bottom — `action_playBot` catches *only* this so unrelated bugs surface instead of locking the game in a retry loop.
- [battleship.action.php](battleship.action.php) — thin AJAX dispatcher. Each `playFoo` method validates args and forwards to `$this->game->action_playFoo(...)`.
- [src/Game.ts](src/Game.ts) — client-side ES module entry. `class Game` (no inheritance) takes `Bga` in constructor and registers state classes via `bga.states.register(name, instance)`. `buildGameArea()` builds the board HTML at runtime; injected via `this.bga.gameArea.getElement().innerHTML` at the top of `setup()`. Compiled to [modules/js/Game.js](modules/js/Game.js) — BGA auto-loads it (no `game_main_js` needed in `gameinfos.inc.php`).
- [src/PlayerTurnPlaceState.ts](src/PlayerTurnPlaceState.ts), [src/PlayerTurnAttackState.ts](src/PlayerTurnAttackState.ts) — per-state classes with `onEnteringState` / `onLeavingState` / `onPlayerActivationChange`. Wire status-bar buttons via `bga.statusBar.addActionButton(label, callback, params?)`.
- [src/grid.ts](src/grid.ts) — pure grid math (no DOM). `gridId`, `gridPosition`, `gridOffset`, `getXYFromOffset`, `cellClass`, `getStart`, `getShipPosDir`, `wouldViolateAdjacency`, `getIntPart`. Reused by `Game.ts` and unit-tested in [src/tests/grid.spec.ts](src/tests/grid.spec.ts).
- [src/dom.ts](src/dom.ts), [src/animation.ts](src/animation.ts) — vanilla-DOM helpers (`addClass`, `removeClass`, `slideToObjectRelative`, ...) that replaced the dojo calls during migration.
- [src/random.ts](src/random.ts) — pure RNG-driven ship-placement helper (`findRandomPlacement`); injectable RNG keeps it unit-testable.
- [battleship.css](battleship.css) — styles.
- [states.inc.php](states.inc.php) — finite state machine (see below).
- [dbmodel.sql](dbmodel.sql) — DB schema. Only one custom table: `token`.
- [gameinfos.inc.php](gameinfos.inc.php), [material.inc.php](material.inc.php) — metadata loaded by the framework.
- [gameoptions.json](gameoptions.json), [gamepreferences.json](gamepreferences.json), [stats.json](stats.json) — JSON-format metadata (replaced the legacy `*.inc.php`).
- [modules/tokens.php](modules/tokens.php) — generic token manager wrapping the `token` table. `class Tokens` (no extends) — takes a game ref in the constructor (`new Tokens($this)`) and uses framework DB helpers (`getObjectFromDB`, `getCollectionFromDB`, `getObjectListFromDB`, `getUniqueValueFromDB`).
- [modules/APP_Extended.php](modules/APP_Extended.php) — base class `extends \Bga\GameFramework\Table`. Helpers: `userAssertTrue`, `systemAssertTrue`, `notifyWithName`, `setNextActivePlayerCustom`.
- [bga-framework.d.ts](bga-framework.d.ts), [_ide_helper.php](_ide_helper.php) — read-only framework typedefs. **Never edit.**

## State machine (states.inc.php)

`setupNewGame returns 2 → playerTurnPlace(2, multiactive) → gameTurnNextPlayer(4, game) ↔ playerTurnAttack(3, activeplayer) → 99 (framework-provided end)`

- States `1` (gameSetup) and `99` (gameEnd) were removed from `$machinestates` — the new framework provides them implicitly. `setupNewGame()` returns the id of the first real state (`2`).
- State `name` is the key used in `bga.states.register(name, instance)` on the JS side.
- `possibleactions` gates `checkAction` on both PHP and JS sides.
- `args` callback shape: `arg_<stateName>()` in `battleship.game.php`.

## Data model — everything lives in `token`

The `token` table has three columns: `token_key` (PK), `token_location`, `token_state`. All game state is encoded into these strings:

- Ship segments: `token_key = fleet_{pnum}_fleetship_{size}_{numindex}_{sizeindex}_{vert}`, `location = board_{pnum}_{x}_{y}`, `vert ∈ {v, h}`.
- Shots that missed: `token_key = shot_{pnum}_{x}_{y}` (created on miss).
- Board cell view: `location = board_{pnum}_{x}_{y}`.
- `token_state`: `0` empty · `1` ship · `2` miss · `3` hit · `7` sunk.

Because identifiers are parsed by `explode('_', ...)` / `split('_')`, **never put underscores inside a field**.

**SQL LIKE gotcha**: `_` is a single-char wildcard. `Tokens::getTokensOfTypeInLocation` and `countTokensInLocation` `preg_replace('/_/', '\\_', $pattern)` when `%` is present — without this, `"board_1%"` would also match `"boardX1..."` etc.

## Adding a player action (the recurring task)

1. Add the action name to `possibleactions` for the relevant state in [states.inc.php](states.inc.php).
2. Add a handler in [battleship.action.php](battleship.action.php) — extract args with `self::getArg(...)`, call `$this->game->action_<name>(...)`.
3. Implement `action_<name>` in [battleship.game.php](battleship.game.php). Start with `$this->checkAction('<name>')`. Validate with `userAssertTrue` (user-facing message) or `systemAssertTrue` (impossible without tampering). End by transitioning (`$this->gamestate->nextState(...)` or `setPlayerNonMultiactive`).
4. Notify via `$this->notifyWithName($type, $msg, $args)` from [modules/APP_Extended.php](modules/APP_Extended.php) (auto-injects `player_id` / `player_name`; honors `$args['_private']` to send only to the active player).
5. In [src/Game.ts](src/Game.ts), add a `notif_<type>(args: any)` method — it's auto-subscribed by `this.bga.notifications.setupPromiseNotifications()` in `setup()`. Return a `Promise` (or `await`) if you want to pace the notification queue (replacement for the legacy `notifqueue.setSynchronous`).
6. Client-side, fire the action with `this.bga.actions.performAction('<name>', { ...args })`. Returns a `Promise<any>`.

## Conventions / gotchas

- Player indices: `pnum` (a.k.a. `pos`) is `1` or `2` (player_no in DB), not `player_id`. Opponent index is `3 - pos`.
- Grid coordinates are 1-based; column letter is `chr($y + 64)` (A–J).
- `bga_rand($lo, $hi)` is BGA's RNG — use it instead of `rand()` so replays work.
- `clienttranslate('...')` is the **only** translation marker — `self::_()` was removed (deprecated by new framework). Inside `clienttranslate('...')`, `${name}` placeholders are BGA's own substitution syntax — **not** PHP interpolation; never change them.
- PHP interpolation in double-quoted strings uses `{$var}`, not `${var}` (PHP 8.2 deprecation).
- `notifyWithName` with `$args['_private'] = true` switches to `notifyPlayer` (single recipient).
- Score: use `$this->playerScore->inc((int)$player_id, $delta)` (framework `PlayerCounter`). Do not write `player_score` via raw SQL.
- Stats: use `$this->playerStats->inc($name, $delta, (int)$player_id)` / `$this->tableStats->inc($name, $delta)` (framework `PlayerStats`/`TableStats`). The old `initStat`/`incStat` are deprecated.
