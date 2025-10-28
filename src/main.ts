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
thinButton.textContent = "Thin";

const thickButton: HTMLButtonElement = document.createElement("button");
thickButton.textContent = "Thick";

// --- Data-Driven Sticker UI ---
const availableStickers: string[] = ["⭐", "💖", "🔥"];

// A container to hold the dynamically generated sticker buttons.
const stickerButtonContainer = document.createElement("div");
stickerButtonContainer.className = "sticker-controls";

// The new button to add a custom sticker.
const addStickerButton: HTMLButtonElement = document.createElement("button");
addStickerButton.textContent = "Add Sticker 🎨";

const clearButton: HTMLButtonElement = document.createElement("button");
clearButton.textContent = "Clear";

const undoButton: HTMLButtonElement = document.createElement("button");
undoButton.textContent = "Undo";

const redoButton: HTMLButtonElement = document.createElement("button");
redoButton.textContent = "Redo";

// Append controls in logical order
controls.appendChild(thinButton);
controls.appendChild(thickButton);
controls.appendChild(stickerButtonContainer); // Add the sticker container
controls.appendChild(addStickerButton); // Add the "add" button
controls.appendChild(clearButton);
controls.appendChild(undoButton);
controls.appendChild(redoButton);

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

class MarkerLine implements Draggable {
  private path: Point[] = [];
  private lineWidth: number;

  constructor(startPoint: Point, lineWidth: number) {
    this.path.push(startPoint);
    this.lineWidth = lineWidth;
  }

  drag(point: Point) {
    this.path.push(point); // Marker drag extends the path
  }

  isValid(): boolean {
    return this.path.length > 1;
  }

  display(ctx: CanvasRenderingContext2D): void {
    const [startPoint, ...restOfPath] = this.path;
    if (!startPoint || restOfPath.length === 0) return;

    ctx.strokeStyle = "black";
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

class MarkerPreview implements Drawable {
  constructor(private position: Point, private lineWidth: number) {}

  display(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
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
  constructor(private position: Point, private emoji: string) {}

  drag(point: Point) {
    this.position = point;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "black";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.position.x, this.position.y);
    ctx.restore();
  }
}

class StickerPreview implements Drawable {
  constructor(private position: Point, private emoji: string) {}

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "black";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.position.x, this.position.y);
    ctx.restore();
  }
}

// --- State Management ---
type Tool = "marker" | "sticker";
const drawing: Drawable[] = [];
const redoStack: Drawable[] = [];
let currentCommand: (MarkerLine | Sticker) | null = null;
let toolPreview: Drawable | null = null;
let isDrawing = false;

let currentTool: Tool = "marker";
let currentLineWidth = 3;
let currentSticker = "⭐"; // Default to the first sticker
let selectedToolButton: HTMLButtonElement = thinButton;
selectedToolButton.classList.add("selectedTool");

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

// --- Tool Selection Logic (Moved to Module Scope) ---
const selectTool = (
  button: HTMLButtonElement,
  tool: Tool,
  options: { lineWidth?: number; sticker?: string },
) => {
  // Make safer: check if the previously selected button still exists
  if (selectedToolButton && document.body.contains(selectedToolButton)) {
    selectedToolButton.classList.remove("selectedTool");
  }
  currentTool = tool;
  if (options.lineWidth) currentLineWidth = options.lineWidth;
  if (options.sticker) currentSticker = options.sticker;
  button.classList.add("selectedTool");
  selectedToolButton = button;
};

// --- Data-Driven Button Generation (Moved to Module Scope) ---
function regenerateStickerButtons() {
  stickerButtonContainer.innerHTML = ""; // Clear all old buttons

  // Re-create buttons from the data source
  for (const emoji of availableStickers) {
    const stickerButton = document.createElement("button");
    stickerButton.textContent = emoji;

    stickerButton.addEventListener("click", () => {
      selectTool(stickerButton, "sticker", { sticker: emoji });
    });

    stickerButtonContainer.appendChild(stickerButton);

    // If this is the currently active sticker, re-select its button
    if (currentTool === "sticker" && currentSticker === emoji) {
      selectTool(stickerButton, "sticker", { sticker: emoji });
    }
  }
}

// --- Event Listener Setup ---
if (ctx) {
  const rect = canvas.getBoundingClientRect();

  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    toolPreview = null;
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    redoStack.length = 0;

    if (currentTool === "marker") {
      currentCommand = new MarkerLine(point, currentLineWidth);
    } else if (currentTool === "sticker") {
      currentCommand = new Sticker(point, currentSticker);
    }
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  canvas.addEventListener("mousemove", (e) => {
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (isDrawing && currentCommand) {
      (currentCommand as Draggable).drag(point);
    } else {
      if (currentTool === "marker") {
        toolPreview = new MarkerPreview(point, currentLineWidth);
      } else if (currentTool === "sticker") {
        toolPreview = new StickerPreview(point, currentSticker);
      }
    }
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  const stopDrawing = () => {
    if (!isDrawing || !currentCommand) return;
    isDrawing = false;

    if (currentCommand instanceof MarkerLine && currentCommand.isValid()) {
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
    () => selectTool(thinButton, "marker", { lineWidth: 3 }),
  );
  thickButton.addEventListener(
    "click",
    () => selectTool(thickButton, "marker", { lineWidth: 8 }),
  );

  // --- Custom Sticker Logic ---
  addStickerButton.addEventListener("click", () => {
    const newSticker = prompt(
      "Enter your custom sticker (e.g., an emoji):",
      "✨",
    );

    // Check for a valid, non-empty, non-null string
    if (newSticker && newSticker.trim() !== "") {
      availableStickers.push(newSticker); // 1. Add to data source
      regenerateStickerButtons(); // 2. Re-render UI

      // 3. Automatically select the new sticker for a good user experience
      const newButton = stickerButtonContainer.lastChild as HTMLButtonElement;
      if (newButton) {
        selectTool(newButton, "sticker", { sticker: newSticker });
      }
    }
  });

  // Initial generation of sticker buttons on page load
  regenerateStickerButtons();

  canvas.addEventListener("drawing-changed", redraw);
} else {
  console.error("Canvas context could not be found.");
}
