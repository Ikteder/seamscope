# Forward-Energy Verification Record: 2026-09-01

## Environment

| Item | Observed value |
|---|---|
| Operating system | Windows |
| Node.js | 26.5.0 |
| Runtime dependencies | None |
| Benchmark seed | `20260901` |

## Automated checks

| Command | Actual result |
|---|---|
| `npm test` | 12 passed, 0 failed |
| `npm run check` | Core, app, server, and benchmark modules passed syntax checks |
| `npm run benchmark` | Three fixtures and 76 total seam removals completed at expected dimensions |

The added tests cover deterministic forward path selection, guidance influence, horizontal support, unknown-method rejection, and introduced-adjacency accounting. The eight original behavior groups remain covered.

## Structured-fixture results

The metric is mean absolute luminance difference between pixels newly joined by a seam removal. Lower values indicate less local adjacency disruption on the generated fixture. It is not a perceptual-quality score.

| Fixture | Axis | Seams | Backward | Forward | Forward/backward ratio |
|---|---:|---:|---:|---:|---:|
| Staggered columns | Vertical | 14 | 3.5258 | 0.7146 | 0.2027 |
| Diagonal ribbons | Vertical | 14 | 7.2017 | 6.6927 | 0.9293 |
| Stepped horizon | Horizontal | 10 | 1.4364 | 0.4805 | 0.3345 |
| Weighted aggregate | Mixed | 38 per method | 4.0717 | 2.6508 | 0.6510 |

The two methods each removed 38 seams, for 76 total removals. Final dimensions were 82 by 64 for both vertical fixtures and 88 by 50 for the horizontal fixture.

## Interpretation

Forward energy produced lower adjacency disruption on all three structured fixtures in this run. The aggregate value was about 34.90% lower than backward energy under this proxy. This supports that the implementation is optimizing the intended local objective. It does not establish that every output looks better or preserves important subjects.

## Browser checks

| Check | Actual result |
|---|---|
| Backward preview | Status identified backward vertical energy; dimensions remained 520 by 340 |
| Method switch | Forward selection removed the prior preview and reset its displayed path cost |
| Forward preview | Status identified forward vertical energy; dimensions remained 520 by 340 |
| Vertical removal | 520 by 340 to 519 by 340; removed count changed from 0 to 1 |
| Horizontal removal | 519 by 340 to 519 by 339; removed count changed from 1 to 2 |
| Forward target run | Removed five more mixed-axis seams and reached exactly 516 by 337 |
| Narrow layout | At a 390 px viewport, document and body scroll width were 375 px; the 331.2 px method control fit inside the 375.2 px workspace |
| Console | No warnings or errors during the verified flow |

## Publication verification

Public GitHub Actions status will be recorded after the commit is pushed.

## Limitations

- Fixtures are generated graphics, not a representative natural-image dataset.
- The metric is closely aligned with the forward-energy objective and is not an independent perceptual evaluation.
- Timings vary between runs and are intentionally excluded from the comparison table.
- No cross-browser matrix, visual regression baseline, or user study was performed.
