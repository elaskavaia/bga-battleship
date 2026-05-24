<?php

require_once __DIR__ . '/../../battleship.game.php';
require_once __DIR__ . '/TokensInMem.php';

// Wraps BattleShip for tests:
//  - swaps Tokens for the in-memory version (no DB)
//  - loads material.inc.php (auto-required by BGA in production, manual here)
class BattleShipUT extends BattleShip {
    function __construct() {
        parent::__construct();
        require __DIR__ . '/../../material.inc.php';
        require __DIR__ . '/../../states.inc.php';
        $this->tokens = new TokensInMem();
        // Wire the state machine — `action_*` methods call `nextState('next')`,
        // which the stub validates against the transitions table.
        $this->gamestate->_setStates($machinestates);
        // Notifications need an active player set (stub returns null otherwise,
        // tripping the string return type on getActivePlayerId).
        $this->gamestate->changeActivePlayer(10);
        // Current player drives action_playPlace; stub's curid is null by default,
        // which collapses player_no/pos to 0 and breaks token key namespacing.
        $this->_setCurrentPlayerId(10);
    }

    function setState(int $stateId): void {
        $this->gamestate->jumpToState($stateId);
        $this->gamestate->changeActivePlayer(10);
    }

    // Test accessor — $tokens is protected on Table, can't be read from test code.
    function tokens(): TokensInMem {
        return $this->tokens;
    }

    // Widen visibility so tests can drive the F5-refresh entry point.
    public function getAllDatas() {
        return parent::getAllDatas();
    }

    function placeShip($pnum, $size, $num, $x, $y, $vert, $state = 1) {
        $dx = $vert === 'v' ? 0 : 1;
        $dy = $vert === 'v' ? 1 : 0;
        $cx = $x; $cy = $y;
        for ($i = 1; $i <= $size; $i++) {
            $key = "fleet_{$pnum}_fleetship_{$size}_{$num}_{$i}_{$vert}";
            $this->tokens->createToken($key, "board_{$pnum}_{$cx}_{$cy}", $state);
            $cx += $dx;
            $cy += $dy;
        }
    }
}
