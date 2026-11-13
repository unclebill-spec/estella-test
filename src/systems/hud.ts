import { defineSystem, Mut, Query, Res, ShapeRenderer, Text, TextAlign, Transform, UICameraInfo } from 'esengine';
import { Frame, FrameRole, Hud, HudKind, Player, Run } from '../components';
import { PLAYER_COLOR, PLAYER_HIT_COLOR, readView } from '../config';

export const hudSystem = defineSystem(
    [
        Res(UICameraInfo),
        Query(Run),
        Query(Mut(Transform), Mut(Text), Hud),
        Query(Mut(ShapeRenderer), Frame),
        Query(Mut(ShapeRenderer), Player),
    ],
    (cam, runs, labels, frames, players) => {
        const found = [...runs][0];
        if (!found) return;
        const run = found[1];
        const view = readView(cam);
        const narrow = view.width < 560;
        const edge = 16;
        const timeLabel = `${run.elapsed.toFixed(1)}s`;

        for (const [, shape, frame] of frames) {
            if (frame.role === FrameRole.Veil) shape.enabled = !run.playing;
        }
        for (const [, shape] of players) {
            const tint = run.playing ? PLAYER_COLOR : PLAYER_HIT_COLOR;
            shape.color.r = tint.r;
            shape.color.g = tint.g;
            shape.color.b = tint.b;
            shape.color.a = tint.a;
        }

        for (const [, transform, text, hud] of labels) {
            if (hud.kind === HudKind.Title) {
                text.content = 'ESTELLA DODGE';
                text.fontSize = narrow ? 22 : 30;
                text.align = TextAlign.Center;
                transform.position.x = view.cx;
                transform.position.y = view.top - (narrow ? 24 : 30);
            } else if (hud.kind === HudKind.Score) {
                text.content = `SCORE ${run.score}`;
                text.fontSize = narrow ? 20 : 26;
                text.align = TextAlign.Left;
                transform.position.x = view.left + edge;
                transform.position.y = view.top - (narrow ? 54 : 32);
            } else if (hud.kind === HudKind.Best) {
                text.content = `BEST ${run.best}`;
                text.fontSize = narrow ? 18 : 22;
                text.align = narrow ? TextAlign.Left : TextAlign.Right;
                transform.position.x = narrow ? view.left + edge : view.right - edge;
                transform.position.y = view.top - (narrow ? 80 : 32);
            } else if (hud.kind === HudKind.Hint) {
                text.content = run.playing
                    ? (narrow
                        ? `${timeLabel}  ·  DODGED ${run.dodged}\nHOLD A SIDE OR A/D`
                        : `${timeLabel}    DODGED ${run.dodged}    ·    ARROWS / A D    ·    HOLD EITHER SIDE`)
                    : '';
                text.fontSize = narrow ? 15 : 16;
                text.align = TextAlign.Center;
                transform.position.x = view.cx;
                transform.position.y = view.top - (narrow ? 118 : 68);
            } else if (hud.kind === HudKind.Banner) {
                text.content = run.playing
                    ? ''
                    : `GAME OVER\nSCORE ${run.score}\nBEST ${run.best}\n\nSPACE, ENTER, OR TAP`;
                text.fontSize = narrow ? 28 : 40;
                text.align = TextAlign.Center;
                transform.position.x = view.cx;
                transform.position.y = view.cy + (narrow ? 8 : 16);
            }
        }
    },
    { name: 'HudSystem' },
);
