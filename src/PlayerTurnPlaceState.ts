import type { Game } from "./Game";
import { addClass, removeClass, removeClassAll } from "./dom";

export class PlayerTurnPlaceState {
  constructor(
    private game: Game,
    private bga: Bga,
  ) {}

  onEnteringState(_args: any, isCurrentPlayerActive: boolean): void {
    console.log("Entering playerTurnPlace");
    addClass("board", "playerTurnPlace");
    removeClassAll(".selected", "selected");
    if (isCurrentPlayerActive) {
      this.addButtons();
    }
  }

  onLeavingState(_args: any): void {
    console.log("Leaving playerTurnPlace");
    removeClass("board", "playerTurnPlace");
  }

  onPlayerActivationChange(_args: any, isCurrentPlayerActive: boolean): void {
    this.bga.statusBar.removeActionButtons();
    if (isCurrentPlayerActive) this.addButtons();
  }

  private addButtons(): void {
    this.bga.statusBar.addActionButton(_("Done"), () => this.game.onDone(), { id: "button_done" });
    this.bga.statusBar.addActionButton(_("Feeling Lazy"), () => this.game.placeAllShipsRandomly(), {
      id: "button_lazy",
      color: "secondary",
    });
    this.bga.statusBar.addActionButton(_("Reset"), () => this.game.onCancel(), {
      id: "button_cancel",
      color: "alert",
    });
  }
}
