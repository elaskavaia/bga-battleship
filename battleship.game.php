<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * BattleShip implementation : © <Your name here> <Your email address here>
 * 
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 * 
 * battleship.game.php
 *
 * This is the main file for your game logic.
 *
 * In this PHP file, you are going to defines the rules of the game.
 *
 */
require_once (APP_GAMEMODULE_PATH . 'module/table/table.game.php');
require_once ('modules/tokens.php');

class BattleShip extends Table {

    function __construct() {
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();
        self::initGameStateLabels(array ("ship_num" => 10            //    "my_second_global_variable" => 11,
            //      ...
            //    "my_first_game_variant" => 100,
            //    "my_second_game_variant" => 101,
            //      ...
        ));
        $this->tokens = new Tokens();
        $this->gameinit = false;
    }

    protected function getGameName() {
        // Used for translations and stuff. Please do not modify.
        return "battleship";
    }

    /*
     * setupNewGame:
     *
     * This method is called only once, when a new game is launched.
     * In this method, you must setup the game according to the game rules, so that
     * the game is ready to be played.
     */
    protected function setupNewGame($players, $options = array()) {
        // Set the colors of the players with HTML color code
        // The default below is red/green/blue/orange/brown
        // The number of colors defined here must correspond to the maximum number of players allowed for the gams
        $gameinfos = self::getGameinfos();
        $default_colors = $gameinfos ['player_colors'];
        $this->ordered_colors = $default_colors;
        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
        $sql = "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ";
        $values = array ();
        foreach ( $players as $player_id => $player ) {
            $color = array_shift($default_colors);
            $values [] = "('" . $player_id . "','$color','" . $player ['player_canal'] . "','" . addslashes($player ['player_name']) . "','" . addslashes($player ['player_avatar']) . "')";
        }
        $sql .= implode($values, ',');
        self::DbQuery($sql);
        self::reattributeColorsBasedOnPreferences($players, $gameinfos ['player_colors']);
        self::reloadPlayersBasicInfos();
        $this->gameinit = true;
        try {
            /**
             * ********** Start the game initialization ****
             */
            // Init global values with their initial values
            self::setGameStateInitialValue('ship_num', 18);
            // INIT GAME STATISTIC
            $all_stats = $this->getStatTypes();
            $player_stats = $all_stats ['player'];
            foreach ( $player_stats as $key => $value ) {
                if (startsWith($key, 'battle')) {
                    $this->initStat('player', $key, 0);
                }
            }
            $this->initStat('player', 'turns_number', 0);
            $this->initStat('table', 'turns_number', 0);
            // Setup the initial game situation here
            //$this->initTables();
            $this->activeNextPlayer();
            $this->incStat(1, 'turns_number', $this->getActivePlayerId());
            $this->incStat(1, 'turns_number');
        } catch ( Exception $e ) {
            $this->dump('err', $e);
        }
        $this->gameinit = false;
    /**
     * ********** End of the game initialization ****
     */
    }

    /*
     * getAllDatas:
     *
     * Gather all informations about current game situation (visible by the current player).
     *
     * The method is called each time the game interface is displayed to a player, ie:
     * _ when the game starts
     * _ when a player refreshes the game page (F5)
     */
    protected function getAllDatas() {
        $result = array ();
        $current_player_id = self::getCurrentPlayerId(); // !! We must only return informations visible by this player !!
        // Get information about players
        // Note: you can retrieve some extra field you added for "player" table in "dbmodel.sql" if you need it.
        $sql = "SELECT player_id id, player_score score, player_color color, player_no no FROM player ";
        $result ['players'] = self::getCollectionFromDb($sql);
        // Gather all information about current game situation (visible by player $current_player_id).
        $board_state = array ();
        $pos = $this->getPlayerPosition($current_player_id);
        $resall = array ();
        if ($pos) {
            $opos = 3 - $pos;
            $resall = array_merge($resall, $this->tokens->getTokensInLocation("board_${opos}%", 3));
            $resall = array_merge($resall, $this->tokens->getTokensInLocation("board_${opos}%", 2));
            $resall = array_merge($resall, $this->tokens->getTokensInLocation("board_${pos}%"));
        } else {
            $resall = array_merge($resall, $this->tokens->getTokensInLocation(null, 3));
            $resall = array_merge($resall, $this->tokens->getTokensInLocation(null, 2));
        }
        foreach ( $resall as $key => $info ) {
            $board_state [$key] = $info ['state'];
        }
        $result ['board_state'] = $board_state;
        return $result;
    }

