const express = require('express');
const router = express.Router();
const multer = require('multer');
const { extractTextFromImage } = require('../utils/ocr');
const { extractMedicines } = require('../utils/gemini');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '이미지가 없습니다.' });

    const rawText = await extractTextFromImage(req.file.buffer);
    console.log('[SCAN] rawText:', rawText);

    const candidates = await extractMedicines(rawText);
    console.log('[SCAN] candidates:', candidates);

    return res.json({ rawText, candidates });

  } catch (err) {
    console.error('[SCAN ERROR]', err);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
