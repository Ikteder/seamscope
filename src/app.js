import {
  cloneImage,
  computeEnergy,
  findSeam,
  paintBias,
  removeSeam,
  validateTarget,
} from "./seam-core.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  imageCanvas: $("#image-canvas"),
  energyCanvas: $("#energy-canvas"),
  fileInput: $("#file-input"),
  demoButton: $("#demo-button"),
  targetWidth: $("#target-width"),
  targetHeight: $("#target-height"),
  brushSize: $("#brush-size"),
  brushOutput: $("#brush-output"),
  previewButton: $("#preview-button"),
  removeButton: $("#remove-button"),
  runButton: $("#run-button"),
  undoButton: $("#undo-button"),
  resetButton: $("#reset-button"),
  exportButton: $("#export-button"),
  dimensions: $("#dimensions"),
  removedCount: $("#removed-count"),
  pathCost: $("#path-cost"),
  computeTime: $("#compute-time"),
  status: $("#status"),
  imageName: $("#image-name"),
};

const state = {
  source: null,
  image: null,
  bias: null,
  preview: null,
  history: [],
  removed: 0,
  imageName: "Generated landscape",
  painting: false,
  running: false,
  cancelRequested: false,
};

function selectedAxis() {
  return document.querySelector('input[name="axis"]:checked').value;
}

function selectedMethod() {
  return document.querySelector('input[name="method"]:checked').value;
}

