import "./style.css";

// --- Create UI Elements ---
const heading: HTMLElement = document.createElement("h1");
heading.textContent = "Sketchpad";

const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;

const clearButton: HTMLButtonElement = document.createElement("button");
clearButton.textContent = "Clear";

const undoButton: HTMLButtonElement = document.createElement("button");
undoButton.textContent = "Undo";

const redoButton: HTMLButtonElement = document.createElement("button");
redoButton.textContent = "Redo";

document.body.appendChild(heading);
document.body.appendChild(canvas);
document.body.appendChild(clearButton);
document.body.appendChild(undoButton);
document.body.appendChild(redoButton);

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

  constructor(startPoint: Point) {
    this.path.push(startPoint);
  }

  drag(point: Point) {
    this.path.push(point);
  }

  isValid(): boolean {
    return this.path.length > 1;
  }

  display(ctx: CanvasRenderingContext2D): void {
    // Destructure the path first.
    const [startPoint, ...restOfPath] = this.path;

    // Use the explicit, linter-friendly guard clause.
    // This proves to the linter that startPoint is a valid Point below.
    if (!startPoint || restOfPath.length === 0) {
      return;
    }

    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
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
// Our state now holds Drawable objects instead of raw points
const drawing: Drawable[] = [];
const redoStack: Drawable[] = [];
let currentCommand: MarkerLine | null = null; // The command currently being created
let isDrawing = false;

// --- Drawing Logic ---
function redraw() {
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // The redraw logic is now much simpler!
  // It just tells each object in the list to draw itself.
  for (const command of drawing) {
    command.display(ctx);
  }

  // Also draw the command currently in progress
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
    // Create a new command object instead of a simple array
    currentCommand = new MarkerLine(startPoint);
    redoStack.length = 0;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing || !currentCommand) return;
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // Add a point to the current command object
    currentCommand.drag(point);
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  const stopDrawing = () => {
    if (!isDrawing || !currentCommand) return;
    isDrawing = false;
    // If the command is valid, push the whole object onto the drawing stack
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

  canvas.addEventListener("drawing-changed", redraw);
} else {
  console.error("Canvas context could not be found.");
}
