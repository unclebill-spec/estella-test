# Estella Dodge

A small 2D arcade game for the Estella engine (v0.104.1). Shapes fall from the top. You slide along the bottom and stay alive as long as you can. The score is time survived plus shapes that pass you. The best score is kept in `localStorage` under `estella-dodge-best`.

Touching a shape ends the run. The hazards stay on screen. Press Space or Enter, or tap, to play again (there is a short lock so the hit itself does not restart the run).

## Controls

- Keyboard: Left/Right arrows, or A and D.
- Mouse or touch: hold the left half of the screen to move left, the right half to move right. Drag, and the player chases your finger at the same speed.
- Restart: Space, Enter, or a tap.

The playfield follows the camera, so the same build fills a phone and a desktop window.

## Create and export

From the engine repo (`/workspace/estella/src` at tag v0.104.1). This project was created from the `blank` template:

```bash
node pipeline/bin/estella.mjs create blank /workspace/estella/estella-test --name "Estella Dodge"
node pipeline/bin/estella.mjs export /workspace/estella/estella-test --json /workspace/estella/export.json
```

The web build is written to `dist-web/`. `export.json` should report `"ok": true` and an empty `errors` list.

### `--wasm`

Export needs a prebuilt web runtime (`esengine.js` and `esengine.wasm`). The CLI looks in `build/wasm/web` first, then in `desktop/public/wasm`. This machine has no Emscripten build tree. The runtime that ships is the one from the official editor installer:

```bash
node pipeline/bin/estella.mjs export /workspace/estella/estella-test \
  --wasm /workspace/estella/src/desktop/public/wasm \
  --json /workspace/estella/export.json
```

Do not build the engine from source.

### Sub-path hosting

`dist-web/index.html` loads `./game.js`, and the bundle loads chunks and wasm with relative URLs, so the folder works on GitHub Pages at `/estella-test/`. Do not rewrite those URLs to root-absolute paths.

The web exporter also pins a screen orientation from the design resolution. This project is portrait (480×720), so a fresh export hides `#canvas` in landscape and shows a rotate hint. That blocks a normal desktop window. The shipped `dist-web/index.html` has that rule, the hint, and the `screen.orientation.lock` script removed. After you export again, delete the `@media (orientation:…){…#canvas{display:none` rule (and the rotate hint) if both phone portrait and desktop landscape should show the game.

## Play the export

Serve `dist-web` and open `index.html`. For a sub-path check, see `/workspace/estella/check.mjs`, which serves the folder at `/estella-test/` and drives headless Chromium.
