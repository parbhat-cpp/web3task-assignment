import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import "./DrawingCanvas.css";
import { useSocket } from "../../hooks/useSocket";
import { useAtom } from "jotai";
import { roomAtom } from "../store/room.store";

type Tool = "pen" | "eraser";
type Point = { x: number; y: number };
type NormalizedPoint = { x: number; y: number };
type DrawStyle = { color: string; size: number; tool: Tool };
type DrawPayload =
  | ({ action: "start"; point: NormalizedPoint } & DrawStyle)
  | ({
      action: "segment";
      start: NormalizedPoint;
      control: NormalizedPoint;
      end: NormalizedPoint;
    } & DrawStyle)
  | ({
      action: "end";
      start: NormalizedPoint;
      end: NormalizedPoint;
    } & DrawStyle)
  | { action: "clear" };

type DrawingCanvasProps = {
  roomId: string;
  turnKey: string;
};

const SWATCHES = [
  "#111827",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#0ea5e9",
  "#6366f1",
  "#ec4899",
];

const SIZE_RANGE: Record<Tool, { min: number; max: number }> = {
  pen: { min: 1, max: 48 },
  eraser: { min: 4, max: 96 },
};

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const PenIcon = () => (
  <svg {...iconProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const EraserIcon = () => (
  <svg {...iconProps}>
    <path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 21" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </svg>
);
const PaletteIcon = () => (
  <svg {...iconProps}>
    <circle cx="13.5" cy="6.5" r=".6" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".6" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".6" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".6" fill="currentColor" />
    <path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4a4.6 4.6 0 0 0 4.6-4.6C22 6 17.5 2 12 2Z" />
  </svg>
);
const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export default function DrawingCanvas({ roomId, turnKey }: DrawingCanvasProps) {
  const socket = useSocket("room");
  const [room] = useAtom(roomAtom);
  const [userId] = useState(localStorage.getItem("userId") || "");

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(SWATCHES[0]);
  const [penSize, setPenSize] = useState(4);
  const [eraserSize, setEraserSize] = useState(24);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const stroke = useRef<{ last: Point; mid: Point } | null>(null);

  const size = tool === "pen" ? penSize : eraserSize;

  /* Size the canvas to its container, keeping what's already drawn. */
  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width === w && canvas.height === h) return;

    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    if (canvas.width > 0 && canvas.height > 0) {
      snapshot.getContext("2d")?.drawImage(canvas, 0, 0);
    }

    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(snapshot, 0, 0);
  }, []);

  useEffect(() => {
    fitCanvas();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [fitCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stroke.current = null;
  }, [turnKey]);

  const toPoint = (e: { clientX: number; clientY: number }): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const applyBrush = (ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
  };

  const normalizePoint = (point: Point): NormalizedPoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, point.x / rect.width)),
      y: Math.max(0, Math.min(1, point.y / rect.height)),
    };
  };

  const emitDraw = (payload: DrawPayload) => {
    if (socket && roomId) {
      socket.emit("draw", { ...payload, roomId });
    }
  };

  useEffect(() => {
    if (!socket) return;

    const receiveDraw = (data: DrawPayload) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      if (data.action === "clear") {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const toCanvasPoint = (point: NormalizedPoint): Point => ({
        x: point.x * rect.width,
        y: point.y * rect.height,
      });
      const applyRemoteBrush = (drawStyle: DrawStyle) => {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = drawStyle.size * Math.min(rect.width, rect.height);
        ctx.strokeStyle = drawStyle.color;
        ctx.fillStyle = drawStyle.color;
        ctx.globalCompositeOperation =
          drawStyle.tool === "eraser" ? "destination-out" : "source-over";
      };

      const start = toCanvasPoint(
        data.action === "start" ? data.point : data.start,
      );
      applyRemoteBrush(data);

      if (data.action === "start") {
        ctx.beginPath();
        ctx.arc(
          start.x,
          start.y,
          (data.size * Math.min(rect.width, rect.height)) / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else if (data.action === "segment") {
        const control = toCanvasPoint(data.control);
        const end = toCanvasPoint(data.end);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
        ctx.stroke();
      } else {
        const end = toCanvasPoint(data.end);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    };

    socket.on("draw", receiveDraw);
    return () => {
      socket.off("draw", receiveDraw);
    };
  }, [socket]);

  const moveRing = (e: { clientX: number; clientY: number }) => {
    const ring = ringRef.current;
    const wrap = wrapRef.current;
    if (!ring || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    ring.style.transform = `translate(${e.clientX - rect.left}px, ${
      e.clientY - rect.top
    }px) translate(-50%, -50%)`;
    ring.style.opacity = "1";
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const p = toPoint(e);
    applyBrush(ctx);
    // A single tap or click leaves a dot.
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    stroke.current = { last: p, mid: p };
    emitDraw({
      action: "start",
      point: normalizePoint(p),
      color,
      size:
        size /
        Math.min(
          canvas.getBoundingClientRect().width,
          canvas.getBoundingClientRect().height,
        ),
      tool,
    });
    moveRing(e);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    moveRing(e);
    const s = stroke.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!s || !ctx || !canvas) return;

    applyBrush(ctx);
    const native = e.nativeEvent;
    const events =
      typeof native.getCoalescedEvents === "function" &&
      native.getCoalescedEvents().length > 0
        ? native.getCoalescedEvents()
        : [native];

    // Curve through midpoints of consecutive samples for smooth strokes.
    for (const ev of events) {
      const p = toPoint(ev);
      const mid = { x: (s.last.x + p.x) / 2, y: (s.last.y + p.y) / 2 };
      ctx.beginPath();
      ctx.moveTo(s.mid.x, s.mid.y);
      ctx.quadraticCurveTo(s.last.x, s.last.y, mid.x, mid.y);
      ctx.stroke();
      emitDraw({
        action: "segment",
        start: normalizePoint(s.mid),
        control: normalizePoint(s.last),
        end: normalizePoint(mid),
        color,
        size:
          size /
          Math.min(
            canvas.getBoundingClientRect().width,
            canvas.getBoundingClientRect().height,
          ),
        tool,
      });
      s.last = p;
      s.mid = mid;
    }
  };

  const endStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = stroke.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (s && ctx && canvas) {
      applyBrush(ctx);
      ctx.beginPath();
      ctx.moveTo(s.mid.x, s.mid.y);
      ctx.lineTo(s.last.x, s.last.y);
      ctx.stroke();
      emitDraw({
        action: "end",
        start: normalizePoint(s.mid),
        end: normalizePoint(s.last),
        color,
        size:
          size /
          Math.min(
            canvas.getBoundingClientRect().width,
            canvas.getBoundingClientRect().height,
          ),
        tool,
      });
    }
    stroke.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onPointerLeave = () => {
    if (ringRef.current) ringRef.current.style.opacity = "0";
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (socket && roomId) {
        socket.emit("draw", { action: "clear", roomId });
      }
    }
    dialogRef.current?.close();
  };

  const setSize = (value: number) =>
    tool === "pen" ? setPenSize(value) : setEraserSize(value);

  const range = SIZE_RANGE[tool];

  return (
    <div className="dc-root">
      <header className="dc-toolbar" role="toolbar" aria-label="Drawing tools">
        <div className="dc-group" role="group" aria-label="Tool">
          <button
            type="button"
            className="dc-tool"
            aria-pressed={tool === "pen"}
            onClick={() => setTool("pen")}
          >
            <PenIcon />
            Pen
          </button>
          <button
            type="button"
            className="dc-tool"
            aria-pressed={tool === "eraser"}
            onClick={() => setTool("eraser")}
          >
            <EraserIcon />
            Eraser
          </button>
        </div>

        <div className="dc-group dc-size">
          <label htmlFor="dc-size">
            {tool === "pen" ? "Pen width" : "Eraser size"}
          </label>
          <input
            id="dc-size"
            type="range"
            min={range.min}
            max={range.max}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <output htmlFor="dc-size" className="dc-readout">
            {size} px
          </output>
        </div>

        <div
          className="dc-group dc-colors"
          data-dimmed={tool === "eraser"}
          role="group"
          aria-label="Color"
        >
          <div className="dc-swatches">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                className="dc-swatch"
                style={{ background: c }}
                aria-label={`Color ${c}`}
                aria-pressed={color.toLowerCase() === c}
                onClick={() => {
                  setColor(c);
                  setTool("pen");
                }}
              />
            ))}
          </div>
          <label className="dc-picker" title="Custom color">
            <PaletteIcon />
            <input
              type="color"
              value={color}
              aria-label="Custom color"
              onChange={(e) => {
                setColor(e.target.value);
                setTool("pen");
              }}
            />
          </label>
          <div className="dc-current" aria-live="polite">
            <span className="dc-chip" style={{ background: color }} />
            <span className="dc-hex">{color.toUpperCase()}</span>
          </div>
        </div>

        <button
          type="button"
          className="dc-clear"
          onClick={() => dialogRef.current?.showModal()}
          disabled={room?.state.currentDrawerId !== userId}
        >
          <TrashIcon />
          Clear Canvas
        </button>
      </header>

      <main className="dc-stage">
        <div className="dc-board" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            className="dc-canvas"
            aria-label="Drawing canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={onPointerLeave}
            style={{
              pointerEvents:
                room?.state.currentDrawerId === userId ? "auto" : "none",
            }}
          />
          <div
            ref={ringRef}
            className="dc-ring"
            data-tool={tool}
            style={{ width: size, height: size }}
          />
        </div>
      </main>

      <dialog
        ref={dialogRef}
        className="dc-dialog"
        aria-labelledby="dc-dialog-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="dc-dialog-body">
          <h2 id="dc-dialog-title">Clear the whole canvas?</h2>
          <p>This removes everything you've drawn and can't be undone.</p>
          <div className="dc-dialog-actions">
            <button
              type="button"
              className="dc-btn"
              autoFocus
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="dc-btn dc-btn-danger"
              onClick={clearCanvas}
              disabled={room?.state.currentDrawerId !== userId}
            >
              Clear canvas
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
