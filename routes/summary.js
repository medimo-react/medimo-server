const express = require("express");
const router = express.Router();

const { summarizeMedicineBrief } = require("../utils/gemini");

router.post("/medicine", async (req, res) => {
  try {
    const { medicine, durList } = req.body;

    if (!medicine) {
      return res.status(400).json({
        message: "medicine 데이터가 필요합니다.",
        summary: "",
      });
    }

    const summary = await summarizeMedicineBrief({
      medicine,
      durList: durList || [],
    });

    return res.json({ summary });
  } catch (err) {
    console.error("[SUMMARY ERROR]", err);

    // 요약은 부가 기능이므로 실패해도 전체 분석을 막지 않음
    return res.json({
      summary: "",
      summaryError: true,
    });
  }
});

module.exports = router;