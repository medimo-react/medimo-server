const express = require('express');
const router = express.Router();
const multer = require('multer');
const { extractTextFromImage } = require('../utils/ocr');

const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/scan
 * 이미지를 받아 Google Vision OCR로 텍스트를 추출해 반환
 *
 * 현재 응답: { rawText }
 *
 * [다음 작업자를 위한 흐름 참고]
 * 1. services/geminiService.js 생성
 *    - rawText를 Gemini에 전달해 약품명만 추출하는 함수 작성
 *    - 반환 형태: candidates: string[]
 * 2. 아래 흐름으로 scan.js 수정
 *    const candidates = await extractMedicines(rawText);
 *    res.json({ rawText, candidates });
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '이미지가 없습니다.' });

    // Step 1: Google Vision OCR로 텍스트 추출
    const rawText = await extractTextFromImage(req.file.buffer);

    console.log('[SCAN] rawText:', rawText);

    // Step 2: Gemini 약품명 추출 (미구현 - 다음 작업자)
    // const candidates = await extractMedicines(rawText);

    res.json({ rawText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
