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
            this.gridDiagOffsets = [ {
                x : -1,
                y : -1
            }, {
                x : -1,
                y : 1
            }, {
                x : 1,
                y : -1
            }, {
                x : 1,
                y : 1
            } ];
            this.gridOffsets = [ {
                x : 0,
                y : -1
            }, {
                x : 0,
                y : 1
            }, {
                x : -1,
                y : 0
            }, {
                x : 1,
                y : 0
            } ];
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

            // Setting up player boards
            for ( var player_id in gamedatas.players) {
                var player = gamedatas.players[player_id];

                // TODO: Setting up players boards if needed
            }

            // TODO: Set up your game interface here, according to "gamedatas"
            this.markupBoard();
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
                 * case 'myGameState': // Show some HTML block at this game state dojo.style( 'my_html_block_id', 'display', 'block' );
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
                 * case 'myGameState': // Hide the HTML block we are displaying only during this game state dojo.style( 'my_html_block_id',
                 * 'display', 'none' );
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
        reconcileShips : function(id) {
            var node = $(id);
            var gpos = this.gridPosition(id);
            var ship = this.getShipOnGrid(gpos);
            //console.log(gpos);
            if (ship) {
                this.setShipOnGrid(gpos, null);
               
                var nei = this.gridNei(gpos, this.gridDiagOffsets);
                var neires = nei.res.concat(this.gridNei(gpos, this.gridOffsets).res);
                for ( var i in neires) {
                    var npos = neires[i];
                    if (!npos) continue;
                    this.placeShip(npos);
                }
            } else {
                this.placeShip(gpos);

            }
            this.markupBoard();
        },
        placeShip : function(gpos) {
            console.log("place on "+gpos.x+" "+gpos.y);
            this.setShipOnGrid(gpos, 'x');
            var nei = this.gridNei(gpos, this.gridDiagOffsets);
            if (nei.count > 0) {
                // error move
            } else {
                nei = this.gridNei(gpos, this.gridOffsets);
                console.log(nei);

                if (nei.vcount * nei.hcount > 0) {
                    // non straight, error
                } else {
                    var l = 1;

                    var toppos = {
                        x : gpos.x,
                        y : gpos.y
                    };

                    if (nei.vcount > 0) {
                        var y = gpos.y - 1;
                        for (var i = 0; i < 10; i++) {
                            y = gpos.y - 1 - i;
                            var ship = this.getShipOnGrid({
                                x : gpos.x,
                                y : y
                            });
                            if (ship == null) break;
                        }
                        y++;
                        toppos.y = y;
                        l = gpos.y - y + nei.vcount;
                    } else if (nei.hcount > 0) {
                        var x = gpos.x - 1;
                        for (var i = 0; i < 10; i++) {
                            x = gpos.x - 1 - i;
                            var ship = this.getShipOnGrid({
                                x : x,
                                y : gpos.y
                            });
                            if (ship == null) break;
                        }
                        x++;
                        toppos.x = x;
                        l = gpos.x - x + nei.hcount;
                    }

                    var shipa = this.findFreeShip(l);
                    console.log(shipa);
                    if (shipa != null) {
                        if (nei.count == 0) {
                            this.setShipOnGrid(gpos, shipa[0]);
                        }
                        if (nei.vcount > 0) {
                            var y = toppos.y;
                            for ( var j in shipa) {
                                var ngrid = {
                                    x : gpos.x,
                                    y : y
                                };
                                y++;
                                this.setShipOnGrid(ngrid, shipa[j]);
                            }
                        }
                        if (nei.hcount > 0) {
                            var x = toppos.x;
                            for ( var j in shipa) {
                                var ngrid = {
                                    x : x,
                                    y : gpos.y
                                };
                                x++;
                                this.setShipOnGrid(ngrid, shipa[j]);
                            }
                        }
                    }
                }

            }
        },
        findFreeShip : function(num) {
            var shipToGrid = {};
            for (var x = 1; x <= 10; x++) {
                for (var y = 1; y <= 10; y++) {
                    var gpos = {
                        x : x,
                        y : y
                    };
                    var ship = this.getShipOnGrid(gpos);
                    if (ship) {
                        shipToGrid[ship] = gpos;
                    }
                }
            }
            for (var y = 1; y <= 2; y++) {
                var res = [];
                for (var x = 1; x <= num; x++) {
                    var name = "fleetship_" + num + "_" + y + "_" + x;
                    if ($(name)) {
                        if (!shipToGrid[name]) res.push(name);
                    }
                }
                if (res.length == num) return res;
            }
            return null;
        },
        markupBoard : function() {
            dojo.query(".ship").removeClass("ship");
            dojo.query(".error").removeClass("error");
            dojo.query(".used").removeClass("used");
            for (var x = 1; x <= 10; x++) {
                for (var y = 1; y <= 10; y++) {
                    var gpos = {
                        x : x,
                        y : y
                    };
                    var ship = this.getShipOnGrid(gpos);
                    if (ship) {
                        var nid = this.gridId(0, gpos.x, gpos.y);
                        dojo.addClass(nid, 'ship');
                        if (ship == 'x') {
                            dojo.addClass(nid, 'error');
                        } else {
                            dojo.addClass(ship, 'used');
                        }
                    }
                }
            }
        },
        getShipOnGrid : function(gpos) {
            if (!this.gridToFleet[gpos.x]) {
                this.gridToFleet[gpos.x] = [];
            }
            if (this.gridToFleet[gpos.x][gpos.y]) return this.gridToFleet[gpos.x][gpos.y];
            this.gridToFleet[gpos.x][gpos.y] = null;
            return null;
        },

        setShipOnGrid : function(gpos, ship) {
            this.gridToFleet[gpos.x][gpos.y] = ship;

        },
        gridNei : function(gpos, offsets) {
            var res = [];
            var count = 0;
            var vcount = 0;
            for ( var i in offsets) {
                var opos = offsets[i];
                var npos = {
                    x : gpos.x + opos.x,
                    y : gpos.y + opos.y
                }
                var ship = this.getShipOnGrid(npos);

                if (ship) {
                    res[i] = npos;
                    count++;
                    if (i < 2) vcount++;

                } else {
                    res[i] = null;
                }
            }
            return {
                res : res,
                count : count,
                vcount : vcount,
                hcount : count - vcount
            };
        },
        gridId : function(own, x, y) {
            var yL = String.fromCharCode(y + 64);
            return "grid_" + own + "_" + yL + "_" + x;
        },
        gridPosition : function(id) {
            var ss = id.split('_');
            var letter = ss[2];
            var y = letter.charCodeAt(0) - 64;
            var x = parseInt(ss[3]);
            return {
                x : x,
                y : y
            };
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
                        //this.placeTokenWithTips(token, tokenInfo, true);
                    }
                }

            }
            this.restoreServerGameState();
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
            if (ss[1] != '0') {
                this.showMoveUnauthorized();
                return;
            }
            this.reconcileShips(id);
        },

        onDone : function(event) {
            var id = event.currentTarget.id;
            console.log('onDone ' + id);
            dojo.stopEvent(event);
            var choices = "";
            for (var x = 1; x <= 10; x++) {
                for (var y = 1; y <= 10; y++) {
                    var gpos = {
                        x : x,
                        y : y
                    };
                    var ship = this.getShipOnGrid(gpos);
                    if (ship) {
                        choices+=" "+ship+"_at_"+gpos.x+"_"+gpos.y;
                    }
                }
            }
            console.log("sending "+choices);
            this.ajaxAction('playPlace', { ships: choices.trim() });
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
     * notif_cardPlayed: function( notif ) { console.log( 'notif_cardPlayed' ); console.log( notif ); // Note: notif.args contains the
     * arguments specified during you "notifyAllPlayers" / "notifyPlayer" PHP call // TODO: play the card in the user interface. },
     * 
     */

    });
});
