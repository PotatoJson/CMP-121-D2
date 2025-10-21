import "./style.css";

// --- Create UI Elements ---
const heading: HTMLElement = document.createElement("h1");
heading.textContent = "Sketchpad";

const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;

const controls = document.createElement("div");

const clearButton: HTMLButtonElement = document.createElement("button");
clearButton.textContent = "Clear";

const undoButton: HTMLButtonElement = document.createElement("button");
undoButton.textContent = "Undo";

const redoButton: HTMLButtonElement = document.createElement("button");
redoButton.textContent = "Redo";

const thinButton: HTMLButtonElement = document.createElement("button");
thinButton.textContent = "Thin";

const thickButton: HTMLButtonElement = document.createElement("button");
thickButton.textContent = "Thick";

controls.appendChild(thinButton);
controls.appendChild(thickButton);
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

class MarkerLine implements Drawable {
  private path: Point[] = [];
  private lineWidth: number;

  constructor(startPoint: Point, lineWidth: number) {
    this.path.push(startPoint);
    this.lineWidth = lineWidth;
  }

  drag(point: Point) {
    this.path.push(point);
  }

  isValid(): boolean {
    return this.path.length > 1;
  }

  display(ctx: CanvasRenderingContext2D): void {
    const [startPoint, ...restOfPath] = this.path;
    if (!startPoint || restOfPath.length === 0) {
      return;
    }

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

// New class for Step 7: The tool preview circle
class ToolPreview implements Drawable {
  constructor(private position: Point, private lineWidth: number) {}

  display(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; // Semi-transparent black
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

// --- State Management ---
const drawing: Drawable[] = [];
const redoStack: Drawable[] = [];
let currentCommand: MarkerLine | null = null;
let isDrawing = false;
let currentLineWidth = 3;
let selectedToolButton = thinButton;
selectedToolButton.classList.add("selectedTool");

// New state for Step 7
let toolPreview: ToolPreview | null = null;

// --- Drawing Logic ---
function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw completed commands
  for (const command of drawing) {
    command.display(ctx);
  }
  // Draw the command currently being created
  if (currentCommand) {
    currentCommand.display(ctx);
  }
  // Draw the tool preview on top, if it exists
  if (toolPreview) {
    toolPreview.display(ctx);
  }
}

// --- Event Listener Setup ---
if (ctx) {
  const rect = canvas.getBoundingClientRect();

  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    toolPreview = null; // Hide preview when drawing starts
    const startPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    currentCommand = new MarkerLine(startPoint, currentLineWidth);
    redoStack.length = 0;
    canvas.dispatchEvent(new CustomEvent("drawing-changed")); // Redraw to remove preview
  });

  canvas.addEventListener("mousemove", (e) => {
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (isDrawing && currentCommand) {
      // If drawing, extend the current line
      currentCommand.drag(point);
    } else {
      // If not drawing, update the tool preview's position
      toolPreview = new ToolPreview(point, currentLineWidth);
    }
    // Trigger a redraw for either action
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  const stopDrawing = () => {
    if (!isDrawing || !currentCommand) return;
    isDrawing = false;
    if (currentCommand.isValid()) {
      drawing.push(currentCommand);
    }
    currentCommand = null;
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  };

  canvas.addEventListener("mouseup", stopDrawing);

  canvas.addEventListener("mouseleave", () => {
    // If drawing when mouse leaves, finish the line
    if (isDrawing) {
      stopDrawing();
    }
    // Always hide the preview when the mouse leaves the canvas
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

  const selectTool = (toolButton: HTMLButtonElement, lineWidth: number) => {
    if (selectedToolButton) {
      selectedToolButton.classList.remove("selectedTool");
    }
    currentLineWidth = lineWidth;
    toolButton.classList.add("selectedTool");
    selectedToolButton = toolButton;
  };

  thinButton.addEventListener("click", () => selectTool(thinButton, 3));
  thickButton.addEventListener("click", () => selectTool(thickButton, 8));

  canvas.addEventListener("drawing-changed", redraw);
} else {
  console.error("Canvas context could not be found.");
}
