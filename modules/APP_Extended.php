<?php

use Bga\GameFramework\UserException;

/**
 * This class contains more useful method which is missing from Table class.
 * To use extend this instead instead of Table, i.e
 *
 <code>
 class BattleShip extends APP_Extended {
 }
 </code>
 *
 */
abstract class APP_Extended extends \Bga\GameFramework\Table {
    protected bool $gameinit;

    function __construct() {
        parent::__construct();
        $this->initGameStateLabels(
                array (
                        "move_nbr" => 6,
                ));
        $this->gameinit = false;
    }
    
    // ------ ERROR HANDLING ----------
    
    /**
     * This will throw an exception if condition is false.
     * The message should be translated and shown to the user.
     *
     * @param $log string
     *            user side log message, translation is needed, use clienttranslate() when passing string to it
     * @throws UserException
     */
    function userAssertTrue(string $message, $cond = false, $log = "") {
        if ($cond)
            return;
            if ($log)
                $this->warn($message . " " . $log);
                throw new UserException($message);
    }
    
    /**
     * This will throw an exception if condition is false.
     * This only can happened if user hacks the game, client must prevent this
     *
     * @param $log string
     *            server side log message, no translation needed
     * @throws UserException
     */
    function systemAssertTrue($log, $cond = false) {
        if ($cond)
            return;
            $move = $this->getGameStateValue('move_nbr');
            //trigger_error("bt") ;
            //$bt = debug_backtrace();
            //$this->dump('bt',$bt);
            $this->error("Internal Error during move $move: $log|");
            //throw new feException($log);
            throw new UserException(clienttranslate("Internal Error. That should not have happened. Please raise a bug. "));
    }
    
    // ------ NOTIFICATIONS ----------
    
    function notifyWithName($type, $message = '', $args = null, $player_id = -1) {
        if ($args == null)
            $args = array ();
            $this->systemAssertTrue("Invalid notification signature", is_array($args));
            if ($player_id == - 1)
                $player_id = $this->getActivePlayerId();
                $args ['player_id'] = $player_id;
                if ($message) {
                    $player_name = $this->getPlayerNameById($player_id);
                    $args ['player_name'] = $player_name;
                }
                if (isset($args ['_private'])) {
                    unset($args ['_private']);
                    $this->notifyPlayer($player_id, $type, $message, $args);
                } else {
                    $this->notifyAllPlayers($type, $message, $args);
                }
    }
    
    // ------ PLAYERS ----------


    /**
     *
     * Change activate player, also increasing turns_number stats and giving extra time
     */
    function setNextActivePlayerCustom($next_player_id) {
        $this->giveExtraTime($next_player_id);
        $this->playerStats->inc('turns_number', 1, (int)$next_player_id);
        $this->tableStats->inc('turns_number', 1);
        $this->gamestate->changeActivePlayer($next_player_id);
    }
    
}



