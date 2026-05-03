const axios = require('axios');
const path = require('path');
const { createWorker } = require('tesseract.js');

const TRAINEDDATA_PATH = path.join(__dirname, '..');

async function extractTextWithVision(imageBuffer) {
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

async function extractTextWithTesseract(imageBuffer) {
  const worker = await createWorker(['kor', 'eng'], 1, {
    langPath: TRAINEDDATA_PATH,
    cachePath: TRAINEDDATA_PATH,
  });

  try {
    const { data: { text } } = await worker.recognize(imageBuffer);
    console.log('[Tesseract OCR] 인식된 텍스트:', text);
    return text;
  } finally {
    await worker.terminate();
  }
}

async function extractTextFromImage(imageBuffer) {
  try {
    return await extractTextWithVision(imageBuffer);
  } catch (err) {
    console.error('[Google Vision OCR] 실패, Tesseract로 전환:', err.response?.data ?? err.message);
    return await extractTextWithTesseract(imageBuffer);
  }
}

module.exports = { extractTextFromImage };
