# Decision 0001: Browser-native reference implementation

Date: 2026-08-26
Status: Accepted

## Context

The selected project needed to be visual, useful, distinct from the existing Python-heavy CV benchmark portfolio, and verifiable in one run. Rust would have varied the stack further, but the required toolchain was unavailable.

## Decision

Use standards-based HTML, CSS, Canvas 2D, and ECMAScript modules with no runtime dependencies. Keep the seam-carving algorithm in a pure module and verify it through Node's built-in test runner.

## Consequences

- The app runs locally without package installation and user images never need a server upload.
- The same code is readable in the browser and directly testable in Node.
- Common browser image formats are available through native decoding.
- Intensive work runs on the main thread; input dimensions are therefore capped for responsiveness.
- Native packaging and SIMD acceleration are deferred.
