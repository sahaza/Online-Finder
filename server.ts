import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Load Firebase config for the server
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase on the server
  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

  app.use(express.json());

  // API to check website reachability
  app.post("/api/check-website", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const response = await axios.get(url, { 
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        validateStatus: () => true 
      });

      const isReachable = response.status >= 200 && response.status < 400;
      let hasSocialMedia = false;
      const socialMediaPlatforms: string[] = [];

      if (isReachable && typeof response.data === 'string') {
        const html = response.data.toLowerCase();
        const platforms = [
          { name: 'facebook', patterns: ['facebook.com', 'fb.me'] },
          { name: 'instagram', patterns: ['instagram.com', 'instagr.am'] },
          { name: 'twitter', patterns: ['twitter.com', 't.co', 'x.com'] },
          { name: 'linkedin', patterns: ['linkedin.com'] }
        ];

        platforms.forEach(p => {
          if (p.patterns.some(pattern => html.includes(pattern))) {
            hasSocialMedia = true;
            socialMediaPlatforms.push(p.name);
          }
        });
      }

      res.json({ 
        reachable: isReachable, 
        status: response.status,
        statusText: response.statusText,
        hasSocialMedia,
        socialMediaPlatforms
      });
    } catch (error: any) {
      res.json({ 
        reachable: false, 
        error: error.message || "Connection failed" 
      });
    }
  });

  // Shareable website route
  app.get("/share/:userId/:businessId", async (req, res) => {
    const { userId, businessId } = req.params;
    
    try {
      const docRef = doc(db, "users", userId, "websites", businessId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        res.setHeader("Content-Type", "text/html");
        res.send(data.html);
      } else {
        res.status(404).send("Website not found");
      }
    } catch (error) {
      console.error("Error fetching shared website:", error);
      res.status(500).send("Error loading website");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
