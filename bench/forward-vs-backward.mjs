import { performance } from "node:perf_hooks";
import {
  findSeam,
  introducedAdjacencyCost,
  removeSeam,
} from "../src/seam-core.js";

function generatedImage(width, height, pixelAt) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = pixelAt(x, y);
      const [red, green, blue] = Array.isArray(value) ? value : [value, value, value];
      data.set([red, green, blue, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

const fixtures = [
  {
    name: "staggered-columns",
    axis: "vertical",
    seams: 14,
    create: () => generatedImage(96, 64, (x, y) => {
      const shiftedX = x + Math.floor(y / 8) * 3;
      const band = Math.floor(shiftedX / 12) % 2;
      const rail = y % 16 < 3 ? 42 : 0;
      return band ? [214 - rail, 224 - rail, 206 - rail] : [48 + rail, 71 + rail, 66 + rail];
    }),
  },
  {
    name: "diagonal-ribbons",
    axis: "vertical",
    seams: 14,
    create: () => generatedImage(96, 64, (x, y) => {
      const ribbon = ((x + Math.floor(y * 1.4)) % 30 + 30) % 30;
      if (ribbon < 5) return [242, 190, 78];
      if (ribbon < 10) return [29, 52, 70];
      return [181, 207, 193];
    }),
  },
  {
    name: "stepped-horizon",
    axis: "horizontal",
    seams: 10,
    create: () => generatedImage(88, 60, (x, y) => {
      const shiftedY = y + Math.floor(x / 8) * 3;
      const band = Math.floor(shiftedY / 10) % 2;
      const post = x % 16 < 3 ? 36 : 0;
      return band ? [220 - post, 201 - post, 143 - post] : [45 + post, 74 + post, 91 + post];
    }),
  },
];

function carveFixture(fixture, method) {
  let image = fixture.create();
  let bias = new Float64Array(image.width * image.height);
  let totalIntroducedLuminance = 0;
  let joinedPixels = 0;
  const started = performance.now();
  for (let step = 0; step < fixture.seams; step += 1) {
    const result = findSeam(image, bias, fixture.axis, method);
    const disruption = introducedAdjacencyCost(image, result.seam, fixture.axis);
    totalIntroducedLuminance += disruption.total;
    joinedPixels += disruption.joinedPixels;
    ({ image, bias } = removeSeam(image, bias, result.seam, fixture.axis));
  }
  const elapsedMs = performance.now() - started;
  const expectedWidth = fixture.axis === "vertical" ? fixture.create().width - fixture.seams : fixture.create().width;
  const expectedHeight = fixture.axis === "horizontal" ? fixture.create().height - fixture.seams : fixture.create().height;
  if (image.width !== expectedWidth || image.height !== expectedHeight) {
    throw new Error(`${method} ${fixture.name} ended at an unexpected size`);
  }
  return {
    totalIntroducedLuminance,
    joinedPixels,
    meanIntroducedLuminance: joinedPixels === 0 ? 0 : totalIntroducedLuminance / joinedPixels,
    elapsedMs,
    finalSize: `${image.width}x${image.height}`,
  };
}

const results = fixtures.map((fixture) => {
  const source = fixture.create();
  const backward = carveFixture(fixture, "backward");
  const forward = carveFixture(fixture, "forward");
  return {
    fixture: fixture.name,
    axis: fixture.axis,
    seams: fixture.seams,
    sourceSize: `${source.width}x${source.height}`,
    backward,
    forward,
    forwardToBackwardDisruptionRatio: backward.meanIntroducedLuminance === 0
      ? null
      : forward.meanIntroducedLuminance / backward.meanIntroducedLuminance,
  };
});

const totals = results.reduce((summary, result) => {
  summary.backwardCost += result.backward.totalIntroducedLuminance;
  summary.backwardJoins += result.backward.joinedPixels;
  summary.forwardCost += result.forward.totalIntroducedLuminance;
  summary.forwardJoins += result.forward.joinedPixels;
  return summary;
}, { backwardCost: 0, backwardJoins: 0, forwardCost: 0, forwardJoins: 0 });

const backwardMean = totals.backwardCost / totals.backwardJoins;
const forwardMean = totals.forwardCost / totals.forwardJoins;
const report = {
  schemaVersion: 1,
  seed: 20260901,
  metric: "mean absolute luminance difference between newly adjacent pixels",
  interpretation: "Lower values indicate less local adjacency disruption. This is not a perceptual-quality score.",
  results,
  summary: {
    backwardMeanIntroducedLuminance: backwardMean,
    forwardMeanIntroducedLuminance: forwardMean,
    forwardToBackwardDisruptionRatio: forwardMean / backwardMean,
  },
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.table(results.map((result) => ({
    fixture: result.fixture,
    axis: result.axis,
    seams: result.seams,
    backwardDisruption: result.backward.meanIntroducedLuminance.toFixed(3),
    forwardDisruption: result.forward.meanIntroducedLuminance.toFixed(3),
    ratio: result.forwardToBackwardDisruptionRatio?.toFixed(3) ?? "n/a",
    backwardMs: result.backward.elapsedMs.toFixed(2),
    forwardMs: result.forward.elapsedMs.toFixed(2),
  })));
  console.log(report.interpretation);
}
