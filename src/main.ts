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

// New UI Elements for Step 8
const starButton: HTMLButtonElement = document.createElement("button");
starButton.textContent = "⭐";
const heartButton: HTMLButtonElement = document.createElement("button");
heartButton.textContent = "💖";
const fireButton: HTMLButtonElement = document.createElement("button");
fireButton.textContent = "🔥";

const clearButton: HTMLButtonElement = document.createElement("button");
clearButton.textContent = "Clear";

const undoButton: HTMLButtonElement = document.createElement("button");
undoButton.textContent = "Undo";

const redoButton: HTMLButtonElement = document.createElement("button");
redoButton.textContent = "Redo";

controls.appendChild(thinButton);
controls.appendChild(thickButton);
controls.appendChild(starButton);
controls.appendChild(heartButton);
controls.appendChild(fireButton);
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

// New class for Step 8: Represents a placed sticker
class Sticker implements Draggable {
  constructor(private position: Point, private emoji: string) {}

  drag(point: Point) {
    this.position = point;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 1.0;
    // FIX: Explicitly set the fill style to an opaque color.
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
    ctx.globalAlpha = 0.5; // This still makes the preview transparent
    // BEST PRACTICE: Set the base color here too for consistency.
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
let currentSticker = "⭐";
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

// --- Event Listener Setup ---
if (ctx) {
  const rect = canvas.getBoundingClientRect();

  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    toolPreview = null; // Hide preview when action starts
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
      // If drawing, drag the current command (line or sticker)
      (currentCommand as Draggable).drag(point);
    } else {
      // If not drawing, update the appropriate tool preview
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

    // Check if the command is valid before pushing
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

  // --- Tool Selection Logic ---
  const selectTool = (
    button: HTMLButtonElement,
    tool: Tool,
    options: { lineWidth?: number; sticker?: string },
  ) => {
    selectedToolButton.classList.remove("selectedTool");
    currentTool = tool;
    if (options.lineWidth) currentLineWidth = options.lineWidth;
    if (options.sticker) currentSticker = options.sticker;
    button.classList.add("selectedTool");
    selectedToolButton = button;
  };

  thinButton.addEventListener(
    "click",
    () => selectTool(thinButton, "marker", { lineWidth: 3 }),
  );
  thickButton.addEventListener(
    "click",
    () => selectTool(thickButton, "marker", { lineWidth: 8 }),
  );
  starButton.addEventListener(
    "click",
    () => selectTool(starButton, "sticker", { sticker: "⭐" }),
  );
  heartButton.addEventListener(
    "click",
    () => selectTool(heartButton, "sticker", { sticker: "💖" }),
  );
  fireButton.addEventListener(
    "click",
    () => selectTool(fireButton, "sticker", { sticker: "🔥" }),
  );

  canvas.addEventListener("drawing-changed", redraw);
} else {
  console.error("Canvas context could not be found.");
}
