<?php

use PHPUnit\Framework\TestCase;

// isShipSunk parses a token key, walks the ship's segments, and returns true
// only when every segment is in state >= 3 (hit). On sunk, it transitions all
// segments to state 7 and fires a notification per segment.
final class IsShipSunkTest extends TestCase {
    private $game;

    protected function setUp(): void {
        $this->game = new BattleShipUT();
    }

    public function testHorizontalShipNotSunkWhenOneSegmentStillIntact() {
        // 2-mast horizontal at (3,4) for player 1
        $this->game->placeShip(1, 2, 1, 3, 4, 'h');
        $this->game->tokens()->setTokenState('fleet_1_fleetship_2_1_1_h', 3); // hit
        // Second segment still in state 1 (untouched)
        $this->assertFalse($this->game->isShipSunk('fleet_1_fleetship_2_1_1_h'));
    }

    public function testHorizontalShipSunkWhenAllSegmentsHit() {
        $this->game->placeShip(1, 2, 1, 3, 4, 'h');
        $this->game->tokens()->setTokenState('fleet_1_fleetship_2_1_1_h', 3);
        $this->game->tokens()->setTokenState('fleet_1_fleetship_2_1_2_h', 3);
        $this->assertTrue($this->game->isShipSunk('fleet_1_fleetship_2_1_2_h'));
        // Side effect: every segment is transitioned to state 7
        $this->assertEquals(7, $this->game->tokens()->getTokenState('fleet_1_fleetship_2_1_1_h'));
        $this->assertEquals(7, $this->game->tokens()->getTokenState('fleet_1_fleetship_2_1_2_h'));
    }

    public function testVerticalShipSunk() {
        // 3-mast vertical at (5,2) → cells (5,2),(5,3),(5,4)
        $this->game->placeShip(2, 3, 1, 5, 2, 'v');
        for ($i = 1; $i <= 3; $i++) {
            $this->game->tokens()->setTokenState("fleet_2_fleetship_3_1_{$i}_v", 3);
        }
        $this->assertTrue($this->game->isShipSunk('fleet_2_fleetship_3_1_1_v'));
        $this->assertEquals(7, $this->game->tokens()->getTokenState('fleet_2_fleetship_3_1_3_v'));
    }

    public function testSingleSegmentShipSunk() {
        // size=1, the smallest fleet item
        $this->game->placeShip(1, 1, 1, 7, 7, 'h');
        $this->game->tokens()->setTokenState('fleet_1_fleetship_1_1_1_h', 3);
        $this->assertTrue($this->game->isShipSunk('fleet_1_fleetship_1_1_1_h'));
        $this->assertEquals(7, $this->game->tokens()->getTokenState('fleet_1_fleetship_1_1_1_h'));
    }

    public function testCanBeQueriedFromAnySegment() {
        // The function looks up the start via num=1, regardless of which segment was asked
        $this->game->placeShip(1, 3, 2, 2, 2, 'h');
        for ($i = 1; $i <= 3; $i++) {
            $this->game->tokens()->setTokenState("fleet_1_fleetship_3_2_{$i}_h", 3);
        }
        $this->assertTrue($this->game->isShipSunk('fleet_1_fleetship_3_2_3_h'));
    }
}
