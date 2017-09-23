{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- BattleShip implementation : © Alena Laskavaia <laskava@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------

    battleship_battleship.tpl
    
    This is the HTML template of your game.
    
    Everything you are writing in this file will be displayed in the HTML page of your game user interface,
    in the "main game zone" of the screen.
    
    You can use in this template:
    _ variables, with the format {MY_VARIABLE_ELEMENT}.
    _ HTML block, with the BEGIN/END format
    
    See your "view" PHP file to check how to set variables and control blocks
    
    Please REMOVE this comment before publishing your game on BGA
-->


<div class="board">
	<div class="background-grids">


		<!-- BEGIN grid -->
		<div class="{GRID_CLASS} grid">
			<div id="{GRID_CLASS}_ships_title"
				class="board_title {GRID_CLASS}_ships_title caption">{GRID_CAPTION}</div>
			<div class="grid-body">
				<!-- BEGIN gridRow -->
				
					<!-- BEGIN gridCell -->
					<div  id='{GRID}_{LETTER}_{NUMBER}' class="{CELL_CLASS} table-cell gridPlacement" style="top: {TOP}px; left: {LEFT}px;">{CELL_CONTENT}</div>
					<!-- END gridCell -->
				
				<!-- END gridRow -->
			</div>
		</div>
		<!-- END grid -->


		<table class="fleet">
			<caption id="fleet_title" class="board_title ships_title">{FLEET_CAPTION}</caption>
			<tbody>
				<tr class="fleet_5">
					<td>1x</td>
					<td class="fleetship_name">Aicraft Carrier</td>
					<td><div id="fleetship_5_1_1" class="fleetship"></div></td>
					<td><div id="fleetship_5_1_2" class="fleetship"></div></td>
					<td><div id="fleetship_5_1_3" class="fleetship"></div></td>
					<td><div id="fleetship_5_1_4" class="fleetship"></div></td>
					<td><div id="fleetship_5_1_5" class="fleetship"></div></td>
				</tr>
				<tr class="fleet_4">
					<td>1x</td>
					<td class="fleetship_name">Battleship</td>
					<td><div id="fleetship_4_1_1" class="fleetship"></div></td>
					<td><div id="fleetship_4_1_2" class="fleetship"></div></td>
					<td><div id="fleetship_4_1_3" class="fleetship"></div></td>
					<td><div id="fleetship_4_1_4" class="fleetship"></div></td>
			
					<td></td>
				</tr>
				<tr class="fleet_3">
					<td>1x</td>
					<td class="fleetship_name">Cruiser</td>
					<td><div id="fleetship_3_1_1" class="fleetship"></div></td>
					<td><div id="fleetship_3_1_2" class="fleetship"></div></td>
					<td><div id="fleetship_3_1_3" class="fleetship"></div></td>
					<td></td>
					<td></td>
				</tr>
				<tr class="fleet_2">
					<td>2x</td>
					<td class="fleetship_name">Destroyer</td>
					<td><div id="fleetship_2_1_1" class="fleetship"></div></td>
					<td><div id="fleetship_2_1_2" class="fleetship"></div></td>
					<td></td>
					<td><div id="fleetship_2_2_1" class="fleetship"></div></td>
					<td><div id="fleetship_2_2_2" class="fleetship"></div></td>
				</tr>
				<tr class="fleet_1">
					<td>2x</td>
					<td class="fleetship_name">Submarine</td>
					<td><div id="fleetship_1_1_1" class="fleetship"></div></td>
					<td></td>
					<td><div id="fleetship_1_2_1" class="fleetship"></div></td>
					<td></td>
					<td></td>
				</tr>
			</tbody>
		</table>


	</div>
</div>


<script type="text/javascript">
    // Javascript HTML templates

    /*
     // Example:
     var jstpl_some_game_item='<div class="my_game_item" id="my_game_item_${id}"></div>';

     */
</script>

{OVERALL_GAME_FOOTER}
