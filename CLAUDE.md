# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A classic Battleship implementation for the **Board Game Arena Studio** platform (BGA). It is uploaded to BGA's servers — there is no local build and no package manager. Eclipse PDT project files (`.project`, `.settings/`, `.buildpath`) are checked in; ignore them.

## Tests

PHPUnit, configured via [phpunit.xml](phpunit.xml). Bootstrap [tests/_bootstrap.php](tests/_bootstrap.php) loads BGA framework stubs from `~/git/bga-sharedcode/misc/php/stubs/BgaFrameworkStubs.php` (override path via `APP_GAMEMODULE_PATH`). No composer, no npm — just:

- `phpunit` — run everything
- `phpunit --filter testFoo tests/SomeTest.php` — run one

## File layout (BGA convention — names are load-bearing)

- [battleship.game.php](battleship.game.php) — server-side game logic. `class BattleShip extends APP_Extended extends Table`.
- [battleship.action.php](battleship.action.php) — thin AJAX dispatcher. Each `playFoo` method validates args and forwards to `$this->game->action_playFoo(...)`.
- [battleship.view.php](battleship.view.php) — generates the HTML grid by populating `BEGIN/END` blocks in the .tpl.
- [battleship_battleship.tpl](battleship_battleship.tpl) — HTML template with `{VAR}` placeholders and `<!-- BEGIN/END block -->` repeaters.
- [battleship.js](battleship.js) — client-side Dojo AMD module `bgagame.battleship` extending `ebg.core.gamegui`.
- [battleship.css](battleship.css) — styles.
- [states.inc.php](states.inc.php) — finite state machine (see below).
- [dbmodel.sql](dbmodel.sql) — DB schema. Only one custom table: `token`.
- [gameinfos.inc.php](gameinfos.inc.php), [gameoptions.inc.php](gameoptions.inc.php), [material.inc.php](material.inc.php), [stats.inc.php](stats.inc.php) — metadata loaded by the framework.
- [modules/tokens.php](modules/tokens.php) — generic token manager wrapping the `token` table.
- [modules/APP_Extended.php](modules/APP_Extended.php) — base class on top of `Table` with helpers (`userAssertTrue`, `systemAssertTrue`, `notifyWithName`, player/score helpers).
- [bga-framework.d.ts](bga-framework.d.ts), [_ide_helper.php](_ide_helper.php) — read-only framework typedefs. **Never edit.**

## State machine (states.inc.php)

`gameSetup(1) → playerTurnPlace(2, multiactive) → gameTurnNextPlayer(4, game) ↔ playerTurnAttack(3, activeplayer) → gameEnd(99)`

- State `name` is what JS sees from `this.getStateName()`.
- `possibleactions` gates `checkAction` on both PHP and JS sides.
- `args` callback shape: `arg_<stateName>()` in `battleship.game.php`.

## Data model — everything lives in `token`

The `token` table has three columns: `token_key` (PK), `token_location`, `token_state`. All game state is encoded into these strings:

- Ship segments: `token_key = fleet_{pnum}_fleetship_{size}_{numindex}_{sizeindex}_{vert}`, `location = board_{pnum}_{x}_{y}`, `vert ∈ {v, h}`.
- Shots that missed: `token_key = shot_{pnum}_{x}_{y}` (created on miss).
- Board cell view: `location = board_{pnum}_{x}_{y}`.
- `token_state`: `0` empty · `1` ship · `2` miss · `3` hit · `7` sunk.

Because identifiers are parsed by `explode('_', ...)` / `split('_')`, **never put underscores inside a field**.

## Adding a player action (the recurring task)

1. Add the action name to `possibleactions` for the relevant state in [states.inc.php](states.inc.php).
2. Add a handler in [battleship.action.php](battleship.action.php) — extract args with `self::getArg(...)`, call `$this->game->action_<name>(...)`.
3. Implement `action_<name>` in [battleship.game.php](battleship.game.php). Start with `$this->checkAction('<name>')`. Validate with `userAssertTrue` (user-facing message) or `systemAssertTrue` (impossible without tampering). End by transitioning (`$this->gamestate->nextState(...)` or `setPlayerNonMultiactive`).
4. Notify via `$this->notifyWithName($type, $msg, $args)` from [modules/APP_Extended.php](modules/APP_Extended.php) (auto-injects `player_id` / `player_name`; honors `$args['_private']` to send only to the active player).
5. In [battleship.js](battleship.js) `setupNotifications`, subscribe with `dojo.subscribe('<type>', this, 'notif_<type>')` and optionally `this.notifqueue.setSynchronous('<type>', ms)` to delay the next notification.
6. Client-side, fire the action with `this.ajaxcall('/battleship/battleship/<name>.html', ...)`.


## Conventions / gotchas

- Player indices: `pnum` (a.k.a. `pos`) is `1` or `2` (player_no in DB), not `player_id`. Opponent index is `3 - pos`.
- Grid coordinates are 1-based; column letter is `chr($y + 64)` (A–J).
- `bga_rand($lo, $hi)` is BGA's RNG — use it instead of `rand()` so replays work.
- `clienttranslate('...')` marks strings for translation in PHP literals; `_('...')` (i.e. `self::_`) translates at runtime.
- `notifyWithName` with `$args['_private'] = true` switches to `notifyPlayer` (single recipient).
- There is a top-level helper `startsWith($haystack, $needle)` defined at the bottom of [modules/APP_Extended.php](modules/APP_Extended.php) — this is unrelated to JS's `String.prototype.startsWith`.
