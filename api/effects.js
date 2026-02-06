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
            const slug = match[2];
            const name = link.text().trim();
            const filename = mp3Url.split('/').pop();
            
            sounds.push({
              id: index + 1,
              name: name,
              filename: filename,
              slug: slug,
           //   mp3_url: mp3Url,
              page_url: `https://www.myinstants.com${link.attr('href')}`
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
      const { sound, search, limit } = req.query;
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
          s.filename.toLowerCase() === sound.toLowerCase() ||
          s.slug.toLowerCase().includes(sound.toLowerCase()) ||
          s.name.toLowerCase().includes(sound.toLowerCase())
        );
        
        if (foundSound) {
          return res.json({
            code: 0,
            msg: "Sound found",
            data: {
              sound: foundSound,
              total_sounds: sounds.length,
              cached: Date.now() - cacheTimestamp < CACHE_DURATION
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
              msg: "Partial matches found",
              data: {
                matches: matchingSounds,
                total_matches: matchingSounds.length,
                total_sounds: sounds.length
              }
            });
          }
          
          return res.json({
            code: 2,
            msg: `Sound "${sound}" not found`,
            data: {
              suggestions: sounds.slice(0, 5).map(s => s.filename),
              total_available: sounds.length
            }
          });
        }
      }
      
      // Case 2: Search by name/content
      if (search) {
        const searchTerm = search.toLowerCase();
        const matchingSounds = sounds.filter(s => 
          s.name.toLowerCase().includes(searchTerm) ||
          s.filename.toLowerCase().includes(searchTerm) ||
          s.slug.toLowerCase().includes(searchTerm)
        );
        
        return res.json({
          code: 0,
          msg: matchingSounds.length > 0 ? "Search results" : "No matches found",
          data: {
            sounds: matchingSounds.slice(0, parseInt(limit) || 50),
            total_matches: matchingSounds.length,
            total_sounds: sounds.length,
            search_term: search
          }
        });
      }
      
      // Case 3: No query - show all sounds (with optional limit)
      const showLimit = parseInt(limit) || sounds.length;
      return res.json({
        code: 0,
        msg: "All available sound effects",
        data: {
          sounds: sounds.slice(0, showLimit),
          total_sounds: sounds.length,
          showing: Math.min(showLimit, sounds.length),
          cached: Date.now() - cacheTimestamp < CACHE_DURATION,
          cache_age: Math.round((Date.now() - cacheTimestamp) / 1000) + ' seconds'
        }
      });
      
    } catch (error) {
      console.error('API error:', error);
      return res.json({
        code: 99,
        msg: "Internal server error",
        error: error.message
      });
    }
  }
};