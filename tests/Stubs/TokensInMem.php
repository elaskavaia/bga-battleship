<?php

use Bga\GameFramework\SystemException;

require_once __DIR__ . '/../../modules/tokens.php';

// In-memory drop-in replacement for the Tokens class. Same public API; only the
// DB-touching methods are overridden. Methods unused by battleship.game.php are
// left to inherit (and will explode if hit — fine, we want loud failure if a
// new code path starts using them).
class TokensInMem extends Tokens {
    private $rows = [];

    function createToken($key, $location, $token_state = 0) {
        self::checkLocation($location);
        self::checkState($token_state);
        self::checkKey($key);
        if (array_key_exists($key, $this->rows)) {
            throw new SystemException("createToken: duplicate key $key");
        }
        $this->rows[$key] = ['key' => $key, 'location' => $location, 'state' => (int)$token_state];
    }

    function createTokens($tokens, $location_global, $token_state_global = null) {
        $next_pos = $location_global ? $this->getExtremePosition(true, $location_global) + 1 : 0;
        $keys = [];
        foreach ($tokens as $tok) {
            $n = isset($tok['nbr']) ? $tok['nbr'] : 1;
            $start = isset($tok['nbr_start']) ? $tok['nbr_start'] : 0;
            for ($i = $start; $i < $n + $start; $i++) {
                $location = isset($tok['location']) ? $tok['location'] : $location_global;
                $token_state = isset($tok['state']) ? (int)$tok['state'] : $token_state_global;
                if ($token_state === null) {
                    $token_state = ($location == $location_global) ? $next_pos++ : 0;
                }
                $key = $this->varsub($tok['key'], array_merge($tok, ['INDEX' => $i]), true);
                $this->createToken($key, $location, $token_state);
                $keys[] = $key;
            }
        }
        return $keys;
    }

    function setTokenState($token_key, $state) {
        self::checkState($state);
        self::checkKey($token_key);
        // SQL UPDATE silently affects zero rows when the key doesn't exist —
        // action_playPlace relies on this (it sets state on a board_x_y key
        // that's never created).
        if (!array_key_exists($token_key, $this->rows)) {
            return;
        }
        $this->rows[$token_key]['state'] = (int)$state;
    }

    function moveToken($token_key, $location, $state = 0) {
        self::checkLocation($location);
        self::checkState($state);
        self::checkKey($token_key);
        if (!array_key_exists($token_key, $this->rows)) {
            $this->rows[$token_key] = ['key' => $token_key, 'location' => $location, 'state' => (int)$state];
            return;
        }
        $this->rows[$token_key]['location'] = $location;
        $this->rows[$token_key]['state'] = (int)$state;
    }

    function getTokenInfo($token_key) {
        self::checkKey($token_key);
        return isset($this->rows[$token_key]) ? $this->rows[$token_key] : null;
    }

    function getAllTokens($order_by = null) {
        return $order_by === null ? $this->rows : array_values($this->rows);
    }

    function getTokensOfTypeInLocation($type, $location = null, $state = null, $order_by = null) {
        if ($type !== null && strpos($type, '%') === false) {
            $type .= '%';
        }
        $matches = [];
        foreach ($this->rows as $key => $rec) {
            if (!self::matchLike($type, $key)) continue;
            if (!self::matchLike($location, $rec['location'])) continue;
            if ($state !== null && (int)$rec['state'] !== (int)$state) continue;
            $matches[$key] = $rec;
        }
        return $order_by === null ? $matches : array_values($matches);
    }

    function countTokensInLocation($location, $state = null) {
        return count($this->getTokensOfTypeInLocation(null, $location, $state));
    }

    function getExtremePosition($getMax, $location) {
        self::checkLocation($location);
        $best = null;
        foreach ($this->rows as $rec) {
            if ($rec['location'] !== $location) continue;
            $s = (int)$rec['state'];
            $best = $best === null ? $s : ($getMax ? max($best, $s) : min($best, $s));
        }
        return $best === null ? 0 : $best;
    }

    private static function matchLike($pattern, $value) {
        if ($pattern === null) return true;
        if ($value === null) return false;
        // Locations are validated as [A-Za-z_0-9-%]+, so no other regex metachars.
        $regex = '/^' . str_replace('%', '.*', $pattern) . '$/i';
        return preg_match($regex, $value) === 1;
    }
}
