const { getMedicineWithCache } = require('./medicineService');
const { fetchDurByProductName } = require('../utils/durApi');
const { summarizeMedicineBrief } = require('../utils/gemini');

async function processSingleCandidate(keyword) {
  const medicine = await getMedicineWithCache(keyword);
  const medicines = medicine ? [medicine] : [];

  const durList = medicine
    ? await fetchDurByProductName(keyword).catch(() => [])
    : [];

  const summary = medicine
    ? await summarizeMedicineBrief({ medicine, durList }).catch(() => '')
    : '';

  return { keyword, medicines, durList, summary };
}

async function runScanPipeline(candidates) {
  return Promise.all(candidates.map(processSingleCandidate));
}

module.exports = { runScanPipeline };
