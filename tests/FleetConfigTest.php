<?php

use PHPUnit\Framework\TestCase;

final class FleetConfigTest extends TestCase {
    private $game;

    protected function setUp(): void {
        $this->game = new BattleShipUT();
    }

    public function testDefaultFleetIsClassic5_4_3_2_2_1_1() {
        // No 'fleet' game state set → default is option 1
        $cfg = $this->game->getFleetConfig();
        $this->assertEquals([5 => 1, 4 => 1, 3 => 1, 2 => 2, 1 => 2], $cfg['nums']);
    }

    public function testClassicFleetHasSevenShips() {
        // 1+1+1+2+2 = 7 ships
        $this->assertEquals(7, $this->game->getFleetShipNum());
    }

    public function testClassicFleetCovers18GridCells() {
        // 5 + 4 + 3 + 2+2 + 1+1 = 18 cells — also the default 'ship_num' label
        $this->assertEquals(18, $this->game->getFleetShipGridNum());
    }

    public function testAlternateFleetConfig() {
        $this->game->setGameStateInitialValue('fleet', 2);
        // 5-4-3-3-2 → 5 ships covering 17 cells
        $cfg = $this->game->getFleetConfig();
        $this->assertEquals([5 => 1, 4 => 1, 3 => 2, 2 => 1, 1 => 0], $cfg['nums']);
        $this->assertEquals(5, $this->game->getFleetShipNum());
        $this->assertEquals(17, $this->game->getFleetShipGridNum());
    }
}
