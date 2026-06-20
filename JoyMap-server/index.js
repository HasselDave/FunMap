const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const app = express();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Create an "uploads" folder if it doesn't exist yet
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// 1. Connect to your Cloudinary Vault
cloudinary.config({
  cloud_name: "dy5v5pzp7", // <-- Paste your Cloud Name here
  api_key: "742756914619924", // <-- Paste your API Key here
  api_secret: "oDO9-LIn0axC06HL8gwVjxUlE9o", // <-- Paste your API Secret here
});

// 2. Tell Multer to send files straight to the cloud!
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "JoyMap_Documents", // It creates a nice folder in your Cloudinary account
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage: storage });
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

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
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
        isVerified: Boolean(user.is_verified),
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
    max_spots_per_user,
    contact_phone, // 👈 NEW
    contact_email, // 👈 NEW
  } = req.body;

  if (!title || !latitude || !longitude || !institution_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 🛡️ 1. FIRST CHECK: Is this institution verified?
  const checkQuery = "SELECT is_verified FROM users WHERE id = ?";

  db.query(checkQuery, [institution_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (results.length === 0 || results[0].is_verified === 0) {
      console.log(
        `❌ Blocked unverified institution ${institution_id} from posting.`,
      );
      return res.status(403).json({
        error:
          "Your account must be verified by an Admin before posting activities!",
      });
    }

    // ✅ 2. IF VERIFIED: Save the activity to the database (UPDATED QUERY)
    const insertQuery = `
      INSERT INTO activities 
      (institution_id, title, description, category, min_age, max_age, activity_type, event_date, max_participants, address, latitude, longitude, max_spots_per_user, contact_phone, contact_email) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      max_spots_per_user || 1,
      contact_phone || null, // 👈 NEW
      contact_email || null, // 👈 NEW
    ];

    db.query(insertQuery, values, (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to save activity" });

      console.log("✅ Securely saved new activity with contact info!");
      res.json({
        message: "Activity created successfully",
        id: result.insertId,
      });
    });
  });
});

// 5. UPDATE an Activity (Edit)
app.put("/api/activities/:id", (req, res) => {
  const { id } = req.params;
  const {
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
    max_spots_per_user,
    contact_phone,
    contact_email,
  } = req.body;

  const updateQuery = `
    UPDATE activities 
    SET title=?, description=?, category=?, min_age=?, max_age=?, activity_type=?, 
        event_date=?, max_participants=?, address=?, latitude=?, longitude=?, 
        max_spots_per_user=?, contact_phone=?, contact_email=?
    WHERE id=?
  `;

  const values = [
    title,
    description,
    category,
    min_age,
    max_age,
    activity_type,
    event_date || null,
    max_participants || null,
    address,
    latitude,
    longitude,
    max_spots_per_user,
    contact_phone || null,
    contact_email || null,
    id,
  ];

  db.query(updateQuery, values, (err, result) => {
    if (err)
      return res.status(500).json({ error: "Failed to update activity" });
    res.json({ message: "Activity updated successfully" });
  });
});

// 6. DELETE an Activity
app.delete("/api/activities/:id", (req, res) => {
  const { id } = req.params;
  const deleteQuery = "DELETE FROM activities WHERE id = ?";

  db.query(deleteQuery, [id], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Failed to delete activity" });
    res.json({ message: "Activity deleted successfully" });
  });
});

// 5. Book an Activity Route (WITH 2-SPOT LIMIT & CAPACITY CHECK)
app.post("/api/bookings", (req, res) => {
  const { activity_id, parent_id } = req.body;

  if (!parent_id || !activity_id) {
    return res.status(400).json({ error: "Missing parent or activity ID." });
  }

  // --- CHECK 1: The Bouncer (Max 2 spots per parent) ---
  // 🧠 This query grabs BOTH the limit from the activity, AND the user's current booking count!
  const checkLimitQuery = `
    SELECT 
      (SELECT max_spots_per_user FROM activities WHERE id = ?) as spotLimit,
      (SELECT COUNT(*) FROM bookings WHERE parent_id = ? AND activity_id = ?) as bookingCount
  `;

  // Note the array: [activity_id, parent_id, activity_id] matches the three question marks above
  db.query(
    checkLimitQuery,
    [activity_id, parent_id, activity_id],
    (err, limitResults) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error checking limits." });

      const spotLimit = limitResults[0].spotLimit || 2; // Fallback to 2 just in case
      const currentBookings = limitResults[0].bookingCount;

      // Compare their bookings to the DYNAMIC limit!
      if (currentBookings >= spotLimit) {
        return res.status(400).json({
          error: `Limit Reached! You can only book a maximum of ${spotLimit} spots for this event.`,
        });
      }

      // ... continue with your booking insertion logic ...

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

            console.log(
              `✅ Parent ${parent_id} booked Activity ${activity_id}`,
            );
            res.json({ message: "Successfully booked your spot!" });
          });
        });
      });
    },
  );
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

// 📥 ADMIN: FETCH ALL INSTITUTIONS
app.get("/api/admin/institutions", (req, res) => {
  // CRUCIAL: Make sure 'verification_document' is in the SELECT list!
  // (Change 'role = "institution"' if your database uses a different way to identify them)
  const sql =
    "SELECT id, email, is_verified, verification_document FROM users WHERE role = 'institution'";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database error fetching institutions:", err);
      return res.status(500).json({ error: "Failed to fetch institutions" });
    }
    res.json(results);
  });
});

// ❌ ADMIN: REJECT INSTITUTION
app.delete("/api/admin/reject/:id", (req, res) => {
  const institutionId = req.params.id;

  // Step 1: Find the document filename before we delete the user
  db.query(
    "SELECT verification_document FROM users WHERE id = ?",
    [institutionId],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error." });

      const fileName = results[0]?.verification_document;

      // Step 2: Delete the user from the database
      db.query(
        "DELETE FROM users WHERE id = ?",
        [institutionId],
        (deleteErr) => {
          if (deleteErr)
            return res.status(500).json({ error: "Could not delete user." });

          // Step 3: Physically delete the picture from your laptop's folder!
          if (fileName) {
            const filePath = path.join(__dirname, "uploads", fileName);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath); // This is the Node command to trash a file
            }
          }

          res.json({ message: "Institution rejected and files cleaned up!" });
        },
      );
    },
  );
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

// 📸 UPLOAD INSTITUTION VERIFICATION DOCUMENT (CLOUDINARY VERSION)
app.post(
  "/api/institutions/upload-document",
  upload.single("document"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file received." });
    }

    const institutionId = req.body.institution_id;

    // Cloudinary automatically gives us the permanent URL in req.file.path!
    const fileUrl = req.file.path;

    const sql = "UPDATE users SET verification_document = ? WHERE id = ?";

    db.query(sql, [fileUrl, institutionId], (err, result) => {
      if (err) return res.status(500).json({ error: "Database error." });

      res.json({
        success: true,
        message: "Document safely stored in the cloud!",
        fileUrl: fileUrl,
      });
    });
  },
);

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

// 📦 GET ALL ACTIVITIES FOR A SPECIFIC INSTITUTION
app.get("/api/activities/institution/:id", (req, res) => {
  const institutionId = req.params.id;

  // Ask the database for this specific institution's activities, newest first
  const sql =
    "SELECT * FROM activities WHERE institution_id = ? ORDER BY id DESC";

  db.query(sql, [institutionId], (err, results) => {
    if (err) {
      console.error("Database error fetching activities:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Send the array of activities back to the mobile app
    res.json(results);
  });
});

// ==========================================
// STATISTICS ENDPOINT: Average Fill Rate
// ==========================================
app.get("/api/statistics/fill-rate/:institution_id", (req, res) => {
  const institutionId = req.params.institution_id;
  console.log(`Fetching statistics for institution: ${institutionId}`);

  // SQL Math: (current / max) * 100, rounded to 1 decimal place.
  // We only check activities for this specific institution, and ensure max > 0 to prevent crashes.
  const query = `
    SELECT 
      category, 
      min_age, 
      max_age, 
      ROUND(AVG((current_participants / max_participants) * 100), 1) AS average_fill_rate,
      SUM(current_participants) AS total_booked_kids,
      SUM(max_participants) AS total_capacity
    FROM activities 
    WHERE institution_id = ? AND max_participants > 0
    GROUP BY category, min_age, max_age
    ORDER BY average_fill_rate DESC
  `;

  db.query(query, [institutionId], (err, results) => {
    if (err) {
      console.error("Database error fetching statistics:", err);
      return res.status(500).json({ error: "Failed to fetch statistics" });
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
cron.schedule("*/1 * * * *", () => {
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
