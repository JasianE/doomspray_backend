require('dotenv').config();
const express = require('express');
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const { auth } = require('express-oauth2-jwt-bearer');
const notificationsRouter = require('./routes/notifications');

// Import DB connection
const { connectDB } = require('./db');

// Initialize Express
const app = express();

app.use(cors({
 origin: 'http://localhost:3000', // your frontend origin
 credentials: true,               // allow cookies and headers
 audience: "https://api.doomspray.com"
}))
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
app.use('/notifications', notificationsRouter);


// Connect to MongoDB before starting server
connectDB();


const jwtCheck = auth({
 audience: 'https://api.doomspray.com',
 issuerBaseURL: 'https://dev-fy4uq4tv3la0alsd.us.auth0.com/',
 tokenSigningAlg: 'RS256'
});


// enforce on all endpoints
app.use(jwtCheck);


// Import and use the blockedSites router
const blockedSitesRouter = require('./routes/blockedSites');
app.use("/blocked-sites", blockedSitesRouter);


// Test Auth0 connection
app.get('/auth-test', (req, res) => {
 res.json({ message: 'Authenticated!', user: req.user });
});

// Auth error handler
app.use((err, req, res, next) => {
 console.error('Auth Error:', err);
 if (err.name === 'UnauthorizedError') {
   return res.status(401).json({
     error: 'Invalid token',
     message: err.message,
     receivedToken: !!req.headers.authorization
   });
 }
 next(err);
});


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
});
