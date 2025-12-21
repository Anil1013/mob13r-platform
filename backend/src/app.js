import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import advertisersRoutes from "./routes/advertisers.routes.js";

const app = express();

/* ✅ CORS — Express v5 compatible */
app.use(cors({
  origin: "https://dashboard.mob13r.com",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/advertisers", advertisersRoutes);

export default app;
