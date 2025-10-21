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

// New UI Elements for Step 6
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
  // Store the thickness for this specific line
  private lineWidth: number;

  // The constructor now accepts a line width
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
    // Use the line width stored in this object
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

// --- State Management ---
const drawing: Drawable[] = [];
const redoStack: Drawable[] = [];
let currentCommand: MarkerLine | null = null;
let isDrawing = false;

// New state for Step 6
let currentLineWidth = 3; // Default to thin
let selectedToolButton = thinButton; // Default to the thin button
selectedToolButton.classList.add("selectedTool"); // Set initial visual feedback

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
}

// --- Event Listener Setup ---
if (ctx) {
  const rect = canvas.getBoundingClientRect();

  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    const startPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // Pass the currently selected line width to the command's constructor
    currentCommand = new MarkerLine(startPoint, currentLineWidth);
    redoStack.length = 0;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing || !currentCommand) return;
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    currentCommand.drag(point);
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
  canvas.addEventListener("mouseleave", stopDrawing);

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

  // --- New Tool Selection Logic for Step 6 ---
  const selectTool = (toolButton: HTMLButtonElement, lineWidth: number) => {
    // Remove highlight from the previously selected button
    if (selectedToolButton) {
      selectedToolButton.classList.remove("selectedTool");
    }
    // Set the new line width
    currentLineWidth = lineWidth;
    // Highlight the new button and update the state
    toolButton.classList.add("selectedTool");
    selectedToolButton = toolButton;
  };

  thinButton.addEventListener("click", () => selectTool(thinButton, 3));
  thickButton.addEventListener("click", () => selectTool(thickButton, 8));

  canvas.addEventListener("drawing-changed", redraw);
} else {
  console.error("Canvas context could not be found.");
}
