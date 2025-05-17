const express = require('express');
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
require('dotenv').config();
const { MongoClient } = require('mongodb');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection Setup
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db; // Will hold our database connection

// Connect to MongoDB (using default database)
async function connectDB() {
  try {
    await client.connect();
    db = client.db("doomspray");
    console.log("✅ Connected to MongoDB");

    // 🧠 Ensure index exists for uniqueness (run once)
    await db.collection('blockedSites').createIndex(
      { userId: 1, url: 1 },
      { unique: true }
    );
    console.log("✅ Ensured index on (userId, url)");

    const collections = await db.listCollections().toArray();
    console.log("Available collections:", collections.map(c => c.name));
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

connectDB();

// Your EXACT scrape endpoint (unchanged)
let total_distractions = 0;
app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const data = [];

    $("a").each((index, element) => {
      data.push({
        text: $(element).text(),
        href: $(element).attr("href"),
      });
    });

    $('video').each((index, element) => {
      total_distractions = total_distractions + 2;
    });

    res.json(data);

    if (total_distractions > 5) {
      res.send('Distracting');
    } else {
      res.send('Good');
    }
  } catch (error) {
    res.status(500).json({ message: "Error accessing the URL" });
  }
});

// Auth0 Configuration
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    jwksUri: `https://dev-fy4uq4tv3la0alsd.us.auth0.com/.well-known/jwks.json`
  }),
  audience: "https://api.doomspray.com", // Must match your new API identifier
  issuer: `https://dev-fy4uq4tv3la0alsd.us.auth0.com/`,
  algorithms: ["RS256"]
});


/// ✅ Protect GET route with Auth0
app.get('/blocked-sites', checkJwt, async (req, res) => {
  try {
    const sites = await db.collection('blockedSites')
      .find({ userId: req.user.sub })
      .toArray();
    res.json(sites.map(site => site.url));
  } catch (err) {
    console.error('Failed to fetch sites:', err);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// ✅ POST: Add new blocked site
app.post('/blocked-sites', checkJwt, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing 'url' in request body" });

  try {
    await db.collection('blockedSites').updateOne(
      { userId: req.user.sub, url },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    res.status(201).json({ message: 'Site added' });
  } catch (err) {
    console.error('Error inserting blocked site:', err);
    res.status(500).json({ error: 'Failed to store site' });
  }
});

// ✅ DELETE: Remove a blocked site
app.delete('/blocked-sites', checkJwt, async (req, res) => {
  const { url } = req.body;
  const userId = req.user.sub;

  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const result = await db.collection('blockedSites').deleteOne({ userId, url });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    res.status(200).json({ message: 'Site removed' });
  } catch (err) {
    console.error('Error deleting site:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});