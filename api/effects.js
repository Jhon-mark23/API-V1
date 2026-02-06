
const axios = require('axios');
const cheerio = require('cheerio');

let soundCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function fetchSounds() {
  const now = Date.now();
  
  if (soundCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return soundCache;
  }
  
  try {
    const url = 'https://www.myinstants.com/en/index/ph/';
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const $ = cheerio.load(response.data);
    const sounds = [];
    
    $('div.instant').each((index, element) => {
      const button = $(element).find('button');
      const link = $(element).find('a.instant-link');
      
      if (button.length && link.length) {
        const onclick = button.attr('onclick');
        if (onclick) {
          const match = onclick.match(/play\('([^']+)',\s*'[^']*',\s*'([^']+)'\)/);
          if (match) {
            const mp3Url = match[1].startsWith('/') ? 
              `https://www.myinstants.com${match[1]}` : match[1];
            const filename = mp3Url.split('/').pop();
            
            sounds.push({
              id: index + 1,
              name: link.text().trim(),
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
    return soundCache || [];
  }
}

module.exports = {
  name: "Sound Effects API",
  category: "media",
  description: "Minimalist API for Myinstants sound effects",
  route: "/effects",
  method: "GET",
  usage: "/effects?sound=filename.mp3",
  handler: async (req, res) => {
    try {
      const { sound, limit } = req.query;
      const sounds = await fetchSounds();
      
      if (!sounds || sounds.length === 0) {
        return res.json({
          code: 1,
          msg: "No sounds available",
          data: []
        });
      }
      
      // Specific sound query
      if (sound) {
        const foundSound = sounds.find(s => 
          s.filename.toLowerCase() === sound.toLowerCase()
        );
        
        if (foundSound) {
          return res.json({
            code: 0,
            msg: "Sound found",
            data: {
              sound: foundSound,
              total: sounds.length
            }
          });
        }
        
        // Try partial match
        const matchingSounds = sounds.filter(s => 
          s.filename.toLowerCase().includes(sound.toLowerCase())
        );
        
        if (matchingSounds.length > 0) {
          return res.json({
            code: 0,
            msg: `${matchingSounds.length} matches found`,
            data: {
              sounds: matchingSounds,
              total: sounds.length
            }
          });
        }
        
        return res.json({
          code: 2,
          msg: "Sound not found",
          data: {
            suggestions: sounds.slice(0, 3).map(s => s.filename)
          }
        });
      }
      
      // No query - return all sounds
      const showLimit = parseInt(limit) || sounds.length;
      return res.json({
        code: 0,
        msg: "All available sound effects",
        data: {
          sounds: sounds.slice(0, showLimit),
          total: sounds.length,
          showing: Math.min(showLimit, sounds.length)
        }
      });
      
    } catch (error) {
      return res.json({
        code: 99,
        msg: "Server error",
        data: null
      });
    }
  }
};