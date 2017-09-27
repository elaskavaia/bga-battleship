<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * BattleShip implementation : © Alena Laskavaia <laskava@gmail.com>
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
require_once ('modules/APP_Extended.php');

class BattleShip extends APP_Extended {

    function __construct() {
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();
        self::initGameStateLabels(
                array (
                        "ship_num" => 10, // number of grid covered by ships
                     
                        // game variants
                        "fleet" => 100, 
                        "grid_width" => 101,
            //      ...
        ));
        /*
         * Board data:
         * key: "board_${pnum}_${x}_{y}" location: "board_${pnum}" state: 0/1/2/3
         *     where state 0 - nothing there, 1 - ship there, 2 - hit and miss, 3 - hit and ship
         * Fleet data:
         * key: "fleet_${pnum}_fleetship_${size}_{numindex}" location: "grid_${pnum}_${x}_{y}_${vert}" state: 1/3/7
         *    where state 0 - not placed, 1 - placed, 3 - hit, 7 - sunk, ${vert}: - v - vertical or h - horizontal
         * 
         */
        $this->tokens = new Tokens();
        $this->gameinit = false;
        $this->width = 0;
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
        shuffle($default_colors);
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
        /**
         * ********** Start the game initialization ****
         */
        // Init global values with their initial values
        self::setGameStateInitialValue('ship_num', 18);
        self::setGameStateInitialValue('grid_width', 10); // XXX init from options
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
        $this->initTables();
        // activate
        $this->activeNextPlayer();
        $this->gameinit = false;
    /**
     * ********** End of the game initialization ****
     */
    }

