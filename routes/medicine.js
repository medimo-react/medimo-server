const express = require('express');
const router = express.Router();
const multer = require('multer');
const { extractTextFromImage } = require('../utils/ocr');
const { fetchMedicineInfo } = require('../utils/medicineApi');
const Medicine = require('../models/Medicine');

const upload = multer({ storage: multer.memoryStorage() });

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

router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '이미지가 없습니다.' })
    
    //1. OCR로 텍스트 추출
    const rawText = await extractTextFromImage(req.file.buffer);

    console.log('[SCAN] rawText:', rawText);

    //2. 약품명처럼 생긴 줄만 추출 (mg/정/캡슐/시럽/액/연고 포함, 4자 이상)
    const drugPattern = /mg|정|캡슐|시럽|액|연고|크림|주사|산|환|겔|패치/i;
    const lines = rawText
      .split(/\n/)
      .map(l => l.trim())
      .filter(l => l.length >= 4 && drugPattern.test(l))
      .map(l => l.replace(/[^\w가-힣\s]/g, '').trim())
      .filter((l, i, arr) => l.length >= 2 && arr.indexOf(l) === i); // 중복 제거

    console.log('[SCAN] 추출된 약품명 후보:', lines);

    //3. 식약처 API로 각 약품명 조회
    const results = await Promise.allSettled(
      lines.map(name => fetchMedicineInfo(name))
    );

    const medicines = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    console.log('[SCAN] 매칭된 약품:', medicines.map(m => m.name));

    if (medicines.length > 0) {
      await Medicine.insertMany(medicines.map(med => ({ ...med, rawText })));
    }

    res.json({ rawText, medicines });
  } catch (err) { 
    console.error(err);
    res.status(500).json({error: '처리 중 오류가 발생했습니다.'})
  }
})

module.exports = router;