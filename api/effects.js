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

      // if no data
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
            msg: `Sound "${sound}" not found`,
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