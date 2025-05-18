const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("doomspray");
    console.log("✅ Connected to MongoDB");

    // Ensure unique index on blockedSites
    await db.collection('blockedSites').createIndex(
      { userId: 1, url: 1 },
      { unique: true }
    );
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

function getDb() {
  if (!db) {
    throw new Error("Database not connected");
  }
  return db;
}

module.exports = { connectDB, getDb };
