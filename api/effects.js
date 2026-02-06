// File: effects.js
const axios = require('axios');
const cheerio = require('cheerio');

// Cache for storing sound data to avoid repeated scraping
let soundCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

async function fetchSounds() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (soundCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return soundCache;
  }
  
  try {
    const url = 'https://www.myinstants.com/en/index/ph/';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const sounds = [];
    
    // Find all sound elements
    $('div.instant').each((index, element) => {
      const button = $(element).find('button');
      const link = $(element).find('a.instant-link');
      
      if (button.length && link.length) {
        const onclick = button.attr('onclick');
        if (onclick) {
          // Extract MP3 URL from play() function
          const match = onclick.match(/play\('([^']+)',\s*'[^']*',\s*'([^']+)'\)/);
          if (match) {
            const mp3Url = match[1].startsWith('/') ? 
              `https://www.myinstants.com${match[1]}` : match[1];
            const name = link.text().trim();
            const filename = mp3Url.split('/').pop();
            
            sounds.push({
              id: index + 1,
              name: name,
              filename: filename,
              mp3_url: mp3Url
            });
          }
        }
      }
    });
    
    soundCache = sounds;
    cacheTimestamp = now;
    return sounds;
    
  } catch (error) {
    console.error('Error fetching sounds:', error.message);
    return soundCache || []; // Return cache if exists, otherwise empty array
  }
}

module.exports = {
  name: "Sound Effects API",
  category: "media",
  description: "API for Myinstants sound effects. Search or list available sounds.",
  route: "/effects",
  method: "GET",
  usage: "/effects?sound=filename.mp3",
  handler: async (req, res) => {
    try {
      const { sound, limit } = req.query;
      const sounds = await fetchSounds();
      
      // If no sounds found
      if (!sounds || sounds.length === 0) {
        return res.json({
          code: 1,
          msg: "No sounds available at the moment",
          data: []
        });
      }
      
      // Case 1: Search for specific sound by filename
      if (sound) {
        const foundSound = sounds.find(s => 
          s.filename.toLowerCase() === sound.toLowerCase()
        );
        
        if (foundSound) {
          return res.json({
            code: 0,
            msg: "",
            data: {
              sounds: [{
                id: foundSound.id,
                name: foundSound.name,
                mp3_url: foundSound.mp3_url
              }]
            }
          });
        } else {
          // Try partial filename match
          const matchingSounds = sounds.filter(s => 
            s.filename.toLowerCase().includes(sound.toLowerCase())
          );
          
          if (matchingSounds.length > 0) {
            return res.json({
              code: 0,
              msg: "",
              data: {
                sounds: matchingSounds.map(sound => ({
                  id: sound.id,
                  name: sound.name,
                  mp3_url: sound.mp3_url
                }))
              }
            });
          }
          
          return res.json({
            code: 2,
            msg: "Sound not found",
            data: null
          });
        }
      }
      
      // Case 2: No query - show all sounds (with optional limit)
      const showLimit = parseInt(limit) || sounds.length;
      return res.json({
        code: 0,
        msg: "All available sound effects",
        data: {
          sounds: sounds.slice(0, showLimit).map(sound => ({
            id: sound.id,
            name: sound.name,
            filename: sound.filename
          })),
          total: sounds.length,
          showing: Math.min(showLimit, sounds.length)
        }
      });
      
    } catch (error) {
      console.error('API error:', error);
      return res.json({
        code: 99,
        msg: "Internal server error",
        data: null
      });
    }
  }
};