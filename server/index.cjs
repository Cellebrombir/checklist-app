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
  // Create events table with eventDate column if it doesn't exist
  db.run(
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      eventDate TEXT DEFAULT NULL
    )`
  );

  // Check if eventDate column exists; if not, add it
  db.get("PRAGMA table_info(events)", (err, columns) => {
    if (err) {
      console.error("Error checking events table info:", err);
      return;
    }
    // columns is an array of { cid, name, type, ... }
    db.all("PRAGMA table_info(events)", (err, cols) => {
      if (err) {
        console.error("Error reading events columns:", err);
        return;
      }
      const hasEventDate = cols.some(col => col.name === "eventDate");
      if (!hasEventDate) {
        db.run("ALTER TABLE events ADD COLUMN eventDate TEXT DEFAULT NULL", (err) => {
          if (err) console.error("Error adding eventDate column:", err);
          else console.log("Added eventDate column to events table");
        });
      }
    });
  });

  // Your existing people table check/migration remains unchanged
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='people'", (err, table) => {
    if (err) {
      console.error("Error checking people table:", err);
      return;
    }
    if (!table) {
      // create people table with composite unique (unchanged)
      db.run(
        `CREATE TABLE people (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL DEFAULT 1,
          name TEXT NOT NULL,
          email TEXT,
          checked INTEGER DEFAULT 0,
          timeOfDay TEXT DEFAULT 'Ochtend',
          FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
          UNIQUE(event_id, email)
        )`
      );
      db.run(`INSERT OR IGNORE INTO events (id, name) VALUES (1, 'Default Event')`);
    } else {
      // migration logic for people table unchanged
      db.all("PRAGMA table_info(people)", (err, columns) => {
        if (err) {
          console.error("Error reading people table info:", err);
          return;
        }
        const hasEventId = columns.some(col => col.name === "event_id");
        if (!hasEventId) {
          db.serialize(() => {
            db.run("ALTER TABLE people RENAME TO people_old");
            db.run(
              `CREATE TABLE people (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL DEFAULT 1,
                name TEXT NOT NULL,
                email TEXT,
                checked INTEGER DEFAULT 0,
                timeOfDay TEXT DEFAULT 'Ochtend',
                FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
                UNIQUE(event_id, email)
              )`
            );
            db.run(
              `INSERT INTO people (id, event_id, name, email, checked, timeOfDay)
               SELECT id, 1, name, email, checked, timeOfDay FROM people_old`
            );
            db.run("DROP TABLE people_old");
          });
          db.run(`INSERT OR IGNORE INTO events (id, name) VALUES (1, 'Default Event')`);
        }
      });
    }
  });
});

// --- Middleware ---

app.use(express.json());

// --- API routes ---

// EVENTS routes

// Get all events
function isoToDdMMyyyy(dateStr) {
  if (!dateStr) return null;
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${dd}-${mm}-${yyyy}`;
}

app.get("/api/events", (req, res) => {
  db.all("SELECT * FROM events ORDER BY name", (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    const formattedRows = rows.map(row => ({
      ...row,
      eventDate: isoToDdMMyyyy(row.eventDate)
    }));
    res.json(formattedRows);
  });
});


// Create new event
function ddmmyyyyToISO(dateStr) {
  // expects "dd-mm-yyyy", returns "yyyy-mm-dd"
  const [dd, mm, yyyy] = dateStr.split("-");
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

app.post("/api/events", (req, res) => {
  const { name, eventDate } = req.body;  // eventDate expected in dd-mm-yyyy format
  if (!name) return res.status(400).json({ error: "Event name required" });

  const isoDate = eventDate ? ddmmyyyyToISO(eventDate) : null;

  db.run(
    "INSERT INTO events (name, eventDate) VALUES (?, ?)",
    [name, isoDate],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(400).json({ error: "Event name already exists" });
        }
        return res.status(500).json({ error: err.message });
      }
      // Return eventDate as dd-mm-yyyy to client:
      const returnDate = eventDate || null;
      res.json({ id: this.lastID, name, eventDate: returnDate });
    }
  );
});


// PEOPLE routes (filtered by event_id)

// Get all people for an event (eventId query param, default to 1)
app.get("/api/people", (req, res) => {
  const eventId = parseInt(req.query.eventId) || 1;

  db.all(
    "SELECT id, name, email, timeOfDay, checked FROM people WHERE event_id = ?",
    eventId,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }
      const people = rows.map((r) => ({
        ...r,
        checked: Boolean(r.checked),
      }));
      res.json(people);
    }
  );
});

// Add or update a person for a specific event
app.post("/api/people", (req, res) => {
  const { id, name, email, checked, timeOfDay, eventId } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!eventId) {
    return res.status(400).json({ error: "eventId is required" });
  }

  if (id) {
    // Update existing
    db.run(
      `UPDATE people SET name = ?, email = ?, checked = ?, timeOfDay = ?, event_id = ? WHERE id = ?`,
      [name, email || null, checked ? 1 : 0, timeOfDay, eventId, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updatedId: id });
      }
    );
  } else {
    // Insert new
    db.run(
      `INSERT INTO people (name, email, checked, timeOfDay, event_id) VALUES (?, ?, ?, ?, ?)`,
      [name, email || null, checked ? 1 : 0, timeOfDay, eventId],
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
  const { name, email, timeOfDay, checked, eventId } = req.body;

  if (!eventId) {
    return res.status(400).json({ error: "eventId is required" });
  }

  const sql = `
    UPDATE people 
    SET name = ?, email = ?, timeOfDay = ?, checked = ?, event_id = ?
    WHERE id = ?
  `;
  db.run(
    sql,
    [name, email || null, timeOfDay, checked ? 1 : 0, eventId, id],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Person not found" });
      }
      res.json({ success: true });
    }
  );
});

// Delete a person
app.delete("/api/people/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM people WHERE id = ?", id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletedId: id });
  });
});

// Bulk import people (requires eventId)
app.post("/api/people/import", (req, res) => {
  const { people, eventId } = req.body;
  if (!Array.isArray(people)) {
    return res.status(400).json({ error: "Invalid data format" });
  }
  if (!eventId) {
    return res.status(400).json({ error: "eventId is required" });
  }

  people.forEach(({ name, email, timeOfDay, checked }) => {
    const cleanName = name?.trim() || "";
    const cleanEmail = email?.trim();
    const cleanTime = timeOfDay?.trim() || "";
    const isChecked = checked ? 1 : 0;

    if (!cleanName && !cleanEmail) return; // skip empty rows

    if (!cleanEmail) {
      db.run(
        `INSERT INTO people (name, email, timeOfDay, checked, event_id) VALUES (?, NULL, ?, ?, ?)`,
        [cleanName, cleanTime, isChecked, eventId],
        (err) => {
          if (err) console.error("Insert without email failed:", err);
        }
      );
    } else {
      db.run(
        `INSERT OR IGNORE INTO people (name, email, timeOfDay, checked, event_id) VALUES (?, ?, ?, ?, ?)`,
        [cleanName, cleanEmail, cleanTime, isChecked, eventId],
        (err) => {
          if (err) console.error("Insert with email failed:", err);
        }
      );
    }
  });

  res.json({ success: true });
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
