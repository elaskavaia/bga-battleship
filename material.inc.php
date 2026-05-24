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
 * material.inc.php
 *
 * BattleShip game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *   
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */


$this->fleetconfig = array (
        1 => array(
             "nums"=> array (5 => 1,4 => 1,3 => 1,2 => 2,1 => 2 ),
             "name"=> array(
                     51=>clienttranslate("Aircraft Carrier"),
                     41=>clienttranslate("Battleship"),
                     31=>clienttranslate("Cruiser"),
                     21=>clienttranslate("Destroyer"),
                     22=>clienttranslate("Destroyer"),
                     11=>clienttranslate("Submarine"),
                     12=>clienttranslate("Submarine"),
             )
        ),
        2 => array(
             "nums"=>array (5 => 1,4 => 1,3 => 2,2 => 1,1 => 0 ),
             "name"=> array(
                     51=>clienttranslate("Aircraft Carrier"),
                     41=>clienttranslate("Battleship"),
                     31=>clienttranslate("Cruiser"),
                     32=>clienttranslate("Submarine"),
                     21=>clienttranslate("Destroyer"),
              
             )
        ),
);


