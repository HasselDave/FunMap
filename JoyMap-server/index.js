const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const cron = require("node-cron");

// 1. Declare the variables first so the rest of your file can see them
let Expo;
let expo;

// 2. Use a "Dynamic Import" to secretly load the modern ES package inside your CommonJS server
(async () => {
  const sdk = await import("expo-server-sdk");
  Expo = sdk.Expo;
  expo = new Expo();
  console.log("📲 Expo Push Notification system securely loaded!");
})();

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

// 8. User Registration Route
app.post("/api/auth/register", (req, res) => {
  const { role, email, password, username } = req.body;

  // Basic validation
  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "Email, password, and role are required." });
  }

  // Check the teacher's specific rule: Parents MUST have a username
  if (role === "parent" && !username) {
    return res.status(400).json({ error: "Parents must provide a username." });
  }

  // 1. Check if the email is already in use
  const checkEmail = "SELECT * FROM users WHERE email = ?";
  db.query(checkEmail, [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length > 0)
      return res.status(400).json({ error: "Email is already registered!" });

    // 2. Insert the new user
    // CRITICAL: Institutions start unverified (0). Parents are automatically verified (1).
    const isVerified = role === "institution" ? 0 : 1;

    const insertQuery =
      "INSERT INTO users (email, password, role, is_verified, username) VALUES (?, ?, ?, ?, ?)";

    db.query(
      insertQuery,
      [email, password, role, isVerified, username || null],
      (err, result) => {
        if (err) {
          console.error("Error saving user:", err);
          return res.status(500).json({ error: "Failed to create account" });
        }

        console.log(`✅ New ${role} registered: ${email}`);
        res.json({ message: "Account created successfully!" });
      },
    );
  });
});

// 2. Simple Login Route
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  // Find the user by email
  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (result.length > 0) {
      const user = result[0]; // Grab the user's data from the database

      // 1. Verify the password! (Later we will upgrade this to bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      // 2. Success! Send back the token AND all the profile data for the mobile app
      console.log(`✅ ${user.role} logged in: ${user.email}`);

      res.json({
        token: "mock-jwt-token",
        message: "Login successful",
        role: user.role,
        id: user.id,
        email: user.email,
        username: user.username, // The mobile app needs this for the new drawer!
      });
    } else {
      res.status(401).json({ error: "User not found" });
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
// 5. Book an Activity Route (WITH 2-SPOT LIMIT & CAPACITY CHECK)
app.post("/api/bookings", (req, res) => {
  const { activity_id, parent_id } = req.body;

  if (!parent_id || !activity_id) {
    return res.status(400).json({ error: "Missing parent or activity ID." });
  }

  // --- CHECK 1: The Bouncer (Max 2 spots per parent) ---
  const checkLimitQuery =
    "SELECT COUNT(*) as bookingCount FROM bookings WHERE parent_id = ? AND activity_id = ?";

  db.query(checkLimitQuery, [parent_id, activity_id], (err, limitResults) => {
    if (err)
      return res.status(500).json({ error: "Database error checking limits." });

    if (limitResults[0].bookingCount >= 2) {
      return res.status(400).json({
        error:
          "Limit Reached! You can only book a maximum of 2 spots per event.",
      });
    }

    // --- CHECK 2: The Capacity (Is the event full?) ---
    const checkCapacityQuery =
      "SELECT max_participants, current_participants FROM activities WHERE id = ?";

    db.query(checkCapacityQuery, [activity_id], (err, capacityResults) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error checking capacity." });
      if (capacityResults.length === 0)
        return res.status(404).json({ error: "Activity not found." });

      const activity = capacityResults[0];

      if (
        activity.max_participants !== null &&
        activity.current_participants >= activity.max_participants
      ) {
        return res
          .status(400)
          .json({ error: "Sorry, this event is fully booked!" });
      }

      // --- ACTION 1: Save the Booking ---
      const bookQuery =
        "INSERT INTO bookings (activity_id, parent_id) VALUES (?, ?)";

      db.query(bookQuery, [activity_id, parent_id], (err) => {
        if (err) return res.status(500).json({ error: "Failed to book." });

        // --- ACTION 2: Increase the Participant Count ---
        const updateQuery =
          "UPDATE activities SET current_participants = current_participants + 1 WHERE id = ?";

        db.query(updateQuery, [activity_id], (err) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Failed to update participant count." });

          console.log(`✅ Parent ${parent_id} booked Activity ${activity_id}`);
          res.json({ message: "Successfully booked your spot!" });
        });
      });
    });
  });
});

