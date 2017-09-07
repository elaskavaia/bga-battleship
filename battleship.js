/**
 * ------ BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com> BattleShip
 * implementation : © <Your name here> <Your email address here>
 * 
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com. See
 * http://en.boardgamearena.com/#!doc/Studio for more information. -----
 * 
 * battleship.js
 * 
 * BattleShip user interface script
 * 
 * In this file, you are describing the logic of your user interface, in Javascript language.
 * 
 */

define([ "dojo", "dojo/_base/declare", "ebg/core/gamegui", "ebg/counter" ], function(dojo, declare) {
    return declare("bgagame.battleship", ebg.core.gamegui, {
        constructor : function() {
            console.log('battleship constructor');

            // Here, you can init the global variables of your user interface
            // Example:
            // this.myGlobalValue = 0;

        },

        /*
         * setup:
         * 
         * This method must set up the game user interface according to current game situation specified in parameters.
         * 
         * The method is called each time the game interface is displayed to a player, ie: _ when the game starts _ when a player refreshes
         * the game page (F5)
         * 
         * "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
         */

        setup : function(gamedatas) {
            console.log("Starting game setup");

            // Setting up player boards
            for ( var player_id in gamedatas.players) {
                var player = gamedatas.players[player_id];

                // TODO: Setting up players boards if needed
            }

            // TODO: Set up your game interface here, according to "gamedatas"
            // Connect
            this.connectClass('gridPlacement', 'onclick', 'onGrid');

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            console.log("Ending game setup");
        },

        // /////////////////////////////////////////////////
        // // Game & client states

        // onEnteringState: this method is called each time we are entering into a new game state.
        // You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState : function(stateName, args) {
            console.log('Entering state: ' + stateName);

            switch (stateName) {

                /*
                 * Example:
                 * 
                 * case 'myGameState':
                 *  // Show some HTML block at this game state dojo.style( 'my_html_block_id', 'display', 'block' );
                 * 
                 * break;
                 */

                case 'dummmy':
                    break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        // You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState : function(stateName) {
            console.log('Leaving state: ' + stateName);

            switch (stateName) {

                /*
                 * Example:
                 * 
                 * case 'myGameState':
                 *  // Hide the HTML block we are displaying only during this game state dojo.style( 'my_html_block_id', 'display', 'none' );
                 * 
                 * break;
                 */

                case 'dummmy':
                    break;
            }
        },

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        // action status bar (ie: the HTML links in the status bar).
        //        
        onUpdateActionButtons : function(stateName, args) {
            console.log('onUpdateActionButtons: ' + stateName);

            if (this.isCurrentPlayerActive()) {
                switch (stateName) {
                    case 'playerTurnPlace':
                        this.addActionButton('button_done', _('Done'), 'onDone');
                        break;

                }
            }
            if (this.isCurrentPlayerActive()) {
                if (this.on_client_state && !$('button_cancel')) {
                    this.addActionButton('button_cancel', _('Cancel'), 'onCancel');
                }

            }
        },

        // /////////////////////////////////////////////////
        // // Utility methods

        /*
         * 
         * Here, you can defines some utility methods that you can use everywhere in your javascript script.
         * 
         */

        // /////////////////////////////////////////////////
        // // Player's action
        /*
         * 
         * Here, you are defining methods to handle player's action (ex: results of mouse click on game objects).
         * 
         * Most of the time, these methods: _ check the action is possible at this game state. _ make a call to the game server
         * 
         */

        onGrid : function(event) {
            var id = event.currentTarget.id;
            console.log('onGrid ' + id);
            dojo.stopEvent(event);

            var ss = id.split('_');
            if (ss[1] != '0') {
                this.showMoveUnauthorized();
                return;
            }
            var node = $(id);
            if (dojo.hasClass(node, 'ship')) {
                dojo.removeClass(node, 'ship');
            } else {
                dojo.addClass(node, 'ship');
            }
        },
        
        onDone : function(event) {
            var id = event.currentTarget.id;
            console.log('onDone ' + id);
            dojo.stopEvent(event);
        },
        onCancel : function(event) {
            var id = event.currentTarget.id;
            console.log('onCancel ' + id);
            dojo.stopEvent(event);
        },
        // /////////////////////////////////////////////////
        // // Reaction to cometD notifications

        /*
         * setupNotifications:
         * 
         * In this method, you associate each of your game notifications with your local method to handle it.
         * 
         * Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in your battleship.game.php file.
         * 
         */
        setupNotifications : function() {
            console.log('notifications subscriptions setup');

            // TODO: here, associate your game notifications with local methods

            // Example 1: standard notification handling
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );

            // Example 2: standard notification handling + tell the user interface to wait
            // during 3 seconds after calling the method in order to let the players
            // see what is happening in the game.
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            // this.notifqueue.setSynchronous( 'cardPlayed', 3000 );
            // 
        },

    // TODO: from this point and below, you can write your game notifications handling methods

    /*
     * Example:
     * 
     * notif_cardPlayed: function( notif ) { console.log( 'notif_cardPlayed' ); console.log( notif );
     *  // Note: notif.args contains the arguments specified during you "notifyAllPlayers" / "notifyPlayer" PHP call
     *  // TODO: play the card in the user interface. },
     * 
     */

    });
});
