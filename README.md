# SeamScope

SeamScope is a local-first visual lab for content-aware image reduction. It makes seam carving inspectable: you can see the Sobel energy field, compare backward and forward energy, preview the exact selected path, paint regions to protect or remove first, and watch vertical or horizontal seams disappear one pixel at a time.

The app is browser-native and has no runtime dependencies, analytics, uploads, or external services.

## Why this project exists

Normal scaling treats every pixel uniformly. Seam carving removes connected low-energy paths instead, which can preserve high-contrast subjects while compressing less detailed areas. That behavior is powerful but not magical, so SeamScope exposes the decisions instead of hiding them behind a one-click result.

## Features

- Generated landscape demo with no external or licensed assets.
- Local image loading through browser decoding; large inputs are capped at 900 pixels on the longest edge for interactive use.
- Luminance-based Sobel energy with protected outer boundaries.
- Selectable backward energy for current contrast or forward energy for predicted neighbor disruption.
- Dynamic-programming seam search with deterministic tie handling under both methods.
- Vertical and horizontal removal using one tested algorithm through transposition.
- Green protection and coral removal-priority brushes.
- Live image, guidance overlay, next-seam preview, and energy heatmap.
- Single-step removal, animated target runs, bounded undo, reset, and clean PNG export.
- Responsive layout, semantic controls, live status announcements, visible focus, and reduced-motion support.
- Dependency-free structured-image benchmark with an explicit local adjacency-disruption proxy.

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
npm run benchmark
```

Verified locally on 2026-09-01 with Node.js 26.5.0 on Windows:

- 12/12 algorithm tests passed, including forward path selection, guidance, horizontal support, method validation, and disruption accounting.
- All four JavaScript modules passed `node --check`.
- The benchmark completed all 76 requested seam removals at the expected dimensions.
- Across three generated structured fixtures, the weighted mean adjacency-disruption proxy was `4.0717` for backward energy and `2.6508` for forward energy, a ratio of `0.6510`.
- Browser verification covered switching methods, preview invalidation, both-axis removal, target carving, and narrow layout.

The proxy measures only the mean absolute luminance difference between pixels newly joined by removal. Lower is less local disruption on these fixtures, not proof of better perceived output. See [the 2026-09-01 verification record](docs/experiments/2026-09-01-forward-energy.md) for exact results and limitations.

## How the algorithm works

1. Convert RGB pixels to relative luminance.
2. Backward energy applies a 3×3 Sobel operator to price contrast in the current image.
3. Forward energy prices the luminance discontinuity that would be created when pixels on either side of a removed seam become neighbors. Diagonal transitions include the predecessor-to-side change.
4. Add user guidance: positive bias protects a region, while negative bias attracts a seam.
5. Accumulate the cheapest path row by row with deterministic left-biased tie handling.
6. Backtrack the minimum terminal cost and remove that connected seam.
7. Transpose the image and guidance field to reuse the same implementation for horizontal seams.
8. Recompute costs after every removal because neighboring pixels have changed.

Path-cost numbers are method-specific and should not be compared directly. Use the documented adjacency-disruption proxy when comparing outputs.

The implementation is in [`src/seam-core.js`](src/seam-core.js), separate from browser state and rendering.

## Repository map

```text
index.html                 accessible application structure
styles.css                responsive editorial interface
src/app.js                 canvas rendering and interaction state
src/seam-core.js           pure image-processing primitives
tests/seam-core.test.js    deterministic algorithm tests
bench/forward-vs-backward.mjs generated structured-fixture comparison
tools/serve.mjs            dependency-free local static server
docs/                      design, decisions, notes, and evidence
```

## Privacy and data

User images are decoded and processed inside the browser. SeamScope has no network request code after its own static files load. No dataset or trained model is used; the demo scene is procedurally drawn with Canvas 2D.

## Limitations

- Reduction only; seam insertion and enlargement are not implemented.
- Sobel contrast is not semantic understanding. Smooth but important regions may need a protection mask, and busy backgrounds can be preserved unintentionally.
- Guidance is a simple additive energy bias, not segmentation.
- Forward energy minimizes a local luminance-disruption objective. It does not guarantee semantic preservation or a preferred-looking result.
- Path costs use different definitions under backward and forward energy and are not directly comparable.
- Each seam recomputes the full energy field, favoring clarity over maximum throughput.
- Large source images are downscaled to a 900-pixel maximum dimension before processing.
- Export was exercised to the app's success state, but the automated browser harness did not expose the data-URL download as a downloadable artifact.
- Video, temporal coherence, EXIF preservation, color profiles, and metadata export are out of scope.
- The benchmark uses three generated structured fixtures and one local artifact proxy. It is not a natural-image study, perceptual evaluation, or cross-device performance benchmark.

## Best next improvement

Add an in-app side-by-side result view with a cumulative disruption chart for the loaded image, then evaluate both methods on a small, documented set of permissively licensed natural and graphic images.

## License

[MIT](LICENSE)
