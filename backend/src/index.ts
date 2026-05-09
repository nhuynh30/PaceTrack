import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.PORT) || 8000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pacetrack-api" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
