/**
 * Tiny dojo-API shim. dojo helpers accepted either a node or an id string;
 * these do the same so call sites stay readable.
 */

export type NodeRef = ElementOrId | null;

export function addClass(target: NodeRef, cls: string): void {
  const n = $(target);
  if (n) n.classList.add(cls);
}

export function removeClass(target: NodeRef, cls: string): void {
  const n = $(target);
  if (n) n.classList.remove(cls);
}

export function removeClassAll(selector: string, cls: string, root: ParentNode = document): void {
  root.querySelectorAll(selector).forEach((n) => (n as HTMLElement).classList.remove(cls));
}
