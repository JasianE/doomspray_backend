const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Middleware to inject db instance
router.use((req, res, next) => {
  try {
    req.db = getDb();
    next();
  } catch (err) {
    next(err);
  }
});

// GET blocked sites
router.get('/', async (req, res) => {
  try {
    const sites = await req.db.collection('blockedSites')
      .find({ userId: req.auth.payload.sub })
      .toArray();
    res.json(sites.map(site => site.url));
  } catch (err) {
    console.error('Failed to fetch sites:', err);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// POST blocked site
router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing 'url' in request body" });

  try {
    await req.db.collection('blockedSites').updateOne(
      { userId: req.auth.payload.sub, url },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    res.status(201).json({ message: 'Site added' });
  } catch (err) {
    console.error('Error inserting blocked site:', err);
    res.status(500).json({ error: 'Failed to store site' });
  }
});

// DELETE blocked site
router.delete('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const result = await req.db.collection('blockedSites').deleteOne({ userId: req.auth.payload.sub, url });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    res.status(200).json({ message: 'Site removed' });
  } catch (err) {
    console.error('Error deleting site:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
