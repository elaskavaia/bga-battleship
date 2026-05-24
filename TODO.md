# TODO

BGA Studio modernization warnings from [misc/warnigs.html](misc/warnigs.html). Grouped by effort.

## Trivial deletes

- [x] **W_IMG_deprecated** — delete `game_icon.png`, `game_box75.png`, `game_box180.png`, `game_box.png` from [img/](img/) (now in Game Metadata Manager)
- [x] **W_PHP_version_php** — delete `version.php`
- [x] **W_PHP_state_1** — remove state `1` (`gameSetup`) from [states.inc.php](states.inc.php); return `10` (or the new first state id) from `setupNewGame`
- [x] **W_PHP_state_99** — remove state `99` (`gameEnd`) from [states.inc.php](states.inc.php)
- [x] **W_PHP_get_game_name** — delete `getGameName()` at [battleship.game.php:63](battleship.game.php#L63)
- [x] **W_CSS_import** — delete `@import url(../../../css/csslayer.css);` at [battleship.css:44](battleship.css#L44)
- [x] **gameinfos deprecated keys** — remove `designer`, `artist`, `year`, `tags`, `complexity`, `strategy`, `luck`, `diplomacy`, `is_beta` from [gameinfos.inc.php](gameinfos.inc.php) (now in Metadata Manager)

## Small refactors

- [x] **W_PHP_extends_old_table** — drop `require_once (APP_GAMEMODULE_PATH . 'module/table/table.game.php')` from [battleship.game.php:18](battleship.game.php#L18) and [modules/APP_Extended.php:8](modules/APP_Extended.php#L8); ensure `extends Bga\GameFramework\Table` (not bare `\Table`)
- [x] **W_PHP_translate_with_underscore** — replace `self::_("...")` with `clienttranslate("...")` (use the parameter pattern for exceptions per [docs](https://en.doc.boardgamearena.com/Main_game_logic:_Game.php#Managing_errors_and_exceptions))
  - [battleship.view.php:106,108,113,121](battleship.view.php#L106) — deferred; file is going away in the `view_tpl` refactor
  - [battleship.game.php:329,334,383,384,385](battleship.game.php#L329) — done
  - [modules/APP_Extended.php:35,63](modules/APP_Extended.php#L35) — done
- [x] **W_JS_ajaxcall** — replace the `ajaxcall` wrapper at [battleship.js:447,478](battleship.js#L447) with `this.bga.actions.performAction`
- [x] **W_JS_scoreCtrl** — replace `this.scoreCtrl[...].setValue(...)` at [battleship.js:854](battleship.js#L854) with `this.bga.playerPanels.getScoreCounter(...)`

## Bigger refactors

- [x] **W_PHP_mysql_fetch_assoc** — replaced via `$this->game->getObjectFromDB / getCollectionFromDB / getObjectListFromDB / getUniqueValueFromDB`. Also fixed bug: `_` escaped in `LIKE` patterns when `%` present (`getTokensOfTypeInLocation`, `countTokensInLocation`); fixed `pickCardsForLocation` → `pickTokensForLocation` typo
- [x] **W_PHP_extends_APP_DbObject** — class is now plain `Tokens`; back-reference to game injected via constructor (`new Tokens($this)`)
- [x] **W_PHP_player_score** — `action_playAttack` uses `$this->playerScore->inc((int)$player_id, 1)` (framework PlayerCounter); the 3 helper methods (`dbGetScoreValue`/`dbSetScoreValue`/`dbIncScoreValueAndNotify`) deleted from APP_Extended; custom `score` notification + its JS subscriber removed (framework sends its own update to the player panel)
- [x] **W_PHP_view_tpl** — view.php + .tpl deleted; HTML scaffolding now built in `buildGameArea()` + `_cellClass()` helper in [battleship.js](battleship.js), injected via `this.bga.gameArea.getElement().innerHTML = ...` at the top of `setup()`

## JSON migrations

- [x] **W_PHP_gameoptions_php** — convert [gameoptions.inc.php](gameoptions.inc.php) to `gameoptions.jsonc` + `gamepreferences.jsonc` (use "Reload game options configuration" in BGA backoffice to generate)
- [x] **W_PHP_stats_php** — convert [stats.inc.php](stats.inc.php) to `stats.jsonc` (use "Reload statistics configuration" in BGA backoffice to generate)

## Config

- [ ] Set `exception_on_warning = true` in [gameinfos.inc.php](gameinfos.inc.php) to surface PHP warnings during execution