function selectedBrush() {
  return document.querySelector('input[name="brush"]:checked').value;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function setImage(image, name) {
  state.source = cloneImage(image);
  state.image = cloneImage(image);
  state.bias = new Float64Array(image.width * image.height);
  state.preview = null;
  state.history = [];
  state.removed = 0;
  state.imageName = name;
  elements.targetWidth.value = Math.max(2, image.width - Math.min(80, Math.floor(image.width * 0.16)));
  elements.targetHeight.value = Math.max(2, image.height - Math.min(50, Math.floor(image.height * 0.12)));
  updateTargetBounds();
  render();
}

function updateTargetBounds() {
  elements.targetWidth.max = state.image.width;
  elements.targetHeight.max = state.image.height;
}

function generateDemo() {
  const canvas = document.createElement("canvas");
  canvas.width = 520;
  canvas.height = 340;
  const context = canvas.getContext("2d");
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#8dc9c0");
  sky.addColorStop(0.58, "#d9e5c5");
  sky.addColorStop(1, "#e7b176");
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(255,242,171,.92)";
  context.beginPath();
  context.arc(403, 80, 40, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255,255,255,.46)";
  for (const [x, y, rx] of [[64, 67, 48], [105, 58, 58], [300, 112, 53]]) {
    context.beginPath(); context.ellipse(x, y, rx, 11, 0, 0, Math.PI * 2); context.fill();
  }

  context.fillStyle = "#6b8d75";
  context.beginPath(); context.moveTo(0, 210); context.quadraticCurveTo(105, 110, 230, 208); context.quadraticCurveTo(390, 100, 520, 211); context.lineTo(520, 340); context.lineTo(0, 340); context.fill();
  context.fillStyle = "#315f50";
  context.beginPath(); context.moveTo(0, 248); context.quadraticCurveTo(150, 158, 310, 249); context.quadraticCurveTo(410, 182, 520, 242); context.lineTo(520, 340); context.lineTo(0, 340); context.fill();
  context.fillStyle = "#c8955f";
  context.beginPath(); context.moveTo(0, 304); context.quadraticCurveTo(230, 258, 520, 296); context.lineTo(520, 340); context.lineTo(0, 340); context.fill();

  context.fillStyle = "#142f28";
  context.fillRect(153, 170, 14, 122);
  for (const [x, y, r] of [[160, 145, 47], [130, 167, 34], [190, 169, 39], [159, 112, 30]]) {
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill();
  }

  context.strokeStyle = "#fff5d6";
  context.lineWidth = 6;
  context.lineCap = "round";
  context.beginPath(); context.arc(345, 252, 13, 0, Math.PI * 2); context.stroke();
  context.beginPath(); context.moveTo(345, 266); context.lineTo(345, 304); context.moveTo(345, 279); context.lineTo(326, 293); context.moveTo(345, 279); context.lineTo(362, 293); context.moveTo(345, 304); context.lineTo(331, 325); context.moveTo(345, 304); context.lineTo(361, 325); context.stroke();

  setImage(fromImageData(context.getImageData(0, 0, canvas.width, canvas.height)), "Generated landscape");
  setStatus("Demo regenerated. Paint the figure or tree to protect it, then preview a seam.");
}

function fromImageData(imageData) {
  return { width: imageData.width, height: imageData.height, data: new Uint8ClampedArray(imageData.data) };
}

function asImageData(image) {
  return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
}

function render() {
  if (!state.image) return;
  renderWorkingImage();
  renderEnergyMap();
  elements.dimensions.textContent = `${state.image.width} × ${state.image.height}`;
  elements.removedCount.textContent = String(state.removed);
  elements.imageName.textContent = state.imageName;
  elements.undoButton.disabled = state.history.length === 0 || state.running;
  elements.previewButton.disabled = state.running;
  elements.removeButton.disabled = state.running;
  elements.resetButton.disabled = state.running;
  elements.exportButton.disabled = state.running;
  document.querySelectorAll('input[name="axis"], input[name="method"]').forEach((input) => {
    input.disabled = state.running;
  });
  updateTargetBounds();
}

function renderWorkingImage() {
  const canvas = elements.imageCanvas;
  canvas.width = state.image.width;
  canvas.height = state.image.height;
  const context = canvas.getContext("2d");
  context.putImageData(asImageData(state.image), 0, 0);

  const overlay = context.createImageData(state.image.width, state.image.height);
  for (let index = 0; index < state.bias.length; index += 1) {
    if (state.bias[index] === 0) continue;
    const offset = index * 4;
    const protect = state.bias[index] > 0;
    overlay.data.set(protect ? [49, 196, 141, 112] : [255, 107, 87, 118], offset);
  }
  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = state.image.width;
  overlayCanvas.height = state.image.height;
  overlayCanvas.getContext("2d").putImageData(overlay, 0, 0);
  context.drawImage(overlayCanvas, 0, 0);

  if (state.preview) {
    const { seam, axis } = state.preview;
    context.save();
    context.strokeStyle = "#fffef9";
    context.shadowColor = "#17201b";
    context.shadowBlur = 3;
    context.lineWidth = Math.max(1.5, state.image.width / 320);
    context.beginPath();
    if (axis === "vertical") {
      context.moveTo(seam[0] + 0.5, 0);
      for (let y = 1; y < seam.length; y += 1) context.lineTo(seam[y] + 0.5, y + 0.5);
    } else {
      context.moveTo(0, seam[0] + 0.5);
      for (let x = 1; x < seam.length; x += 1) context.lineTo(x + 0.5, seam[x] + 0.5);
    }
    context.stroke();
    context.restore();
  }
}

function renderEnergyMap() {
  const energy = computeEnergy(state.image, state.bias);
  const canvas = elements.energyCanvas;
  canvas.width = state.image.width;
  canvas.height = state.image.height;
  const context = canvas.getContext("2d");
  const output = context.createImageData(canvas.width, canvas.height);
  let max = 1;
  for (const value of energy) {
    if (value < 900_000 && value > max) max = value;
  }
  for (let index = 0; index < energy.length; index += 1) {
    const clipped = Math.min(max, Math.max(0, energy[index]));
    const normalized = Math.log1p(clipped) / Math.log1p(max);
    const value = Math.round(normalized * 255);
    const offset = index * 4;
    output.data.set([value, value, value, 255], offset);
  }
  context.putImageData(output, 0, 0);
  if (!state.preview) return;
  context.save();
  context.strokeStyle = "#d8ff4f";
  context.lineWidth = Math.max(1.5, state.image.width / 320);
  context.beginPath();
  if (state.preview.axis === "vertical") {
    context.moveTo(state.preview.seam[0] + 0.5, 0);
    for (let y = 1; y < state.preview.seam.length; y += 1) context.lineTo(state.preview.seam[y] + 0.5, y + 0.5);
  } else {
    context.moveTo(0, state.preview.seam[0] + 0.5);
    for (let x = 1; x < state.preview.seam.length; x += 1) context.lineTo(x + 0.5, state.preview.seam[x] + 0.5);
  }
  context.stroke();
  context.restore();
}

function previewNext() {
  const axis = selectedAxis();
  const method = selectedMethod();
  if ((axis === "vertical" && state.image.width <= 2) || (axis === "horizontal" && state.image.height <= 2)) {
    setStatus("That dimension is already at the safe minimum of 2 pixels.");
    return null;
  }
  const started = performance.now();
  const result = findSeam(state.image, state.bias, axis, method);
  const elapsed = performance.now() - started;
  state.preview = { seam: result.seam, axis, method, totalEnergy: result.totalEnergy };
  elements.pathCost.textContent = formatCost(result.totalEnergy);
  elements.computeTime.textContent = `${elapsed.toFixed(1)} ms`;
  render();
  setStatus(`${method === "forward" ? "Forward" : "Backward"} ${axis} seam previewed. No pixels changed.`);
  return state.preview;
}

function formatCost(value) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

function pushHistory() {
  state.history.push({
    image: cloneImage(state.image),
    bias: new Float64Array(state.bias),
    removed: state.removed,
  });
  if (state.history.length > 20) state.history.shift();
}

function removeOne({ recordHistory = true, quiet = false } = {}) {
  const axis = selectedAxis();
  const method = selectedMethod();
  const limitReached = axis === "vertical" ? state.image.width <= 2 : state.image.height <= 2;
  if (limitReached) {
    if (!quiet) setStatus("That dimension is already at the safe minimum of 2 pixels.");
    return false;
  }
  if (recordHistory) pushHistory();
  const preview = state.preview?.axis === axis && state.preview?.method === method ? state.preview : previewNext();
  if (!preview) return false;
  const result = removeSeam(state.image, state.bias, preview.seam, axis);
  state.image = result.image;
  state.bias = result.bias;
  state.preview = null;
  state.removed += 1;
  if (!quiet) {
    render();
    setStatus(`Removed one ${method} ${axis} seam. Undo remains available.`);
  }
  return true;
}

async function runToTarget() {
  if (state.running) {
    state.cancelRequested = true;
    return;
  }
  const targetWidth = Number.parseInt(elements.targetWidth.value, 10);
  const targetHeight = Number.parseInt(elements.targetHeight.value, 10);
  const method = selectedMethod();
  try {
    validateTarget(state.image, targetWidth, targetHeight);
  } catch (error) {
    setStatus(error.message);
    return;
  }
  if (targetWidth === state.image.width && targetHeight === state.image.height) {
    setStatus("The target already matches the current image.");
    return;
  }

  pushHistory();
  state.running = true;
  state.cancelRequested = false;
  elements.runButton.textContent = "Stop run";
  render();
  const totalStarted = performance.now();
  let removedThisRun = 0;

  while (!state.cancelRequested && (state.image.width > targetWidth || state.image.height > targetHeight)) {
    const widthRemaining = state.image.width - targetWidth;
    const heightRemaining = state.image.height - targetHeight;
    const axis = widthRemaining / state.image.width >= heightRemaining / state.image.height ? "vertical" : "horizontal";
    document.querySelector(`input[name="axis"][value="${axis}"]`).checked = true;
    const result = findSeam(state.image, state.bias, axis, method);
    state.preview = { seam: result.seam, axis, method, totalEnergy: result.totalEnergy };
    const carved = removeSeam(state.image, state.bias, result.seam, axis);
    state.image = carved.image;
    state.bias = carved.bias;
    state.preview = null;
    state.removed += 1;
    removedThisRun += 1;
    if (removedThisRun % 3 === 0) {
      setStatus(`Carving… ${state.image.width} × ${state.image.height}`);
      render();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  const elapsed = performance.now() - totalStarted;
  state.running = false;
  elements.runButton.textContent = "Run to target";
  elements.computeTime.textContent = `${elapsed.toFixed(1)} ms total`;
  render();
  const methodLabel = method === "forward" ? "Forward energy" : "Backward energy";
  setStatus(state.cancelRequested ? `Stopped after ${removedThisRun} seams.` : `${methodLabel} target reached after ${removedThisRun} seams.`);
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return;
  state.image = previous.image;
  state.bias = previous.bias;
  state.removed = previous.removed;
  state.preview = null;
  render();
  setStatus("Previous image state restored.");
}

function reset() {
  if (!state.source) return;
  state.image = cloneImage(state.source);
  state.bias = new Float64Array(state.image.width * state.image.height);
  state.preview = null;
  state.history = [];
  state.removed = 0;
  elements.pathCost.textContent = "—";
  elements.computeTime.textContent = "—";
  elements.targetWidth.value = Math.max(2, state.image.width - Math.min(80, Math.floor(state.image.width * 0.16)));
  elements.targetHeight.value = Math.max(2, state.image.height - Math.min(50, Math.floor(state.image.height * 0.12)));
  render();
  setStatus("Source image restored and guidance mask cleared.");
}

function exportPng() {
  const canvas = document.createElement("canvas");
  canvas.width = state.image.width;
  canvas.height = state.image.height;
  canvas.getContext("2d").putImageData(asImageData(state.image), 0, 0);
  const link = document.createElement("a");
  link.download = "seamscope-result.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  setStatus("Exported the current pixels without guidance or seam overlays.");
}

async function loadFile(file) {
  if (!file?.type.startsWith("image/")) {
    setStatus("Choose a supported browser image file.");
    return;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(2, Math.round(bitmap.width * scale));
    const height = Math.max(2, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    setImage(fromImageData(context.getImageData(0, 0, width, height)), file.name);
    setStatus(scale < 1 ? `Loaded locally and scaled to ${width} × ${height} for interactive performance.` : "Loaded locally. The image never left this browser.");
  } catch (error) {
    setStatus(`Could not decode that image: ${error.message}`);
  }
}

function pointerPosition(event) {
  const bounds = elements.imageCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * (state.image.width / bounds.width),
    y: (event.clientY - bounds.top) * (state.image.height / bounds.height),
  };
}

function applyBrush(event) {
  if (!state.painting || state.running) return;
  const { x, y } = pointerPosition(event);
  const mode = selectedBrush();
  const value = mode === "protect" ? 2_000_000 : mode === "remove" ? -500_000 : 0;
  const radius = Number(elements.brushSize.value) * (state.image.width / elements.imageCanvas.getBoundingClientRect().width);
  state.bias = paintBias(state.bias, state.image.width, state.image.height, x, y, radius, value);
  state.preview = null;
  renderWorkingImage();
}

elements.fileInput.addEventListener("change", () => loadFile(elements.fileInput.files[0]));
elements.demoButton.addEventListener("click", generateDemo);
elements.previewButton.addEventListener("click", previewNext);
elements.removeButton.addEventListener("click", () => removeOne());
elements.runButton.addEventListener("click", runToTarget);
elements.undoButton.addEventListener("click", undo);
elements.resetButton.addEventListener("click", reset);
elements.exportButton.addEventListener("click", exportPng);
elements.brushSize.addEventListener("input", () => { elements.brushOutput.value = `${elements.brushSize.value} px`; });
document.querySelectorAll('input[name="axis"]').forEach((input) => input.addEventListener("change", () => {
  state.preview = null;
  render();
  setStatus(`${selectedAxis() === "vertical" ? "Width" : "Height"} reduction selected.`);
}));
document.querySelectorAll('input[name="method"]').forEach((input) => input.addEventListener("change", () => {
  state.preview = null;
  elements.pathCost.textContent = "—";
  elements.computeTime.textContent = "—";
  render();
  setStatus(`${selectedMethod() === "forward" ? "Forward" : "Backward"} energy selected. Preview the next seam before removing it.`);
}));
elements.imageCanvas.addEventListener("pointerdown", (event) => {
  if (state.running) return;
  state.painting = true;
  pushHistory();
  elements.imageCanvas.setPointerCapture(event.pointerId);
  applyBrush(event);
});
elements.imageCanvas.addEventListener("pointermove", applyBrush);
elements.imageCanvas.addEventListener("pointerup", (event) => {
  state.painting = false;
  elements.imageCanvas.releasePointerCapture(event.pointerId);
  render();
  setStatus(`${selectedBrush() === "protect" ? "Protection" : selectedBrush() === "remove" ? "Removal-priority" : "Erase"} mask updated.`);
});
elements.imageCanvas.addEventListener("pointercancel", () => { state.painting = false; });

generateDemo();
