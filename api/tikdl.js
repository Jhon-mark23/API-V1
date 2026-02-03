const axios = require("axios");

module.exports = {
  name: "TikTok Downloader",
  category: "media",
  description: "Download TikTok videos without watermark",
  route: "/tikdl",
  method: "GET",
  usage: "/tikdl?url=<tiktok_video_url>",
  handler: async (req, res) => {
    const startTime = Date.now();
    const { url } = req.query;

    // Validate input
    if (!url) {
      return res.status(400).json({
        code: 400,
        msg: "Missing 'url' query parameter (e.g., /tikdl?url=<tiktok_url>)",
      });
    }

    try {
      // Fetch TikTok video data via TikWM API
      const api = await axios.get(
        `https://tikwm.com/api/?url=${encodeURIComponent(url)}`
      );

      // Handle failed response
      if (api.data.code !== 0 || !api.data.data) {
        return res.status(404).json({
          code: 404,
          msg: "Failed to fetch TikTok video data",
        });
      }

      const v = api.data.data;

      // Return structured response
      res.json({
        code: 0,
        msg: "success",
        processed_time: Number(((Date.now() - startTime) / 1000).toFixed(4)),
        data: {
          id: v.id || "",
          title: v.title || "",
          region: v.region || "PH",
          duration: v.duration || 0,
          cover: v.cover || "",
          music: v.music || "",
          play: v.play || "",
          wmplay: v.wmplay || "",
          hdplay: v.hdplay || "",
          no_watermark: v.play || "",
          author: {
            id: v.author?.id || "",
            unique_id: v.author?.unique_id || "",
            nickname: v.author?.nickname || "",
            avatar: v.author?.avatar || "",
          },
          stats: {
            likes: v.digg_count || 0,
            comments: v.comment_count || 0,
            shares: v.share_count || 0,
            saves: v.collect_count || 0,
          },
        },
      });
    } catch (err) {
      console.error("TikDL Error:", err.message);
      res.status(500).json({
        code: 500,
        msg: "Internal server error",
      });
    }
  },
};