
const axios = require('axios');
const cheerio = require('cheerio');

// Cache for storing sound data
let soundCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Random user agents
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.144'
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
        'Connection': 'keep-alive'
      },
      timeout: 10000
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
    
    // Try backup with different user agent
    if (!soundCache) {
      try {
        console.log('Attempting backup fetch...');
        const backupResponse = await axios.get('https://www.myinstants.com/en/index/ph/', {
          headers: { 'User-Agent': getRandomUserAgent() },
          timeout: 8000
        });
        
        const $ = cheerio.load(backupResponse.data);
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
        
      } catch (backupError) {
        console.error('Backup fetch failed:', backupError.message);
      }
    }
    
    return soundCache || [];
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
      
      if (!sounds || sounds.length === 0) {
        return res.json({
          code: 1,
          msg: "No sounds available at the moment",
          data: []
        });
      }
      
      // Search for specific sound by filename
      if (sound) {
        const foundSound = sounds.find(s => 
          s.filename.toLowerCase() === sound.toLowerCase()
        );
        
        if (foundSound) {
          return res.json({
            code: 0,
            msg: "The sound effects found",
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
      
      // No query - show all sounds
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