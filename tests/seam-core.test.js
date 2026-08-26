import test from "node:test";
import assert from "node:assert/strict";
import {
  computeEnergy,
  findVerticalSeam,
  paintBias,
  removeSeam,
  removeVerticalSeam,
  transposeImage,
  validateTarget,
} from "../src/seam-core.js";

function imageFromValues(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  rows.flat().forEach((value, index) => data.set([value, value, value, 255], index * 4));
  return { width, height, data };
}

test("Sobel energy gives borders a protective sentinel", () => {
  const image = imageFromValues([[0, 0, 0], [0, 255, 0], [0, 0, 0]]);
  const energy = computeEnergy(image, new Float64Array(9));
  assert.equal(energy[0], 1_000_000);
  assert.equal(energy[4], 0);
});

test("vertical seam follows the minimum connected path", () => {
  const energy = new Float64Array([
    8, 1, 8,
    1, 8, 8,
    1, 8, 8,
  ]);
  const result = findVerticalSeam(energy, 3, 3);
  assert.deepEqual([...result.seam], [1, 0, 0]);
  assert.equal(result.totalEnergy, 3);
});

test("vertical seam removal preserves remaining pixel order", () => {
  const image = imageFromValues([[1, 2, 3], [4, 5, 6]]);
  const carved = removeVerticalSeam(image, new Int32Array([1, 1]));
  assert.equal(carved.width, 2);
  assert.deepEqual([carved.data[0], carved.data[4], carved.data[8], carved.data[12]], [1, 3, 4, 6]);
});

test("transpose swaps axes without changing pixels", () => {
  const image = imageFromValues([[1, 2, 3], [4, 5, 6]]);
  const transposed = transposeImage(image);
  assert.equal(transposed.width, 2);
  assert.equal(transposed.height, 3);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((index) => transposed.data[index * 4]), [1, 4, 2, 5, 3, 6]);
});

test("horizontal seam removal uses the same verified vertical primitive", () => {
  const image = imageFromValues([[1, 2], [3, 4], [5, 6]]);
  const bias = new Float64Array(6);
  const result = removeSeam(image, bias, new Int32Array([1, 1]), "horizontal");
  assert.equal(result.image.height, 2);
  assert.deepEqual([0, 1, 2, 3].map((index) => result.image.data[index * 4]), [1, 2, 5, 6]);
});

test("painted bias changes only pixels inside the brush", () => {
  const painted = paintBias(new Float64Array(25), 5, 5, 2, 2, 1.1, 42);
  assert.equal(painted[2 * 5 + 2], 42);
  assert.equal(painted[2 * 5 + 1], 42);
  assert.equal(painted[0], 0);
});

test("large protection bias steers the seam away", () => {
  const image = imageFromValues(Array.from({ length: 5 }, () => [50, 50, 50, 50, 50]));
  let bias = new Float64Array(25);
  for (let y = 0; y < 5; y += 1) bias[y * 5 + 1] = 2_000_000;
  const energy = computeEnergy(image, bias);
  const seam = findVerticalSeam(energy, 5, 5).seam;
  assert.ok([...seam].every((x) => x !== 1));
});

test("targets reject enlargement and one-pixel results", () => {
  const image = imageFromValues([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
  assert.doesNotThrow(() => validateTarget(image, 2, 2));
  assert.throws(() => validateTarget(image, 4, 2), /reduction only/);
  assert.throws(() => validateTarget(image, 1, 2), /at least 2/);
});
