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

<div id="board" class="board">
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

	
	
		<div class="fleet-wrap">
			<div id="fleet_title" class="board_title ships_title caption">{FLEET_CAPTION}</div>
			<div id="fleet" class="fleet">
			   	<!-- BEGIN fleetRow -->
				<div class="fleet-row">
					<div class="fleetship_name">{NAME}</div>
					<div id="slot_{ID}" class="fleet-slot">
						<div id="{ID}" class="fleetship {ID} {CLASS} own"></div>
						<div id="o{ID}" class="fleetship {ID} {CLASS} enemy"></div>
					</div>
				</div>
				<!-- END fleetRow -->
			</div>
		</div>


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