    function initTables() {
            // Create ships
        $option = $this->getGameStateValue('fleet');
        if (! $option)
            $option = 1;
        $shipconfg = $this->fleetconfig[$option];
        $width = $this->getWidth();
        for ($p = 1; $p <= 2; $p ++) {
            foreach ( $shipconfg as $size => $num ) {
                $this->tokens->createTokensPack("fleet_${p}_fleetship_${size}_{INDEX}", "fleet", $num, 1);
            }
            // Board
            for ($x = 1; $x <= $width; $x ++) {
                $this->tokens->createTokensPack("board_${p}_${x}_{INDEX}", "board_${p}", $width, 1);
            }
        }
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
        $fleetall = array ();
        if ($pos) {
            $opos = 3 - $pos;
            $resall = array_merge($resall, $this->tokens->getTokensInLocation("board_${opos}", 3));
            $resall = array_merge($resall, $this->tokens->getTokensInLocation("board_${opos}", 2));
            $resall = array_merge($resall, $this->tokens->getTokensInLocation("board_${pos}"));
            
            $fleetall = array_merge($fleetall, $this->tokens->getTokensOfTypeInLocation("fleet_${pos}"));
            $fleetall = array_merge($fleetall, $this->tokens->getTokensOfTypeInLocation("fleet_${opos}", null, 7));
        } else { // spectator
            $resall = array_merge($resall, $this->tokens->getTokensInLocation("board", 3));
            $resall = array_merge($resall, $this->tokens->getTokensInLocation("board", 2));
            $fleetall = array_merge($fleetall, $this->tokens->getTokensOfTypeInLocation("fleet", null, 7));
        }
        foreach ( $resall as $key => $info ) {
            $board_state [$key] = $info ['state'];
        }
        $result ['board_state'] = $board_state;
        $result ['fleet'] = $fleetall;

        
        
        $result ['fleetconfig'] = $this->getFleetConfig();
     
        
        $result ['width'] = $this->getWidth();
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
        $ship_num = self::getGameStateValue('ship_num');
        $ship_num1 = count($this->tokens->getTokensInLocation("board_1", 3));
        $ship_num2 = count($this->tokens->getTokensInLocation("board_2", 3));
        return ($ship_num1 + $ship_num2) / $ship_num / 2 * 100;
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Utility functions
    ////////////    
    function activeNextPlayerCustom() {
        $player_id = $this->getActivePlayerId();
        if ($player_id == 0) {
            $this->activeNextPlayer();
            return;
        }
        $next_player_id = $this->getPlayerAfter($player_id);
        if ($this->isEndOfGame($next_player_id)) {
            return null; //XXX temp disable the end
        }
        if ($next_player_id == 0) {
            throw new BgaVisibleSystemException("Played id is 0");
        }
        $this->setNextActivePlayerCustom($next_player_id);
        return $next_player_id;
    }

    function isEndOfGame($next_player_id) {
        if (! $next_player_id)
            return false;
        $player_id = $this->getActivePlayerId();
        // check if all ships of this player is destroyed
        //$ship_num = self::getGameStateValue('ship_num');
        $pos = $this->getPlayerPosition($next_player_id);
        $ship_num = count($this->tokens->getTokensInLocation("board_${pos}", 1));
        return $ship_num == 0;
    }

    function isShipSunk($location) {
        $parts = explode('_', $location);
        $opos = $parts [1];
        $x = $parts [2];
        $y = $parts [3];
        //
        $x2 = $x - 1;
        $y2 = $y;
        $location = "board_${opos}_${x2}_${y2}";
        $state = $this->tokens->getTokenState($location);
        if ($state == 1)
            return false;
        //
        $x2 = $x + 1;
        $y2 = $y;
        $location = "board_${opos}_${x2}_${y2}";
        $state = $this->tokens->getTokenState($location);
        if ($state == 1)
            return false;
        //
        $x2 = $x;
        $y2 = $y - 1;
        $location = "board_${opos}_${x2}_${y2}";
        $state = $this->tokens->getTokenState($location);
        if ($state == 1)
            return false;
        //
        $x2 = $x;
        $y2 = $y + 1;
        $location = "board_${opos}_${x2}_${y2}";
        $state = $this->tokens->getTokenState($location);
        if ($state == 1)
            return false;
        return true;
    }

    function getWidth() {
        if (! $this->width)
            $this->width = $this->getGameStateValue('grid_width');
        return $this->width;
    }
    
    function getFleetConfig() {
        $option = $this->getGameStateValue('fleet');
        if (!$option) $option=1;
        
        return $this->fleetconfig[$option];
    }
    
    function getFleetShipNum() {
        $config = $this->getFleetConfig();
        $nums = $config['nums'];
        $sum = 0;
        foreach ($nums as $size => $num) {
            $sum+=$num;
        }        
        return $sum;
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
        // fleetship_3_1_at_grid_0_2_3_v fleetship_1_2_at_grid_0_4_7_h 
        $arr = explode(' ', $ships);
        $this->systemAssertTrue("Invalid payload", count($arr) > 0);
        $ship_num = $this->getFleetShipNum();
        $this->warn("ship num $ship_num");
        $this->userAssertTrue(self::_("Not enough ships placed"), count($arr) == $ship_num);
        foreach ( $arr as $key ) {
            $this->userAssertTrue(self::_("Placement error"), $key !== 'x');
            $parts = explode('_at_', $key);
            $this->systemAssertTrue("Invalid payload", count($parts) == 2);
            $coords = explode('_', $parts [1]);
            $this->systemAssertTrue("Invalid payload", count($coords) == 5);
            $x = $coords [2];
            $y = $coords [3];
            $ship = $parts [0];
            $dpos = "board_${pos}_${x}_${y}";
            $this->tokens->setTokenState($dpos, 1);
        
            $vert= $coords[4];
            $location = "grid_${pos}_${x}_${y}_${vert}";
            $this->tokens->moveToken("fleet_${pos}_$ship", $location, 1);
        }
        $this->notifyWithName('playPlace', clienttranslate('${player_name} placed ships'), array (), $player_id);
        $this->gamestate->setPlayerNonMultiactive($player_id, 'next');
    }

    public function action_playAttack($grid) {
        $this->checkAction('playAttack');
        $this->systemAssertTrue("Invalid payload", $grid != null);
        $gridparts = explode('_', $grid);
        $this->systemAssertTrue("Invalid payload", count($gridparts) == 2);
        $player_id = $this->getActivePlayerId();
        $pos = $this->getPlayerPosition($player_id);
        $opos = 3 - $pos;
        $location = "board_${opos}_$grid";
        $state = $this->tokens->getTokenState($location);
        $hgrid = chr($gridparts [1] + 64) . $gridparts [0];
        if (! $state || $state == 2) {
            // missed
            $state = 2;
            $this->tokens->setTokenState($location, $state); // 2 hit and miss
            $this->notifyWithName('playAttack', clienttranslate('${player_name} fired at ${pos} and missed'), array (
                    'pos' => $hgrid,'grid' => $grid,'state' => $state,'last' => false ));
            $this->incStat(1, 'battle_player_miss', $player_id);
        } else if ($state == 1 || $state == 3) {
            $state = 3;
            $this->tokens->setTokenState($location, $state);
            $sunk = $this->isShipSunk($location);
            if ($sunk)
                $message = clienttranslate('${player_name} fired at ${pos} and hit! ship is sunk!');
            else
                $message = clienttranslate('${player_name} fired at ${pos} and hit!');
            $this->notifyWithName('playAttack', $message, array ('pos' => $hgrid,'grid' => $grid,'state' => $state,
                    'last' => $sunk ));
            $this->dbIncScoreValueAndNotify($player_id, 1, '');
            $this->incStat(1, 'battle_player_score_total', $player_id);
        }
        $this->gamestate->nextState('next');
    }

    public function action_playBot() {
        $width = $this->getWidth();
        $x = rand(1, $width);
        $y = rand(1, $width);
        $this->action_playAttack("${x}_${y}");
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

    //////////// --- Game state actions generated begin ---
    function st_MultiPlayerInit() {
        $this->gamestate->setAllPlayersMultiactive();
    }

    function st_gameTurnNextPlayer() {
        $next_player_id = $this->activeNextPlayerCustom();
        if ($next_player_id == null) {
            // end of game
            $this->notifyWithName('playLog', clienttranslate('${player_name} WINS!!!'));
            $this->gamestate->nextState('last'); // XXX fix
            return;
        }
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

