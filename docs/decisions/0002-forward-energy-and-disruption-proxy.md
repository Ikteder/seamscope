# Decision 0002: Forward energy and a local disruption proxy

Date: 2026-09-01
Status: Accepted

## Context

The original implementation used backward Sobel energy only. Its documented next improvement called for forward-energy costs and a comparison that could be reproduced without licensed image assets or subjective claims.

## Decision

Keep backward energy as the default and add forward energy as an explicit user choice. Forward energy accumulates the luminance discontinuity introduced by newly adjacent pixels, plus predecessor-to-side costs for diagonal moves. Both methods retain boundary protection, guidance masks, deterministic ties, and horizontal operation through transposition.

Compare methods on generated structured fixtures using the mean absolute luminance difference between pixels newly joined by each removal. Report timings as observations but do not use them as a quality result.

## Consequences

- Existing behavior remains available and is still the default.
- Users can inspect how an alternative objective changes the selected seam.
- The benchmark is deterministic in image content and requested work, but elapsed time varies by machine and run.
- The disruption proxy directly matches the forward objective, so it is useful for implementation validation but incomplete as an independent perceptual assessment.
- Natural-image semantics, user preference, and overall visual quality remain unmeasured.
