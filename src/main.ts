import "./style.css";

// --- Create UI Elements ---
const heading: HTMLHeadingElement = document.createElement("h1");
heading.textContent = "Sketchpad";

const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;

const clearButton: HTMLButtonElement = document.createElement("button");
clearButton.textContent = "Clear";

// New UI Elements for Step 4
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

const drawing: Point[][] = [];
// New state for Step 4: A stack to hold undone paths
const redoStack: Point[][] = [];
let currentPath: Point[] = [];
let isDrawing = false;

// --- Drawing Logic ---
function redraw() {
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const allPaths = [...drawing, currentPath];

  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const path of allPaths) {
    const [startPoint, ...restOfPath] = path;
    if (!startPoint || restOfPath.length === 0) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);

    for (const point of restOfPath) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}

// --- Event Listener Setup ---
if (ctx) {
  const rect = canvas.getBoundingClientRect();

  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    currentPath = [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
    // IMPORTANT: A new drawing action clears the redo history.
    redoStack.length = 0;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    currentPath.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  const stopDrawing = () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentPath.length > 1) {
      drawing.push(currentPath);
    }
    currentPath = [];
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  };

  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseleave", stopDrawing);

  clearButton.addEventListener("click", () => {
    drawing.length = 0;
    // Also clear the redo stack when clearing the canvas
    redoStack.length = 0;
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  // --- New Logic for Step 4 ---
  undoButton.addEventListener("click", () => {
    // Can't undo if there's nothing to undo
    if (drawing.length === 0) {
      return;
    }
    // Pop the last path from the main drawing
    const pathToUndo = drawing.pop()!;
    // Push that undone path onto the redo stack
    redoStack.push(pathToUndo);
    // Trigger a redraw
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  redoButton.addEventListener("click", () => {
    // Can't redo if the redo stack is empty
    if (redoStack.length === 0) {
      return;
    }
    // Pop the last undone path from the redo stack
    const pathToRedo = redoStack.pop()!;
    // Push it back onto the main drawing
    drawing.push(pathToRedo);
    // Trigger a redraw
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  });

  // --- Observer Setup ---
  canvas.addEventListener("drawing-changed", redraw);
} else {
  console.error("Canvas context could not be found.");
}
