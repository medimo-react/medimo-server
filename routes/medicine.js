const express = require('express');
const router = express.Router();
const { fetchMedicineInfo } = require('../utils/medicineApi');
const Medicine = require('../models/Medicine');

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const cleanMedicineKeyword = (value = "") => {
  const text = String(value).trim();

  const matched = text.match(
    /[가-힣A-Za-z0-9]+(?:정|캡슐|시럽|현탁액|액|과립|산|주사|주|크림|연고|겔|패취|점안액)/
  );

  return matched?.[0] || text.split(/\s|\[/)[0];
};

/**
 * GET /api/medicine?q=약품명
 * 약품명으로 DB 검색 후 없으면 식약처 API 조회해서 저장 후 반환
 *
 * [다음 작업자 참고]
 * - Gemini에서 추출한 candidates 배열을 프론트에서 받아
 *   각 약품명마다 이 API를 호출하면 됨
 *   예: candidates.forEach(name => GET /api/medicine?q=name)
 */
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const shouldRefresh = req.query.refresh === "true" || req.query.refresh === "1";

    const keyword = q ? cleanMedicineKeyword(q) : "";

    if (!keyword) {
      return res.json([]);
    }

    const escapedKeyword = escapeRegex(keyword);

    const filter = {
      name: { $regex: escapedKeyword, $options: "i" },
    };

    let medicines = [];

    if (!shouldRefresh) {
      medicines = await Medicine.find(filter).sort({ createdAt: -1 });
    }

    if (medicines.length === 0 || shouldRefresh) {
      const result = await fetchMedicineInfo(keyword);

      if (result) {
        if (shouldRefresh) {
          await Medicine.deleteMany(filter);
        }

        const saved = await Medicine.create(result);
        medicines = [saved];
      }
    }

    res.set("Cache-Control", "no-store");
    return res.json(medicines);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "데이터를 불러오지 못했습니다.",
      message: err.message,
    });
  }
});

module.exports = router;