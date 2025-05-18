const express = require('express');
const router = express.Router();
const axios = require('axios');

const apiKey = process.env.GEMINI_API_KEY;

router.post('/suggest', async (req, res) => {
  try {
    console.log('Received request with blockedSites:', req.body.blockedSites);
    
    const { blockedSites } = req.body;
    if (!Array.isArray(blockedSites)) {
      return res.status(400).json({ error: 'blockedSites must be an array' });
    }

    // Verify API key is present
    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const prompt = `Based on these blocked websites: ${blockedSites.join(', ')}, suggest 3 similar websites that might also be distracting. Return only a JSON array of website URLs. Example: {"sites": ["example.com", "example.org"]}`;

    const geminiPayload = {
      contents: [{
        role: "user",
        parts: [{
          text: prompt
        }]
      }]
    };

    const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    console.log('Making request to:', requestUrl);

    const geminiResponse = await axios.post(requestUrl, geminiPayload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Gemini API response:', geminiResponse.data);
    
    // Handle different response formats
    let suggestions = [];
    if (geminiResponse.data.candidates && geminiResponse.data.candidates[0].content.parts[0].text) {
      const responseText = geminiResponse.data.candidates[0].content.parts[0].text;
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(responseText);
        suggestions = parsed.sites || [];
      } catch (e) {
        // Fallback to extracting URLs
        const urlRegex = /https?:\/\/[^\s]+/g;
        suggestions = responseText.match(urlRegex) || [];
      }
    }

    return res.json({ suggestions });

  } catch (error) {
    console.error('Full error details:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Failed to get suggestions from Gemini API',
      details: error.response?.data || error.message 
    });
  }
});

module.exports = router;