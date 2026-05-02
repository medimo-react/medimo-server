const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: String, //약품명
    effect: String, //효능
    usage: String, //용법
    caution: String, //주의사항
    sideEffect: String, //부작용
    image: String, //이미지 URL
    rawText: String, //OCR 원문
    dosage: String, // 북마크/목록에서 보여줄 복용법

    // 조회 출처
    // easyDrug: e약은요 API
    // permit: 의약품 제품 허가정보 API
    source: String,

    // 의약품 제품 허가정보 API에서 내려오는 정보
    company: String, // 제조사
    ingredient: String, // 주성분
    storageMethod: String, // 저장방법
    validTerm: String, // 유효기간
    permitDate: String, // 허가일자
    className: String, // 전문/일반 구분

    interaction: String,
    productType: String,
    status: String,
    ediCode: String,
    normalizedName: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Medicine", medicineSchema, "medicine");
