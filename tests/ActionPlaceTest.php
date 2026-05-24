<?php

use PHPUnit\Framework\TestCase;
use Bga\GameFramework\UserException;

// Payload format: "fleetship_{size}_{numindex}_at_grid_{x}_{y}_{vert}" tokens,
// space-separated, count must equal getFleetShipNum().
final class ActionPlaceTest extends TestCase {
    private $game;

    protected function setUp(): void {
        $this->game = new BattleShipUT();
    }

    private function classicFleetPayload(): string {
        // Payload format: fleetship_{size}_{numindex}_at_grid_{board}_{x}_{y}_{vert}
        // The {board} segment is the client-side grid id (0 = own); server only
        // uses x/y/vert. 7 ships: 5(x1) 4(x1) 3(x1) 2(x2) 1(x2).
        return implode(' ', [
            'fleetship_5_1_at_grid_0_1_1_v',
            'fleetship_4_1_at_grid_0_3_1_v',
            'fleetship_3_1_at_grid_0_5_1_v',
            'fleetship_2_1_at_grid_0_7_1_v',
            'fleetship_2_2_at_grid_0_9_1_v',
            'fleetship_1_1_at_grid_0_1_8_v',
            'fleetship_1_2_at_grid_0_3_8_v',
        ]);
    }

    public function testValidPlacementCreatesAllSegmentTokens() {
        $this->game->action_playPlace($this->classicFleetPayload());
        // 5+4+3+2+2+1+1 = 18 segments for player 1
        $segments = $this->game->tokens()->getTokensOfTypeInLocation('fleet_1_');
        $this->assertCount(18, $segments);
        // Check the head of the 5-mast carrier
        $this->assertNotNull($this->game->tokens()->getTokenInfo('fleet_1_fleetship_5_1_1_v'));
        $this->assertEquals('board_1_1_1', $this->game->tokens()->getTokenInfo('fleet_1_fleetship_5_1_1_v')['location']);
    }

    public function testTooFewShipsThrowsUserException() {
        $this->expectException(UserException::class);
        $this->game->action_playPlace('fleetship_5_1_at_grid_1_1_v');
    }

    // Touching layout: the 5-mast carrier on col 1 and the 4-mast battleship on col 2
    // share the y=1..4 rows. Default option (0) accepts it; the no-touch options reject.
    private function touchingFleetPayload(): string {
        return implode(' ', [
            'fleetship_5_1_at_grid_0_1_1_v',
            'fleetship_4_1_at_grid_0_2_1_v',
            'fleetship_3_1_at_grid_0_4_1_v',
            'fleetship_2_1_at_grid_0_6_1_v',
            'fleetship_2_2_at_grid_0_8_1_v',
            'fleetship_1_1_at_grid_0_1_8_v',
            'fleetship_1_2_at_grid_0_3_8_v',
        ]);
    }

    // Diagonal-only adjacency: 3-mast and the lone 1-mast meet at a corner (3,8)<->(2,7).
    // Accepted by mode 0 and mode 1, rejected by mode 2.
    private function diagonalTouchingFleetPayload(): string {
        return implode(' ', [
            'fleetship_5_1_at_grid_0_1_1_v',
            'fleetship_4_1_at_grid_0_3_1_v',
            'fleetship_3_1_at_grid_0_5_1_v',
            'fleetship_2_1_at_grid_0_7_1_v',
            'fleetship_2_2_at_grid_0_9_1_v',
            'fleetship_1_1_at_grid_0_2_7_v',
            'fleetship_1_2_at_grid_0_3_8_v',
        ]);
    }

    public function testAdjacencyDefaultAllowsTouching() {
        // Option not set → default 0 → touching layout accepted (matches legacy behavior).
        $this->game->action_playPlace($this->touchingFleetPayload());
        $this->assertCount(18, $this->game->tokens()->getTokensOfTypeInLocation('fleet_1_'));
    }

    public function testAdjacencyModeOneRejectsSideTouching() {
        $this->game->setGameStateValue('ship_adjacency', 1);
        $this->expectException(UserException::class);
        $this->game->action_playPlace($this->touchingFleetPayload());
    }

    public function testAdjacencyModeOneAcceptsSpacedLayout() {
        $this->game->setGameStateValue('ship_adjacency', 1);
        $this->game->action_playPlace($this->classicFleetPayload());
        $this->assertCount(18, $this->game->tokens()->getTokensOfTypeInLocation('fleet_1_'));
    }

    public function testAdjacencyModeOneAllowsDiagonalCorner() {
        // Mode 1 only forbids orthogonal touching, so corner-touching ships pass.
        $this->game->setGameStateValue('ship_adjacency', 1);
        $this->game->action_playPlace($this->diagonalTouchingFleetPayload());
        $this->assertCount(18, $this->game->tokens()->getTokensOfTypeInLocation('fleet_1_'));
    }

    public function testAdjacencyModeTwoRejectsDiagonalCorner() {
        $this->game->setGameStateValue('ship_adjacency', 2);
        $this->expectException(UserException::class);
        $this->game->action_playPlace($this->diagonalTouchingFleetPayload());
    }

    public function testAdjacencyModeOneRejectsOverlap() {
        // Two ships sharing cell (3,1): 5-mast on col 1 vs 4-mast also starting at (1,1) horizontal.
        $payload = implode(' ', [
            'fleetship_5_1_at_grid_0_1_1_v',
            'fleetship_4_1_at_grid_0_1_1_h',
            'fleetship_3_1_at_grid_0_5_5_v',
            'fleetship_2_1_at_grid_0_7_1_v',
            'fleetship_2_2_at_grid_0_9_1_v',
            'fleetship_1_1_at_grid_0_1_8_v',
            'fleetship_1_2_at_grid_0_3_8_v',
        ]);
        $this->game->setGameStateValue('ship_adjacency', 1);
        $this->expectException(UserException::class);
        $this->game->action_playPlace($payload);
    }
}
