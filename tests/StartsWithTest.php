<?php

use PHPUnit\Framework\TestCase;

// Tests the top-level helpers at the bottom of modules/APP_Extended.php.
// These are used by battleship.game.php to parse token keys like
// "fleet_1_fleetship_5_1_2_v" and to gate stat init by key prefix.
final class StartsWithTest extends TestCase {
    public function testCommonPrefix() {
        $this->assertTrue(startsWith("hello", "he"));
    }

    public function testNonPrefixSubstring() {
        // "lo" is in "hello" but not at the start
        $this->assertFalse(startsWith("hello", "lo"));
    }

    public function testEmptyNeedleAlwaysMatches() {
        $this->assertTrue(startsWith("hello", ""));
        $this->assertTrue(startsWith("", ""));
    }

    public function testFullStringMatch() {
        $this->assertTrue(startsWith("hello", "hello"));
    }

    public function testNeedleLongerThanHaystack() {
        $this->assertFalse(startsWith("hello", "helloX"));
    }

    public function testEmptyHaystackNonEmptyNeedle() {
        $this->assertFalse(startsWith("", "a"));
    }

    public function testRealUsageStatKeyPrefix() {
        // Mirrors battleship.game.php:101 — gates which stats get initStat'd
        $this->assertTrue(startsWith("battle_player_score_total", "battle"));
        $this->assertTrue(startsWith("battle_player_miss", "battle"));
        $this->assertFalse(startsWith("turns_number", "battle"));
    }

    public function testRealUsageTokenKeyPrefix() {
        // Token keys are space partitioned by an underscore prefix
        $this->assertTrue(startsWith("fleet_1_fleetship_5_1_2_v", "fleet_"));
        $this->assertTrue(startsWith("shot_2_3_4", "shot_"));
        $this->assertFalse(startsWith("board_1_3_4", "fleet_"));
    }
}
