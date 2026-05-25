import { expect } from "chai";
import { Game } from "../Game";

const bgaStub: any = {
  gameArea: { getElement: () => document.createElement("div") },
  statusBar: { addActionButton: () => {}, removeActionButtons: () => {} },
  actions: { performAction: () => {} },
  notifications: { setupPromiseNotifications: () => {} },
  players: { isCurrentPlayerSpectator: () => false },
  states: { register: () => {} },
};

describe("Game", () => {
  it("constructs without throwing and registers state classes", () => {
    let registered: string[] = [];
    const bga = { ...bgaStub, states: { register: (name: string) => registered.push(name) } };
    const game = new Game(bga);
    expect(game).to.be.instanceOf(Game);
    expect(registered).to.include.members(["playerTurnPlace", "playerTurnAttack"]);
  });
});
