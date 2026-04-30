const axios = require('axios');

async function extractTextFromImage(imageBuffer) {
  const base64Image = imageBuffer.toString('base64');

  const response = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    {
      requests: [
        {
          image: { content: base64Image },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    }
  );

  const text = response.data?.responses?.[0]?.textAnnotations?.[0]?.description ?? '';
  console.log('[Google Vision OCR] 인식된 텍스트:', text);
  return text;
}

async function extractTextFromImageSafe(imageBuffer) {
  try {
    return await extractTextFromImage(imageBuffer);
  } catch (err) {
    console.error('[Google Vision OCR] 에러 상세:', err.response?.data ?? err.message);
    throw err;
  }
}

module.exports = { extractTextFromImage: extractTextFromImageSafe };
