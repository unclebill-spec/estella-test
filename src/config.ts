import { platformDevicePixelRatio, type UICameraData } from 'esengine';

export const BEST_KEY = 'estella-dodge-best';

export const PLAYER_COLOR = { r: 0.18, g: 0.95, b: 0.88, a: 1 };
export const PLAYER_HIT_COLOR = { r: 1, g: 0.32, b: 0.4, a: 1 };

export const HAZARD_COLORS = [
    { r: 1, g: 0.34, b: 0.42, a: 1 },
    { r: 1, g: 0.74, b: 0.22, a: 1 },
    { r: 0.64, g: 0.46, b: 1, a: 1 },
    { r: 0.4, g: 0.95, b: 0.5, a: 1 },
    { r: 1, g: 0.46, b: 0.82, a: 1 },
];

export interface View {
    left: number;
    right: number;
    bottom: number;
    top: number;
    cx: number;
    cy: number;
    width: number;
    height: number;
}

/** Camera orthoSize is 360, so a 4:3 window is the fallback until the first sync. */
const FALLBACK: View = {
    left: -480, right: 480, bottom: -360, top: 360,
    cx: 0, cy: 0, width: 960, height: 720,
};

export function readView(cam: UICameraData): View {
    if (!cam.valid || cam.worldRight - cam.worldLeft < 8 || cam.worldTop - cam.worldBottom < 8) {
        return FALLBACK;
    }
    const left = cam.worldLeft;
    const right = cam.worldRight;
    const bottom = cam.worldBottom;
    const top = cam.worldTop;
    return {
        left, right, bottom, top,
        cx: (left + right) * 0.5,
        cy: (bottom + top) * 0.5,
        width: right - left,
        height: top - bottom,
    };
}

export function clampDt(delta: number): number {
    if (!Number.isFinite(delta) || delta <= 0) return 0;
    return Math.min(delta, 0.05);
}

export function loadBest(): number {
    try {
        const raw = globalThis.localStorage?.getItem(BEST_KEY);
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
        return 0;
    }
}

export function saveBest(score: number): void {
    try {
        globalThis.localStorage?.setItem(BEST_KEY, String(Math.floor(score)));
    } catch {
        // Private mode and non-browser hosts have no storage. The run still shows best.
    }
}

/**
 * The export page keeps a splash over the canvas while the wasm boots, and
 * systems are already ticking underneath it. Simulation waits until that
 * overlay is fading, so a run cannot end before it is visible.
 */
export function simulationOpen(): boolean {
    try {
        const doc = (globalThis as { document?: Document }).document;
        const el = doc?.getElementById('es-splash');
        if (!el) return true;
        return el.classList.contains('es-splash-gone');
    } catch {
        return true;
    }
}

export interface PointerSample {
    x: number;
    y: number;
}

/**
 * Pointer position in world units while a finger or mouse button is held.
 * `mouseX` / touch positions are CSS pixels from the canvas origin (top-left).
 * `UICameraInfo.screenW` is the same surface in device pixels.
 */
export function heldPointer(
    mouseX: number,
    mouseY: number,
    mouseDown: boolean,
    touchX: number | null,
    touchY: number | null,
    cam: UICameraData,
    view: View,
): PointerSample | null {
    const sx = touchX !== null ? touchX : mouseDown ? mouseX : null;
    const sy = touchY !== null ? touchY : mouseDown ? mouseY : null;
    if (sx === null || sy === null || !cam.valid || cam.screenW <= 0 || cam.screenH <= 0) return null;
    const dpr = platformDevicePixelRatio() || 1;
    const cssW = cam.screenW / dpr;
    const cssH = cam.screenH / dpr;
    if (!(cssW > 0) || !(cssH > 0)) return null;
    return {
        x: view.left + (sx / cssW) * view.width,
        y: view.top - (sy / cssH) * view.height,
    };
}
