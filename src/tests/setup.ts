/**
 * Test setup: stub BGA framework globals so source files can be imported.
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='ebd-body'></div></body></html>");

(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).Element = dom.window.Element;

(global as any).$ = function $(id: any): any {
  if (typeof id === "string") return dom.window.document.getElementById(id);
  return id;
};

(global as any)._ = function _(str: string) {
  return str;
};

(global as any).gameui = {
  player_id: 1,
  on_client_state: false,
  format_string_recursive: (log: string, _args: any) => log,
  isCurrentPlayerActive: () => false,
  showMessage: () => {},
  showBubble: () => {},
};

(global as any).ebg = {
  core: { gamegui: {} },
  counter: class {},
};

(global as any).define = function () {};
