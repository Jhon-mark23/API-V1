const gtts = require("gtts");

module.exports = {
  name: "Text-to-Speech",
  category: "tools",
  description: "Convert text into speech using Google TTS",
  route: "/tts",
  method: "GET",
  usage: "/tts?text=Hello World&lang=en",
  handler: async (req, res) => {
    const startTime = Date.now();
    const { text, lang = "en" } = req.query;

    // Validation
    if (!text) {
      return res.status(400).json({
        code: 400,
        msg: "Missing 'text' query parameter (e.g., /tts?text=Hello)",
      });
    }

    try {
      // Create speech stream
      const speech = new gtts(text, lang);

      // Set headers for streaming audio
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="tts_${Date.now()}.mp3"`
      );

      // Stream audio directly
      speech.stream().on("error", (err) => {
        console.error("TTS Stream Error:", err.message);
        res.status(500).json({
          code: 500,
          msg: "Error generating speech audio",
        });
      });

      speech.stream().pipe(res);

    } catch (error) {
      console.error("TTS Error:", error.message);
      res.status(500).json({
        code: 500,
        msg: "Internal server error",
      });
    }
  },
};