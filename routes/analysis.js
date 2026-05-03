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
    .select('candidates medicineCount cautionCount createdAt isPinned pinnedAt')
    .sort({ isPinned: -1, pinnedAt: -1, createdAt: -1 });

    return res.json(records);
  } catch (err) {
    console.error('[ANALYSIS LIST ERROR]', err);
    res.status(500).json({ error: '목록을 불러오지 못했습니다.' });
  }
});

// PATCH /api/analysis/:id/title - 이름 변경
router.patch('/:id/title', authMiddleware, async (req, res) => {
  try {
    const title = req.body.title?.trim();

    if (!title) {
      return res.status(400).json({ error: '제목을 입력해주세요.' });
    }
    if (title.length > 50) {
      return res.status(400).json({ error: '제목은 50자 이하로 입력해주세요.' });
    }

    const record = await AnalysisRecord.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { title },
        { new: true, select: 'title' },
    );

    if (!record) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });

    return res.json({ title: record.title });
  } catch (err) {
    console.error('[ANALYSIS RENAME ERROR]', err);
    res.status(500).json({ error: '이름 변경에 실패했습니다.' });
  }
});

// PATCH /api/analysis/:id/pin - 상단 고정 토글
router.patch('/:id/pin', authMiddleware, async (req, res) => {
  try {
    const record = await AnalysisRecord.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!record) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });

    record.isPinned = !record.isPinned;
    record.pinnedAt = record.isPinned ? new Date() : null;
    await record.save();

    return res.json({ isPinned: record.isPinned });
  } catch (err) {
    console.error('[ANALYSIS PIN ERROR]', err);
    res.status(500).json({ error: '고정 처리에 실패했습니다.' });
  }
});

// GET /api/analysis/recent - 내 최근 분석 결과 조회
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const recentAnalysis = await AnalysisRecord.findOne({
      userId: req.user.id,
    })
    .select("candidates medicineCount cautionCount medicineResults createdAt")
    .sort({ createdAt: -1 });

    return res.json(recentAnalysis || null);
  } catch (err) {
    console.error("[ANALYSIS RECENT ERROR]", err);
    res.status(500).json({
      error: "최근 분석 결과를 불러오지 못했습니다.",
    });
  }
});

// DELETE /api/analysis/:id - 기록 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const record = await AnalysisRecord.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!record) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });

    return res.json({ success: true });
  } catch (err) {
    console.error('[ANALYSIS DELETE ERROR]', err);
    res.status(500).json({ error: '삭제에 실패했습니다.' });
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
