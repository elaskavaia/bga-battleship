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

            this.gridToFleet = [];
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
            console.log(gamedatas);

            this.gamedatas = gamedatas;

            if (this.isSpectator) {
                this.player_color = 'ffffff';
                this.player_no = 1;
            } else {
                this.player_color = gamedatas.players[this.player_id].color;
                this.player_no = gamedatas.players[this.player_id].no;
            }

            // Setting up player boards
            for ( var player_id in gamedatas.players) {
                var player = gamedatas.players[player_id];

                // TODO: Setting up players boards if needed
            }
            // TODO: Set up your game interface here, according to "gamedatas"
            for ( var loc in gamedatas.board_state) {
                var state = gamedatas.board_state[loc];

                var sloc = loc.split('_');
                var grid = "";
                if (sloc[1] == this.player_no) {
                    // my board
                    grid = this.gridId(0, sloc[2], sloc[3]);
                } else {
                    grid = this.gridId(1, sloc[2], sloc[3]);
                }

                console.log(loc + " " + grid + "->" + state);
                this.changeTokenStateTo(grid, state);

                if (state == 1) {
                    var gpos = this.gridPosition(grid);
                    this.setShipOnGrid(gpos, 's');
                }
            }

            this.markupBoard();
            // Connect
            this.connectClass('gridPlacement', 'onclick', 'onGrid');

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            this.hookBot();

            console.log("Ending game setup");
        },

        hookBot : function() {
            // this.bot = this.player_id >= 2300663 && this.player_id < 2300662 + 9;
            var dnode = $('debug_load3');
            var self = this;
            if (dnode != null) {
                dnode = dojo.create("span", {
                    innerHTML : " • "
                }, dnode, 'after');
                dnode = dojo.create("a", {
                    href : "blank:",
                    onclick : function(event) {
                        dojo.stopEvent(event);
                        self.bot = false;
                        console.log("bot disable");
                    },
                    innerHTML : "Take Over Bot"
                }, dnode, 'after');
                dnode = dojo.create("span", {
                    innerHTML : " • "
                }, dnode, 'after');
                dnode = dojo.create("a", {
                    href : "blank:",
                    onclick : function(event) {
                        dojo.stopEvent(event);
                        self.bot = true;
                        console.log("bot enabled");
                        self.autoBotAction();
                    },
                    innerHTML : "Run Bot"
                }, dnode, 'after');
            }
        },

        autoBotAction : function() {
            if (!this.bot) return;
            if (typeof g_replayFrom != "undefined") {
                console.log("reply on");
                return;
            }

            console.log("bot called " + (this.player_id - 2300662));

            setTimeout(dojo.hitch(this, function() {
                this.ajaxAction('playBot');
            }), 100);
        },

        // /////////////////////////////////////////////////
        // // Game & client states

        // onEnteringState: this method is called each time we are entering into a new game state.
        // You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState : function(stateName, args) {
            console.log('Entering state: ' + stateName);

            if (this.isCurrentPlayerActive()) {
                switch (stateName) {
                    case 'playerTurnAttack':
                        if (this.bot) {
                            this.autoBotAction();
                        }
                        break;
                }
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        // You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState : function(stateName) {
            console.log('Leaving state: ' + stateName);

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

        reconcileShips : function(id) {
            var node = $(id);
            var gpos = this.gridPosition(id);
            var ship = this.getShipOnGrid(gpos);
            // console.log(gpos);
            if (ship) {
                this.setShipOnGrid(gpos, null);

            } else {
                this.setShipOnGrid(gpos, 's');

            }
            this.reconcileBoard();
            this.markupBoard();
        },
        
        findFreeShip1 : function(num) {
            for (var y = 1; y <= 2; y++) {
                for (var x = 1; x <= num; x++) {
                    var name = "fleetship_" + num + "_" + y + "_" + x;
                    if ($(name)) {
                        if (!this.shipToGrid[name]) return name;
                    }
                }
            }
            return null;
        },
        reconcileBoard : function() {
            this.shipToGrid = [];
            var l = 0;
            for (var i = 0; i < 100; i++) {
                var gpos = i;
                if (i % 10 == 0) l = 0;
                var ship = this.getShipOnGrid(gpos);
                if (ship) l++;
                else
                    l = 0;
                for (var j = 0; j < l; j++) {
                    this.setShipOnGrid(gpos - j, l);
                }
            }
            for (var i = 0; i < 100; i++) {
                var y = i % 10;
                var x = Math.floor(i / 10);
                var gpos = y * 10 + x;
                if (i % 10 == 0) l = 0;
                var ship = this.getShipOnGrid(gpos);
                if (ship) l++;
                else
                    l = 0;
                for (var j = 0; j < l; j++) {
                    this.setShipOnGrid(gpos - j * 10, l * 10 + ship % 10);
                }
            }

            for (var i = 0; i < 100; i++) {
                var gpos = i;
                var ship = this.getShipOnGrid(gpos);
                if (ship) {
                    this.setShipOnGrid(gpos, 'x');
                    var l = ship % 10;
                    var lh = Math.floor(ship / 10);
                    if (l == 1) l = lh;
                    else if (lh != 1) continue;

                    var f = this.findFreeShip1(l);
                    if (f != null) {
                        this.shipToGrid[f] = gpos;
                        var diag1 = this.addOffsets(gpos, 1, 1);
                        var diag2 = this.addOffsets(gpos, -1, 1);
                        // console.log("for "+gpos+" "+diag1+"=>"+this.getShipOnGrid(diag1)+" "+diag2+"=>"+this.getShipOnGrid(diag2));
                        if (!this.getShipOnGrid(diag1) && !this.getShipOnGrid(diag2)) {
                            this.setShipOnGrid(gpos, f);
                        }
                    }
                }
            }
        },
        markupBoard : function() {
            dojo.query(".ship").removeClass("ship");
            dojo.query(".error").removeClass("error");
            dojo.query(".used").removeClass("used");
            for (var i = 0; i < 100; i++) {
                var ship = this.getShipOnGrid(i);
                var nid = this.gridId(0, i % 10 + 1, i / 10 + 1);
                if (ship) {
                    dojo.addClass(nid, 'ship');
                    if (ship == 'x') {
                        dojo.addClass(nid, 'error');
                    } else if ($(ship)) {
                        dojo.addClass(ship, 'used');
                    }
                }
            }
        },
        getShipOnGrid : function(gpos) {
            return this.gridToFleet[gpos];
        },

        setShipOnGrid : function(gpos, ship) {
            this.gridToFleet[gpos] = ship;

        },

        gridId : function(own, x, y) {
            var yL = String.fromCharCode(parseInt(y) + 64);
            return "grid_" + own + "_" + yL + "_" + x;
        },
        gridPosition : function(id) {
            var ss = id.split('_');
            var letter = ss[2];
            var y = letter.charCodeAt(0) - 64;
            var x = parseInt(ss[3]);
            return this.gridOffset(x, y);
        },
        gridOffset : function(x, y) {
            return (y - 1) * 10 + (x - 1);
        },

        
        getX_YfromOffset : function(grid) {
            var x = grid % 10 + 1;
            var y = Math.floor(grid / 10) + 1;
            return x+"_"+y;
        },

        addOffsets : function(a, x2, y2) {
            var x1 = a % 10;
            var y1 = Math.floor(a / 10);

            if (x1 + x2 < 0 || x1 + x2 > 9) return -1;
            if (y1 + y2 < 0 || y1 + y2 > 9) return -1;
            return a + y2 * 10 + x2;
        },

        /** More convenient version of ajaxcall, do not to specify game name, and any of the handlers */

        ajaxAction : function(action, args, func, err) {
            // console.log("ajax action " + action);
            if (!args) {
                args = [];
            }
            // console.log(args);
            delete args.action;
            args.lock = true;
            if (typeof func == "undefined" || func == null) {
                func = function(result) {

                };
            }

            if (this.on_client_state) {
                // restore server server if error happened
                if (typeof err == "undefined") {
                    var self = this;
                    err = function(iserr, message) {
                        if (iserr) {
                            console.log('restoring server state, error: ' + message);
                            self.cancelLocalStateEffects();
                        }
                    };
                }
            }
            var name = this.game_name;
            if (this.checkAction(action)) {
                // args.lock = true;
                this.ajaxcall("/" + name + "/" + name + "/" + action + ".html", args,// 
                this, func, err);
            }
        },

        cancelLocalStateEffects : function() {
            if (this.on_client_state) {
                this.clientStateArgs = null;
                this.gamedatas_local = dojo.clone(this.gamedatas);
                if (this.restoreList) {
                    var restoreList = this.restoreList;

                    this.restoreList = [];
                    for (var i = 0; i < restoreList.length; i++) {
                        var token = restoreList[i];

                        var tokenInfo = this.gamedatas.tokens[token];
                        // this.placeTokenWithTips(token, tokenInfo, true);
                    }
                }

            }
            this.restoreServerGameState();
        },

        /**
         * Convenient method to get state name
         */
        getStateName : function() {
            return this.gamedatas.gamestate.name;
        },
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
            if (this.getStateName() == 'playerTurnPlace') {
                if (ss[1] != '0') {
                    this.showMoveUnauthorized();
                    return;
                }
                this.reconcileShips(id)
            } else {
                if (ss[1] != '1') {
                    this.showMoveUnauthorized();
                    return;
                }
                var gpos = this.gridPosition(id);
                var grid = this.getX_YfromOffset(gpos);
                this.ajaxAction('playAttack', {
                    grid : grid
                });
            }

        },

        onDone : function(event) {
            var id = event.currentTarget.id;
            console.log('onDone ' + id);
            dojo.stopEvent(event);
            var choices = "";
            for (var i = 0; i < 100; i++) {
                var gpos = i;
                var ship = this.getShipOnGrid(gpos);
                if (ship) {
       
                    var grid = this.getX_YfromOffset(gpos);
                    choices += " " + ship + "_at_" + grid;
                }

            }
            console.log("sending " + choices);
            this.ajaxAction('playPlace', {
                ships : choices.trim()
            });
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
            dojo.subscribe('playAttack', this, "notif_playAttack");
            dojo.subscribe('score', this, "notif_score");
            // Example 2: standard notification handling + tell the user interface to wait
            // during 3 seconds after calling the method in order to let the players
            // see what is happening in the game.
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            // this.notifqueue.setSynchronous( 'cardPlayed', 3000 );
            // 
        },

        // TODO: from this point and below, you can write your game notifications handling methods

        notif_playAttack : function(notif) {
            console.log('notif_playAttack');
            console.log(notif); // Note: notif.args contains the
            var state = parseInt(notif.args.state);
            var grid = notif.args.grid;
            var sgrid = grid.split("_");
            if (notif.args.player_id == this.player_id) {
                var loc = this.gridId(1, sgrid[0], sgrid[1]);
                this.changeTokenStateTo(loc, state);
            } else {
                var loc = this.gridId(0, sgrid[0], sgrid[1]);
                this.changeTokenStateTo(loc, state);
            }

            // arguments specified during you "notifyAllPlayers" / "notifyPlayer" PHP call // TODO: play the card in the user interface.
        },

        notif_score : function(notif) {
            this.scoreCtrl[notif.args.player_id].setValue(notif.args.player_score);
        },

        changeTokenStateTo : function(token, newState) {
            var node = $(token);
            // console.log(token + "|=>" + newState);
            if (!node) return;
            if (this.on_client_state) {
                if (this.restoreList.indexOf(token) < 0) {
                    this.restoreList.push(token);
                }
            }

            var arr = node.className.split(' ');
            for (var i = 0; i < arr.length; i++) {
                var cl = arr[i];
                if (cl.startsWith("state_")) {
                    dojo.removeClass(token, cl);
                }
            }

            newState = parseInt(newState);
            dojo.addClass(token, "state_" + newState);

        },

    });
});
