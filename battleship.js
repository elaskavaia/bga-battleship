/**
 * ------ BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com> BattleShip
 * implementation : © Alena Laskavaia <laskava@gmail.com>
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
            this.WIDTH = gamedatas['width'];
            this.shipToGrid = {};

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
                if (sloc[0] == 'board') {
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
                        this.setShipOnGrid(gpos, 'p');
                    }
                } 
            }
            
            for ( var key in gamedatas.fleet) {
                var ship_info = gamedatas.fleet[key];
                // key: "fleet_${pnum}_fleetship_${size}_{numindex}"
                // loc: board_${pnum}_${x}_{y}_${vert}
           
                var loc = ship_info.location;
                console.log(key + "->" + loc + " for "+this.player_no);
                var sloc = loc.split('_');
                var num = parseInt(sloc[1]); 
                if (num == this.player_no) {
                    // my  fleet
                    console.log(key + "-.->" + loc );
                    var gpos = this.gridPosition(loc);
                    var dirid =  sloc[4];
                    var skey = key.split('_');
                    var ship = skey[2]+"_"+skey[3]+"_"+skey[4];
                    this.moveShipOnGrid(ship,gpos,dirid);
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

        placeOrRemoveShip : function(id) {
            var node = $(id);
            var gpos = this.gridPosition(id);
            var ship = this.getShipOnGrid(gpos);
            // console.log(gpos);
            if (ship) {
                if (ship.startsWith('fleetship')) {
                    // whole ship remove
                    this.moveShipOnGrid(ship,null);
                } else if (ship.startsWith('x')) {
                    this.setShipOnGrid(gpos, null);
                } else {
                    this.completeShip(gpos);
                    ship = this.getShipOnGrid(gpos);
                    if (ship == 's') {
                        this.setShipOnGrid(gpos, 'x');
                    }
                }
               

            } else {
                this.setShipOnGrid(gpos, 's');

            }
            //this.reconcileBoard();
            this.markupBoard();
        },
        
        completeShip : function(gpos) {
            var vector = this.getShipPosDir(gpos);
            var size = vector.len;
            var f = this.findFreeShip1(size);
            if (f == null) {
                for (var i = 0; i < vector.len; i++) {
                    var spos = vector.gpos + i * vector.dir;
                    this.setShipOnGrid(spos, 'x');
                }
                return;
            }
           
            this.moveShipOnGrid(f,vector.gpos, vector.dirid);
        }, 
        


        getShipPosDir : function(gpos) {
            var xpos = this.getStart(gpos, -1);
            var ypos = this.getStart(gpos, -1 * this.WIDTH);
            var xpos2 = this.getStart(xpos, 1);
            var ypos2 = this.getStart(ypos, this.WIDTH);
            var xlen = xpos2 - xpos + 1;
            var ylen = (ypos2 - ypos) / this.WIDTH + 1;
            if (xpos < ypos || xlen >= ylen) {
                return {
                    gpos : xpos,
                    dir : 1,
                    len : xlen,
                    dirid: "h",
                }
            } else {
                return {
                    gpos : ypos,
                    dir : this.WIDTH,
                    len : ylen,
                    dirid: "v",
                }
            }
        }, 
        
        getStart : function(gpos, offset) {
            var last = gpos;
            var spos;
            for (var i = 0; i < 5; i++) {
                spos = gpos + offset * i;
                if (spos<0) break;
                if (spos>=this.WIDTH*this.WIDTH) break;
                var ship = this.getShipOnGrid(spos);
                if (ship == 's' || ship == 'x') last = spos;
                else break;
                var x = spos % this.WIDTH;
                if (offset == -1 && x == 0) break;
                if (offset == 1 && x == this.WIDTH - 1) break;
            }
            return last;
        },
        
        findFreeShip1 : function(num) {
            var res = dojo.query(".fleet .fleetship_"+num);
            if (res.length>0) return res[0].id;
            return null;
        },
      
        markupBoard : function() {
            dojo.query(".ship").removeClass("ship");
            dojo.query(".error").removeClass("error");
            dojo.query(".used").removeClass("used");
            for (var i = 0; i < this.WIDTH * this.WIDTH; i++) {
                var ship = this.getShipOnGrid(i);
                var nid = this.gridId(0, i % this.WIDTH + 1, i / this.WIDTH + 1);
                if ($(nid))
                    ;//
                else
                    console.error("Unknown grid "+nid);
                if (ship) {
                    dojo.addClass(nid, 'ship');
                    dojo.removeClass(nid, 'preship');
                    if (ship.startsWith('x')) {
                        dojo.addClass(nid, 'error');
                       
                    } else if ($(ship)) {
                        dojo.addClass('slot_'+ship, 'used');
                       
                        
                    } else if (ship == 's') {
                        dojo.addClass(nid, 'preship');
                    }
                }
            }
        },
        getShipOnGrid : function(gpos) {
            var mark = this.gridToFleet[gpos];
            var gpos = this.shipToGrid[mark];
            if ($(mark) && gpos) return this.gridToFleet[gpos];
            return mark;
        },

        moveShipOnGrid : function(ship, gpos, dirid) {
            if (!dirid) dirid='h';
            
            var inc = 1;
            if (dirid == 'v') inc = this.WIDTH;
            var size = getIntPart(ship, 1);
            dojo.removeClass(ship, 'ship_h');
            dojo.removeClass(ship, 'ship_v');
            console.log(ship + "-move->" + gpos +" "+dirid);
            if (gpos == null) { // remove
                gpos = this.shipToGrid[ship];
                if (gpos != null) {
                    this.slideToObjectRelative(ship, 'slot_'+ship, 500); // fleet
                }

                this.shipToGrid[ship] = null;
                for (var x = 0; x < size; x++) {
                    var spos = gpos + x * inc;
                    this.gridToFleet[spos] = null;
                }
            } else { // add
                dojo.addClass(ship, 'ship_' + dirid);

                this.shipToGrid[ship] = gpos;
                this.slideToObjectRelative(ship, 'grid_0_' + this.getX_YfromOffset(gpos), 500);

                for (var x = 0; x < size; x++) {
                    var spos = gpos + x * inc;
                    this.gridToFleet[spos] = ship;
                }
            }
        },
        
        setShipOnGrid : function(gpos, ship) {
            this.gridToFleet[gpos] = ship;
       
        },

        gridId : function(own, x, y) {
            y = parseInt(y);
            return "grid_" + own + "_" + x + "_" + y;
        },
        gridPosition : function(id) {
            var ss = id.split('_');
            var x = parseInt(ss[2]);
            var y = parseInt(ss[3]);
            return this.gridOffset(x, y);
        },
        gridOffset : function(x, y) {
            return ( parseInt(y) - 1) * this.WIDTH + ( parseInt(x) - 1);
        },

        
        getX_YfromOffset : function(grid) {
            var x = grid % this.WIDTH + 1;
            var y = Math.floor(grid / this.WIDTH) + 1;
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
        
        /**
         * This method will remove all inline style added to element that affect positioning
         */
        stripPosition : function(token) {
            // console.log(token + " STRIPPING");
            // remove any added positioning style
            dojo.style(token, "display", "");
            dojo.style(token, "top", "");
            dojo.style(token, "left", "");
            dojo.style(token, "position", "");
            // dojo.style(token, "transform", null);
        },
        stripTransition : function(token) {
            this.setTransition(token, "");

        },
        setTransition : function(token, value) {
            dojo.style(token, "transition", value);
            dojo.style(token, "-webkit-transition", value);
            dojo.style(token, "-moz-transition", value);
            dojo.style(token, "-o-transition", value);

        },
        /**
         * This method will attach mobile to a new_parent without destroying, unlike original attachToNewParent which destroys mobile and
         * all its connectors (onClick, etc)
         */

        attachToNewParentNoDestroy : function(mobile, new_parent) {
            if (mobile === null) {
                console.error("attachToNewParent: mobile obj is null");
                return;
            }
            if (new_parent === null) {
                console.error("attachToNewParent: new_parent is null");
                return;
            }
            if (typeof mobile == "string") {
                mobile = $(mobile);
            }
            if (typeof new_parent == "string") {
                new_parent = $(new_parent);
            }

            var src = dojo.position(mobile);
            dojo.style(mobile, "position", "absolute");
            dojo.place(mobile, new_parent, "last");
            var tgt = dojo.position(mobile);
            var box = dojo.marginBox(mobile);
            var cbox = dojo.contentBox(mobile);

            var left = box.l + src.x - tgt.x;
            var top = box.t + src.y - tgt.y;
            dojo.style(mobile, "top", top + "px");
            dojo.style(mobile, "left", left + "px");
            box.l += box.w - cbox.w;
            box.t += box.h - cbox.h;
            return box;
        },

        /**
         * This method is similar to slideToObject but works on object which do not use inline style positioning. It also attaches object to
         * new parent immediately, so parent is correct during animation
         */
        slideToObjectRelative : function(token, finalPlace, duration, delay, onEnd) {
            if (typeof token == 'string') {
                token = $(token);
            }

            var self = this;
            this.delayedExec(function() {
                self.stripTransition(token);
                self.stripPosition(token);
                var box = self.attachToNewParentNoDestroy(token, finalPlace);
                self.setTransition(token, "all " + duration + "ms ease-in-out");
                self.placeOnObjectDirect(token, finalPlace, box.l, box.t);

            }, function() {
                self.stripTransition(token);
                self.stripPosition(token);
                if (onEnd) onEnd(token);
            }, duration, delay);
        },

        slideToObjectAbsolute : function(token, finalPlace, x, y, duration, delay, onEnd) {
            if (typeof token == 'string') {
                token = $(token);
            }
            var self = this;
            this.delayedExec(function() {
                self.stripTransition(token);
                var box = self.attachToNewParentNoDestroy(token, finalPlace);
                self.setTransition(token, "all " + duration + "ms ease-in-out");
                self.placeOnObjectDirect(token, finalPlace, x, y);
            }, function() {
                self.stripTransition(token);
                if (onEnd) onEnd(token);
            }, duration, delay);
        },

        placeOnObjectDirect : function(mobileObj, targetObj, x, y) {
            var left = dojo.style(mobileObj, "left");
            var top = dojo.style(mobileObj, "top");
            dojo.style(mobileObj, "left", x + "px");
            dojo.style(mobileObj, "top", y + "px");
        },

        delayedExec : function(onStart, onEnd, duration, delay) {
            if (typeof duration == "undefined") {
                duration = 500;
            }
            if (typeof delay == "undefined") {
                delay = 0;
            }
            if (this.instantaneousMode) {
                delay = Math.min(1, delay);
                duration = Math.min(1, duration);
            }
            if (delay) {
                setTimeout(function() {
                    onStart();
                    if (onEnd) {
                        setTimeout(onEnd, duration);
                    }
                }, delay);
            } else {
                onStart();
                if (onEnd) {
                    setTimeout(onEnd, duration);
                }
            }

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
                    this.showMessage(_('This is not your board!'), 'error');
                    return;
                }
                this.placeOrRemoveShip(id)
            } else {
                if (ss[1] != '1') {
                    this.showMessage(_('This is your own board silly!'), 'error');
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
            var res = dojo.query(".grid .fleetship");
            for ( var i=0;i<res.length;i++) {
                var node = res[i];
                if (!node) continue;
                var grid = node.parentNode.id;
                var dirid = 'h';
                var ship = node.id;
                if (dojo.hasClass(node,'ship_v')) dirid='v';
                choices += " " + ship + "_at_" + grid + "_" + dirid;
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
            this.notifqueue.setSynchronous( 'playAttack', 700 );
            // 
        },


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

function getPart(word, i) {
    var arr = word.split('_');
    return arr[i];
};

function getIntPart(word, i) {
    var arr = word.split('_');
    return parseInt(arr[i]);
};
