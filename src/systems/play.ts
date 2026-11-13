import {
    Commands, defineSystem, Input, Mut, Query, Res, ShapeRenderer, ShapeType, Time, Transform,
    UICameraInfo,
    type CommandsInstance,
} from 'esengine';
import { Frame, FrameRole, Hazard, Player, Run, Star, Visor } from '../components';
import {
    clampDt, HAZARD_COLORS, heldPointer, readView, saveBest, simulationOpen,
    type View,
} from '../config';

let gesture: { origin: number; drag: boolean } | null = null;

function resetGesture(): void {
    gesture = null;
}

function spawnHazard(cmds: CommandsInstance, view: View, x: number, y: number, speed: number, index: number): void {
    const radius = Math.max(16, Math.min(34, view.width * 0.045 + (index % 3) * 4));
    const round = index % 2 === 0;
    const color = HAZARD_COLORS[index % HAZARD_COLORS.length];
    cmds.spawn('Hazard')
        .insert(Transform, { position: { x, y, z: 0 } })
        .insert(ShapeRenderer, {
            shapeType: round ? ShapeType.RoundedRect : ShapeType.Circle,
            size: { x: radius * 2, y: radius * 2 },
            cornerRadius: round ? Math.min(12, radius * 0.45) : 0,
            color,
            layer: 4,
        })
        .insert(Hazard, {
            speed,
            half: radius,
            baseX: x,
            phase: index * 1.3,
            sway: round ? Math.min(36, view.width * 0.03) : Math.min(22, view.width * 0.02),
            scored: 0,
            spin: round ? 1.4 : 0,
        });
}

export const layoutSystem = defineSystem(
    [
        Res(UICameraInfo),
        Query(Mut(Transform), Mut(ShapeRenderer), Frame),
        Query(Mut(Transform), Mut(ShapeRenderer), Mut(Player)),
        Query(Mut(Transform), Mut(ShapeRenderer), Visor),
    ],
    (cam, frames, players, visors) => {
        const view = readView(cam);
        let foot = 0;
        let bodyH = 44;
        let bodyW = 112;
        for (const [, transform, shape, player] of players) {
            bodyW = Math.max(78, Math.min(128, view.width * 0.2));
            bodyH = Math.max(34, Math.min(52, bodyW * 0.4));
            player.halfW = bodyW * 0.5;
            player.halfH = bodyH * 0.5;
            shape.size = { x: bodyW, y: bodyH };
            shape.cornerRadius = bodyH * 0.5;
            foot = Math.max(26, view.height * 0.05);
            transform.position.y = view.bottom + player.halfH + foot;
            const minX = view.left + player.halfW + 8;
            const maxX = view.right - player.halfW - 8;
            transform.position.x = Math.max(minX, Math.min(maxX, transform.position.x));
        }
        for (const [, transform, shape] of visors) {
            const s = bodyH * 0.36;
            shape.size = { x: s, y: s };
            transform.position.x = bodyW * 0.12;
            transform.position.y = bodyH * 0.06;
        }
        const laneY = view.bottom + foot - 8;
        const panelHalf = view.width * 0.5 + 24;
        let backdrop = 0;
        let veil = 0;
        for (const [, transform, shape, frame] of frames) {
            if (frame.role === FrameRole.Backdrop || frame.role === FrameRole.Veil) {
                const index = frame.role === FrameRole.Backdrop ? backdrop++ : veil++;
                transform.position.x = index === 0
                    ? view.left + panelHalf * 0.5 - 8
                    : view.right - panelHalf * 0.5 + 8;
                transform.position.y = view.cy;
                shape.size = { x: panelHalf, y: view.height + 8 };
            } else if (frame.role === FrameRole.Lane) {
                transform.position.x = view.cx;
                transform.position.y = laneY;
                shape.size = { x: view.width, y: 8 };
                shape.cornerRadius = 4;
            } else if (frame.role === FrameRole.RailL || frame.role === FrameRole.RailR) {
                transform.position.x = frame.role === FrameRole.RailL ? view.left + 6 : view.right - 6;
                transform.position.y = view.cy;
                shape.size = { x: 8, y: view.height };
            }
        }
    },
    { name: 'LayoutSystem' },
);

