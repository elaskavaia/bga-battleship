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
 * battleship.action.php
 *
 * BattleShip main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/battleship/battleship/myAction.html", ...)
 *
 */
  
  
  class action_battleship extends APP_GameAction
  { 
    // Constructor: please do not modify
   	public function __default()
  	{
  	    if( self::isArg( 'notifwindow') )
  	    {
            $this->view = "common_notifwindow";
  	        $this->viewArgs['table'] = self::getArg( "table", AT_posint, true );
  	    }
  	    else
  	    {
            $this->view = "battleship_battleship";
            self::trace( "Complete reinitialization of board game" );
      }
  	} 
  	
  	// --- generated actions begin ---
  	
  	public function playPlace() {
  	    self::setAjaxMode();
  	    $choices = self::getArg('ships', AT_alphanum, true);
  	    $this->game->action_playPlace( $choices );
  	    self::ajaxResponse( );
  	}
  	
  	public function playAttack() {
  	    self::setAjaxMode();
  	    $card = self::getArg('grid', AT_alphanum, true);
  	    $this->game->action_playAttack( $card );
  	    self::ajaxResponse( );
  	}
  	public function playBot() {
  	    self::setAjaxMode();
  	    $this->game->action_playBot( );
  	    self::ajaxResponse( );
  	}
  	
  	// --- generated actions end ---

  }
  

