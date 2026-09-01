const EDGE_ENERGY = 1_000_000;

export function assertImage(image) {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height)) {
    throw new TypeError("image must have integer width and height");
  }
  if (image.width < 1 || image.height < 1) {
    throw new RangeError("image dimensions must be positive");
  }
  if (!(image.data instanceof Uint8ClampedArray) || image.data.length !== image.width * image.height * 4) {
    throw new TypeError("image data must be a width × height RGBA Uint8ClampedArray");
  }
}

export function cloneImage(image) {
  assertImage(image);
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

function computeLuminance(image) {
  assertImage(image);
  const luminance = new Float64Array(image.width * image.height);
  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    luminance[index] = 0.2126 * image.data[offset]
      + 0.7152 * image.data[offset + 1]
      + 0.0722 * image.data[offset + 2];
  }
  return luminance;
}

function assertBias(bias, width, height) {
  if (bias !== null && (!(bias instanceof Float64Array) || bias.length !== width * height)) {
    throw new TypeError("bias must be a width × height Float64Array");
  }
}

export function computeEnergy(image, bias = null) {
  assertImage(image);
  const { width, height } = image;
  assertBias(bias, width, height);
  const luminance = computeLuminance(image);

  const energy = new Float64Array(width * height);
  const sample = (x, y) => luminance[y * width + x];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        energy[index] = EDGE_ENERGY + (bias?.[index] ?? 0);
        continue;
      }
      const gx =
        -sample(x - 1, y - 1) + sample(x + 1, y - 1)
        - 2 * sample(x - 1, y) + 2 * sample(x + 1, y)
        - sample(x - 1, y + 1) + sample(x + 1, y + 1);
      const gy =
        -sample(x - 1, y - 1) - 2 * sample(x, y - 1) - sample(x + 1, y - 1)
        + sample(x - 1, y + 1) + 2 * sample(x, y + 1) + sample(x + 1, y + 1);
      energy[index] = Math.hypot(gx, gy) + (bias?.[index] ?? 0);
    }
  }
  return energy;
}

export function findVerticalSeam(energy, width, height) {
  if (!(energy instanceof Float64Array) || energy.length !== width * height) {
    throw new TypeError("energy must be a width × height Float64Array");
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError("width and height must be positive integers");
  }

  const costs = new Float64Array(energy);
  const parents = new Int32Array(width * height);
  parents.fill(-1);

  for (let y = 1; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let bestX = x;
      let bestCost = costs[(y - 1) * width + x];
      if (x > 0) {
        const candidate = costs[(y - 1) * width + x - 1];
        if (candidate <= bestCost) {
          bestCost = candidate;
          bestX = x - 1;
        }
      }
      if (x + 1 < width) {
        const candidate = costs[(y - 1) * width + x + 1];
        if (candidate < bestCost) {
          bestCost = candidate;
          bestX = x + 1;
        }
      }
      const index = y * width + x;
      costs[index] += bestCost;
      parents[index] = bestX;
    }
  }

  let endX = 0;
  let totalEnergy = costs[(height - 1) * width];
  for (let x = 1; x < width; x += 1) {
    const candidate = costs[(height - 1) * width + x];
    if (candidate < totalEnergy) {
      totalEnergy = candidate;
      endX = x;
    }
  }

  const seam = new Int32Array(height);
  seam[height - 1] = endX;
  for (let y = height - 1; y > 0; y -= 1) {
    seam[y - 1] = parents[y * width + seam[y]];
  }
  return { seam, totalEnergy };
}

