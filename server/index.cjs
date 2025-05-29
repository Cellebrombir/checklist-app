// server/index.cjs

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Setup SQLite database ---

const dbPath = path.resolve(__dirname, "../db/people.db");
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to open DB:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      checked INTEGER DEFAULT 0,
      timeOfDay TEXT DEFAULT 'Ochtend'
    )`
  );
});

// --- Middleware ---

app.use(express.json());

// --- API routes ---

// Get all people
app.get("/api/people", (req, res) => {
  db.all("SELECT * FROM people", (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    // Convert checked from 0/1 to boolean
    const people = rows.map((r) => ({
      ...r,
      checked: Boolean(r.checked),
    }));
    res.json(people);
  });
});


// Add or update a person
app.post("/api/people", (req, res) => {
  const { id, name, email, checked, timeOfDay } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  if (id) {
    // Update existing
    db.run(
      `UPDATE people SET name = ?, email = ?, checked = ?, timeOfDay = ? WHERE id = ?`,
      [name, email, checked ? 1 : 0, timeOfDay, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updatedId: id });
      }
    );
  } else {
    // Insert new
    db.run(
      `INSERT INTO people (name, email, checked, timeOfDay) VALUES (?, ?, ?, ?)`,
      [name, email, checked ? 1 : 0, timeOfDay],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ insertedId: this.lastID });
      }
    );
  }
});

// Update person by id
app.put("/api/people/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, timeOfDay, checked } = req.body;

  const sql = `
    UPDATE people 
    SET name = ?, email = ?, timeOfDay = ?, checked = ? 
    WHERE id = ?
  `;
  db.run(sql, [name, email, timeOfDay, checked ? 1 : 0, id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.json({ success: true });
  });
});

// Delete a person
app.delete("/api/people/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM people WHERE id = ?", id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletedId: id });
  });
});

// Bulk import people
app.post("/api/people/import", (req, res) => {
  const { people } = req.body;
  if (!Array.isArray(people)) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  const placeholders = people.map(() => "(?, ?, ?, ?)").join(",");
  const values = [];

  people.forEach(({ name, email, timeOfDay, checked }) => {
    const cleanName = name?.trim() || "";
    const cleanEmail = email?.trim();
    const cleanTime = timeOfDay?.trim() || "";
    const isChecked = checked ? 1 : 0;

    if (!cleanName && !cleanEmail) return; // skip completely empty rows

    if (!cleanEmail) {
      // No email, insert directly — multiple NULLs are allowed
      db.run(
        `INSERT INTO people (name, email, timeOfDay, checked) VALUES (?, NULL, ?, ?)`,
        [cleanName, cleanTime, isChecked],
        (err) => {
          if (err) console.error("Insert without email failed:", err);
        }
      );
    } else {
      // Email exists, use INSERT OR IGNORE to skip duplicates
      db.run(
        `INSERT OR IGNORE INTO people (name, email, timeOfDay, checked) VALUES (?, ?, ?, ?)`,
        [cleanName, cleanEmail, cleanTime, isChecked],
        (err) => {
          if (err) console.error("Insert with email failed:", err);
        }
      );
    }
  });


  const sql = `INSERT OR IGNORE INTO people (name, email, timeOfDay, checked) VALUES ${placeholders}`;

  db.run(sql, values, function(err) {
    if (err) {
      console.error("DB import error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ success: true, inserted: this.changes });
  });
});


// --- Serve static React app from /checklist-app ---

const clientDistPath = path.join(__dirname, "../client/dist");

app.use("/checklist-app", express.static(clientDistPath));

// React routing fallback for SPA (handle all routes under /checklist-app)
app.get("/checklist-app/*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

// Root redirect to /checklist-app for convenience
app.get("/", (req, res) => {
  res.redirect("/checklist-app");
});

// --- Start server ---

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
