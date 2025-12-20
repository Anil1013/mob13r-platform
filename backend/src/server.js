import dotenv from "dotenv";
import app from "./app.js";

// ✅ Only load dotenv locally
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// 🔎 Runtime verification (temporary – keep for now)
console.log("JWT_SECRET:", process.env.JWT_SECRET);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