// 12. Cancel a Booking
app.delete("/api/bookings/:bookingId", (req, res) => {
  const bookingId = req.params.bookingId;

  // 1. First, find out which activity this booking belongs to
  const findActivityQuery = "SELECT activity_id FROM bookings WHERE id = ?";

  db.query(findActivityQuery, [bookingId], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Database error looking up booking." });
    if (results.length === 0)
      return res.status(404).json({ error: "Booking not found." });

    const activityId = results[0].activity_id;

    // 2. Delete the booking from the database
    const deleteQuery = "DELETE FROM bookings WHERE id = ?";
    db.query(deleteQuery, [bookingId], (deleteErr) => {
      if (deleteErr)
        return res.status(500).json({ error: "Failed to cancel booking." });

      // 3. Give the spot back! (Decrease current_participants by 1)
      // We use GREATEST() just to make absolutely sure it never accidentally goes below 0.
      const updateQuery =
        "UPDATE activities SET current_participants = GREATEST(current_participants - 1, 0) WHERE id = ?";

      db.query(updateQuery, [activityId], (updateErr) => {
        if (updateErr)
          return res
            .status(500)
            .json({ error: "Failed to update activity capacity." });

        console.log(
          `🗑️ Booking ${bookingId} cancelled, freed up a spot for Activity ${activityId}`,
        );
        res.json({ message: "Booking cancelled successfully!" });
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

// 9. Get Current Bookings for a User
app.get("/api/bookings/current/:userId", (req, res) => {
  const userId = req.params.userId;

  // We JOIN the bookings table with the activities table.
  // We match using b.parent_id = ?
  const query = `
    SELECT b.id AS booking_id, a.title, a.address, a.event_date, a.activity_type 
    FROM bookings b
    JOIN activities a ON b.activity_id = a.id
    WHERE b.parent_id = ? AND (a.event_date >= CURDATE() OR a.activity_type = 'permanent')
    ORDER BY a.event_date ASC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching bookings:", err);
      return res.status(500).json({ error: "Failed to fetch bookings" });
    }

    res.json(results);
  });
});

// 11. Update Profile (Change Username)
app.put("/api/users/update-profile", (req, res) => {
  const { userId, username } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ error: "Missing user ID or username." });
  }

  // Update the username in the database where the ID matches
  const updateQuery = "UPDATE users SET username = ? WHERE id = ?";

  db.query(updateQuery, [username, userId], (err, result) => {
    if (err) {
      console.error("Error updating profile:", err);
      return res.status(500).json({ error: "Failed to update profile." });
    }

    console.log(`✅ User ${userId} changed username to: ${username}`);
    res.json({ message: "Profile updated successfully!" });
  });
});

// Get Previous Bookings for a User
app.get("/api/bookings/previous/:userId", (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT b.id AS booking_id, a.title, a.address, a.event_date, a.activity_type 
    FROM bookings b
    JOIN activities a ON b.activity_id = a.id
    WHERE b.parent_id = ? AND a.event_date < CURDATE() AND a.activity_type != 'permanent'
    ORDER BY a.event_date DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching previous bookings:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch previous bookings" });
    }

    res.json(results);
  });
});

// 13. Save Push Token
app.post("/api/users/push-token", (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) return res.status(400).json({ error: "Missing data" });

  const updateQuery = "UPDATE users SET expo_push_token = ? WHERE id = ?";
  db.query(updateQuery, [token, userId], (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Token saved successfully!" });
  });
});

// --- THE DAILY REMINDER CRON JOB ---
// This runs every day at 8:00 AM server time ("0 8 * * *")
cron.schedule("0 8 * * *", () => {
  console.log("⏰ Running daily booking reminder check...");

  // Find all bookings where the event is exactly ONE DAY away, AND the user has a push token
  const query = `
    SELECT b.id as booking_id, u.expo_push_token, a.title, a.event_date 
    FROM bookings b
    JOIN users u ON b.parent_id = u.id
    JOIN activities a ON b.activity_id = a.id
    WHERE DATE(a.event_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    AND u.expo_push_token IS NOT NULL
  `;

  db.query(query, async (err, results) => {
    if (err) return console.error("Cron Job DB Error:", err);
    if (results.length === 0)
      return console.log("No events happening tomorrow.");

    let messages = [];

    // Construct the notification for each user
    for (let booking of results) {
      if (!Expo.isExpoPushToken(booking.expo_push_token)) continue;

      messages.push({
        to: booking.expo_push_token,
        sound: "default",
        title: "Upcoming Activity! 🎉",
        body: `Reminder: '${booking.title}' is happening tomorrow! Get ready for fun!`,
        data: { bookingId: booking.booking_id },
      });
    }

    // Send the notifications in batches to Expo
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
        console.log(`✅ Sent ${chunk.length} reminders!`);
      } catch (error) {
        console.error("Error sending push notifications:", error);
      }
    }
  });
});

app.listen(3000, () => console.log("Bridge running on http://localhost:3000"));
