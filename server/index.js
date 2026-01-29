require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );
  next();
});

if (!process.env.MONGODB_URI) {
  console.warn("Missing MONGODB_URI in environment.");
}

mongoose
  .connect(process.env.MONGODB_URI || "")
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

const quizzSchema = new mongoose.Schema(
  {
    quizzId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: [
        "collecting",
        "voting1",
        "results1",
        "voting2",
        "results2",
        "voting3",
        "results3",
        "voting4",
        "results4",
        "finish",
      ],
      default: "collecting",
    },
    participants: [
      {
        participantId: { type: String, required: true },
        answers: {
          explorer: { type: String, default: "" },
          introspector: { type: String, default: "" },
          comparer: { type: String, default: "" },
          recommender: { type: String, default: "" },
        },
      },
    ],
    votes: {
      explorer: [
        {
          voterId: { type: String, required: true },
          selections: [{ type: String, required: true }],
        },
      ],
      introspector: [
        {
          voterId: { type: String, required: true },
          selections: [{ type: String, required: true }],
        },
      ],
      comparer: [
        {
          voterId: { type: String, required: true },
          selections: [{ type: String, required: true }],
        },
      ],
      recommender: [
        {
          voterId: { type: String, required: true },
          selections: [{ type: String, required: true }],
        },
      ],
    },
  },
  { timestamps: true }
);

const Quizz = mongoose.model("Quizz", quizzSchema);

app.post("/quizz", async (req, res) => {
  const quizzId = crypto.randomUUID();

  try {
    await Quizz.create({ quizzId });
    console.log(`[${new Date().toISOString()}] created quizz ${quizzId}`);
    res.status(201).json({ quizzId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

app.get("/quizz/:quizzId/status", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select("status");
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    return res.status(200).json({ status: quizz.status });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch status" });
  }
});

app.get("/quizz/:quizzId/participants/summary", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select("participants");
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const participantsCount = quizz.participants.length;
    const submittedCount = quizz.participants.filter((participant) => {
      const answers = participant.answers || {};
      return (
        answers.explorer?.trim() ||
        answers.introspector?.trim() ||
        answers.comparer?.trim() ||
        answers.recommender?.trim()
      );
    }).length;

    return res.status(200).json({ participantsCount, submittedCount });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load participant summary" });
  }
});

app.post("/quizz/:quizzId/participants", async (req, res) => {
  const { quizzId } = req.params;
  const { participantId, answers } = req.body || {};

  if (!participantId) {
    return res.status(400).json({ error: "participantId is required" });
  }

  try {
    const quizz = await Quizz.findOne({ quizzId });
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const existing = quizz.participants.find(
      (participant) => participant.participantId === participantId
    );

    if (existing) {
      existing.answers = {
        explorer: answers?.explorer || "",
        introspector: answers?.introspector || "",
        comparer: answers?.comparer || "",
        recommender: answers?.recommender || "",
      };
    } else {
      quizz.participants.push({
        participantId,
        answers: {
          explorer: answers?.explorer || "",
          introspector: answers?.introspector || "",
          comparer: answers?.comparer || "",
          recommender: answers?.recommender || "",
        },
      });
    }

    await quizz.save();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save answers" });
  }
});

app.get("/quizz/:quizzId/explorer", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select("participants");
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const explorer = quizz.participants
      .map((participant) => ({
        id: participant.participantId,
        text: participant.answers?.explorer || "",
      }))
      .filter((answer) => answer.text.trim().length > 0);

    return res.status(200).json({ explorer });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load explorer answers" });
  }
});

app.get("/quizz/:quizzId/introspector", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select("participants");
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const introspector = quizz.participants
      .map((participant) => ({
        id: participant.participantId,
        text: participant.answers?.introspector || "",
      }))
      .filter((answer) => answer.text.trim().length > 0);

    return res.status(200).json({ introspector });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load introspector answers" });
  }
});

app.get("/quizz/:quizzId/comparer", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select("participants");
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const comparer = quizz.participants
      .map((participant) => ({
        id: participant.participantId,
        text: participant.answers?.comparer || "",
      }))
      .filter((answer) => answer.text.trim().length > 0);

    return res.status(200).json({ comparer });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load comparer answers" });
  }
});

