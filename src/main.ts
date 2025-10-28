import "./style.css";

// --- Create UI Elements ---
const heading: HTMLElement = document.createElement("h1");
heading.textContent = "Sketchpad";

const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;

const controls = document.createElement("div");
controls.className = "controls";

const thinButton: HTMLButtonElement = document.createElement("button");
thinButton.textContent = "Pen (Thin)";

const thickButton: HTMLButtonElement = document.createElement("button");
thickButton.textContent = "Pen (Thick)";

// --- Data-Driven Sticker UI ---
const availableStickers: string[] = ["⭐", "💖", "🔥"];

// A container to hold the dynamically generated stamp buttons.
const stickerButtonContainer = document.createElement("div");
stickerButtonContainer.className = "stamp-controls";

// The new button to add a custom stamp.
const addStickerButton: HTMLButtonElement = document.createElement("button");
addStickerButton.textContent = "Add Stamp 🎨";

const sliderContainer = document.createElement("div");
sliderContainer.className = "tool-options";

const sliderLabel = document.createElement("label");
sliderLabel.htmlFor = "tool-slider";
sliderLabel.textContent = "Pen Hue (0-360):"; // Initial state

const slider: HTMLInputElement = document.createElement("input");
slider.type = "range";
slider.id = "tool-slider";
slider.min = "0";
slider.max = "360";
slider.value = "0";

sliderContainer.appendChild(sliderLabel);
sliderContainer.appendChild(slider);

const clearButton: HTMLButtonElement = document.createElement("button");
clearButton.textContent = "Clear";

const undoButton: HTMLButtonElement = document.createElement("button");
undoButton.textContent = "Undo";

const redoButton: HTMLButtonElement = document.createElement("button");
redoButton.textContent = "Redo";

// --- New Export Button ---
const exportButton: HTMLButtonElement = document.createElement("button");
exportButton.textContent = "Export 🖼️";

// Append controls in logical order
controls.appendChild(thinButton);
controls.appendChild(thickButton);
controls.appendChild(stickerButtonContainer);
controls.appendChild(addStickerButton);
controls.appendChild(sliderContainer);
controls.appendChild(clearButton);
controls.appendChild(undoButton);
controls.appendChild(redoButton);
controls.appendChild(exportButton);

document.body.appendChild(heading);
document.body.appendChild(canvas);
document.body.appendChild(controls);

const ctx = canvas.getContext("2d");

// --- Data Structures & State ---
interface Point {
  x: number;
  y: number;
}

interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

// Dragable is an object that can be moved after creation
interface Draggable extends Drawable {
  drag(point: Point): void;
}

class penLine implements Draggable {
  private path: Point[] = [];
  private lineWidth: number;
  private color: string;

  constructor(startPoint: Point, lineWidth: number, color: string) {
    this.path.push(startPoint);
    this.lineWidth = lineWidth;
    this.color = color; // This will now correctly use the passed-in color
  }

  drag(point: Point) {
    this.path.push(point); // pen drag extends the path
  }

  isValid(): boolean {
    return this.path.length > 1;
  }

  display(ctx: CanvasRenderingContext2D): void {
    const [startPoint, ...restOfPath] = this.path;
    if (!startPoint || restOfPath.length === 0) return;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    for (const point of restOfPath) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}

class penPreview implements Drawable {
  constructor(
    private position: Point,
    private lineWidth: number,
    private color: string,
  ) {}

  display(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(
      this.position.x,
      this.position.y,
      this.lineWidth / 2,
      0,
      2 * Math.PI,
    );
    ctx.fill();
  }
}

class Sticker implements Draggable {
  constructor(
    private position: Point,
    private emoji: string,
    private rotation: number,
  ) {}

  drag(point: Point) {
    this.position = point;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation * (Math.PI / 180)); // Convert degrees to radians
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "black";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

class StickerPreview implements Drawable {
  constructor(
    private position: Point,
    private emoji: string,
    private rotation: number,
  ) {}

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation * (Math.PI / 180)); // Convert degrees to radians

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "black";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // FIX: Draw at (0, 0) relative to the translated/rotated context
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

// --- State Management ---
type Tool = "pen" | "stamp";
const drawing: Drawable[] = [];
const redoStack: Drawable[] = [];
let currentCommand: (penLine | Sticker) | null = null;
let toolPreview: Drawable | null = null;
let isDrawing = false;

let currentTool: Tool = "pen"; // Renamed
let currentLineWidth = 2;
let currentSticker = "🎨";
let selectedToolButton: HTMLButtonElement = thinButton;
selectedToolButton.classList.add("selectedTool");

// Single state variable for the slider (0-360)
let currentSetting = 0;

// --- Helper Functions ---
function getCurrentColor(): string {
  return `hsl(${currentSetting}, 100%, 50%)`;
}
function getPreviewColor(): string {
  return `hsla(${currentSetting}, 100%, 50%, 0.5)`;
}
function getCurrentRotation(): number {
  return currentSetting;
}

// --- Drawing Logic ---
function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const command of drawing) {
    command.display(ctx);
  }
  if (currentCommand) {
    currentCommand.display(ctx);
  }
  if (toolPreview) {
    toolPreview.display(ctx);
  }
}