    /*
     * getGameProgression:
     *
     * Compute and return the current game progression.
     * The number returned must be an integer beween 0 (=the game just started) and
     * 100 (= the game is finished or almost finished).
     *
     * This method is called each time we are in a game state with the "updateGameProgression" property set to true
     * (see states.inc.php)
     */
    function getGameProgression() {
        // TODO: compute and return the game progression
        return 0;
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Utility functions
    ////////////    
    public function getNumPlayers() {
        if (! isset($this->players_basic)) {
            $this->players_basic = $this->loadPlayersBasicInfos();
        }
        return count($this->players_basic);
    }

    /**
     *
     * @return int - first player in natural player order
     */
    function getFirstPlayer() {
        $table = $this->getNextPlayerTable();
        return $table [0];
    }

    function getPlayerColor($player_id) {
        if (! isset($this->players_basic)) {
            $this->players_basic = $this->loadPlayersBasicInfos();
        }
        if (! isset($this->players_basic [$player_id])) {
            return 0;
        }
        return $this->players_basic [$player_id] ['player_color'];
    }

    function getPlayerPosition($player_id) {
        if (! isset($this->players_basic)) {
            $this->players_basic = $this->loadPlayersBasicInfos();
        }
        if (! isset($this->players_basic [$player_id])) {
            return 0;
        }
        return $this->players_basic [$player_id] ['player_no'];
    }

    function getPlayerName($player_id) {
        if (! isset($this->players_basic)) {
            $this->players_basic = $this->loadPlayersBasicInfos();
        }
        if (! isset($this->players_basic [$player_id])) {
            return "unknown";
        }
        return $this->players_basic [$player_id] ['player_name'];
    }

    function getPlayerIdByColor($color) {
        if (! isset($this->players_basic)) {
            $this->players_basic = $this->loadPlayersBasicInfos();
        }
        if (! isset($this->player_colors)) {
            $this->player_colors = array ();
            foreach ( $this->players_basic as $player_id => $info ) {
                $this->player_colors [$info ['player_color']] = $player_id;
            }
        }
        if (! isset($this->player_colors [$color])) {
            return 0;
        }
        return $this->player_colors [$color];
    }

    /*
     * In this space, you can put any utility methods useful for your game logic
     */
    function notifyAllPlayersWithActive($type, $message = '', $args = null, $player_id = -1) {
        if ($this->gameinit)
            return;
        if ($args == null)
            $args = array ();
        $this->systemAssertTrue("Invalid notification signature", is_array($args));
        if ($player_id == - 1)
            $player_id = $this->getActivePlayerId();
        $args ['player_id'] = $player_id;
        if ($message) {
            $player_name = $this->getPlayerName($player_id);
            $args ['player_name'] = $player_name;
        }
        if (isset($args ['_private'])) {
            unset($args ['_private']);
            $this->notifyPlayer($player_id, $type, $message, $args);
        } else {
            $this->notifyAllPlayers($type, $message, $args);
        }
    }

    /**
     * This will throw an exception if condition is false.
     * The message should be translated and shown to the user.
     *
     * @param $log string
     *            is
     *            server side log message, no translation needed
     * @throws BgaUserException
     */
    function userAssertTrue($message, $cond = false, $log = "") {
        if ($cond)
            return;
        if ($log)
            $this->warn($message . " " . $log);
        throw new BgaUserException($message);
    }

    function systemAssertTrue($log, $cond = false) {
        if ($cond)
            return;
        $move = $this->getGameStateValue('move_nbr');
        //trigger_error("bt") ;
        //$bt = debug_backtrace();
        //$this->dump('bt',$bt);
        $this->error("Internal Error during move $move: $log|");
        //throw new feException($log);
        throw new BgaUserException(self::_("Internal Error. That should not have happened. Please raise a bug. ") . $log); // TODO remove
    }

    function activeNextPlayerCustom() {
        $player_id = $this->getActivePlayerId();
        $next_player_id = $this->getPlayerAfter($player_id);
        if ($this->isEndOfGame($next_player_id)) {
            $this->notifyAllPlayersWithActive('playAttack', clienttranslate('${player_name} WINS!!!'));
            return null; //XXX temp disable the end
        }
        $this->setNextActivePlayerCustom($next_player_id);
        return $next_player_id;
    }

    function setNextActivePlayerCustom($next_player_id) {
        $this->giveExtraTime($next_player_id);
        $this->incStat(1, 'turns_number', $next_player_id);
        $this->incStat(1, 'turns_number');
        $this->gamestate->changeActivePlayer($next_player_id);
        $this->trace("====> changed active player to $next_player_id |");
    }

    function isEndOfGame($next_player_id) {
        $player_id = $this->getActivePlayerId();
        // check if all ships of this player is destroyed
        //$ship_num = self::getGameStateValue('ship_num');
        $pos = $this->getPlayerPosition($next_player_id);
        $ship_num = count($this->tokens->getTokensInLocation("board_${pos}_%", 1));
        $ship_num += count($this->tokens->getTokensInLocation("board_${pos}_%", 3));
        //$this->warn("ship num $ship_num");
        $score = self::dbGetScoreValue($player_id);
        //$this->warn("score $score");
        return $score >= $ship_num;
    }

    function dbGetScoreValue($player_id) {
        return $this->getUniqueValueFromDB("SELECT player_score FROM player WHERE player_id='$player_id'");
    }

    function dbSetScoreValue($player_id, $count) {
        $this->DbQuery("UPDATE player SET player_score='$count' WHERE player_id='$player_id'");
        $this->setStat($count, 'battle_player_score_total', $player_id);
    }

    function dbIncScoreValueAndNotify($player_id, $inc, $notif = '') {
        $count = $this->dbGetScoreValue($player_id);
        if ($inc != 0) {
            $count += $inc;
            $this->dbSetScoreValue($player_id, $count);
        }
        $this->notifyAllPlayersWithActive("score", $notif, array ('player_score' => $count,'inc' => $inc ), $player_id);
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    //////////// 
    /*
     * Each time a player is doing some game action, one of the methods below is called.
     * (note: each method below must match an input method in battleship.action.php)
     */
    public function action_playPlace($ships) {
        $this->checkAction('playPlace');
        $player_id = $this->getCurrentPlayerId();
        $pos = $this->getPlayerPosition($player_id);
        // ships in form 
        // fleetship_3_1_3_at_2_3 fleetship_1_2_1_at_4_7 fleetship_2_1_1_at_6_3
        $arr = explode(' ', $ships);
        $this->systemAssertTrue("Invalid payload", count($arr) > 0);
        $ship_num = $this->getGameStateValue('ship_num');
        $this->warn("ship num $ship_num");
        $this->userAssertTrue(self::_("Not enough ships placed"), count($arr) == $ship_num);
   
        foreach ( $arr as $key ) {
            $parts = explode('_at_', $key);
            $this->systemAssertTrue("Invalid payload", count($parts) == 2);
            $coords = explode('_', $parts [1]);
            $this->systemAssertTrue("Invalid payload", count($coords) == 2);
            $x = $coords [0];
            $y = $coords [1];
            $ship = $parts [0];
            $dpos = "board_${pos}_${x}_${y}";
            $this->tokens->createToken($dpos, $dpos, 1);
            //$this->tokens->createToken("p_${pos}_$ship", $dpos, 10); // just in case we need it
        }
        $this->notifyAllPlayersWithActive('playPlace', clienttranslate('${player_name} places ships'), array (), $player_id);
        $this->gamestate->setPlayerNonMultiactive($player_id, 'next');
    }

    public function action_playAttack($grid) {
        $this->checkAction('playAttack');
        $player_id = $this->getActivePlayerId();
        $pos = $this->getPlayerPosition($player_id);
        $opos = 3 - $pos;
        $location = "board_${opos}_$grid";
        $state = $this->tokens->getTokenState($location);
        if (! $state) {
            // missed
            $this->tokens->createToken($location, $location, 2); // 2 hit and miss
            $this->notifyAllPlayersWithActive('playAttack', clienttranslate('${player_name} fired at ${pos} and missed'), array (
                    'pos' => $grid,'grid' => $grid,'state' => 2 ));
        } else if ($state == 1) {
            $this->tokens->setTokenState($location, 3);
            $this->notifyAllPlayersWithActive('playAttack', clienttranslate('${player_name} fired at ${pos} and hit!'), array (
                    'pos' => $grid,'grid' => $grid,'state' => 3 ));
            $this->dbIncScoreValueAndNotify($player_id, 1, '');
        } else if ($state == 3) { // should not happened
            $this->tokens->setTokenState($location, 3);
            $this->notifyAllPlayersWithActive('playAttack', clienttranslate('${player_name} fired at ${pos} and hit!'), array (
                    'pos' => $grid,'grid' => $grid,'state' => 3 ));
        } else if ($state == 2) { // should not happened, already missed
            $this->notifyAllPlayersWithActive('playAttack', clienttranslate('${player_name} fired at ${pos} and missed'), array (
                    'pos' => $grid,'grid' => $grid,'state' => 2 ));
        }
        $this->gamestate->nextState('next');
    }

    /*
     *
     * //////////////////////////////////////////////////////////////////////////////
     * //////////// Game state arguments
     * ////////////
     * /*
     * Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
     * These methods function is to return some additional information that is specific to the current
     * game state.
     */
    function arg_playerTurnPlace() {
        return array ();
    }

    function arg_playerTurnAttack() {
        return array ();
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state actions
    ////////////
    /*
     * Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
     * The action method of state X is called everytime the current game state is set to X.
     */
    function st______GAME_STATE_ACTIONS___() {
        return 0;
    }

    //////////// --- Game state actions generated begin ---
    function st_MultiPlayerInit() {
        $this->gamestate->setAllPlayersMultiactive();
    }

    function st_gameTurnNextPlayer() {
        $next_player_id = $this->activeNextPlayerCustom();
        if ($next_player_id == null) {
            // end of game
            $this->gamestate->nextState('last');
            return;
        }
        //self::setGameStateValue('camp_played', 0);
        $this->gamestate->nextState('next');
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Zombie
    ////////////
    /*
     * zombieTurn:
     *
     * This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
     * You can do whatever you want in order to make sure the turn of this player ends appropriately
     * (ex: pass).
     */
    function zombieTurn($state, $active_player) {
        $statename = $state ['name'];
        if ($state ['type'] == "activeplayer") {
            switch ($statename) {
                default :
                    $this->gamestate->nextState("next");
                    break;
            }
            return;
        }
        if ($state ['type'] == "multipleactiveplayer") {
            // Make sure player is in a non blocking status for role turn
            $sql = "
                UPDATE  player
                SET     player_is_multiactive = 0
                WHERE   player_id = $active_player
            ";
            self::DbQuery($sql);
            $this->gamestate->updateMultiactiveOrNextState('next');
            return;
        }
        throw new feException("Zombie mode not supported at this game state: " . $statename);
    }

    ///////////////////////////////////////////////////////////////////////////////////:
    ////////// DB upgrade
    //////////
    /*
     * upgradeTableDb:
     *
     * You don't have to care about this until your game has been published on BGA.
     * Once your game is on BGA, this method is called everytime the system detects a game running with your old
     * Database scheme.
     * In this case, if you change your Database scheme, you just have to apply the needed changes in order to
     * update the game database and allow the game to continue to run with your new version.
     *
     */
    function upgradeTableDb($from_version) {
        // $from_version is the current version of this game database, in numerical form.
        // For example, if the game was running with a release of your game named "140430-1345",
        // $from_version is equal to 1404301345
        // Example:
        //        if( $from_version <= 1404301345 )
        //        {
        //            $sql = "ALTER TABLE xxxxxxx ....";
        //            self::DbQuery( $sql );
        //        }
        //        if( $from_version <= 1405061421 )
        //        {
        //            $sql = "CREATE TABLE xxxxxxx ....";
        //            self::DbQuery( $sql );
        //        }
        //        // Please add your future database scheme changes here
        //
        //
    }
}

function startsWith($haystack, $needle) {
    // search backwards starting from haystack length characters from the end
    return $needle === "" || strrpos($haystack, $needle, - strlen($haystack)) !== false;
}

function getPart($haystack, $i) {
    try {
        $parts = explode('_', $haystack);
        return $parts [$i];
    } catch ( Exception $e ) {
        $this->dump('err', $e);
        return '';
    }
}
