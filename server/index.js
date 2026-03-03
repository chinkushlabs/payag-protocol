const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Payag Backend is running" });
});

// Escrow Protocol Info Endpoint
app.get("/api/protocol", async (req, res) => {
  try {
    res.json({
      name: "Payag Escrow Protocol",
      version: "1.0.0",
      description: "The Trust & Settlement Layer for Autonomous AI Agents",
      features: [
        "Multi-agent trust scoring",
        "Programmable settlement guarantees",
        "Automated dispute resolution",
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all active escrows
app.get("/api/escrows", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM escrows WHERE status != 'COMPLETED' ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching escrows:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const port = process.env.PORT || 3001; // Replit sets process.env.PORT automatically when published
app.listen(port, "0.0.0.0", () => {
  console.log(`Payag Protocol live on port ${port}`);
});

// The Judge-Bot Endpoint
app.post("/api/escrow/verify", async (req, res) => {
  const { escrow_id, submitted_work } = req.body;

  try {
    // 1. Fetch the requirement from your database
    const result = await client.query(
      "SELECT task_description FROM escrows WHERE id = $1",
      [escrow_id],
    );
    const requirement = result.rows[0].task_description;

    // 2. Ask the AI to Judge (Make sure you have an OPENAI_API_KEY in your .env)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are the Payag Escrow Judge. Answer only YES or NO.",
        },
        {
          role: "user",
          content: `Requirement: ${requirement}. Submission: ${submitted_work}. Does this satisfy the requirement?`,
        },
      ],
    });

    const decision = completion.choices[0].message.content;

    // 3. Update database if YES
    if (decision?.includes("YES")) {
      await client.query(
        "UPDATE escrows SET status = 'COMPLETED' WHERE id = $1",
        [escrow_id],
      );
      return res.json({
        success: true,
        decision: "YES",
        message: "Work verified. Escrow settled.",
      });
    } else {
      return res.json({
        success: false,
        decision: "NO",
        message: "Work rejected by Judge-Bot.",
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});
