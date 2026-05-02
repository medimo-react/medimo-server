const Medicine = require('../models/Medicine');
const { fetchMedicineInfo } = require('../utils/medicineApi');

async function getMedicineWithCache(name) {
  const cached = await Medicine.findOne({ name: { $regex: name, $options: 'i' } });
  if (cached) return cached;

  const result = await fetchMedicineInfo(name);
  if (!result) return null;

  return await Medicine.create(result);
}

module.exports = { getMedicineWithCache };
