import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import advertisersRoutes from "./routes/advertisers.routes.js";
import pinRoutes from "./routes/pin.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/advertisers", advertisersRoutes);
app.use("/api", pinRoutes);

export default app;
