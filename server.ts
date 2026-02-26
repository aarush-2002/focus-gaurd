import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("focusguard.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    start_time TEXT,
    end_time TEXT,
    duration_mins INTEGER,
    present_mins REAL,
    absent_mins REAL,
    focus_percentage REAL,
    absences_count INTEGER,
    grade TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/sessions", (req, res) => {
    const sessions = db.prepare("SELECT * FROM sessions ORDER BY id DESC LIMIT 50").all();
    res.json(sessions);
  });

  app.post("/api/sessions", (req, res) => {
    const { 
      subject, start_time, end_time, duration_mins, 
      present_mins, absent_mins, focus_percentage, 
      absences_count, grade 
    } = req.body;

    const info = db.prepare(`
      INSERT INTO sessions (
        subject, start_time, end_time, duration_mins, 
        present_mins, absent_mins, focus_percentage, 
        absences_count, grade
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subject, start_time, end_time, duration_mins, 
      present_mins, absent_mins, focus_percentage, 
      absences_count, grade
    );

    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
