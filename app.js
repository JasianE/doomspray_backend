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
app.use(cors())

let total_distractions = 0;
const PORT = process.env.PORT || 5000;

/*const port = new SerialPort({
  path: '/dev/ttyACM0', 
  baudRate: 9600,
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
// Read the 
port.on("open", () => {
  console.log('serial port open');
  setTimeout(() => {
    port.write('push\n');
    console.log('Sent push command to Arduino');
  }, 2000); // wait 2 seconds
});
parser.on('data', data =>{
  console.log('got word from arduino:', data);
});
*/
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

// Scraper
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

app.post("/scrape", async (req, res) => {
  console.log('hello!')
  const data = req.body;
  const extra_urls = req.body.extra_urls; // The urls that the user has blocked themselves
  const the_url = req.body.the_url; // The url that the user is currently accessing 
  
  let isTheWebsiteDistracting = false; // Changes to true value if the url user is accesing is in extra_urls
  try {
    const response = await axios.get(the_url);
    const html = response.data; // parse the html and load it into cheerio
    const $ = cheerio.load(html); 
    $('video').each((index, element) => {
      total_distractions = total_distractions + 30; //make videos worth 10 times
    })
    $('img').each((index, element) => {
      total_distractions = total_distractions+1
    })

    for(let i = 0; i < extra_urls.length; i++){
      if(extra_urls[i] == the_url){
        isTheWebsiteDistracting = true;
      }
    }

    if(total_distractions >30 || isTheWebsiteDistracting){
      res.send('Distracting')

      //port.write('push\n')
    } else {
      res.send('Good')
    }
  } catch (error) {
    res.status(500).json({ message: "Error accessing the URL" });
  }
});
