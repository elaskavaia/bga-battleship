import type { Game } from "./Game";
import { addClass, removeClass, removeClassAll } from "./dom";

export class PlayerTurnAttackState {
  constructor(
    private game: Game,
    private bga: Bga,
  ) {}

  onEnteringState(_args: any, isCurrentPlayerActive: boolean): void {
    console.log("Entering playerTurnAttack");
    addClass("board", "playerTurnAttack");
    removeClassAll(".selected", "selected");
    this.game.attackGrid = null;
    if (isCurrentPlayerActive) {
      const title = document.getElementById("fleet_title");
      if (title) title.innerHTML = _("ENEMY FLEET");
      if (this.game.bot) this.game.autoBotAction();
    }
  }

  onLeavingState(_args: any): void {
    console.log("Leaving playerTurnAttack");
    removeClass("board", "playerTurnAttack");
  }
}
