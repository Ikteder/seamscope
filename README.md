# SeamScope

SeamScope is a local-first visual lab for content-aware image reduction. It makes seam carving inspectable: you can see the Sobel energy field, preview the exact minimum-cost path, paint regions to protect or remove first, and watch vertical or horizontal seams disappear one pixel at a time.

The app is browser-native and has no runtime dependencies, analytics, uploads, or external services.

## Why this project exists

Normal scaling treats every pixel uniformly. Seam carving removes connected low-energy paths instead, which can preserve high-contrast subjects while compressing less detailed areas. That behavior is powerful but not magical, so SeamScope exposes the decisions instead of hiding them behind a one-click result.

## Features

- Generated landscape demo with no external or licensed assets.
- Local image loading through browser decoding; large inputs are capped at 900 pixels on the longest edge for interactive use.
- Luminance-based Sobel energy with protected outer boundaries.
- Dynamic-programming seam search with deterministic tie handling.
- Vertical and horizontal removal using one tested algorithm through transposition.
- Green protection and coral removal-priority brushes.
- Live image, guidance overlay, next-seam preview, and energy heatmap.
- Single-step removal, animated target runs, bounded undo, reset, and clean PNG export.
- Responsive layout, semantic controls, live status announcements, visible focus, and reduced-motion support.

## Run locally

Requirements: Node.js 20 or newer. There are no packages to install.

```bash
npm start
```

Open `http://127.0.0.1:8080`.

## Verify

```bash
npm test
npm run check
```

Verified on 2026-08-26 with Node.js 26.5.0 on Windows:

- 8/8 algorithm tests passed.
- All JavaScript modules passed `node --check`.
- Browser smoke tests passed for startup, preview, vertical removal, horizontal removal, undo, mask painting, mixed-axis target carving, and responsive layout.
- The generated demo preview completed in 16.4 ms in the observed browser run. This is a single local observation, not a cross-device benchmark.

See [the verification record](docs/experiments/2026-08-26-verification.md) for exact checks and limitations.

## How the algorithm works

1. Convert RGB pixels to relative luminance.
2. Apply a 3×3 Sobel operator to estimate local contrast.
3. Add user guidance: positive bias protects a region, while negative bias attracts a seam.
4. Accumulate the cheapest path cost row by row, allowing the next pixel to be straight down or one column diagonally away.
5. Backtrack the minimum terminal cost and remove that connected seam.
6. Transpose the image to reuse the same operation for horizontal seams.
7. Recompute energy after every removal because neighboring pixels have changed.

The implementation is in [`src/seam-core.js`](src/seam-core.js), separate from browser state and rendering.

## Repository map

```text
index.html                 accessible application structure
styles.css                responsive editorial interface
src/app.js                 canvas rendering and interaction state
src/seam-core.js           pure image-processing primitives
tests/seam-core.test.js    deterministic algorithm tests
tools/serve.mjs            dependency-free local static server
docs/                      design, decisions, notes, and evidence
```

## Privacy and data

User images are decoded and processed inside the browser. SeamScope has no network request code after its own static files load. No dataset or trained model is used; the demo scene is procedurally drawn with Canvas 2D.

## Limitations

- Reduction only; seam insertion and enlargement are not implemented.
- Sobel contrast is not semantic understanding. Smooth but important regions may need a protection mask, and busy backgrounds can be preserved unintentionally.
- Guidance is a simple additive energy bias, not segmentation.
- Each seam recomputes the full energy field, favoring clarity over maximum throughput.
- Large source images are downscaled to a 900-pixel maximum dimension before processing.
- Export was exercised to the app's success state, but the automated browser harness did not expose the data-URL download as a downloadable artifact.
- Video, temporal coherence, EXIF preservation, color profiles, and metadata export are out of scope.

## Best next improvement

Add forward-energy seam costs and a side-by-side benchmark against the current backward-energy method. Forward energy estimates the disruption introduced by newly adjacent pixels and should reduce visible artifacts on structured images.

## License

[MIT](LICENSE)
