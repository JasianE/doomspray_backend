const express = require('express');
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
require('dotenv').config();
console.log("Mongo URI from .env:", process.env.MONGODB_URI);
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const app = express();
app.use(cors());

let total_distractions = 0;
const PORT = process.env.PORT || 8000;

// Connect to MongoDB and start the server
async function startServer() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}

startServer();

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
      total_distractions = total_distractions + 2; //make videos worth 2 times
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


app.get("/test-mongo", async (req, res) => {
  try {
    const db = client.db("doomspray"); // name your DB whatever you want
    const collection = db.collection("testData");

    // Insert test data
    await collection.insertOne({ test: "hello from Doomspray!", timestamp: new Date() });

    // Fetch the latest entry
    const docs = await collection.find().sort({ timestamp: -1 }).limit(1).toArray();
    
    res.json({ message: "MongoDB is working!", latestEntry: docs[0] });

  } catch (err) {
    console.error("Mongo test error:", err);
    res.status(500).json({ error: "MongoDB test failed" });
  }
});
