const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// List of User-Agents to randomize
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.7 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.185 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.5790.171 Mobile Safari/537.36"
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

module.exports = {
    name: "Spotify Info",
    category: "Music",
    description: "Spotify Downloader web scrape",
    route: "/spotify",
    method: "GET",
    usage: "/spotify?url=<spotify_track_url>",
    handler: async (req, res) => {
        const { url, id, name } = req.query;

        // 🎵 Serve existing file
        if (id) {
            const filePath = path.join("/tmp", `${id}.mp3`);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, message: "File expired" });
            }

            res.setHeader("Content-Type", "audio/mpeg");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${name || "song"}.mp3"`
            );

            return fs.createReadStream(filePath).pipe(res);
        }

        // 🎵 Process Spotify URL
        if (!url) {
            return res.status(400).json({ success: false, message: "Spotify track URL is required." });
        }

        try {
            const randomUA = getRandomUserAgent();

            // 🔹 Get song info
            const infoRes = await axios.get(
                "https://spotdown.org/api/song-details",
                {
                    params: { url },
                    headers: {
                        "User-Agent": randomUA,
                        "Referer": "https://spotdown.org"
                    }
                }
            );

            const song = infoRes.data.songs?.[0];
            if (!song) return res.status(404).json({ success: false, message: "Song not found." });

            const safeName = `${song.title} - ${song.artist}`.replace(/[\\/:*?"<>|]/g, "").trim();

            // 🔹 Download MP3
            const audioRes = await axios({
                method: "POST",
                url: "https://spotdown.org/api/download",
                data: { url },
                headers: {
                    "Content-Type": "application/json",
                    "Referer": "https://spotdown.org",
                    "User-Agent": randomUA
                },
                responseType: "arraybuffer"
            });

            // 🔹 Save temp file
            const fileId = crypto.randomBytes(6).toString("hex");
            const filePath = path.join("/tmp", `${fileId}.mp3`);
            fs.writeFileSync(filePath, Buffer.from(audioRes.data));

            // 🔹 Return JSON with download URL
            return res.json({
                success: true,
                info: {
                    title: song.title,
                    artist: song.artist,
                    album: song.album,
                    duration: song.duration,
                    thumbnail: song.thumbnail
                },
                downloadUrl: `${req.protocol}://${req.get("host")}/spotify?id=${fileId}&name=${encodeURIComponent(safeName)}`
            });

        } catch (error) {
            console.error("Spotify API Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Failed to process Spotify track."
            });
        }
    }
};