// --- Tool Selection Logic ---
const selectTool = (
  button: HTMLButtonElement,
  tool: Tool,
  options: { lineWidth?: number; stamp?: string },
) => {
  if (selectedToolButton && document.body.contains(selectedToolButton)) {
    selectedToolButton.classList.remove("selectedTool");
  }
  currentTool = tool;
  if (options.lineWidth) currentLineWidth = options.lineWidth;
  if (options.stamp) currentSticker = options.stamp;
  button.classList.add("selectedTool");
  selectedToolButton = button;

  if (currentTool === "pen") {
    sliderLabel.textContent = "Pen Hue (0-360):";
  } else if (currentTool === "stamp") {
    sliderLabel.textContent = "Stamp Rotation (0-360):";
  }
};

// --- Data-Driven Button Generation ---
function regenerateStickerButtons() {
  stickerButtonContainer.innerHTML = ""; // Clear all old buttons

  // Re-create buttons from the data source
  for (const emoji of availableStickers) {
    const stickerButton = document.createElement("button");
    stickerButton.textContent = emoji;

    stickerButton.addEventListener("click", () => {
      selectTool(stickerButton, "stamp", { stamp: emoji });
    });

    stickerButtonContainer.appendChild(stickerButton);

    // If this is the currently active stamp, re-select its button
    if (currentTool === "stamp" && currentSticker === emoji) {
      selectTool(stickerButton, "stamp", { stamp: emoji });
    }
  }
}

// --- Export Logic ---
function exportDrawing() {
  // Temporarily create a new canvas object
  const exportCanvas = document.createElement("canvas");
  const exportSize = 1024;
  exportCanvas.width = exportSize;
  exportCanvas.height = exportSize;

  const exportCtx = exportCanvas.getContext("2d");
  if (!exportCtx) {
    console.error("Could not create export canvas context.");
    return;
  }

  // Add a white background, otherwise exported PNG will be transparent
  exportCtx.fillStyle = "white";
  exportCtx.fillRect(0, 0, exportSize, exportSize);

  // Scale the context to draw the 256x256 drawing onto the 1024x1024 canvas
  const scaleFactor = exportSize / canvas.width; // 1024 / 256 = 4
  exportCtx.scale(scaleFactor, scaleFactor);

  // Execute all items from the display list
  // We only draw items from the `drawing` array, not previews or in-progress commands.
  for (const command of drawing) {
    command.display(exportCtx);
  }

  // Trigger the file download
  const dataUrl = exportCanvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = "sketchpad-export.png";
  link.href = dataUrl;
  link.click();
}

// --- Event Listener Setup ---
if (ctx) {
  const rect = canvas.getBoundingClientRect();

  slider.addEventListener("input", (e) => {
    currentSetting = parseInt((e.target as HTMLInputElement).value, 10);
  });

  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    toolPreview = null;
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    redoStack.length = 0;

    if (currentTool === "pen") {
      currentCommand = new penLine(point, currentLineWidth, getCurrentColor());
    } else if (currentTool === "stamp") {
      currentCommand = new Sticker(point, currentSticker, getCurrentRotation());
    }
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  canvas.addEventListener("mousemove", (e) => {
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (isDrawing && currentCommand) {
      (currentCommand as Draggable).drag(point);
    } else {
      if (currentTool === "pen") {
        toolPreview = new penPreview(
          point,
          currentLineWidth,
          getPreviewColor(),
        );
      } else if (currentTool === "stamp") {
        toolPreview = new StickerPreview(
          point,
          currentSticker,
          getCurrentRotation(),
        );
      }
    }
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  const stopDrawing = () => {
    if (!isDrawing || !currentCommand) return;
    isDrawing = false;

    if (currentCommand instanceof penLine && currentCommand.isValid()) {
      drawing.push(currentCommand);
    } else if (currentCommand instanceof Sticker) {
      drawing.push(currentCommand);
    }

    currentCommand = null;
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  };

  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseleave", () => {
    if (isDrawing) stopDrawing();
    toolPreview = null;
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  clearButton.addEventListener("click", () => {
    drawing.length = 0;
    redoStack.length = 0;
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  undoButton.addEventListener("click", () => {
    if (drawing.length === 0) return;
    const commandToUndo = drawing.pop()!;
    redoStack.push(commandToUndo);
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  redoButton.addEventListener("click", () => {
    if (redoStack.length === 0) return;
    const commandToRedo = redoStack.pop()!;
    drawing.push(commandToRedo);
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  // --- Event Listener Registrations ---
  thinButton.addEventListener(
    "click",
    () => selectTool(thinButton, "pen", { lineWidth: 2 }),
  );
  thickButton.addEventListener(
    "click",
    () => selectTool(thickButton, "pen", { lineWidth: 10 }),
  );

  // --- Custom Sticker Logic ---
  addStickerButton.addEventListener("click", () => {
    const newSticker = prompt(
      "Enter your custom stamp (e.g., an emoji):",
      "✨",
    );

    // Check for a valid, non-empty, non-null string
    if (newSticker && newSticker.trim() !== "") {
      availableStickers.push(newSticker); // Add to data source
      regenerateStickerButtons(); // Re-render UI

      const newButton = stickerButtonContainer.lastChild as HTMLButtonElement;
      if (newButton) {
        selectTool(newButton, "stamp", { stamp: newSticker });
      }
    }
  });

  exportButton.addEventListener("click", exportDrawing);

  // Initial generation of stamp buttons on page load
  regenerateStickerButtons();

  canvas.addEventListener("drawing-changed", redraw);
} else {
  console.error("Canvas context could not be found.");
}
