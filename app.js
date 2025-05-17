const express = require('express');
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const {SerialPort} = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');


const app = express();
app.use(cors())

let total_distractions = 0;
const PORT = process.env.PORT || 8000;  

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

// Scraper
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

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
      })
      
      res.json(data)
      if(total_distractions > 5){
        res.send('Distracting')
      } else {
        res.send('Good')
      }
    } catch (error) {
      res.status(500).json({ message: "Error accessing the URL" });
    }
  });