app.get("/quizz/:quizzId/recommender", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select("participants");
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const recommender = quizz.participants
      .map((participant) => ({
        id: participant.participantId,
        text: participant.answers?.recommender || "",
      }))
      .filter((answer) => answer.text.trim().length > 0);

    return res.status(200).json({ recommender });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load recommender answers" });
  }
});

app.post("/quizz/:quizzId/votes/explorer", async (req, res) => {
  const { quizzId } = req.params;
  const { voterId, selections } = req.body || {};

  if (!voterId || !Array.isArray(selections)) {
    return res.status(400).json({ error: "voterId and selections are required" });
  }

  try {
    const quizz = await Quizz.findOne({ quizzId });
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const existing = quizz.votes?.explorer?.find(
      (vote) => vote.voterId === voterId
    );

    if (existing) {
      existing.selections = selections;
    } else {
      quizz.votes = quizz.votes || {};
      quizz.votes.explorer = quizz.votes.explorer || [];
      quizz.votes.explorer.push({ voterId, selections });
    }

    await quizz.save();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save votes" });
  }
});

app.post("/quizz/:quizzId/votes/introspector", async (req, res) => {
  const { quizzId } = req.params;
  const { voterId, selections } = req.body || {};

  if (!voterId || !Array.isArray(selections)) {
    return res.status(400).json({ error: "voterId and selections are required" });
  }

  try {
    const quizz = await Quizz.findOne({ quizzId });
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const existing = quizz.votes?.introspector?.find(
      (vote) => vote.voterId === voterId
    );

    if (existing) {
      existing.selections = selections;
    } else {
      quizz.votes = quizz.votes || {};
      quizz.votes.introspector = quizz.votes.introspector || [];
      quizz.votes.introspector.push({ voterId, selections });
    }

    await quizz.save();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save votes" });
  }
});

app.post("/quizz/:quizzId/votes/comparer", async (req, res) => {
  const { quizzId } = req.params;
  const { voterId, selections } = req.body || {};

  if (!voterId || !Array.isArray(selections)) {
    return res.status(400).json({ error: "voterId and selections are required" });
  }

  try {
    const quizz = await Quizz.findOne({ quizzId });
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const existing = quizz.votes?.comparer?.find(
      (vote) => vote.voterId === voterId
    );

    if (existing) {
      existing.selections = selections;
    } else {
      quizz.votes = quizz.votes || {};
      quizz.votes.comparer = quizz.votes.comparer || [];
      quizz.votes.comparer.push({ voterId, selections });
    }

    await quizz.save();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save votes" });
  }
});

app.post("/quizz/:quizzId/votes/recommender", async (req, res) => {
  const { quizzId } = req.params;
  const { voterId, selections } = req.body || {};

  if (!voterId || !Array.isArray(selections)) {
    return res.status(400).json({ error: "voterId and selections are required" });
  }

  try {
    const quizz = await Quizz.findOne({ quizzId });
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const existing = quizz.votes?.recommender?.find(
      (vote) => vote.voterId === voterId
    );

    if (existing) {
      existing.selections = selections;
    } else {
      quizz.votes = quizz.votes || {};
      quizz.votes.recommender = quizz.votes.recommender || [];
      quizz.votes.recommender.push({ voterId, selections });
    }

    await quizz.save();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save votes" });
  }
});

