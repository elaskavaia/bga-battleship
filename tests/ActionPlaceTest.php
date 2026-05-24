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
}