export const moveSystem = defineSystem(
    [Res(Input), Res(Time), Res(UICameraInfo), Query(Run), Query(Mut(Transform), Player)],
    (input, time, cam, runs, players) => {
        const run = [...runs][0];
        if (!run || !run[1].playing || !simulationOpen()) {
            resetGesture();
            return;
        }
        const view = readView(cam);
        const dt = clampDt(time.delta);
        const speed = Math.max(240, view.width * 0.95);
        let dir = 0;
        if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) dir -= 1;
        if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) dir += 1;
        const touch = input.getTouches()[0];
        const pointer = heldPointer(
            input.mouseX,
            input.mouseY,
            input.isMouseButtonDown(0),
            touch ? touch.x : null,
            touch ? touch.y : null,
            cam,
            view,
        );
        if (!pointer) resetGesture();

        for (const [, transform, player] of players) {
            let x = transform.position.x;
            if (dir !== 0) {
                x += dir * speed * dt;
                resetGesture();
            } else if (pointer) {
                const threshold = Math.max(14, view.width * 0.02);
                if (!gesture) gesture = { origin: pointer.x, drag: false };
                if (!gesture.drag && Math.abs(pointer.x - gesture.origin) >= threshold) gesture.drag = true;
                if (gesture.drag) {
                    const dx = pointer.x - x;
                    const step = speed * dt;
                    x += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;
                } else {
                    x += (pointer.x < view.cx ? -1 : 1) * speed * dt;
                }
            }
            const minX = view.left + player.halfW + 8;
            const maxX = view.right - player.halfW - 8;
            transform.position.x = Math.max(minX, Math.min(maxX, x));
        }
    },
    { name: 'MoveSystem' },
);

let hazardSerial = 0;

export const hazardSystem = defineSystem(
    [
        Commands(), Res(Time), Res(UICameraInfo), Query(Mut(Run)),
        Query(Transform, Player), Query(Mut(Transform), Mut(Hazard)),
    ],
    (cmds, time, cam, runs, players, hazards) => {
        const found = [...runs][0];
        if (!found) return;
        const run = found[1];
        const view = readView(cam);
        const hudBand = Math.min(120, view.height * 0.18);
        if (!run.seeded && cam.valid) {
            const spots: Array<[number, number]> = [[0.22, 0.72], [0.78, 0.58], [0.36, 0.46], [0.64, 0.34]];
            const playTop = view.top - hudBand;
            const playBottom = view.bottom + Math.max(120, view.height * 0.22);
            spots.forEach(([fx, fy], index) => {
                const speed = 120 + index * 10;
                spawnHazard(
                    cmds,
                    view,
                    view.left + fx * view.width,
                    playBottom + fy * (playTop - playBottom),
                    speed,
                    hazardSerial++,
                );
            });
            run.seeded = 1;
            run.spawnIn = 0.75;
        }
        if (!simulationOpen() || !run.playing) return;

        const dt = clampDt(time.delta);
        run.elapsed += dt;
        run.spawnIn -= dt;
        const fall = Math.min(460, 140 + run.elapsed * 18);
        if (run.spawnIn <= 0) {
            run.spawnIn = Math.max(0.32, 1.02 - run.elapsed * 0.04);
            const margin = Math.max(28, view.width * 0.06);
            const x = view.left + margin + Math.random() * Math.max(8, view.width - margin * 2);
            spawnHazard(cmds, view, x, view.top - hudBand, fall * (0.85 + Math.random() * 0.35), hazardSerial++);
        }

        const body = [...players][0];
        const playerBottom = body
            ? body[1].position.y - body[2].halfH
            : view.bottom + Math.max(26, view.height * 0.05);

        for (const [entity, transform, hazard] of hazards) {
            hazard.phase += dt * (hazard.spin > 0 ? hazard.spin : 1.2);
            const swayX = hazard.baseX + Math.sin(hazard.phase) * hazard.sway;
            const minX = view.left + hazard.half + 10;
            const maxX = view.right - hazard.half - 10;
            transform.position.x = Math.max(minX, Math.min(maxX, swayX));
            transform.position.y -= hazard.speed * dt;
            if (hazard.spin > 0) {
                // ShapePlugin recovers the angle as 2 * atan2(z, w), so store a half-angle.
                const half = hazard.phase * 0.35;
                transform.rotation.x = 0;
                transform.rotation.y = 0;
                transform.rotation.z = Math.sin(half);
                transform.rotation.w = Math.cos(half);
            }
            if (!hazard.scored && transform.position.y + hazard.half < playerBottom) {
                hazard.scored = 1;
                run.dodged += 1;
            }
            if (transform.position.y + hazard.half < view.bottom - 24) cmds.despawn(entity);
        }

        run.score = Math.floor(run.elapsed * 10) + run.dodged * 25;
        if (run.score > run.best) run.best = run.score;
    },
    { name: 'HazardSystem' },
);

