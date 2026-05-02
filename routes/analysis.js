const express = require('express');
const router = express.Router();
const AnalysisRecord = require('../models/AnalysisRecord');
const authMiddleware = require('../middleware/auth');

// POST /api/analysis - 분석 결과 저장
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { candidates, medicineResults } = req.body;

    if (!medicineResults) {
      return res.status(400).json({ error: 'medicineResults가 필요합니다.' });
    }

    const medicineCount = medicineResults.filter(r => r.medicines?.length > 0).length;
    const cautionCount = medicineResults.filter(r => r.durList?.length > 0).length;

    const record = await AnalysisRecord.create({
      userId: req.user.id,
      candidates,
      medicineCount,
      cautionCount,
      medicineResults,
    });

    return res.json({ recordId: record._id });
  } catch (err) {
    console.error('[ANALYSIS SAVE ERROR]', err);
    res.status(500).json({ error: '저장에 실패했습니다.' });
  }
});

// GET /api/analysis - 내 기록 목록 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    const records = await AnalysisRecord.find({ userId: req.user.id })
      .select('candidates medicineCount cautionCount createdAt')
      .sort({ createdAt: -1 });

    return res.json(records);
  } catch (err) {
    console.error('[ANALYSIS LIST ERROR]', err);
    res.status(500).json({ error: '목록을 불러오지 못했습니다.' });
  }
});

// GET /api/analysis/:id - 상세 조회
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const record = await AnalysisRecord.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!record) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });

    return res.json(record);
  } catch (err) {
    console.error('[ANALYSIS DETAIL ERROR]', err);
    res.status(500).json({ error: '기록을 불러오지 못했습니다.' });
  }
});

module.exports = router;
