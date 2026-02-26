export type PersonState = "present" | "warning" | "absent" | "unknown";

export interface SessionStats {
  total_time: number;
  present_time: number;
  absent_time: number;
  focus_percentage: number;
  absence_count: number;
  session_start: number;
}

export interface SessionRecord {
  id?: number;
  subject: string;
  start_time: string;
  end_time: string;
  duration_mins: number;
  present_mins: number;
  absent_mins: number;
  focus_percentage: number;
  absences_count: number;
  grade: string;
}

export const SUBJECT_PRESETS = {
  SQL: { duration: 120, warning_delay: 15, alarm_delay: 45 },
  Maths: { duration: 120, warning_delay: 10, alarm_delay: 30 },
  Physics: { duration: 120, warning_delay: 10, alarm_delay: 30 },
  Chemistry: { duration: 120, warning_delay: 10, alarm_delay: 30 },
  "Self Study": { duration: 180, warning_delay: 20, alarm_delay: 60 },
};
