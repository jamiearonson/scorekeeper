import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };

const STROKE_COLOR = "#111827"; // gray-900 — reads like a marker on white
const STROKE_WIDTH = 5;

// A fullscreen white canvas you write on with a finger or stylus — a stand-in for the
// dry-erase board in games like Blank Slate. Nothing is stored or synced; closing it
// throws the scribble away, same as wiping a board clean.
export function ScratchPad({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Strokes are kept in CSS pixels so they survive resize/orientation changes; we
  // replay them on every redraw instead of snapshotting bitmap data.
  const strokesRef = useRef<Point[][]>([]);
  const drawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hidden, setHidden] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = canvas;
    // Only resize the backing store when it drifts — resizing clears the canvas.
    if (canvas.width !== clientWidth * dpr || canvas.height !== clientHeight * dpr) {
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, clientWidth, clientHeight);
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      if (stroke.length === 1) {
        // A tap — draw a dot so single touches leave a mark.
        ctx.lineTo(stroke[0].x + 0.1, stroke[0].y);
      } else {
        for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, []);

  // Size to the viewport on mount and whenever it changes (rotation, keyboard, etc.).
  useLayoutEffect(() => {
    redraw();
    window.addEventListener("resize", redraw);
    window.addEventListener("orientationchange", redraw);
    return () => {
      window.removeEventListener("resize", redraw);
      window.removeEventListener("orientationchange", redraw);
    };
  }, [redraw]);

  // Close on Escape for desktop/stylus convenience.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pointFrom(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (hidden) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    strokesRef.current.push([pointFrom(e)]);
    setIsEmpty(false);
    redraw();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    // Coalesced events give smoother lines on high-frequency touch/stylus input.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const rect = e.currentTarget.getBoundingClientRect();
    for (const ev of events) {
      stroke.push({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
    }
    redraw();
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleUndo() {
    strokesRef.current.pop();
    setIsEmpty(strokesRef.current.length === 0);
    redraw();
  }

  function handleClear() {
    strokesRef.current = [];
    setIsEmpty(true);
    redraw();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 size-full touch-none"
      />

      {/* Opaque cover so neighbours can't peek before the reveal. */}
      {hidden && (
        <button
          type="button"
          onClick={() => setHidden(false)}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gray-900 text-white"
        >
          <Eye className="size-8" />
          <span className="text-base font-medium">Tap to reveal</span>
        </button>
      )}

      {/* Toolbar floats over the canvas, clear of the notch. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button
          variant="secondary"
          size="icon-lg"
          className="pointer-events-auto shadow"
          onClick={onClose}
          aria-label="Close scratch pad"
        >
          <X className="size-5" />
        </Button>
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon-lg"
            className="shadow"
            onClick={() => setHidden((h) => !h)}
            aria-label={hidden ? "Reveal" : "Hide"}
          >
            {hidden ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
          </Button>
          <Button
            variant="secondary"
            size="icon-lg"
            className="shadow"
            onClick={handleUndo}
            disabled={isEmpty || hidden}
            aria-label="Undo"
          >
            <Undo2 className="size-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon-lg"
            className="shadow"
            onClick={handleClear}
            disabled={isEmpty || hidden}
            aria-label="Clear"
          >
            <Trash2 className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
