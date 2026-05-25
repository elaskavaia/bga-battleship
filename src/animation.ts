/**
 * Sliding-element animation helpers. Ported 1:1 from the legacy
 * slideToObjectRelative/Absolute (which were the BGA dojo-era helpers).
 * Keeping behavior identical so we don't introduce visual regressions
 * during the framework migration.
 */

function setTransition(node: HTMLElement, value: string): void {
  node.style.transition = value;
}

function stripTransition(node: HTMLElement): void {
  setTransition(node, "");
}

function stripPosition(node: HTMLElement): void {
  node.style.display = "";
  node.style.top = "";
  node.style.left = "";
  node.style.position = "";
}

function placeOnObjectDirect(mobile: HTMLElement, x: number, y: number): void {
  mobile.style.left = `${x}px`;
  mobile.style.top = `${y}px`;
}

/** dojo.position parity: page-coords + size. Suitable for absolute placement math. */
export function pagePosition(target: ElementOrId): { x: number; y: number; w: number; h: number } {
  const n = $(target);
  if (!n) return { x: 0, y: 0, w: 0, h: 0 };
  const r = n.getBoundingClientRect();
  return {
    x: r.left + window.scrollX,
    y: r.top + window.scrollY,
    w: r.width,
    h: r.height,
  };
}

/**
 * Attach `mobile` to `newParent` without destroying event handlers, keeping
 * its current visual position via absolute positioning. Returns the
 * margin-box of the moved node (for the caller to read l/t/w/h).
 */
export function attachToNewParentNoDestroy(mobile: HTMLElement, newParent: HTMLElement): { l: number; t: number; w: number; h: number } {
  const src = pagePosition(mobile);
  mobile.style.position = "absolute";
  newParent.appendChild(mobile);
  const tgt = pagePosition(mobile);
  // Modern boxes: marginBox ≈ contentBox for our use; we only need l/t/w/h.
  const box = { l: 0, t: 0, w: tgt.w, h: tgt.h };
  const left = box.l + src.x - tgt.x;
  const top = box.t + src.y - tgt.y;
  mobile.style.left = `${left}px`;
  mobile.style.top = `${top}px`;
  return box;
}

function delayedExec(onStart: () => void, onEnd: (() => void) | null, duration: number, delay: number, instant: boolean): void {
  if (instant) {
    delay = Math.min(1, delay);
    duration = Math.min(1, duration);
  }
  const run = () => {
    onStart();
    if (onEnd) setTimeout(onEnd, duration);
  };
  if (delay) setTimeout(run, delay);
  else run();
}

export interface SlideOptions {
  duration?: number;
  delay?: number;
  instant?: boolean;
  onEnd?: (token: HTMLElement) => void;
}

/**
 * Slide a token so it ends up centered on `finalPlace`. Works on elements
 * that don't use inline positioning; reparents before the animation so
 * later position math uses the new parent.
 */
export function slideToObjectRelative(token: string | HTMLElement, finalPlace: string | HTMLElement, opts: SlideOptions = {}): void {
  const node = typeof token === "string" ? $(token) : token;
  const target = typeof finalPlace === "string" ? $(finalPlace) : finalPlace;
  if (!node || !target) return;

  const duration = opts.duration ?? 500;
  const delay = opts.delay ?? 0;

  delayedExec(
    () => {
      stripTransition(node);
      stripPosition(node);
      const box = attachToNewParentNoDestroy(node, target);
      setTransition(node, `all ${duration}ms ease-in-out`);
      placeOnObjectDirect(node, box.l, box.t);
    },
    () => {
      stripTransition(node);
      stripPosition(node);
      opts.onEnd?.(node);
    },
    duration,
    delay,
    opts.instant ?? false,
  );
}

export function slideToObjectAbsolute(
  token: string | HTMLElement,
  finalPlace: string | HTMLElement,
  x: number,
  y: number,
  opts: SlideOptions = {},
): void {
  const node = typeof token === "string" ? $(token) : token;
  const target = typeof finalPlace === "string" ? $(finalPlace) : finalPlace;
  if (!node || !target) return;

  const duration = opts.duration ?? 500;
  const delay = opts.delay ?? 0;

  delayedExec(
    () => {
      stripTransition(node);
      attachToNewParentNoDestroy(node, target);
      setTransition(node, `all ${duration}ms ease-in-out`);
      placeOnObjectDirect(node, x, y);
    },
    () => {
      stripTransition(node);
      opts.onEnd?.(node);
    },
    duration,
    delay,
    opts.instant ?? false,
  );
}
