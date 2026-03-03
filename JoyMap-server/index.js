const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Connect to MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // your mysql username
  password: process.env.DB_PASSWORD, // your mysql password
  database: "joymap_db",
});

db.connect((err) => {
  if (err) console.log("Database Connection Failed", err);
  else console.log("MySQL Bridge Connected!");
});

// 2. Simple Login Route
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  // For now, we just check if user exists.
  // Later we will add password encryption (bcrypt)
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length > 0) {
      // Mocking a token for now
      res.json({ token: "mock-jwt-token", role: result[0].role });
    } else {
      res.status(401).json({ message: "User not found" });
    }
  });
});

// 3. Fetch Valid Activities Route (UPGRADED)
app.get("/api/activities", (req, res) => {
  console.log("Fetching valid activities for the map...");

  // This SQL query grabs ALL permanent places, but ONLY grabs limited events if they haven't happened yet!
  const query = `
    SELECT * FROM activities 
    WHERE activity_type = 'permanent' 
    OR (activity_type = 'limited' AND event_date >= NOW())
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error fetching activities:", err);
      return res.status(500).json({ error: "Failed to fetch activities" });
    }
    res.json(results);
  });
});

// 4. Create a New Activity Route (SECURE VERSION)
app.post("/api/activities", (req, res) => {
  const {
    institution_id,
    title,
    description,
    category,
    min_age,
    max_age,
    activity_type,
    event_date,
    max_participants,
    address,
    latitude,
    longitude,
  } = req.body;

  if (!title || !latitude || !longitude || !institution_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 🛡️ 1. FIRST CHECK: Is this institution verified?
  const checkQuery = "SELECT is_verified FROM users WHERE id = ?";

  db.query(checkQuery, [institution_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    // If user doesn't exist OR is_verified is 0 (false)
    if (results.length === 0 || results[0].is_verified === 0) {
      console.log(
        `❌ Blocked unverified institution ${institution_id} from posting.`,
      );
      return res.status(403).json({
        error:
          "Your account must be verified by an Admin before posting activities!",
      });
    }

    // ✅ 2. IF VERIFIED: Save the activity to the database
    const insertQuery = `
      INSERT INTO activities 
      (institution_id, title, description, category, min_age, max_age, activity_type, event_date, max_participants, address, latitude, longitude) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      institution_id,
      title,
      description,
      category || "education",
      min_age || 0,
      max_age || 18,
      activity_type || "permanent",
      event_date || null,
      max_participants || null,
      address || null,
      latitude,
      longitude,
    ];

    db.query(insertQuery, values, (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to save activity" });

      console.log("✅ Securely saved new activity!");
      res.json({
        message: "Activity created successfully",
        id: result.insertId,
      });
    });
  });
});
// 5. Book an Activity Route
app.post("/api/bookings", (req, res) => {
  const { activity_id, parent_id } = req.body;

  // 1. First, check if there is still room available
  const checkQuery =
    "SELECT max_participants, current_participants FROM activities WHERE id = ?";

  db.query(checkQuery, [activity_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(404).json({ error: "Activity not found" });

    const activity = results[0];

    // 2. If it's a limited event and it's full, reject the booking
    if (
      activity.max_participants !== null &&
      activity.current_participants >= activity.max_participants
    ) {
      return res
        .status(400)
        .json({ error: "Sorry, this event is fully booked!" });
    }

    // 3. If there is room, save the booking
    const bookQuery =
      "INSERT INTO bookings (activity_id, parent_id) VALUES (?, ?)";
    db.query(bookQuery, [activity_id, parent_id], (err) => {
      if (err) return res.status(500).json({ error: "Failed to book" });

      // 4. Increase the current_participants count by 1
      const updateQuery =
        "UPDATE activities SET current_participants = current_participants + 1 WHERE id = ?";
      db.query(updateQuery, [activity_id], (err) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Failed to update participant count" });

        console.log(`✅ Parent ${parent_id} booked Activity ${activity_id}`);
        res.json({ message: "Successfully booked your spot!" });
      });
    });
  });
});

// 6. Admin: Get all institutions
app.get("/api/admin/institutions", (req, res) => {
  // We grab all users who are institutions, so the admin can review them
  const query =
    "SELECT id, email, is_verified, document_url FROM users WHERE role = 'institution'";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error fetching institutions:", err);
      return res.status(500).json({ error: "Failed to fetch institutions" });
    }
    res.json(results);
  });
});

// 7. Admin: Verify an institution
app.put("/api/admin/verify/:id", (req, res) => {
  const institutionId = req.params.id;

  const query = "UPDATE users SET is_verified = TRUE WHERE id = ?";

  db.query(query, [institutionId], (err, result) => {
    if (err) {
      console.error("Database error verifying institution:", err);
      return res.status(500).json({ error: "Failed to verify" });
    }
    res.json({ message: "Institution successfully verified!" });
  });
});

app.listen(3000, () => console.log("Bridge running on http://localhost:3000"));