export function findVerticalForwardSeam(image, bias = null) {
  assertImage(image);
  const { width, height } = image;
  assertBias(bias, width, height);
  const luminance = computeLuminance(image);
  const costs = new Float64Array(width * height);
  const localCosts = new Float64Array(width * height);
  const parents = new Int32Array(width * height);
  parents.fill(-1);
  const sample = (x, y) => luminance[y * width + Math.max(0, Math.min(width - 1, x))];
  const localBase = (x, y) => {
    const boundary = x === 0 || y === 0 || x === width - 1 || y === height - 1;
    return (boundary ? EDGE_ENERGY : 0) + (bias?.[y * width + x] ?? 0);
  };

  for (let x = 0; x < width; x += 1) {
    const base = localBase(x, 0);
    costs[x] = base;
    localCosts[x] = base;
  }

  for (let y = 1; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const disruptionUp = Math.abs(sample(x + 1, y) - sample(x - 1, y));
      const disruptionLeft = disruptionUp + Math.abs(sample(x, y - 1) - sample(x - 1, y));
      const disruptionRight = disruptionUp + Math.abs(sample(x, y - 1) - sample(x + 1, y));

      let bestX = x;
      let bestCost = costs[(y - 1) * width + x] + disruptionUp;
      let localTransition = disruptionUp;
      if (x > 0) {
        const candidate = costs[(y - 1) * width + x - 1] + disruptionLeft;
        if (candidate <= bestCost) {
          bestCost = candidate;
          bestX = x - 1;
          localTransition = disruptionLeft;
        }
      }
      if (x + 1 < width) {
        const candidate = costs[(y - 1) * width + x + 1] + disruptionRight;
        if (candidate < bestCost) {
          bestCost = candidate;
          bestX = x + 1;
          localTransition = disruptionRight;
        }
      }

      const index = y * width + x;
      const base = localBase(x, y);
      costs[index] = base + bestCost;
      localCosts[index] = base + localTransition;
      parents[index] = bestX;
    }
  }

  let endX = 0;
  let totalEnergy = costs[(height - 1) * width];
  for (let x = 1; x < width; x += 1) {
    const candidate = costs[(height - 1) * width + x];
    if (candidate < totalEnergy) {
      totalEnergy = candidate;
      endX = x;
    }
  }

  const seam = new Int32Array(height);
  seam[height - 1] = endX;
  for (let y = height - 1; y > 0; y -= 1) {
    seam[y - 1] = parents[y * width + seam[y]];
  }
  return { seam, totalEnergy, energy: localCosts };
}

