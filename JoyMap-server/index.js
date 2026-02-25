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
  password: "Stephanydance18!!!", // your mysql password
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

app.listen(3000, () => console.log("Bridge running on http://localhost:3000"));
