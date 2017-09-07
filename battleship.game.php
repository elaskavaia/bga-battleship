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
        self::initGameStateLabels(array (
            //    "my_first_global_variable" => 10,
            //    "my_second_global_variable" => 11,
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
            //self::setGameStateInitialValue('trigger_player', 0);
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
        $sql = "SELECT player_id id, player_score score FROM player ";
        $result ['players'] = self::getCollectionFromDb($sql);
        // TODO: Gather all information about current game situation (visible by player $current_player_id).
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
    /*
     * In this space, you can put any utility methods useful for your game logic
     */
    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    //////////// 
    /*
     * Each time a player is doing some game action, one of the methods below is called.
     * (note: each method below must match an input method in battleship.action.php)
     */
    
    public function action_playPlace($ships) {
        $this->checkAction('playPlace');
        $player_id = $this->getActivePlayerId();
        $this->notifyAllPlayersWithActive('playPlace', clienttranslate('${player_name} playPlace'), array ());
        $this->gamestate->setPlayerNonMultiactive($player_id, 'next');
    }
    
    public function action_playAttack($grid) {
        $this->checkAction('playAttack');
        $player_id = $this->getActivePlayerId();
        $this->notifyAllPlayersWithActive('playAttack', clienttranslate('${player_name} playAttack'), array ());
        $this->gamestate->nextState('next');
    }
    /*

    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state arguments
    ////////////
    /*
     * Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
     * These methods function is to return some additional information that is specific to the current
     * game state.
     */
    
    function arg_playerTurnPlace(){
        return array();
    }
    
    
    function arg_playerTurnAttack(){
        return array();
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
    
    function activeNextPlayerCustom() {
        $player_id = $this->getActivePlayerId();
        
        $next_player_id = $this->getPlayerAfter($player_id);
        if ($this->isEndOfGame($next_player_id)) {
            return null;
        }
        $this->setNextActivePlayerCustom($next_player_id);
        return $next_player_id;
    }
    
    function isEndOfGame($next_player_id) {
        return false; // XXX
    }
    
    function setNextActivePlayerCustom($next_player_id) {
        $this->giveExtraTime($next_player_id);
        $this->incStat(1, 'turns_number', $next_player_id);
        $this->incStat(1, 'turns_number');
        $this->gamestate->changeActivePlayer($next_player_id);
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
