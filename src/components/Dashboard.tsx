import React, { useEffect, useState } from "react";
import { SessionRecord, SUBJECT_PRESETS } from "../types";
import { Play, History, TrendingUp, Award, Clock, User, ShieldCheck, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";

interface DashboardProps {
  onStartSession: (subject: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartSession }) => {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex justify-between items-end border-b border-white/10 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-emerald-500">
              <ShieldCheck className="w-8 h-8" />
              <span className="text-xs font-black tracking-[0.3em] uppercase">Security Level: Active</span>
            </div>
            <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
              Focus Guard
            </h1>
            <p className="text-white/40 uppercase tracking-widest text-sm">
              IIT Patna Routine Manager v3.0
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold tracking-tighter">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-xs text-white/40 uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <Clock className="w-6 h-6 text-white/20" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Focus</span>
            </div>
            <div className="mt-4">
              <div className="text-5xl font-black tracking-tighter">{(totalFocusTime / 60).toFixed(1)}h</div>
              <div className="text-xs text-white/40 uppercase mt-1">Accumulated study time</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <TrendingUp className="w-6 h-6 text-emerald-500/40" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Avg Focus</span>
            </div>
            <div className="mt-4">
              <div className="text-5xl font-black tracking-tighter text-emerald-500">{avgFocus.toFixed(0)}%</div>
              <div className="text-xs text-white/40 uppercase mt-1">Average session quality</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <Award className="w-6 h-6 text-amber-500/40" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Rank</span>
            </div>
            <div className="mt-4">
              <div className="text-5xl font-black tracking-tighter text-amber-500">PRO</div>
              <div className="text-xs text-white/40 uppercase mt-1">Based on last 10 sessions</div>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Start Session */}
          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
              <Play className="w-4 h-4 fill-white/40" />
              Initialize Session
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {Object.keys(SUBJECT_PRESETS).map((subj) => (
                <button
                  key={subj}
                  onClick={() => onStartSession(subj)}
                  className="group relative flex items-center justify-between p-6 bg-zinc-900 border border-white/5 rounded-2xl hover:bg-white hover:text-black transition-all duration-300 overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="text-2xl font-black uppercase tracking-tighter">{subj}</div>
                    <div className="text-[10px] uppercase tracking-widest opacity-60">
                      {SUBJECT_PRESETS[subj as keyof typeof SUBJECT_PRESETS].duration}m Session • {SUBJECT_PRESETS[subj as keyof typeof SUBJECT_PRESETS].alarm_delay}s Alarm
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-black/10 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
              <History className="w-4 h-4" />
              Mission Logs
            </h2>
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-white/20 uppercase tracking-widest text-xs">Loading logs...</div>
              ) : history.length === 0 ? (
                <div className="p-12 text-center text-white/20 uppercase tracking-widest text-xs">No logs found</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {history.map((session) => (
                    <div key={session.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs ${
                          session.focus_percentage >= 80 ? "bg-emerald-500/20 text-emerald-500" : 
                          session.focus_percentage >= 60 ? "bg-amber-500/20 text-amber-500" : "bg-red-500/20 text-red-500"
                        }`}>
                          {session.focus_percentage.toFixed(0)}%
                        </div>
                        <div>
                          <div className="font-bold uppercase tracking-tight">{session.subject}</div>
                          <div className="text-[10px] text-white/40 uppercase">{format(new Date(session.start_time), "MMM d, HH:mm")}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{session.duration_mins}m</div>
                        <div className="text-[10px] text-white/40 uppercase">{session.grade}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
