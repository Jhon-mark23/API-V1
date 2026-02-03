const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Available Gemini AI models
const availableModels = {
    "1": "gemini-1.5-flash-latest",
    "2": "gemini-1.5-pro-latest",
    "3": "gemini-1.0-pro-latest"
};

module.exports = {
    name: "Gemini AI",
    category: "AI",
    description: "Google Gemini AI API integration with text and image support",
    route: "/geminiapi",
    method: "GET",
    usage: "/geminiapi?ask=hi&imagurl=&apikey=&aimodels=",
    handler: async (req, res) => {
        const { ask, imagurl, apikey, aimodels } = req.query;

        try {
            // === VALIDATION SECTION ===
            // Validate required parameters
            if (!ask || ask.trim() === "") {
                return res.status(400).json({
                    success: false,
                    error: "Missing or empty 'ask' parameter",
                    message: "Please provide a question to ask Gemini AI",
                    example: "/geminiapi?ask=What is artificial intelligence?&apikey=YOUR_API_KEY"
                });
            }

            if (!apikey || apikey.trim() === "") {
                return res.status(400).json({
                    success: false,
                    error: "Missing or empty 'apikey' parameter",
                    message: "Google Gemini API key is required",
                    example: "/geminiapi?ask=Hello&apikey=AIzaSyYourApiKeyHere"
                });
            }

            // Validate API key format (basic check)
            if (!apikey.startsWith('AIza')) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid API key format",
                    message: "Google API keys typically start with 'AIza'",
                    tip: "Get your API key from https://makersuite.google.com/app/apikey"
                });
            }

            // Validate and select model
            const modelKey = aimodels || "default";
            const selectedModel = availableModels[modelKey] || availableModels["default"];
            
            if (!availableModels[modelKey] && aimodels) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid model selection",
                    message: `Model '${aimodels}' is not available`,
                    availableModels: Object.entries(availableModels)
                        .filter(([key]) => key !== "default")
                        .map(([key, value]) => `${key}: ${value}`),
                    defaultModel: "Using 'gemini-1.5-flash-latest' as default"
                });
            }

            // Validate image URL format if provided
            if (imagurl) {
                try {
                    new URL(imagurl); // Will throw if invalid URL
                } catch (urlError) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid image URL",
                        message: "Please provide a valid URL for the image",
                        example: "https://example.com/image.jpg"
                    });
                }
            }

            // === INITIALIZE GEMINI ===
            let genAI;
            try {
                genAI = new GoogleGenerativeAI(apikey);
            } catch (initError) {
                return res.status(400).json({
                    success: false,
                    error: "Failed to initialize Gemini AI",
                    message: "Invalid API key or configuration",
                    details: initError.message
                });
            }

            let model;
            try {
                model = genAI.getGenerativeModel({ model: selectedModel });
            } catch (modelError) {
                return res.status(500).json({
                    success: false,
                    error: "Model initialization failed",
                    message: "Could not load the selected Gemini model",
                    model: selectedModel,
                    details: modelError.message
                });
            }

            // === PROCESS REQUEST ===
            let result;
            const startTime = Date.now();

            try {
                if (imagurl) {
                    // === IMAGE PROCESSING ===
                    let imageResponse;
                    try {
                        imageResponse = await axios.get(imagurl, {
                            responseType: 'arraybuffer',
                            timeout: 10000, // 10 second timeout
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Accept': 'image/*',
                                'Referer': 'https://google.com'
                            },
                            validateStatus: function (status) {
                                return status >= 200 && status < 300;
                            }
                        });

                        if (!imageResponse.data || imageResponse.data.length === 0) {
                            throw new Error("Image download returned empty data");
                        }

                        // Check if it's a valid image (basic check)
                        const contentType = imageResponse.headers['content-type'];
                        if (!contentType || !contentType.startsWith('image/')) {
                            throw new Error(`URL does not point to an image. Content-Type: ${contentType}`);
                        }

                    } catch (imageError) {
                        return res.status(400).json({
                            success: false,
                            error: "Image download failed",
                            message: "Could not download or process the provided image",
                            imageUrl: imagurl,
                            details: imageError.message,
                            tip: "Try a different image URL or use text-only mode"
                        });
                    }

                    const image = {
                        inlineData: {
                            data: Buffer.from(imageResponse.data).toString("base64"),
                            mimeType: imageResponse.headers['content-type'] || "image/jpeg",
                        },
                    };

                    try {
                        result = await model.generateContent([ask, image]);
                    } catch (genError) {
                        return res.status(400).json({
                            success: false,
                            error: "Content generation failed",
                            message: "Gemini AI could not process the image and text",
                            details: genError.message,
                            possibleCauses: [
                                "Image format not supported",
                                "Image too large",
                                "Content violates safety policies"
                            ]
                        });
                    }

                } else {
                    // === TEXT-ONLY PROCESSING ===
                    try {
                        result = await model.generateContent(ask);
                    } catch (genError) {
                        // Handle specific Gemini API errors
                        if (genError.message.includes("API_KEY_INVALID")) {
                            return res.status(401).json({
                                success: false,
                                error: "Invalid API Key",
                                message: "The provided Google Gemini API key is invalid or expired",
                                tip: "Get a new API key from https://makersuite.google.com/app/apikey"
                            });
                        }

                        if (genError.message.includes("SAFETY")) {
                            return res.status(400).json({
                                success: false,
                                error: "Content Safety Violation",
                                message: "The request was blocked due to safety concerns",
                                tip: "Try rephrasing your question or remove sensitive content"
                            });
                        }

                        throw genError; // Re-throw for generic error handling
                    }
                }

            } catch (processingError) {
                return res.status(500).json({
                    success: false,
                    error: "Processing failed",
                    message: "An error occurred while generating content",
                    details: processingError.message,
                    stack: process.env.NODE_ENV === 'development' ? processingError.stack : undefined
                });
            }

            // === SUCCESS RESPONSE ===
            const responseTime = Date.now() - startTime;
            
            if (!result || !result.response) {
                return res.status(500).json({
                    success: false,
                    error: "Empty response",
                    message: "Gemini AI returned an empty response"
                });
            }

            const responseText = result.response.text();
            if (!responseText || responseText.trim() === "") {
                return res.status(500).json({
                    success: false,
                    error: "Empty content",
                    message: "Gemini AI generated an empty response"
                });
            }

            res.json({
                success: true,
                response: responseText,
                model: selectedModel,
                hasImage: !!imagurl,
                processingTime: `${responseTime}ms`,
                usage: {
                    promptTokens: result.response.usageMetadata?.promptTokenCount || "unknown",
                    candidatesTokenCount: result.response.usageMetadata?.candidatesTokenCount || "unknown",
                    totalTokenCount: result.response.usageMetadata?.totalTokenCount || "unknown"
                },
                requestDetails: {
                    question: ask,
                    imageProvided: !!imagurl,
                    modelUsed: selectedModel
                }
            });

        } catch (unexpectedError) {
            // Catch-all for any unexpected errors
            console.error("Unexpected Gemini AI Error:", {
                message: unexpectedError.message,
                stack: unexpectedError.stack,
                queryParams: { ask: ask?.substring(0, 100), hasImage: !!imagurl }
            });

            res.status(500).json({
                success: false,
                error: "Internal Server Error",
                message: "An unexpected error occurred",
                details: process.env.NODE_ENV === 'development' ? unexpectedError.message : undefined,
                requestId: Date.now().toString(36) + Math.random().toString(36).substr(2),
                tip: "Please check your parameters and try again. If the problem persists, contact support."
            });
        }
    }
};
