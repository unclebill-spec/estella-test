// Schemas only. The editor reads this module for the component palette, so
// startup and per-frame work live in the systems.
import { defineComponent, defineTag } from 'esengine';

export const HudKind = {
    Score: 0,
    Best: 1,
    Title: 2,
    Hint: 3,
    Banner: 4,
} as const;

export const FrameRole = {
    Backdrop: 0,
    Lane: 1,
    Veil: 2,
    RailL: 3,
    RailR: 4,
} as const;

/** Shared run. One entity. `best` is the persisted high score. */
export const Run = defineComponent('Run', {
    playing: true,
    score: 0,
    best: 0,
    elapsed: 0,
    dodged: 0,
    spawnIn: 0.55,
    lock: 0,
    seeded: 0,
});

/** The puck at the bottom. Extents are half-sizes in world units. */
export const Player = defineComponent('Player', {
    halfW: 56,
    halfH: 22,
});

export const Hazard = defineComponent('Hazard', {
    speed: 160,
    half: 24,
    baseX: 0,
    phase: 0,
    sway: 0,
    /** 1 once this shape has passed the player and been counted. */
    scored: 0,
    spin: 0,
});

export const Star = defineComponent('Star', {
    speed: 28,
    phase: 0,
});

export const Frame = defineComponent('Frame', { role: 0 });
export const Hud = defineComponent('Hud', { kind: 0 });
export const Visor = defineTag('Visor');
