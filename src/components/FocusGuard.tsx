import React, { useState, useEffect, useRef, useCallback } from "react";
import { useFaceDetection } from "../hooks/useFaceDetection";
import { PersonState, SessionStats, SessionRecord, SUBJECT_PRESETS } from "../types";
import { Play, Pause, Square, AlertTriangle, Shield, CheckCircle, Clock, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { format } from "date-fns";

interface FocusGuardProps {
  subject: string;
  onComplete: (stats: SessionRecord) => void;
  onCancel: () => void;
}

export const FocusGuard: React.FC<FocusGuardProps> = ({ subject, onComplete, onCancel }) => {
  const [state, setState] = useState<PersonState>("unknown");
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedAbsent, setElapsedAbsent] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [presentTime, setPresentTime] = useState(0);
  const [absentTime, setAbsentTime] = useState(0);
  const [absencesCount, setAbsencesCount] = useState(0);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isWarningSent, setIsWarningSent] = useState(false);

  const config = SUBJECT_PRESETS[subject as keyof typeof SUBJECT_PRESETS] || SUBJECT_PRESETS["Self Study"];
  const lastCheckRef = useRef(Date.now());
  const absentSinceRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize audio
  useEffect(() => {
    const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleDetection = useCallback((present: boolean) => {
    if (isPaused) return;

    const now = Date.now();
    const delta = (now - lastCheckRef.current) / 1000;
    lastCheckRef.current = now;

    setSessionTime(prev => prev + delta);

    if (present) {
      setPresentTime(prev => prev + delta);
      
      if (state !== "present") {
        if (isAlarmActive) {
          audioRef.current?.pause();
          setIsAlarmActive(false);
          speak("Welcome back! Stay focused.");
        } else if (isWarningSent) {
          speak("Good, you're back.");
        }
        setState("present");
        absentSinceRef.current = null;
        setIsWarningSent(false);
      }
    } else {
      setAbsentTime(prev => prev + delta);
      
      if (absentSinceRef.current === null) {
        absentSinceRef.current = now;
        setAbsencesCount(prev => prev + 1);
      }

      const elapsed = (now - absentSinceRef.current) / 1000;
      setElapsedAbsent(elapsed);

      if (elapsed >= config.alarm_delay) {
        if (!isAlarmActive) {
          setIsAlarmActive(true);
          setState("absent");
          audioRef.current?.play().catch(() => {});
          speak("ALARM! You have been away for too long! Come back to study now!");
        }
      } else if (elapsed >= config.warning_delay) {
        if (!isWarningSent) {
          setIsWarningSent(true);
          setState("warning");
          speak("Warning! You have left your study position! Please come back immediately!");
        }
      }
    }
  }, [state, isPaused, isAlarmActive, isWarningSent, config, speak]);

  const { videoRef, canvasRef, isReady, error } = useFaceDetection(handleDetection);

  const handleEndSession = () => {
    const total = presentTime + absentTime;
    const focusPct = total > 0 ? (presentTime / total) * 100 : 0;
    
    let grade = "💪 NEEDS WORK";
    if (focusPct >= 90) grade = "🏆 EXCELLENT";
    else if (focusPct >= 75) grade = "⭐ GREAT";
    else if (focusPct >= 60) grade = "👍 GOOD";

    const record: SessionRecord = {
      subject,
      start_time: format(new Date(Date.now() - sessionTime * 1000), "yyyy-MM-dd HH:mm:ss"),
      end_time: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      duration_mins: Math.round(sessionTime / 60),
      present_mins: Number((presentTime / 60).toFixed(1)),
      absent_mins: Number((absentTime / 60).toFixed(1)),
      focus_percentage: Number(focusPct.toFixed(1)),
      absences_count: absencesCount,
      grade
    };

    if (focusPct >= 80) confetti();
    onComplete(record);
  };

  const focusPct = (presentTime + absentTime) > 0 
    ? (presentTime / (presentTime + absentTime)) * 100 
    : 100;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden font-mono">
      {/* Header Bar */}
      <div className={`h-16 flex items-center justify-between px-6 transition-colors duration-500 ${
        state === "present" ? "bg-emerald-600" : 
        state === "warning" ? "bg-amber-500" : 
        state === "absent" ? "bg-red-600 animate-pulse" : "bg-zinc-800"
      }`}>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <span className="text-lg font-bold tracking-tighter uppercase">
            {state === "present" ? "✅ PRESENT - KEEP STUDYING" : 
             state === "warning" ? `⚠️ WARNING - COME BACK (${Math.round(elapsedAbsent)}s)` : 
             state === "absent" ? `🚨 ABSENT - ALARM! (${Math.round(elapsedAbsent)}s)` : "🔍 DETECTING..."}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm font-bold">
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
            <Clock className="w-4 h-4" />
            <span>{Math.floor(sessionTime / 60)}m {Math.floor(sessionTime % 60)}s</span>
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
            <BarChart2 className="w-4 h-4" />
            <span>FOCUS: {focusPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative bg-zinc-900 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale"
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={640}
          height={480}
        />
        
        {/* Overlay Info */}
        <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
          <div className="space-y-2">
            <div className="text-4xl font-black tracking-tighter uppercase text-white/90">
              {subject}
            </div>
            <div className="text-xs text-white/50 uppercase tracking-widest">
              IIT Patna Focus Guard v3.0
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all active:scale-95"
            >
              {isPaused ? <Play className="w-8 h-8 fill-white" /> : <Pause className="w-8 h-8 fill-white" />}
            </button>
            <button
              onClick={handleEndSession}
              className="w-16 h-16 rounded-full bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 flex items-center justify-center transition-all active:scale-95"
            >
              <Square className="w-8 h-8 fill-red-600" />
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <AnimatePresence>
          {isAlarmActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-red-600/40 backdrop-blur-sm z-50"
            >
              <AlertTriangle className="w-32 h-32 text-white animate-bounce" />
              <h2 className="text-6xl font-black uppercase tracking-tighter mt-4">ALARM ACTIVE</h2>
              <p className="text-xl mt-2 font-bold">RETURN TO YOUR SEAT IMMEDIATELY</p>
            </motion.div>
          )}
          
          {isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-40"
            >
              <Pause className="w-32 h-32 text-amber-500" />
              <h2 className="text-6xl font-black uppercase tracking-tighter mt-4 text-amber-500">PAUSED</h2>
              <button
                onClick={() => setIsPaused(false)}
                className="mt-8 px-8 py-3 bg-amber-500 text-black font-black uppercase tracking-widest rounded-full hover:bg-amber-400 transition-colors"
              >
                Resume Session
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats Footer */}
      <div className="h-24 bg-black border-t border-white/10 grid grid-cols-4 divide-x divide-white/10">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Absences</span>
          <span className="text-2xl font-bold">{absencesCount}</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Present Time</span>
          <span className="text-2xl font-bold text-emerald-500">{Math.floor(presentTime / 60)}m</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Absent Time</span>
          <span className="text-2xl font-bold text-red-500">{Math.floor(absentTime / 60)}m</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Focus Score</span>
          <div className="w-32 h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${focusPct}%` }}
              className={`h-full ${focusPct > 80 ? "bg-emerald-500" : focusPct > 60 ? "bg-amber-500" : "bg-red-500"}`}
            />
          </div>
          <span className="text-xs mt-1 font-bold">{focusPct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};
