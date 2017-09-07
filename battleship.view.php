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
 * battleship.view.php
 *
 * This is your "view" file.
 *
 * The method "build_page" below is called each time the game interface is displayed to a player, ie:
 * _ when the game starts
 * _ when a player refreshes the game page (F5)
 *
 * "build_page" method allows you to dynamically modify the HTML generated for the game interface. In
 * particular, you can set here the values of variables elements defined in battleship_battleship.tpl (elements
 * like {MY_VARIABLE_ELEMENT}), and insert HTML block elements (also defined in your HTML template file)
 *
 * Note: if the HTML of your game interface is always the same, you don't have to place anything here.
 *
 */
require_once (APP_BASE_PATH . "view/common/game.view.php");

class view_battleship_battleship extends game_view {

    function getGameName() {
        return "battleship";
    }

    function getClass($row, $column) {
        $class = '';
        if ($row === 0 && $column > 0) {
            $class = "cell-number";
        }
        if ($column === 0 && $row > 0) {
            $class = "cell-letter";
        }
        if ($row == 1 && $column > 0) {
            $class .= "cell-first-inside-row";
        }
        if ($column == 1 && $row > 0) {
            $class .= " cell-first-inside-col";
        }
        if ($row == 10 && $column > 0) {
            $class .= " cell-last-inside-row";
        }
        if ($column == 10 && $row > 0) {
            $class .= " cell-last-inside-col";
        }
        if ($column === 0 && $row === 0) {
            $class = "first-cell";
        }
        return $class;
    }

    function cellContent($row, $column) {
        $value = '';
        $letter = array (1 => 'A',2 => 'B',3 => 'C',4 => 'D',5 => 'E',6 => 'F',7 => 'G',8 => 'H',9 => 'I',10 => 'J' );
        if ($row === 0 && $column > 0) {
            $value = $column;
        }
        if ($column === 0 && $row > 0) {
            $value = $letter [$row];
        }
        return $value;
    }

    function build_page($viewArgs) {
        // Get players & players number
        $players = $this->game->loadPlayersBasicInfos();
        $players_nbr = count($players);
        /**
         * ********* Place your code below: ***********
         */
        $letter = array (0 => 'LE',1 => 'A',2 => 'B',3 => 'C',4 => 'D',5 => 'E',6 => 'F',7 => 'G',8 => 'H',9 => 'I',
                10 => 'J' );
        $this->page->begin_block("battleship_battleship", "gridCell");
        $this->page->begin_block("battleship_battleship", "gridRow");
        $this->page->begin_block("battleship_battleship", "grid");
        for ($a = 0; $a < 2; $a ++) {
            $this->page->reset_subblocks('gridRow');
            for ($b = 0; $b < 11; $b ++) {
                $this->page->reset_subblocks('gridCell');
                for ($c = 0; $c < 11; $c ++) {
                    $class = $this->getClass($b, $c);
                    $content = $this->cellContent($b, $c);
                    $this->page->insert_block('gridCell', array ('CELL_CLASS' => $class,'CELL_CONTENT' => $content,
                            'GRID' => 'grid_' . $a,'LETTER' => $letter [$b],'NUMBER' => $c ));
                }
                $this->page->insert_block('gridRow');
            }
            $this->page->insert_block('grid', array ('GRID_CLASS' => 'grid_' . $a ));
        }
        /*
         *
         * // Examples: set the value of some element defined in your tpl file like this: {MY_VARIABLE_ELEMENT}
         *
         * // Display a specific number / string
         * $this->tpl['MY_VARIABLE_ELEMENT'] = $number_to_display;
         *
         * // Display a string to be translated in all languages:
         * $this->tpl['MY_VARIABLE_ELEMENT'] = self::_("A string to be translated");
         *
         * // Display some HTML content of your own:
         * $this->tpl['MY_VARIABLE_ELEMENT'] = self::raw( $some_html_code );
         *
         */

    /**
     * ********* Do not change anything below this line ***********
     */
    }
}


