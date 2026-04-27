const axios = require('axios');

const API_KEY = process.env.MEDICINE_API_KEY; //식약처 공공데이터 API 키
const BASE_URL = 'http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList';

async function fetchMedicineInfo(itemName) {
  try {
    const res = await axios.get(BASE_URL, {
      params: {
        serviceKey: API_KEY,
        itemName,
        numOfRows: 1,
        pageNo: 1,
        type: 'json'
      }
    });

    const item = res.data?.body?.items?.[0];
    if (!item) return null;

    return {
      name: item.itemName,
      effect: item.efcyQesitm,       // 이 약의 효능
      usage: item.useMethodQesitm,    // 이 약의 용법
      caution: item.atpnQesitm,       // 주의사항
      sideEffect: item.seQesitm,      // 부작용
      image: item.itemImage,          // 약 이미지
    };
  } catch { 
    return null;
  }
}

module.exports = { fetchMedicineInfo };