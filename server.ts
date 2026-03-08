import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // OAuth URL Endpoints
  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback/google`;
    
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent'
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url: authUrl });
  });

  app.get('/api/auth/microsoft/url', (req, res) => {
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback/microsoft`;
    
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email User.Read',
      response_mode: 'query'
    });
    
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  });

  // Callback Handler
  const handleCallback = async (req: express.Request, res: express.Response) => {
    // In a real app, we would exchange the code for tokens here.
    // For this demo, we'll simulate a successful login and pass a mock user back.
    // The user would need to implement the actual token exchange with their secrets.
    
    const { code, error } = req.query;

    if (error) {
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error}' }, '*');
                window.close();
              }
            </script>
            <p>Authentication failed. You can close this window.</p>
          </body>
        </html>
      `);
      return;
    }

    // Mock user data for demonstration since we don't have real secrets configured yet
    // In production, use the code to fetch the real user profile
    const mockUser = {
      email: 'admin@church.com', // Simulate the admin email (matches default in db.ts)
      name: 'Admin User',
      provider: req.path.includes('google') ? 'google' : 'microsoft'
    };

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify(mockUser)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  };

  app.get(['/auth/callback/google', '/auth/callback/google/'], handleCallback);
  app.get(['/auth/callback/microsoft', '/auth/callback/microsoft/'], handleCallback);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
