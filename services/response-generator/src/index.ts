import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import models from "./models";
import generateRoutes from "./routes/generate-routes";
import responseService from "./services/response-service";
import errorHandler from "./middleware/error-handler";
import logger from "./middleware/logger";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3003;

// Initialize database and sync models
models
  .syncDatabase()
  .then(() => console.log("Response generator: Database models synchronized"))
  .catch((err) =>
    console.error("Response generator: Error syncing database models:", err)
  );

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Routes
app.use("/api/generate", generateRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "response-generator",
    timestamp: new Date().toISOString(),
  });
});

// Debugging endpoint to check default responses
app.get("/api/debug/defaults", async (req, res) => {
  try {
    const defaults = await models.DefaultResponse.findAll();
    res.status(200).json({
      count: defaults.length,
      defaultResponses: defaults.map((d) => ({
        id: d.id,
        context: d.context || "general",
        priority: d.priority,
        responseText: d.responseText.substring(0, 30) + "...",
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving default responses" });
  }
});

// Error handler
app.use(errorHandler);

// Preload default responses
responseService
  .preloadDefaultResponses()
  .then(() => console.log("Default responses preloaded"))
  .catch((err: unknown) => console.error("Error preloading default responses:", err));

// Start the server
app.listen(port, () => {
  console.log(`Response generator running on port ${port}`);
});

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  await models.sequelize.close();
  process.exit(0);
});
