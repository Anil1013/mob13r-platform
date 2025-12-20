import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import advertiserRoutes from "./routes/advertisers.routes.js";
import offerRoutes from "./routes/offers.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok", app: "mob13r-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/advertisers", advertiserRoutes);
app.use("/api/offers", offerRoutes);

app.use(errorMiddleware);

export default app;