export const collideSystem = defineSystem(
    [Query(Mut(Run)), Query(Transform, Player), Query(Transform, Hazard)],
    (runs, players, hazards) => {
        const found = [...runs][0];
        if (!found || !found[1].playing || !simulationOpen()) return;
        const run = found[1];
        const player = [...players][0];
        if (!player) return;
        const [, pTransform, body] = player;
        for (const [, hTransform, hazard] of hazards) {
            const hit = Math.abs(pTransform.position.x - hTransform.position.x) < (body.halfW + hazard.half) * 0.92
                && Math.abs(pTransform.position.y - hTransform.position.y) < (body.halfH + hazard.half) * 0.92;
            if (!hit) continue;
            run.playing = false;
            run.lock = 0.45;
            if (run.score > run.best) run.best = run.score;
            saveBest(run.best);
            return;
        }
    },
    { name: 'CollideSystem' },
);

export const starSystem = defineSystem(
    [Res(Time), Res(UICameraInfo), Query(Mut(Transform), Mut(Star))],
    (time, cam, stars) => {
        const view = readView(cam);
        const dt = clampDt(time.delta);
        for (const [, transform, star] of stars) {
            star.phase += dt;
            transform.position.y -= star.speed * dt;
            transform.position.x += Math.sin(star.phase) * 8 * dt;
            if (transform.position.y < view.bottom - 12) {
                transform.position.y = view.top + 8;
                transform.position.x = view.left + Math.random() * view.width;
            }
            if (transform.position.x < view.left) transform.position.x = view.right;
            if (transform.position.x > view.right) transform.position.x = view.left;
        }
    },
    { name: 'StarSystem' },
);

export const restartSystem = defineSystem(
    [Commands(), Res(Input), Res(Time), Res(UICameraInfo), Query(Mut(Run)), Query(Mut(Transform), Player), Query(Hazard)],
    (cmds, input, time, cam, runs, players, hazards) => {
        const found = [...runs][0];
        if (!found || found[1].playing || !simulationOpen()) return;
        const run = found[1];
        const dt = clampDt(time.delta);
        run.lock = Math.max(0, run.lock - dt);
        if (run.lock > 0) return;
        const tap = input.isMouseButtonPressed(0) || input.getTouchesStarted().length > 0;
        const key = input.isKeyPressed('Space') || input.isKeyPressed('Enter') || input.isKeyPressed('NumpadEnter');
        if (!tap && !key) return;

        const view = readView(cam);
        run.playing = true;
        run.elapsed = 0;
        run.dodged = 0;
        run.score = 0;
        run.spawnIn = 0.55;
        run.seeded = 0;
        run.lock = 0;
        resetGesture();
        for (const [, transform] of players) transform.position.x = view.cx;
        for (const [entity] of hazards) cmds.despawn(entity);
    },
    { name: 'RestartSystem' },
);
