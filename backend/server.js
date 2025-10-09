import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize, initModels } from "./models.js";
import routes from "./routes/index.js";
import seed from "./seed.js";

dotenv.config();
const app = express();

// allow frontend domain
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(cors({ origin: [frontendOrigin, "http://localhost:3000"] }));

app.use(bodyParser.json());
app.use("/api", routes);

const PORT = process.env.PORT || 4000;
initModels();

sequelize.sync({ alter: true }).then(async () => {
  console.log("✅ DB synced successfully");
  await seed();
  app.listen(PORT, () =>
    console.log(`🚀 Backend running at http://localhost:${PORT}`)
  );
});
