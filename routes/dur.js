const express = require("express");
const router = express.Router();

const {
  fetchDurByIngredient,
  fetchDurByProductName,
} = require("../utils/durApi");

const normalizeProductName = (name = "") =>
  String(name)
    .replace(/\([^)]*\)/g, "") // 괄호 안 성분명 제거
    .replace(/\[[^\]]*\]/g, "") // 대괄호 내용 제거
    .replace(/\s+/g, " ")
    .trim();

/**
 * GET /api/dur/ingredient?name=Metoclopramide
 * 성분명 기준 DUR 병용금기 조회
 */
router.get("/ingredient", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        message: "성분명이 필요합니다.",
      });
    }

    const result = await fetchDurByIngredient(name);

    return res.json(result);
  } catch (err) {
    console.error("[DUR INGREDIENT ROUTE ERROR]", err);

    return res.status(500).json({
      message: "DUR 성분 정보를 불러오지 못했습니다.",
      error: err.message,
    });
  }
});

/**
 * GET /api/dur/product?name=맥페란정
 * 품목명 기준 DUR 병용금기 조회
 */
router.get("/product", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        message: "품목명이 필요합니다.",
      });
    }

    const productName = normalizeProductName(name);

    console.log("[DUR PRODUCT RAW NAME]", name);
    console.log("[DUR PRODUCT NORMALIZED NAME]", productName);

    const result = await fetchDurByProductName(productName);

    return res.json(result);
  } catch (err) {
    console.error("[DUR PRODUCT ROUTE ERROR]", err);

    return res.status(500).json({
      message: "DUR 품목 정보를 불러오지 못했습니다.",
      error: err.message,
    });
  }
});

module.exports = router;
