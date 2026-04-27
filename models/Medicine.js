const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: String, //약품명
    effect: String, //효능
    usage: String, //용법
    caution: String, //주의사항
    sideEffect: String, //부작용
    image: String, //이미지 URL
    rawText: String, //OCR 원문
  },
  { timestamps: true }
);

module.exports = mongoose.model('Medicine', medicineSchema, 'medicine');