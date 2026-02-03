const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/*const = aimodels [
 "gemini-flash-lite-latest",
];*/

const models = {
  1: "gemini-flash-lite-latest",
  2: "gemini-pro"
};




module.exports = {
    name: "Gemini AI",
    category: "AI",
    description: "Google Gemini AI API integration with text and image support",
    route: "/geminiapi",
    method: "GET",
    usage: "/geminiapi?ask=&imagurl=&apikey=&aimodels=",
    handler: async (req, res) => {
        const { ask, imagurl, apikey, aimodels } = req.query;

if(!aimodels){
	console.log("GEMINI AI Models no selected pls select AI models\n\nThis is the available GEMINI AI models\n\n${selectedModel}\n");
	process.exit(1);
	}
	
        if (!ask || !apikey ) { 
  return res.status(400).json({ 
    error: 'Both ask and apikey parameters are required.\n\nThis is the available GEMINI AI models ${aimodels}\n' 
  }); 
}

const selectedModel = models[aimodels];
if (!selectedModel) {
  return res.status(400).json({ error: 'Invalid aimodels parameter.' });
}

        try {
            const genAI = new GoogleGenerativeAI(apikey);
            const model = genAI.getGenerativeModel({ model: selectedModel });
      //      const model = genAI.getGenerativeModel({ model: aimodels });

            let result;

            if (imagurl) {
                // Fetch the image if imagurl is provided
                const imageResponse = await axios.get(imagurl, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                        'Referer': 'https://facebook.com'
                    }
                });

                const image = {
                    inlineData: {
                        data: Buffer.from(imageResponse.data).toString("base64"),
                        mimeType: "image/jpeg",
                    },
                };

                result = await model.generateContent([ask, image]);
            } else {
                // Use only text input if imagurl is not provided
                result = await model.generateContent(ask);
            }
            
            

            res.json({
                description: result.response.text(),
            });
        } catch (error) {
            console.error("Error:", error.message);
            res.status(500).json({
                error: 'An error occurred while processing the request.',
                details: error.message,
            });
        }
    }

};
