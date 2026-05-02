const express = require("express");
const router = express.Router();
const multer = require("multer");
const { extractTextFromImage } = require("../models/ocr");
const {
  extractMedicines,
  extractMedicinesFallback,
} = require("../utils/gemini");

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
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "이미지가 없습니다." });

    const rawText = await extractTextFromImage(req.file.buffer);

    console.log("[SCAN] rawText:", rawText);

    // Step 2: Gemini 약품명 추출 (미구현 - 다음 작업자)
    let candidates = [];
    let usedFallback = false;

    const BLOCK_WORDS = [
      "환자",
      "가정",
      "메디홈",
      "약제비",
      "총액",
      "전액",
      "금액",
      "수납",
      "본인부담",
      "보험",
      "처방",
      "조제",
      "복용",
      "용법",
      "용량",
      "일수",
      "투약",
      "필름코팅",
      "코팅정",
      "완화시켜",
    ];

    const DOSAGE_ONLY_WORDS = [
      "정",
      "1정",
      "2정",
      "3정",
      "전액",
      "필름코팅정",
      "코팅정",
      "캡슐",
      "시럽",
      "현탁액",
      "과립",
      "연고",
      "크림",
    ];

    const cleanMedicineName = (value = "") => {
      const text = String(value)
        .replace(/\s+/g, "")
        .replace(/[()[\]{}]/g, "")
        .trim();

      if (!text) return "";

      // 너무 짧은 값 제거: 1정, 정, 전액 같은 값 방지
      if (text.length < 3) return "";

      // 숫자 + 제형만 있는 값 제거
      if (/^\d+(정|캡슐|포|병|회|일|mg|ml)$/i.test(text)) return "";

      // 금액/환자/문장성 단어 제거
      if (BLOCK_WORDS.some((word) => text.includes(word))) return "";

      // 제형만 있는 단어 제거
      if (DOSAGE_ONLY_WORDS.includes(text)) return "";

      /**
       * 주의:
       * - "주" 단독은 제거해야 함. "완화시켜주" 같은 문장이 잡힘.
       * - "액"은 전액/금액 때문에 위험하지만, 실제 약품명에도 쓰일 수 있어서
       *   위 BLOCK_WORDS로 먼저 걸러낸 뒤 제한적으로 허용.
       */
      const matched = text.match(
        /[가-힣A-Za-z0-9]+(?:정|캡슐|시럽|현탁액|액|과립|산|주사|크림|연고|겔|패취|점안액)$/,
      );

      return matched?.[0] || "";
    };

    const normalizeCandidates = (candidates = []) => {
      return [...new Set(candidates.map(cleanMedicineName).filter(Boolean))];
    };

    try {
      candidates = await extractMedicines(rawText);
    } catch (geminiErr) {
      console.error("[GEMINI MEDICINE EXTRACT ERROR]", geminiErr.message);

      candidates = extractMedicinesFallback(rawText);
      usedFallback = true;
    }

    candidates = normalizeCandidates(candidates);

    console.log("[SCAN] candidates:", candidates);

    return res.json({
      rawText,
      candidates,
      usedFallback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "처리 중 오류가 발생했습니다." });
  }
});

module.exports = router;
