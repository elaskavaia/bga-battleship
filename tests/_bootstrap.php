<?php
// Loads BGA framework stubs from bga-sharedcode so the game's PHP files
// (which `extend Table`) can be required from a phpunit run with no DB.
// Override path via env var APP_GAMEMODULE_PATH.

if (!defined("APP_GAMEMODULE_PATH")) {
    define("APP_GAMEMODULE_PATH", getenv("APP_GAMEMODULE_PATH") ?: getenv("HOME") . "/git/bga-sharedcode/misc/");
}
require_once APP_GAMEMODULE_PATH . "/php/stubs/BgaFrameworkStubs.php";

// `APP_Extended` base class used by BattleShip.
require_once __DIR__ . "/../modules/APP_Extended.php";

// Test scaffolding for real game-logic tests.
require_once __DIR__ . "/Stubs/TokensInMem.php";
require_once __DIR__ . "/Stubs/BattleShipUT.php";
