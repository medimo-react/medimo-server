const express = require("express");
const router = express.Router();

const {
  summarizeMedicineBrief,
  summarizeMedicinesBrief,
} = require("../utils/gemini");

const makeEasyFallbackSummary = (medicine = {}) => {
  const text = [
    medicine.effect,
    medicine.usage,
    medicine.caution,
    medicine.interaction,
    medicine.sideEffect,
    medicine.storageMethod,
  ]
    .filter(Boolean)
    .join(" ");

  const hasDurWarnings =
    Array.isArray(medicine.durWarnings) && medicine.durWarnings.length > 0;

  if (hasDurWarnings) {
    return "함께 먹으면 주의가 필요한 약이 있을 수 있어 복용 전 확인하세요.";
  }

  if (medicine.source === "permit") {
    return "제품 허가정보 기준으로 확인됐으며, 복용법과 부작용은 처방전이나 약사 안내를 확인하세요.";
  }

  if (/졸음|운전|기계/.test(text)) {
    return "졸음이 올 수 있으니 운전이나 기계 조작 전에는 주의하세요.";
  }

  if (/과민|알레르기|녹내장|전립선|간질|배뇨|소변/.test(text)) {
    return "알레르기나 특정 질환이 있다면 복용 전 약사에게 확인하세요.";
  }

  if (/보관|실온|차광|밀폐/.test(text)) {
    return "복용 전 안내사항을 확인하고 정해진 방법대로 보관하세요.";
  }

  return "복용 전 처방전이나 약사 안내를 확인하고, 이상 증상이 있으면 복용을 중단하세요.";
};

const makeFallbackSummaries = (medicines = []) =>
  medicines.map((medicine, index) => ({
    id: String(medicine.id ?? index),
    keyword: medicine.keyword || medicine.name || "",
    summary: makeEasyFallbackSummary(medicine),
  }));

// 기존: 약 1개 요약
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

    console.log("[PRESCRIPTION SUMMARY RESULT]", summary);

    return res.json({ summary });
  } catch (err) {
    console.error("[SUMMARY ERROR]", err);

    return res.json({
      summary: "",
      summaryError: true,
    });
  }
});

// 추가: 약 여러 개를 한 번에 요약
router.post("/medicines", async (req, res) => {
  try {
    const { medicines } = req.body;

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        message: "medicines 배열 데이터가 필요합니다.",
        summaries: [],
      });
    }

    const summaries = await summarizeMedicinesBrief(medicines);

    return res.json({ summaries });
  } catch (err) {
    console.error("[SUMMARY BULK ERROR]", err);

    const fallbackSummaries = makeFallbackSummaries(req.body.medicines || []);

    return res.json({
      summaries: fallbackSummaries,
      summaryError: true,
      fallback: true,
    });
  }
});

module.exports = router;