export function removeVerticalSeam(image, seam) {
  assertImage(image);
  const { width, height, data } = image;
  validateSeam(seam, width, height);
  if (width === 1) throw new RangeError("cannot remove a seam from a one-pixel-wide image");

  const output = new Uint8ClampedArray((width - 1) * height * 4);
  for (let y = 0; y < height; y += 1) {
    let targetX = 0;
    for (let x = 0; x < width; x += 1) {
      if (x === seam[y]) continue;
      const sourceOffset = (y * width + x) * 4;
      const targetOffset = (y * (width - 1) + targetX) * 4;
      output.set(data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
      targetX += 1;
    }
  }
  return { width: width - 1, height, data: output };
}

export function removeVerticalBias(bias, width, height, seam) {
  if (!(bias instanceof Float64Array) || bias.length !== width * height) {
    throw new TypeError("bias must be a width × height Float64Array");
  }
  validateSeam(seam, width, height);
  if (width === 1) throw new RangeError("cannot remove bias from a one-pixel-wide field");
  const output = new Float64Array((width - 1) * height);
  for (let y = 0; y < height; y += 1) {
    let targetX = 0;
    for (let x = 0; x < width; x += 1) {
      if (x === seam[y]) continue;
      output[y * (width - 1) + targetX] = bias[y * width + x];
      targetX += 1;
    }
  }
  return output;
}

export function transposeImage(image) {
  assertImage(image);
  const output = new Uint8ClampedArray(image.data.length);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const sourceOffset = (y * image.width + x) * 4;
      const targetOffset = (x * image.height + y) * 4;
      output.set(image.data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return { width: image.height, height: image.width, data: output };
}

export function transposeBias(bias, width, height) {
  if (!(bias instanceof Float64Array) || bias.length !== width * height) {
    throw new TypeError("bias must be a width × height Float64Array");
  }
  const output = new Float64Array(bias.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) output[x * height + y] = bias[y * width + x];
  }
  return output;
}

export function findSeam(image, bias, axis = "vertical", method = "backward") {
  if (method !== "backward" && method !== "forward") {
    throw new RangeError("method must be backward or forward");
  }
  if (axis === "vertical") {
    if (method === "forward") return findVerticalForwardSeam(image, bias);
    const energy = computeEnergy(image, bias);
    return { ...findVerticalSeam(energy, image.width, image.height), energy };
  }
  if (axis !== "horizontal") throw new RangeError("axis must be vertical or horizontal");
  const transposedImage = transposeImage(image);
  const transposedBias = transposeBias(bias, image.width, image.height);
  if (method === "forward") return findVerticalForwardSeam(transposedImage, transposedBias);
  const energy = computeEnergy(transposedImage, transposedBias);
  return { ...findVerticalSeam(energy, transposedImage.width, transposedImage.height), energy };
}

export function introducedAdjacencyCost(image, seam, axis = "vertical") {
  assertImage(image);
  if (axis === "horizontal") {
    return introducedAdjacencyCost(transposeImage(image), seam, "vertical");
  }
  if (axis !== "vertical") throw new RangeError("axis must be vertical or horizontal");
  validateSeam(seam, image.width, image.height);
  const luminance = computeLuminance(image);
  let total = 0;
  let joinedPixels = 0;
  for (let y = 0; y < image.height; y += 1) {
    const x = seam[y];
    if (x === 0 || x === image.width - 1) continue;
    total += Math.abs(luminance[y * image.width + x - 1] - luminance[y * image.width + x + 1]);
    joinedPixels += 1;
  }
  return { total, mean: joinedPixels === 0 ? 0 : total / joinedPixels, joinedPixels };
}

export function removeSeam(image, bias, seam, axis = "vertical") {
  if (axis === "vertical") {
    return {
      image: removeVerticalSeam(image, seam),
      bias: removeVerticalBias(bias, image.width, image.height, seam),
    };
  }
  if (axis !== "horizontal") throw new RangeError("axis must be vertical or horizontal");
  const transposedImage = transposeImage(image);
  const transposedBias = transposeBias(bias, image.width, image.height);
  const carvedImage = removeVerticalSeam(transposedImage, seam);
  const carvedBias = removeVerticalBias(transposedBias, transposedImage.width, transposedImage.height, seam);
  return {
    image: transposeImage(carvedImage),
    bias: transposeBias(carvedBias, carvedImage.width, carvedImage.height),
  };
}

export function validateTarget(image, targetWidth, targetHeight) {
  assertImage(image);
  if (!Number.isInteger(targetWidth) || !Number.isInteger(targetHeight)) {
    throw new TypeError("target dimensions must be integers");
  }
  if (targetWidth < 2 || targetHeight < 2) throw new RangeError("target dimensions must be at least 2 × 2");
  if (targetWidth > image.width || targetHeight > image.height) {
    throw new RangeError("SeamScope currently supports reduction only");
  }
}

export function paintBias(bias, width, height, centerX, centerY, radius, value) {
  if (!(bias instanceof Float64Array) || bias.length !== width * height) {
    throw new TypeError("bias must be a width × height Float64Array");
  }
  const next = new Float64Array(bias);
  const radiusSquared = radius * radius;
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radiusSquared) next[y * width + x] = value;
    }
  }
  return next;
}

function validateSeam(seam, width, height) {
  if (!(seam instanceof Int32Array) || seam.length !== height) {
    throw new TypeError("seam must be an Int32Array with one entry per row");
  }
  for (let y = 0; y < height; y += 1) {
    if (seam[y] < 0 || seam[y] >= width) throw new RangeError("seam coordinate is outside the image");
    if (y > 0 && Math.abs(seam[y] - seam[y - 1]) > 1) throw new RangeError("seam must be 8-connected");
  }
}

export const constants = { EDGE_ENERGY };
