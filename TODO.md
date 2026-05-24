# TODO

BGA Studio modernization warnings from [misc/warnigs.html](misc/warnigs.html). Grouped by effort.

## Trivial deletes

- [ ] **W_IMG_deprecated** — delete `game_icon.png`, `game_box75.png`, `game_box180.png`, `game_box.png` from [img/](img/) (now in Game Metadata Manager)
- [ ] **W_PHP_version_php** — delete `version.php`
- [ ] **W_PHP_state_1** — remove state `1` (`gameSetup`) from [states.inc.php](states.inc.php); return `10` (or the new first state id) from `setupNewGame`
- [ ] **W_PHP_state_99** — remove state `99` (`gameEnd`) from [states.inc.php](states.inc.php)
- [ ] **W_PHP_get_game_name** — delete `getGameName()` at [battleship.game.php:63](battleship.game.php#L63)
- [ ] **W_CSS_import** — delete `@import url(../../../css/csslayer.css);` at [battleship.css:44](battleship.css#L44)
- [ ] **gameinfos deprecated keys** — remove `designer`, `artist`, `year`, `tags`, `complexity`, `strategy`, `luck`, `diplomacy`, `is_beta` from [gameinfos.inc.php](gameinfos.inc.php) (now in Metadata Manager)

## Small refactors

- [ ] **W_PHP_extends_old_table** — drop `require_once (APP_GAMEMODULE_PATH . 'module/table/table.game.php')` from [battleship.game.php:18](battleship.game.php#L18) and [modules/APP_Extended.php:8](modules/APP_Extended.php#L8); ensure `extends Bga\GameFramework\Table` (not bare `\Table`)
- [ ] **W_PHP_translate_with_underscore** — replace `self::_("...")` with `clienttranslate("...")` (use the parameter pattern for exceptions per [docs](https://en.doc.boardgamearena.com/Main_game_logic:_Game.php#Managing_errors_and_exceptions))
  - [battleship.view.php:106,108,113,121](battleship.view.php#L106)
  - [battleship.game.php:329,334,383,384,385](battleship.game.php#L329)
  - [modules/APP_Extended.php:35,63](modules/APP_Extended.php#L35)
- [ ] **W_JS_ajaxcall** — replace the `ajaxcall` wrapper at [battleship.js:447,478](battleship.js#L447) with `this.bga.actions.performAction`
- [ ] **W_JS_scoreCtrl** — replace `this.scoreCtrl[...].setValue(...)` at [battleship.js:854](battleship.js#L854) with `this.bga.playerPanels.getScoreCounter(...)`

## Bigger refactors

- [ ] **W_PHP_mysql_fetch_assoc** — replace 10 `mysql_fetch_assoc` calls in [modules/tokens.php](modules/tokens.php) (lines 146, 212, 367, 385, 417, 431, 455, 466, 480, 603) with framework DB functions
- [ ] **W_PHP_extends_APP_DbObject** — remove `extends APP_DbObject` at [modules/tokens.php:19](modules/tokens.php#L19); use static `Table::DbFunctionName` calls
- [ ] **W_PHP_player_score** — replace raw `UPDATE player SET player_score=...` and the `score` notification at [modules/APP_Extended.php:188,197](modules/APP_Extended.php#L188) with `$this->bga->playerScore` counter
- [ ] **W_PHP_view_tpl** — delete [battleship.view.php](battleship.view.php) and [battleship_battleship.tpl](battleship_battleship.tpl); rebuild the grid scaffolding in `setup()` of [battleship.js](battleship.js) via `bga.gameArea.getElement()`

## JSON migrations

- [ ] **W_PHP_gameoptions_php** — convert [gameoptions.inc.php](gameoptions.inc.php) to `gameoptions.jsonc` + `gamepreferences.jsonc` (use "Reload game options configuration" in BGA backoffice to generate)
- [ ] **W_PHP_stats_php** — convert [stats.inc.php](stats.inc.php) to `stats.jsonc` (use "Reload statistics configuration" in BGA backoffice to generate)

## Config

- [ ] Set `exception_on_warning = true` in [gameinfos.inc.php](gameinfos.inc.php) to surface PHP warnings during execution
