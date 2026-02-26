import React, { useState, useEffect, useRef, useCallback } from "react";
import { useHandTracking } from "../hooks/useHandTracking";
import { Results, Landmark } from "@mediapipe/hands";
import { motion, AnimatePresence } from "motion/react";
import { Eraser, Pencil, Palette, Save, Trash2, Undo2, Redo2, X, Shield, Clock, BarChart2 } from "lucide-react";
import confetti from "canvas-confetti";

interface AirWriterProps {
  onClose: () => void;
}

type Mode = "draw" | "erase" | "pause" | "color" | "save" | "none";

const COLORS = [
  { name: "White", value: "#FFFFFF" },
  { name: "Red", value: "#FF1313" },
  { name: "Green", value: "#17DD62" },
  { name: "Blue", value: "#345EC3" },
  { name: "Yellow", value: "#FCDB05" },
  { name: "Cyan", value: "#4AEDD9" },
  { name: "Magenta", value: "#FF00FF" },
];

export const AirWriter: React.FC<AirWriterProps> = ({ onClose }) => {
  const [mode, setMode] = useState<Mode>("none");
  const [currentColorIdx, setCurrentColorIdx] = useState(2); // Default Green
  const [thickness, setThickness] = useState(5);
  const [notification, setNotification] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const persistentCanvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const cooldownRef = useRef<{ [key: string]: number }>({});

  // Initialize persistent canvas
  useEffect(() => {
    if (persistentCanvasRef.current) {
      const ctx = persistentCanvasRef.current.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, []);

  const showNotification = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 2000);
  };

  const saveToHistory = () => {
    if (persistentCanvasRef.current) {
      const ctx = persistentCanvasRef.current.getContext("2d");
      if (ctx) {
        const data = ctx.getImageData(0, 0, persistentCanvasRef.current.width, persistentCanvasRef.current.height);
        historyRef.current.push(data);
        if (historyRef.current.length > 20) historyRef.current.shift();
        redoStackRef.current = [];
      }
    }
  };

  const undo = () => {
    if (historyRef.current.length > 1) {
      const current = historyRef.current.pop();
      if (current) redoStackRef.current.push(current);
      const prev = historyRef.current[historyRef.current.length - 1];
      if (persistentCanvasRef.current && prev) {
        const ctx = persistentCanvasRef.current.getContext("2d");
        ctx?.putImageData(prev, 0, 0);
        showNotification("Undo");
      }
    }
  };

  const clearCanvas = () => {
    if (persistentCanvasRef.current) {
      const ctx = persistentCanvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, persistentCanvasRef.current.width, persistentCanvasRef.current.height);
      saveToHistory();
      showNotification("Canvas Cleared");
    }
  };

  const saveImage = () => {
    if (persistentCanvasRef.current) {
      const link = document.createElement("a");
      link.download = `air-writing-${Date.now()}.png`;
      link.href = persistentCanvasRef.current.toDataURL();
      link.click();
      showNotification("Image Saved");
      confetti();
    }
  };

  const detectGesture = (landmarks: Landmark[]): { mode: Mode; pos: { x: number; y: number } | null; extra?: any } => {
    // Helper to check if finger is up
    const isUp = (tip: number, pip: number) => landmarks[tip].y < landmarks[pip].y;
    
    const thumbUp = landmarks[4].x < landmarks[3].x; // Simple thumb check
    const indexUp = isUp(8, 6);
    const middleUp = isUp(12, 10);
    const ringUp = isUp(16, 14);
    const pinkyUp = isUp(20, 18);

    const fingersUpCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
    const indexPos = { x: landmarks[8].x, y: landmarks[8].y };
    const palmPos = { 
      x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
      y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3
    };

    // ✋ Open Palm -> ERASE
    if (fingersUpCount >= 4) return { mode: "erase", pos: palmPos };
    
    // ✌️ Peace Sign -> COLOR
    if (indexUp && middleUp && !ringUp && !pinkyUp) return { mode: "color", pos: indexPos };

    // ☝️ Index Only -> DRAW
    if (indexUp && !middleUp && !ringUp && !pinkyUp) return { mode: "draw", pos: indexPos };

    // 👊 Fist -> PAUSE
    if (fingersUpCount === 0 && !thumbUp) return { mode: "pause", pos: palmPos };

    // 👍 Thumbs Up -> SAVE
    if (thumbUp && fingersUpCount === 0) return { mode: "save", pos: { x: landmarks[4].x, y: landmarks[4].y } };

    // 🤏 Pinch (Thumb + Index) -> THICKNESS
    const dist = Math.sqrt(Math.pow(landmarks[4].x - landmarks[8].x, 2) + Math.pow(landmarks[4].y - landmarks[8].y, 2));
    if (dist < 0.05) return { mode: "none", pos: indexPos, extra: { pinch: true, dist } };

    return { mode: "none", pos: null };
  };

  const handleResults = useCallback((results: Results) => {
    if (!canvasRef.current || !persistentCanvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const pCtx = persistentCanvasRef.current.getContext("2d");
    if (!ctx || !pCtx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const { mode: newMode, pos, extra } = detectGesture(landmarks);
      setMode(newMode);

      if (pos) {
        const x = (1 - pos.x) * canvasRef.current.width; // Mirror
        const y = pos.y * canvasRef.current.height;

        // ── DRAWING LOGIC ──
        if (newMode === "draw") {
          pCtx.strokeStyle = COLORS[currentColorIdx].value;
          pCtx.lineWidth = thickness;
          if (lastPointRef.current) {
            pCtx.beginPath();
            pCtx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            pCtx.lineTo(x, y);
            pCtx.stroke();
          } else {
            saveToHistory();
          }
          lastPointRef.current = { x, y };
        } else {
          lastPointRef.current = null;
        }

        // ── ERASING LOGIC ──
        if (newMode === "erase") {
          pCtx.clearRect(x - 40, y - 40, 80, 80);
          ctx.strokeStyle = "white";
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x - 40, y - 40, 80, 80);
          ctx.setLineDash([]);
        }

        // ── COLOR CHANGE COOLDOWN ──
        if (newMode === "color") {
          const now = Date.now();
          if (now - (cooldownRef.current["color"] || 0) > 1000) {
            setCurrentColorIdx(prev => (prev + 1) % COLORS.length);
            cooldownRef.current["color"] = now;
            showNotification(`Color: ${COLORS[(currentColorIdx + 1) % COLORS.length].name}`);
          }
        }

        // ── SAVE COOLDOWN ──
        if (newMode === "save") {
          const now = Date.now();
          if (now - (cooldownRef.current["save"] || 0) > 2000) {
            saveImage();
            cooldownRef.current["save"] = now;
          }
        }

        // ── CURSOR ──
        ctx.fillStyle = newMode === "draw" ? COLORS[currentColorIdx].value : "white";
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        lastPointRef.current = null;
      }
    } else {
      setMode("none");
      lastPointRef.current = null;
    }
  }, [currentColorIdx, thickness]);

  const { videoRef, isReady } = useHandTracking(handleResults);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white overflow-hidden font-mc">
      {/* HUD Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b-[4px] border-black bg-[#8b8b8b] text-black">
        <div className="flex items-center gap-3">
          <Pencil className="w-6 h-6" />
          <span className="text-lg font-bold uppercase mc-text-shadow">
            {mode === "draw" ? "✏️ DRAWING" : 
             mode === "erase" ? "🧹 ERASING" : 
             mode === "color" ? "🎨 SELECTING COLOR" : 
             mode === "pause" ? "⏸️ PAUSED" : "🔍 WAITING FOR HAND"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {COLORS.map((c, i) => (
              <div 
                key={i} 
                className={`w-6 h-6 border-2 border-black/20 ${i === currentColorIdx ? "scale-125 border-white shadow-lg" : ""}`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <button onClick={onClose} className="mc-button p-1 bg-[#FF1313] border-red-800">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale scale-x-[-1]" autoPlay muted playsInline />
        <canvas ref={persistentCanvasRef} className="absolute inset-0 w-full h-full" width={1280} height={720} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" width={1280} height={720} />
        
        {/* UI Overlay */}
        <div className="absolute top-8 left-8 space-y-4">
          <div className="mc-panel p-4 bg-black/40 border-none text-white space-y-2">
            <div className="text-[10px] uppercase font-bold text-white/60">Gestures</div>
            <div className="text-xs space-y-1">
              <p>☝️ Index: Draw</p>
              <p>✋ Palm: Erase</p>
              <p>✌️ Peace: Color</p>
              <p>👊 Fist: Pause</p>
              <p>👍 Thumb: Save</p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 mc-panel px-6 py-2 bg-[#FCDB05] text-black font-bold uppercase tracking-widest"
            >
              {notification}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* HUD Footer */}
      <div className="h-20 mc-panel border-none border-t-[4px] border-black flex items-center justify-center gap-4 px-6">
        <button onClick={undo} className="mc-button flex items-center gap-2">
          <Undo2 className="w-4 h-4" /> <span>Undo</span>
        </button>
        <button onClick={clearCanvas} className="mc-button flex items-center gap-2 bg-[#FF1313] border-red-800 text-white">
          <Trash2 className="w-4 h-4" /> <span>Clear</span>
        </button>
        <div className="h-8 w-px bg-black/20 mx-2" />
        <div className="flex items-center gap-4 text-black">
          <span className="text-[10px] font-bold uppercase">Thickness</span>
          <input 
            type="range" 
            min="1" max="20" 
            value={thickness} 
            onChange={(e) => setThickness(parseInt(e.target.value))}
            className="w-32 accent-black"
          />
          <span className="text-xs font-bold">{thickness}px</span>
        </div>
        <div className="h-8 w-px bg-black/20 mx-2" />
        <button onClick={saveImage} className="mc-button flex items-center gap-2 bg-[#17DD62] border-green-800 text-black">
          <Save className="w-4 h-4" /> <span>Save Image</span>
        </button>
      </div>
    </div>
  );
};
