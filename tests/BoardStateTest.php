<?php

use PHPUnit\Framework\TestCase;

// Tests the read-only board-query methods: getBoardState, getGameProgression,
// isEndOfGame, dbGetTokenInfoOnLocation, getWidth, plus trivial no-ops.
final class BoardStateTest extends TestCase {
    private $game;

    protected function setUp(): void {
        $this->game = new BattleShipUT();
        // Player 10 is player_no 1 in the Table stub, player 12 is player_no 2.
        // Place a single 1-mast ship for each player so the math has something to chew on.
        $this->game->placeShip(1, 1, 1, 3, 4, 'h'); // player 1's ship
        $this->game->placeShip(2, 1, 1, 5, 6, 'h'); // player 2's ship
    }

    public function testGetWidthReadsGridWidthState() {
        $this->game->setGameStateInitialValue('grid_width', 10);
        $this->assertEquals(10, $this->game->getWidth());
    }

    public function testDbGetTokenInfoOnLocationReturnsToken() {
        $info = $this->game->dbGetTokenInfoOnLocation('board_1_3_4');
        $this->assertNotNull($info);
        $this->assertEquals('fleet_1_fleetship_1_1_1_h', $info['key']);
    }

    public function testDbGetTokenInfoOnLocationReturnsNullForEmptyCell() {
        $this->assertNull($this->game->dbGetTokenInfoOnLocation('board_1_9_9'));
    }

    public function testGetBoardStateHidesOpponentShipsWhenNotRevealed() {
        // Player 10 (pos=1) querying: their own ship is visible, opponent's is hidden
        $r = $this->game->getBoardState(10, false);
        $this->assertArrayHasKey('fleet_1_fleetship_1_1', $r['fleet']); // own
        $this->assertArrayNotHasKey('fleet_2_fleetship_1_1', $r['fleet']); // opponent hidden
    }

    public function testGetBoardStateRevealsAllWhenReveal() {
        $r = $this->game->getBoardState(10, true);
        $this->assertArrayHasKey('fleet_1_fleetship_1_1', $r['fleet']);
        $this->assertArrayHasKey('fleet_2_fleetship_1_1', $r['fleet']);
    }

    public function testGameProgressionIsZeroAtStart() {
        $this->assertEquals(0, $this->game->getGameProgression());
    }

    public function testGameProgressionProportionalToHits() {
        // 7 ships * 18 cells = 18 grid cells per player. Hit one cell on each side.
        $this->game->tokens()->setTokenState('fleet_1_fleetship_1_1_1_h', 3);
        $this->game->tokens()->setTokenState('fleet_2_fleetship_1_1_1_h', 3);
        // (1+1)/18/2*100 ≈ 5.55
        $this->assertEqualsWithDelta(5.55, $this->game->getGameProgression(), 0.1);
    }

    public function testIsEndOfGameFalseWhenShipsRemain() {
        $this->assertFalse($this->game->isEndOfGame(12));
    }

    public function testIsEndOfGameFalseForNullPlayer() {
        $this->assertFalse($this->game->isEndOfGame(0));
    }

    public function testIsEndOfGameTrueWhenNextPlayersShipsAllDestroyed() {
        // isEndOfGame checks the $next_player_id's ships (the active-player
        // read at game.php:240 is dead code). 12 → pos 2 → sink board_2 ship.
        $this->game->tokens()->setTokenState('fleet_2_fleetship_1_1_1_h', 7);
        $this->assertTrue($this->game->isEndOfGame(12));
    }

    public function testGetAllDatasReturnsExpectedShape() {
        $this->game->setGameStateInitialValue('grid_width', 10);
        $data = $this->game->getAllDatas();
        $this->assertArrayHasKey('players', $data);
        $this->assertArrayHasKey('board', $data);
        $this->assertArrayHasKey('fleetconfig', $data);
        $this->assertEquals(10, $data['width']);
        // board carries the same shape as getBoardState
        $this->assertArrayHasKey('board_state', $data['board']);
        $this->assertArrayHasKey('fleet', $data['board']);
    }
}
