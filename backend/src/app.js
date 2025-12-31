import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import advertisersRoutes from "./routes/advertisers.routes.js";
import pinRoutes from "./routes/pin.routes.js";
import offersRoutes from "./routes/offers.routes.js";
import publisherRoutes from "./routes/publisher.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/advertisers", advertisersRoutes);
app.use("/api", pinRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/publisher", publisherRoutes);

export default app;
