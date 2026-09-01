# SeamScope Forward-Energy Improvement Specification

Date: 2026-09-01
Status: Approved for the 2026-09-01 scheduled improvement run by the governing seeded-selection workflow.

## Selection

- Seed: `20260901` using Python `random.Random`.
- Mode roll: `0.8010605011932569`, selecting the 30% existing-project improvement branch.
- Lane: software development and engineering. Classical image processing is a supporting technique inside a browser software tool.
- Repository: SeamScope, selected from clean public repositories because its documented next improvement identifies a concrete algorithmic limitation and a measurable validation plan.

## Problem

SeamScope 1.0 uses backward energy: it removes paths with low energy in the current image but does not estimate the visual discontinuity created when previously separated pixels become neighbors. This can produce avoidable artifacts around structured edges.

## Required behavior

1. Add a user-selectable backward or forward energy method without changing the default behavior.
2. Implement forward-energy dynamic programming as a pure, deterministic core function.
3. Preserve protection and removal-priority guidance under both methods.
4. Support both vertical and horizontal carving through the existing transpose path.
5. Invalidate a preview when the selected method changes so a seam is never removed under a different method than the one displayed.
6. Label preview and run status with the active method.
7. Add a deterministic benchmark that removes the same number of seams from generated structured images with both methods.
8. Report an explicit adjacency-disruption proxy and elapsed time without presenting either as perceptual quality or a universal performance result.
9. Extend tests, documentation, and CI-facing verification commands.

## Forward-energy definition

For each candidate vertical seam pixel, accumulate the luminance discontinuity that would be introduced by joining its left and right neighbors. Diagonal transitions also include the change between the predecessor pixel and the newly adjacent side. User guidance is added to the local cost, and the existing large outer-edge penalty remains in force. Deterministic tie handling must match the existing left-biased policy.

Horizontal seams reuse the same implementation after transposing the image and guidance field.

## Comparison metric

The benchmark sums the absolute luminance difference between the two pixels that become adjacent after each removal, normalized per joined pixel. This is an interpretable local disruption proxy. It does not measure semantics, object preservation, overall perceptual quality, or user preference.

## Verification plan

- Unit tests for forward-path selection, guidance influence, method validation, horizontal support, and adjacency-disruption calculation.
- Existing backward-energy tests must continue to pass unchanged in meaning.
- Deterministic structured fixtures must complete at the requested dimensions for both methods.
- Syntax checks and the benchmark command must run without dependencies.
- Browser smoke and responsive-layout checks must confirm method selection, preview invalidation, removal, and target runs.
- README files must contain no em dash characters.

## Non-goals

- Claiming that forward energy always produces a better-looking image.
- Learned saliency, segmentation, image enlargement, video retargeting, or metadata preservation.
- Treating microbenchmark timing as a cross-device performance ranking.
