<?php

use PHPUnit\Framework\TestCase;

// Active player 10 (pos=1) fires at player 12's board (pos=2).
final class ActionAttackTest extends TestCase {
    private $game;

    protected function setUp(): void {
        $this->game = new BattleShipUT();
        $this->game->setGameStateInitialValue('grid_width', 10);
        $this->game->setState(3); // playerTurnAttack — where action_playAttack fires
    }

    public function testMissCreatesShotTokenWithState2() {
        // Opponent has no ship at 7_7 → miss
        $this->game->action_playAttack('7_7');
        $info = $this->game->tokens()->getTokenInfo('shot_2_7_7');
        $this->assertNotNull($info);
        $this->assertEquals(2, $info['state']);
    }

    public function testHitFlipsShipSegmentToState3() {
        // 2-mast horizontal at (3,4) on opponent's board
        $this->game->placeShip(2, 2, 1, 3, 4, 'h');
        $this->game->action_playAttack('3_4');
        $this->assertEquals(3, $this->game->tokens()->getTokenState('fleet_2_fleetship_2_1_1_h'));
    }

    public function testSinkingTransitionsAllSegmentsTo7() {
        // 1-mast ship: hitting it both hits and sinks
        $this->game->placeShip(2, 1, 1, 5, 5, 'h');
        $this->game->action_playAttack('5_5');
        $this->assertEquals(7, $this->game->tokens()->getTokenState('fleet_2_fleetship_1_1_1_h'));
    }

    public function testRefiringAtMissThrowsUserException() {
        $this->game->action_playAttack('1_1'); // miss
        $this->expectException(BgaUserException::class);
        $this->game->action_playAttack('1_1');
    }

    public function testRefiringAtHitThrowsUserException() {
        $this->game->placeShip(2, 2, 1, 3, 4, 'h');
        $this->game->action_playAttack('3_4'); // hits, leaves state=3
        $this->expectException(BgaUserException::class);
        $this->game->action_playAttack('3_4');
    }

    public function testActionPlayBotFiresAtSomeCell() {
        // bga_rand stub returns $min, so the bot always fires at (1,1) — verifies
        // the method runs end-to-end through action_playAttack.
        $this->game->action_playBot();
        $this->assertNotNull($this->game->tokens()->getTokenInfo('shot_2_1_1'));
    }

    public function testActionPlayBotRetriesOnAlreadyFiredCell() {
        // Pre-fire the cell the bot will pick (bga_rand stub → (1,1)).
        $this->game->action_playAttack('1_1'); // creates shot_2_1_1
        // setState back to attack — action_playAttack moved us to state 4.
        $this->game->setState(3);
        // Bot retries on AlreadyFired, hits (1,1) again, retries... infinite
        // loop in the stub's deterministic-rand world. We can't actually let
        // the loop run, but we can prove the *specific* exception fires from
        // within action_playAttack — that's the precondition for retry.
        $this->expectException(BattleShipAlreadyFiredException::class);
        $this->game->action_playAttack('1_1');
    }

    public function testActionPlayBotDoesNotSwallowUnexpectedExceptions() {
        // Subclass injects a non-AlreadyFired exception path. With the old
        // `catch (Exception $e)`, this would loop forever; with the narrowed
        // catch, it propagates.
        $game = new class extends BattleShipUT {
            public function action_playAttack($grid) {
                throw new RuntimeException('simulated bug');
            }
        };
        $game->setGameStateInitialValue('grid_width', 10);
        $this->expectException(RuntimeException::class);
        $game->action_playBot();
    }
}
