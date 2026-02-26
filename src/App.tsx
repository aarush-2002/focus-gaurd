import React, { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { FocusGuard } from "./components/FocusGuard";
import { AirWriter } from "./components/AirWriter";
import { SessionRecord } from "./types";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAirWriting, setIsAirWriting] = useState(false);

  const handleStartSession = (subject: string) => {
    if (subject === "Air Writing") {
      setIsAirWriting(true);
      return;
    }
    setActiveSubject(subject);
    setIsMonitoring(true);
  };

  const handleCompleteSession = async (record: SessionRecord) => {
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.error("Failed to save session:", err);
    }
    setIsMonitoring(false);
    setActiveSubject(null);
  };

  const handleCancelSession = () => {
    setIsMonitoring(false);
    setActiveSubject(null);
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        {isAirWriting ? (
          <motion.div
            key="air-writing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen"
          >
            <AirWriter onClose={() => setIsAirWriting(false)} />
          </motion.div>
        ) : !isMonitoring ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            <Dashboard onStartSession={handleStartSession} />
          </motion.div>
        ) : (
          <motion.div
            key="monitoring"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen"
          >
            {activeSubject && (
              <FocusGuard
                subject={activeSubject}
                onComplete={handleCompleteSession}
                onCancel={handleCancelSession}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
