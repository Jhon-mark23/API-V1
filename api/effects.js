// File: effects.js
const axios = require('axios');
const cheerio = require('cheerio');

let soundCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Random user agents to rotate
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.144',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function fetchSounds() {
  const now = Date.now();
  
  if (soundCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return soundCache;
  }
  
  try {
    const url = 'https://www.myinstants.com/en/index/ph/';
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 10000 // 10 second timeout
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
    // Try one more time with different user agent on failure
    if (!soundCache) {
      try {
        const backupResponse = await axios.get('https://www.myinstants.com/en/index/ph/', {
          headers: { 'User-Agent': getRandomUserAgent() },
          timeout: 8000
        });
        
        const $ = cheerio.load(backupResponse.data);
        const sounds = [];
        
        // Same extraction logic as above
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
        
      } catch (backupError) {
        console.error('Backup fetch also failed:', backupError.message);
        return soundCache || [];
      }
    }
    return soundCache || [];
  }
}

module.exports = {
  name: "Sound Effects API",
  category: "media",
  description: "Minimalist API for Myinstants sound effects with random user agents",
  route: "/effects",
  method: "GET",
  usage: "/effects?sound=filename.mp3 or /effects for all",
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