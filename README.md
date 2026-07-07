# TriCoSphere Project Page

This repository hosts the static GitHub Pages project page for TriCoSphere:

https://hurobomaster.github.io/tricosphere.github.io/

The site is a plain static HTML/CSS/JavaScript academic project page. It does not require a backend server or a Vite/React build step for deployment.

## Model Files

MuJoCo XML and mesh assets are stored under:

```text
models/
```

Current model groups:

```text
models/faithful_mode/
models/faithful_primitive/
models/surrogate/
```

These files are static assets and can be accessed from GitHub Pages with URLs such as:

```text
https://hurobomaster.github.io/tricosphere.github.io/models/surrogate/surrogate_best.xml
```

## Local Testing

From the repository root, serve the static files:

```bash
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/
```

Do not open `index.html` directly with `file://` if you need to test fetched static assets.

## Deployment

This repository is deployed as static files from the repository root. No backend is required.

After pushing to `main`, GitHub Pages may take a short time to refresh. If the browser still shows old content, use a hard refresh.