app.get("/quizz/:quizzId/explorer/results", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select(
      "participants votes.explorer"
    );
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const answers = quizz.participants
      .map((participant) => ({
        id: participant.participantId,
        text: participant.answers?.explorer || "",
      }))
      .filter((answer) => answer.text.trim().length > 0);

    const counts = new Map();
    for (const answer of answers) {
      counts.set(answer.id, 0);
    }

    for (const vote of quizz.votes?.explorer || []) {
      for (const selection of vote.selections || []) {
        if (counts.has(selection)) {
          counts.set(selection, counts.get(selection) + 1);
        }
      }
    }

    const results = answers
      .map((answer) => ({
        ...answer,
        count: counts.get(answer.id) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load results" });
  }
});

app.get("/quizz/:quizzId/introspector/results", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select(
      "participants votes.introspector"
    );
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const answers = quizz.participants
      .map((participant) => ({
        id: participant.participantId,
        text: participant.answers?.introspector || "",
      }))
      .filter((answer) => answer.text.trim().length > 0);

    const counts = new Map();
    for (const answer of answers) {
      counts.set(answer.id, 0);
    }

    for (const vote of quizz.votes?.introspector || []) {
      for (const selection of vote.selections || []) {
        if (counts.has(selection)) {
          counts.set(selection, counts.get(selection) + 1);
        }
      }
    }

    const results = answers
      .map((answer) => ({
        ...answer,
        count: counts.get(answer.id) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load results" });
  }
});

app.get("/quizz/:quizzId/comparer/results", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select(
      "participants votes.comparer"
    );
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const answers = quizz.participants
      .map((participant) => ({
        id: participant.participantId,
        text: participant.answers?.comparer || "",
      }))
      .filter((answer) => answer.text.trim().length > 0);

    const counts = new Map();
    for (const answer of answers) {
      counts.set(answer.id, 0);
    }

    for (const vote of quizz.votes?.comparer || []) {
      for (const selection of vote.selections || []) {
        if (counts.has(selection)) {
          counts.set(selection, counts.get(selection) + 1);
        }
      }
    }

    const results = answers
      .map((answer) => ({
        ...answer,
        count: counts.get(answer.id) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load results" });
  }
});

app.get("/quizz/:quizzId/recommender/results", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select(
      "participants votes.recommender"
    );
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const answers = quizz.participants
      .map((participant) => ({
        id: participant.participantId,
        text: participant.answers?.recommender || "",
      }))
      .filter((answer) => answer.text.trim().length > 0);

    const counts = new Map();
    for (const answer of answers) {
      counts.set(answer.id, 0);
    }

    for (const vote of quizz.votes?.recommender || []) {
      for (const selection of vote.selections || []) {
        if (counts.has(selection)) {
          counts.set(selection, counts.get(selection) + 1);
        }
      }
    }

    const results = answers
      .map((answer) => ({
        ...answer,
        count: counts.get(answer.id) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load results" });
  }
});

app.get("/quizz/:quizzId/votes/explorer/summary", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select(
      "participants votes.explorer"
    );
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const participantsCount = quizz.participants.length;
    const votesCount = quizz.votes?.explorer?.length || 0;

    return res.status(200).json({ participantsCount, votesCount });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load vote summary" });
  }
});

app.get("/quizz/:quizzId/votes/introspector/summary", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select(
      "participants votes.introspector"
    );
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const participantsCount = quizz.participants.length;
    const votesCount = quizz.votes?.introspector?.length || 0;

    return res.status(200).json({ participantsCount, votesCount });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load vote summary" });
  }
});

app.get("/quizz/:quizzId/votes/comparer/summary", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select(
      "participants votes.comparer"
    );
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const participantsCount = quizz.participants.length;
    const votesCount = quizz.votes?.comparer?.length || 0;

    return res.status(200).json({ participantsCount, votesCount });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load vote summary" });
  }
});

app.get("/quizz/:quizzId/votes/recommender/summary", async (req, res) => {
  const { quizzId } = req.params;

  try {
    const quizz = await Quizz.findOne({ quizzId }).select(
      "participants votes.recommender"
    );
    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const participantsCount = quizz.participants.length;
    const votesCount = quizz.votes?.recommender?.length || 0;

    return res.status(200).json({ participantsCount, votesCount });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load vote summary" });
  }
});

app.post("/quizz/:quizzId/status", async (req, res) => {
  const { quizzId } = req.params;
  const { status } = req.body || {};

  if (!status) {
    return res.status(400).json({ error: "status is required" });
  }

  try {
    const quizz = await Quizz.findOneAndUpdate(
      { quizzId },
      { status },
      { new: true }
    ).select("status");

    if (!quizz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    return res.status(200).json({ status: quizz.status });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update status" });
  }
});

app.get("/:name", (req, res) => {
  res.status(200).send(`hello ${req.params.name}`);
});

app.use((req, res) => {
  res.sendStatus(404);
});

app.listen(port, () => {
  console.log(`server listening on ${port}`);
});
