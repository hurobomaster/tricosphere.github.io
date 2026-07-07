# TriCoSphere Project Page

This repository hosts the static GitHub Pages project page for TriCoSphere:

https://hurobomaster.github.io/tricosphere.github.io/

The site is a plain static HTML/CSS/JavaScript page. It does not require a backend server or a Vite/React build step for deployment.

## Interactive MuJoCo Demo

The page includes an `Interactive MuJoCo Demo` section between `Motion Demos` and `Abstract`.

Key files:

```text
index.html
models/single_finger.xml
static/css/index.css
static/js/actuator-config.js
static/js/mujoco-loader.js
static/js/interactive-demo.js
static/vendor/mujoco/mujoco.js
static/vendor/mujoco/mujoco.wasm
static/vendor/three/three.module.min.js
static/vendor/three/three.core.min.js
static/vendor/three/OrbitControls.js
```

The browser loads `models/single_finger.xml`, initializes MuJoCo WebAssembly, renders supported MuJoCo geoms with Three.js, and writes slider values in radians to `data.ctrl[i]`.

## Replacing `single_finger.xml`

Replace:

```text
models/single_finger.xml
```

Keep the deployed URL valid:

```text
https://hurobomaster.github.io/tricosphere.github.io/models/single_finger.xml
```

If the replacement XML references meshes, textures, or other assets, place those files under `models/` or another static folder and update the MJCF paths accordingly.

## Adjusting Actuators

Edit:

```text
static/js/actuator-config.js
```

The current configuration defines four position actuator sliders:

```js
act_1_1, act_2_1, act_3_1, act_4_1
```

Slider values are stored and sent to MuJoCo in radians. The UI also displays degrees for readability.

## GitHub Pages Base Path

The demo detects the GitHub Pages subpath:

```text
/tricosphere.github.io/
```

This logic lives in:

```text
static/js/mujoco-loader.js
```

If the repository name or Pages path changes, update `pagesBase` in `getBasePath()`.

## Local Testing

From the repository root, serve the static files:

```bash
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/
```

Do not open `index.html` directly with `file://`; ES modules, WASM, and `fetch()` need an HTTP server.

## Deployment

This repository is deployed as static files from the repository root. No backend is required.

Before pushing, check these paths:

```text
https://hurobomaster.github.io/tricosphere.github.io/
https://hurobomaster.github.io/tricosphere.github.io/models/single_finger.xml
https://hurobomaster.github.io/tricosphere.github.io/static/vendor/mujoco/mujoco.wasm
```

Expected behavior:

- The page shows `Interactive MuJoCo Demo`.
- The viewer renders a 3D model, not a placeholder image or video.
- The actuator panel shows four sliders.
- Reset and Play/Pause work.
- Simulation time and FPS update.

## Common Errors

`XML 404`

Check that `models/single_finger.xml` exists and that the GitHub Pages base path is correct.

`WASM 404`

Check that `static/vendor/mujoco/mujoco.wasm` was committed and deploys with the page.

`MIME type error`

GitHub Pages serves `.wasm` correctly as `application/wasm`. For local testing, use a modern static server such as Python's `http.server`.

`GitHub Pages base path error`

Update `pagesBase` in `static/js/mujoco-loader.js` if the repository path changes.

`Slider values change but the model does not move`

Confirm that the actuator order in `static/js/actuator-config.js` matches the actuator order in the MJCF `<actuator>` section. The code writes:

```js
data.ctrl[0] = act_1_1
data.ctrl[1] = act_2_1
data.ctrl[2] = act_3_1
data.ctrl[3] = act_4_1
```

Also check that the MJCF actuators are not disabled and that joint limits/equality constraints are not over-constraining the model.
