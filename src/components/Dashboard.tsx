import React, { useEffect, useState } from "react";
import { SessionRecord, SUBJECT_PRESETS } from "../types";
import { Play, History, TrendingUp, Award, Clock, ShieldCheck, ChevronRight, Droplets, Sword, Book, Zap } from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";

interface DashboardProps {
  onStartSession: (subject: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartSession }) => {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [waterCount, setWaterCount] = useState(0);

  useEffect(() => {
    fetch("/api/sessions")
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalFocusTime = history.reduce((acc, curr) => acc + curr.present_mins, 0);
  const avgFocus = history.length > 0 
    ? history.reduce((acc, curr) => acc + curr.focus_percentage, 0) / history.length 
    : 0;

  const xpLevel = Math.floor(totalFocusTime / 60) + 1;
  const xpProgress = (totalFocusTime % 60) / 60 * 100;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-4 md:p-8 font-mc">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HUD Top Bar */}
        <div className="mc-panel p-4 flex flex-col md:flex-row justify-between items-center gap-6 text-black">
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-black/60">Focus HP</span>
              <div className="flex gap-1">
                {[...Array(10)].map((_, i) => (
                  <span key={i} className={i < Math.ceil(avgFocus / 10) ? "text-red-600" : "text-black/20"}>❤️</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-black/60">Energy</span>
              <div className="flex gap-1">
                {[...Array(10)].map((_, i) => (
                  <span key={i} className={i < 8 ? "text-[#C36521]" : "text-black/20"}>🍗</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full text-center">
            <div className="relative h-6 bg-[#1a1a1a] border-[3px] border-black overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                className="h-full bg-gradient-to-b from-[#80FF20] to-[#40B000]"
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#80FF20] mc-text-shadow">
                Level {xpLevel} IITian
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xl font-bold tracking-tighter">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-[10px] uppercase text-black/60">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <button 
              onClick={() => setWaterCount(prev => Math.min(prev + 1, 8))}
              className="mc-button flex items-center gap-2"
            >
              <Droplets className="w-4 h-4 text-blue-600" />
              <span>{waterCount}/8</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2 py-8">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mc-text-shadow text-[#FCDB05]">
            IIT Patna
          </h1>
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-widest mc-text-shadow">
            Routine Manager
          </h2>
          <div className="inline-block bg-[#4AEDD9] text-black px-4 py-1 text-xs font-bold uppercase tracking-widest mt-4">
            ⛏️ Minecraft Edition
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inventory (Subject Selection) */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-sm uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
              <Sword className="w-4 h-4" />
              Select Mission
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.keys(SUBJECT_PRESETS).map((subj) => (
                <button
                  key={subj}
                  onClick={() => onStartSession(subj)}
                  className="mc-slot group p-4 flex flex-col items-center justify-center gap-3 hover:bg-[#9b9b9b] transition-all active:scale-95"
                >
                  <div className="text-3xl group-hover:scale-110 transition-transform">
                    {subj === "SQL" ? "💻" : subj === "Maths" ? "📐" : subj === "Physics" ? "⚛️" : subj === "Chemistry" ? "🧪" : "📖"}
                  </div>
                  <div className="text-[10px] font-bold uppercase text-center leading-tight">
                    {subj}
                  </div>
                </button>
              ))}
              <button
                onClick={() => onStartSession("Air Writing")}
                className="mc-slot group p-4 flex flex-col items-center justify-center gap-3 hover:bg-[#9b9b9b] transition-all active:scale-95 border-[#FCDB05]"
              >
                <div className="text-3xl group-hover:scale-110 transition-transform">
                  ✍️
                </div>
                <div className="text-[10px] font-bold uppercase text-center leading-tight text-[#FCDB05]">
                  Air Writing
                </div>
              </button>
            </div>
          </div>

          {/* Mission Logs */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-sm uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
              <History className="w-4 h-4" />
              Mission Logs
            </h3>
            <div className="mc-panel p-2 h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center text-black/40 uppercase text-[10px]">Mining logs...</div>
              ) : history.length === 0 ? (
                <div className="p-12 text-center text-black/40 uppercase text-[10px]">No logs found</div>
              ) : (
                <div className="space-y-2">
                  {history.map((session) => (
                    <div key={session.id} className="mc-slot bg-[#9b9b9b] p-3 flex items-center justify-between border-[2px]">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 flex items-center justify-center font-bold text-xs border-[2px] border-black/20 ${
                          session.focus_percentage >= 80 ? "bg-[#17DD62] text-black" : 
                          session.focus_percentage >= 60 ? "bg-[#FCDB05] text-black" : "bg-[#FF1313] text-white"
                        }`}>
                          {session.focus_percentage.toFixed(0)}%
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-black">{session.subject}</div>
                          <div className="text-[8px] text-black/60 uppercase">{format(new Date(session.start_time), "MMM d, HH:mm")}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-black">{session.duration_mins}m</div>
                        <div className="text-[8px] text-black/60 uppercase">{session.grade}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hotbar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-1 p-2 bg-black/80 border-[4px] border-[#373737] shadow-2xl z-50">
          {[
            { icon: "💧", label: "Water", count: waterCount },
            { icon: "🛡️", label: "Focus" },
            { icon: "🤖", label: "AI" },
            { icon: "📊", label: "Stats" },
            { icon: "🏃", label: "Run" },
            { icon: "🎵", label: "Music" },
            { icon: "📝", label: "Notes" },
            { icon: "📲", label: "Alerts" },
            { icon: "😴", label: "Sleep" }
          ].map((item, i) => (
            <div 
              key={i}
              className={`w-12 h-12 mc-slot flex flex-col items-center justify-center relative cursor-pointer hover:bg-[#9b9b9b] ${i === 0 ? "border-[#ffffff]" : ""}`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.count !== undefined && (
                <span className="absolute bottom-0.5 right-1 text-[10px] font-bold mc-text-shadow">{item.count}</span>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
