const express = require('express');
const router = express.Router();
const { fetchMedicineInfo } = require('../utils/medicineApi');
const Medicine = require('../models/Medicine');

/**
 * GET /api/medicine?q=약품명
 * 약품명으로 DB 검색 후 없으면 식약처 API 조회해서 저장 후 반환
 *
 * [다음 작업자 참고]
 * - Gemini에서 추출한 candidates 배열을 프론트에서 받아
 *   각 약품명마다 이 API를 호출하면 됨
 *   예: candidates.forEach(name => GET /api/medicine?q=name)
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
    let medicines = await Medicine.find(filter).sort({ createdAt: -1 });

    if (medicines.length === 0 && q) {
      const result = await fetchMedicineInfo(q);
      if (result) {
        const saved = await Medicine.create(result);
        medicines = [saved];
      }
    }

    res.set('Cache-Control', 'no-store');
    res.json(medicines);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '데이터를 불러오지 못했습니다.' });
  }
});

module.exports = router;