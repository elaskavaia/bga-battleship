<?php

use PHPUnit\Framework\TestCase;

// State-machine and trivial-getter coverage.
final class StateMachineTest extends TestCase {
    private $game;

    protected function setUp(): void {
        $this->game = new BattleShipUT();
    }

    public function testArgPlayerTurnPlaceIsEmptyArray() {
        $this->assertSame([], $this->game->arg_playerTurnPlace());
    }

    public function testArgPlayerTurnAttackIsEmptyArray() {
        $this->assertSame([], $this->game->arg_playerTurnAttack());
    }

    public function testActiveNextPlayerCustomCyclesToNextPlayer() {
        // Default active = 10, getPlayerAfter cycles 10 → 12
        $this->game->placeShip(2, 1, 1, 5, 5, 'h'); // keep opponent alive
        $next = $this->game->activeNextPlayerCustom();
        $this->assertEquals(12, $next);
    }

    public function testActiveNextPlayerCustomReturnsNullAtEndOfGame() {
        // Active is 10 (pos=1); leave their board empty so isEndOfGame fires
        $next = $this->game->activeNextPlayerCustom();
        $this->assertNull($next);
    }

    public function testStGameTurnNextPlayerEndOfGameFiresRevealAndTransitionsToLast() {
        // From state 4 (gameTurnNextPlayer). No ships placed → end-of-game branch.
        $this->game->setState(4);
        $this->game->st_gameTurnNextPlayer();
        $this->assertEquals('revealShips', $this->game->debugLastNotif['type']);
        $this->assertEquals(99, $this->game->gamestate->state_id()); // 'last' → gameEnd
    }

    public function testStGameTurnNextPlayerNormalTransitionsToAttack() {
        // Keep opponent (player 12 = pos 2) alive so end-of-game is skipped
        $this->game->placeShip(2, 1, 1, 5, 5, 'h');
        $this->game->setState(4);
        $this->game->st_gameTurnNextPlayer();
        $this->assertEquals(3, $this->game->gamestate->state_id()); // 'next' → playerTurnAttack
    }

    public function testZombieTurnActivePlayerTransitionsToLast() {
        $this->game->setState(3); // playerTurnAttack
        $this->game->zombieTurn(['name' => 'playerTurnAttack', 'type' => 'activeplayer'], 10);
        $this->assertEquals(99, $this->game->gamestate->state_id());
    }

    // multipleactiveplayer branch isn't asserted here — the stub's
    // updateMultiactiveOrNextState is a no-op, so there's no observable.

    public function testZombieTurnGameStateThrows() {
        $this->expectException(Exception::class);
        $this->game->zombieTurn(['name' => 'gameTurnNextPlayer', 'type' => 'game'], 10);
    }
}
