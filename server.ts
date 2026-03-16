import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy to ensure correct protocol/host behind load balancers
  app.set('trust proxy', 1);

  // API Routes
  app.get("/api/health", (req, res) => {
    console.log('Health check requested');
    res.json({ status: "ok" });
  });

  // Catch-all for API routes not found
  app.use('/api/*', (req, res) => {
    console.warn(`API route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Not Found' });
  });

  // Vite middleware for development
  try {
    if (process.env.NODE_ENV === "production") {
      // Serve static files in production
      app.use(express.static('dist'));
    } else {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }
  } catch (e) {
    console.error('Failed to setup middleware:', e);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
