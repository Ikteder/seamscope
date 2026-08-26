# Verification Record — 2026-08-26

## Environment

| Item | Observed value |
|---|---|
| Operating system | Windows |
| Node.js | 26.5.0 |
| Package dependencies | None |
| Demo dimensions | 520 × 340 pixels |

## Automated checks

| Command | Result |
|---|---|
| `npm test` | 8 passed, 0 failed |
| `npm run check` | All three JavaScript modules passed syntax checks |

The tests cover border energy, minimum connected path selection, vertical pixel order, transposition, horizontal removal, brush extent, protection bias, and target validation.

## Browser checks

| Check | Actual result |
|---|---|
| Initial render | Demo loaded at 520 × 340 with no new console error after the fix |
| Vertical preview | Dimensions unchanged; path cost displayed; observed computation 16.4 ms |
| Vertical removal | 520 × 340 → 519 × 340; removed counter 0 → 1 |
| Undo | Restored 520 × 340 and counter 0 |
| Horizontal removal | 520 × 340 → 520 × 339 |
| Guidance brush | Status changed to protection mask updated; undo enabled |
| Target run | Removed 10 seams and reached exactly 515 × 335 |
| Narrow layout | At 390 px viewport, document scroll width was 375 px; no horizontal overflow |
| Export | App reached the clean-PNG export success state |

## Defect and retest

The first browser load exposed a stack overflow in energy-map scaling caused by spreading a large array into `Math.max`. It was replaced with an iterative maximum calculation. Mask display was also changed from pixel replacement to alpha compositing. Automated checks were rerun successfully and the browser then loaded the correct 520 × 340 state.

## Limitations of this evidence

- The 16.4 ms preview time is one observation on one local browser session, not a benchmark distribution.
- The browser harness did not surface the data-URL export as a downloadable test artifact; the application callback and success state executed.
- No cross-browser matrix, high-resolution stress test, visual-regression baseline, or perceptual image-quality study was run.
