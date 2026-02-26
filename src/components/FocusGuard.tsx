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
    utterance.rate = 1;
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
          speak("Yeah I knew you love her");
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
          speak("Mumtaz will leave you if you stopped studying");
        }
      } else if (elapsed >= config.warning_delay) {
        if (!isWarningSent) {
          setIsWarningSent(true);
          setState("warning");
          speak("Mumtaz will leave you if you stopped studying");
        }
      }
    }
  }, [state, isPaused, isAlarmActive, isWarningSent, config, speak]);

  const { videoRef, canvasRef } = useFaceDetection(handleDetection);

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

  const focusPct = (presentTime + absentTime) > 0 ? (presentTime / (presentTime + absentTime)) * 100 : 100;

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white overflow-hidden font-mc">
      {/* HUD Bar */}
      <div className={`h-16 flex items-center justify-between px-6 border-b-[4px] border-black transition-colors duration-300 ${
        state === "present" ? "bg-[#5D9B3C]" : 
        state === "warning" ? "bg-[#FCDB05]" : 
        state === "absent" ? "bg-[#FF1313] animate-pulse" : "bg-[#8b8b8b]"
      }`}>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-black" />
          <span className="text-lg font-bold uppercase mc-text-shadow">
            {state === "present" ? "✅ PRESENT" : 
             state === "warning" ? `⚠️ WARNING (${Math.round(elapsedAbsent)}s)` : 
             state === "absent" ? `🚨 ABSENT (${Math.round(elapsedAbsent)}s)` : "🔍 DETECTING..."}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="mc-panel bg-black/20 border-none px-3 py-1 text-[10px] font-bold">
            {Math.floor(sessionTime / 60)}m {Math.floor(sessionTime % 60)}s
          </div>
          <div className="mc-panel bg-black/20 border-none px-3 py-1 text-[10px] font-bold">
            FOCUS: {focusPct.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale" autoPlay muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" width={640} height={480} />
        
        <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
          <div className="space-y-1">
            <div className="text-4xl font-black uppercase tracking-tighter mc-text-shadow text-[#FCDB05]">
              {subject}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest">
              Focus Guard v3.0
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => setIsPaused(!isPaused)} className="mc-button w-14 h-14 flex items-center justify-center">
              {isPaused ? <Play className="w-6 h-6 fill-black" /> : <Pause className="w-6 h-6 fill-black" />}
            </button>
            <button onClick={handleEndSession} className="mc-button w-14 h-14 flex items-center justify-center bg-[#FF1313] border-t-[#ff5555] border-l-[#ff5555] border-b-[#aa0000] border-r-[#aa0000]">
              <Square className="w-6 h-6 fill-white" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isAlarmActive && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-red-600/40 backdrop-blur-sm z-50">
              <AlertTriangle className="w-24 h-24 text-white animate-bounce" />
              <h2 className="text-4xl font-black uppercase tracking-tighter mt-4 mc-text-shadow">ALARM ACTIVE</h2>
            </motion.div>
          )}
          {isPaused && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-40">
              <h2 className="text-5xl font-black uppercase tracking-tighter text-[#FCDB05] mc-text-shadow">PAUSED</h2>
              <button onClick={() => setIsPaused(false)} className="mt-8 mc-button text-black font-bold uppercase">Resume</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* HUD Footer */}
      <div className="h-20 mc-panel border-none border-t-[4px] border-black grid grid-cols-4 divide-x divide-black/20 text-black">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[8px] uppercase font-bold opacity-60">Absences</span>
          <span className="text-xl font-bold">{absencesCount}</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[8px] uppercase font-bold opacity-60">Present</span>
          <span className="text-xl font-bold text-[#3D7A1C]">{Math.floor(presentTime / 60)}m</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[8px] uppercase font-bold opacity-60">Absent</span>
          <span className="text-xl font-bold text-[#FF1313]">{Math.floor(absentTime / 60)}m</span>
        </div>
        <div className="flex flex-col items-center justify-center px-4">
          <div className="w-full h-3 bg-black border-[2px] border-[#373737] overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${focusPct}%` }} className={`h-full ${focusPct > 80 ? "bg-[#17DD62]" : focusPct > 60 ? "bg-[#FCDB05]" : "bg-[#FF1313]"}`} />
          </div>
          <span className="text-[8px] mt-1 font-bold uppercase">Focus: {focusPct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};
