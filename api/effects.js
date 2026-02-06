const axios = require('axios');
const cheerio = require('cheerio');

// Cache for storing sound data
let soundCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Pool of random User-Agents
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.160 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:115.0) Gecko/20100101 Firefox/115.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
];

// Helper → pick random User-Agent
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchSounds() {
  const now = Date.now();

  // Return cached if valid
  if (soundCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return soundCache;
  }

  try {
    const url = 'https://www.myinstants.com/en/index/ph/';
    const response = await axios.get(url, {
      headers: { 'User-Agent': getRandomUserAgent() }
    });

    const $ = cheerio.load(response.data);
    const sounds = [];

    $('div.instant').each((index, element) => {
      const button = $(element).find('button');
      const link = $(element).find('a.instant-link');

      if (button.length && link.length) {
        const onclick = button.attr('onclick');
        if (onclick) {
          const match = onclick.match(/play'([^']+)',\s*'[^']*',\s*'([^']+)'/);
          if (match) {
            const mp3Url = match[1].startsWith('/')
              ? `https://www.myinstants.com${match[1]}`
              : match[1];
            const slug = match[2];
            const name = link.text().trim();
            const filename = mp3Url.split('/').pop();

            sounds.push({
              id: index + 1,
              name,
              filename,
              slug,
              mp3_url: mp3Url,
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
      const { sound } = req.query;
      const sounds = await fetchSounds();

      if (!sounds || sounds.length === 0) {
        return res.json({
          code: 1,
          msg: "No sounds available at the moment",
          data: []
        });
      }

      // case: /effects?sound=fahhhhhhhhhhhhhh.mp3
      if (sound) {
        const found = sounds.find(
          s => s.filename.toLowerCase() === sound.toLowerCase()
        );

        if (found) {
          return res.json({
            code: 0,
            msg: "",
            data: {
              sounds: [
                {
                  id: found.id,
                  name: found.name,
                  mp3_url: found.mp3_url
                }
              ]
            }
          });
        } else {
          return res.json({
            code: 2,
            msg: `Sound \"${sound}\" not found`,
            data: { sounds: [] }
          });
        }
      }

      // case: /effects
      return res.json({
        code: 0,
        msg: "All available sound effects",
        data: {
          sounds: sounds.map(({ id, name, filename }) => ({
            id,
            name,
            filename
          }))
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