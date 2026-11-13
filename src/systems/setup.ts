import {
    Commands, defineSystem, ShapeRenderer, ShapeType, Text, TextAlign, TextVerticalAlign, Transform,
    type CommandsInstance,
} from 'esengine';
import { Frame, FrameRole, Hud, HudKind, Player, Run, Star, Visor } from '../components';
import { HAZARD_COLORS, loadBest, PLAYER_COLOR } from '../config';

const INK = { r: 0.03, g: 0.04, b: 0.08, a: 1 };

function shape(
    cmds: CommandsInstance,
    name: string,
    role: number,
    color: { r: number; g: number; b: number; a: number },
    layer: number,
    enabled = true,
): void {
    cmds.spawn(name)
        .insert(Transform, { position: { x: 0, y: 0, z: 0 } })
        .insert(ShapeRenderer, {
            shapeType: ShapeType.RoundedRect,
            size: { x: 10, y: 10 },
            cornerRadius: 0,
            color,
            layer,
            enabled,
        })
        .insert(Frame, { role });
}

function label(
    cmds: CommandsInstance,
    name: string,
    kind: number,
    content: string,
    fontSize: number,
    color: { r: number; g: number; b: number; a: number },
    align: number,
): void {
    cmds.spawn(name)
        .insert(Transform, { position: { x: 0, y: 0, z: 0 } })
        .insert(Text, {
            content,
            fontSize,
            fontFamily: 'Arial',
            color,
            align,
            verticalAlign: TextVerticalAlign.Middle,
            wordWrap: false,
            bold: true,
            lineHeight: 1.15,
            strokeWidth: 4,
            strokeColor: INK,
            layer: 12,
        })
        .insert(Hud, { kind });
}

export const setupSystem = defineSystem(
    [Commands()],
    (cmds) => {
        // Two overlapping panels. One full-screen quad leaves a dashed seam on
        // SwiftShader (the clear color shows through the triangle diagonal).
        shape(cmds, 'BackdropL', FrameRole.Backdrop, { r: 0.06, g: 0.08, b: 0.16, a: 1 }, 0);
        shape(cmds, 'BackdropR', FrameRole.Backdrop, { r: 0.06, g: 0.08, b: 0.16, a: 1 }, 0);
        shape(cmds, 'Lane', FrameRole.Lane, { r: 0.2, g: 0.85, b: 0.8, a: 0.55 }, 2);
        shape(cmds, 'RailL', FrameRole.RailL, { r: 0.14, g: 0.2, b: 0.34, a: 1 }, 2);
        shape(cmds, 'RailR', FrameRole.RailR, { r: 0.14, g: 0.2, b: 0.34, a: 1 }, 2);
        shape(cmds, 'VeilL', FrameRole.Veil, { r: 0.02, g: 0.03, b: 0.07, a: 0.72 }, 9, false);
        shape(cmds, 'VeilR', FrameRole.Veil, { r: 0.02, g: 0.03, b: 0.07, a: 0.72 }, 9, false);

        const player = cmds.spawn('Player')
            .insert(Transform, { position: { x: 0, y: -280, z: 0 } })
            .insert(ShapeRenderer, {
                shapeType: ShapeType.RoundedRect,
                size: { x: 112, y: 44 },
                cornerRadius: 22,
                color: PLAYER_COLOR,
                layer: 6,
            })
            .insert(Player, { halfW: 56, halfH: 22 });
        cmds.spawn('Visor')
            .childOf(player.id())
            .insert(Transform, { position: { x: 14, y: 4, z: 0 } })
            .insert(ShapeRenderer, {
                shapeType: ShapeType.Circle,
                size: { x: 16, y: 16 },
                color: { r: 1, g: 1, b: 1, a: 0.95 },
                layer: 7,
            })
            .insert(Visor);

        for (let i = 0; i < 28; i++) {
            const tint = HAZARD_COLORS[i % HAZARD_COLORS.length];
            const size = 3 + (i % 5);
            cmds.spawn(`Star${i}`)
                .insert(Transform, {
                    position: { x: (i * 67) % 900 - 450, y: (i * 53) % 680 - 340, z: 0 },
                })
                .insert(ShapeRenderer, {
                    shapeType: ShapeType.Circle,
                    size: { x: size, y: size },
                    color: { r: tint.r, g: tint.g, b: tint.b, a: 0.28 + (i % 4) * 0.12 },
                    layer: 1,
                })
                .insert(Star, { speed: 16 + (i % 6) * 7, phase: i * 0.7 });
        }

        cmds.spawn('Run')
            .insert(Transform, { position: { x: 0, y: 0, z: 0 } })
            .insert(Run, {
                playing: true,
                score: 0,
                best: loadBest(),
                elapsed: 0,
                dodged: 0,
                spawnIn: 0.55,
                lock: 0,
                seeded: 0,
            });

        label(cmds, 'Title', HudKind.Title, 'ESTELLA DODGE', 30, { r: 0.95, g: 0.97, b: 1, a: 1 }, TextAlign.Center);
        label(cmds, 'Score', HudKind.Score, 'SCORE 0', 26, { r: 0.5, g: 1, b: 0.92, a: 1 }, TextAlign.Left);
        label(cmds, 'Best', HudKind.Best, 'BEST 0', 22, { r: 1, g: 0.84, b: 0.45, a: 1 }, TextAlign.Right);
        label(cmds, 'Hint', HudKind.Hint, 'ARROWS / A D  ·  HOLD EITHER SIDE', 16, { r: 0.8, g: 0.86, b: 0.94, a: 0.95 }, TextAlign.Center);
        label(cmds, 'Banner', HudKind.Banner, '', 40, { r: 1, g: 0.96, b: 0.9, a: 1 }, TextAlign.Center);
    },
    { name: 'SetupSystem' },
);
