const axios = require("axios");

const API_KEY = process.env.MEDICINE_API_KEY;

// 1차: e약은요 API
const EASY_DRUG_URL =
  "http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList";

// 2차: 의약품 제품 허가정보 API
const PERMIT_DRUG_URL =
  "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07";

const getItems = (data) => {
  const items = data?.body?.items;

  if (!items) return [];

  // JSON 응답이 배열로 올 때
  if (Array.isArray(items)) return items;

  // XML 변환형/일부 API 응답에서 item으로 감싸질 때 대비
  if (Array.isArray(items.item)) return items.item;
  if (items.item) return [items.item];

  return [];
};

const pick = (obj, keys) => {
  for (const key of keys) {
    if (obj?.[key]) return obj[key];
  }

  return "";
};

async function fetchEasyDrugInfo(itemName) {
  try {
    console.log("[EASY DRUG API QUERY]", itemName);

    const res = await axios.get(EASY_DRUG_URL, {
      params: {
        serviceKey: API_KEY,
        itemName,
        numOfRows: 1,
        pageNo: 1,
        type: "json",
      },
    });

    // console.log("[EASY DRUG API RESPONSE]", JSON.stringify(res.data, null, 2));

    const item = getItems(res.data)[0];
    if (!item) return null;

    // console.log("[PERMIT DRUG ITEM KEYS]", Object.keys(item));
    // console.log("[PERMIT DRUG ITEM]", item);

    return {
      name: item.itemName,
      effect: item.efcyQesitm,
      usage: item.useMethodQesitm,
      caution: item.atpnQesitm,
      interaction: item.intrcQesitm,
      sideEffect: item.seQesitm,
      storageMethod: item.depositMethodQesitm,
      image: item.itemImage,
      source: "easyDrug",
    };
  } catch (err) {
    console.error("[EASY DRUG API ERROR]", err.response?.data || err.message);
    return null;
  }
}

async function fetchPermitDrugInfo(itemName) {
  try {
    console.log("[PERMIT DRUG API QUERY]", itemName);

    const res = await axios.get(PERMIT_DRUG_URL, {
      params: {
        serviceKey: API_KEY,
        itemName: itemName,
        numOfRows: 1,
        pageNo: 1,
        type: "json",
      },
    });

    console.log(
      "[PERMIT DRUG API RESPONSE]",
      JSON.stringify(res.data, null, 2),
    );

    const item = getItems(res.data)[0];
    if (!item) return null;

    const name = pick(item, ["itemName", "itemName", "itemName"]);
    const company = pick(item, ["ENTP_NAME", "entp_name", "entpName"]);
    const ingredient = pick(item, [
      "ITEM_INGR_NAME",
      "item_ingr_name",
      "MAIN_ITEM_INGR",
      "MAIN_INGR",
      "MATERIAL_NAME",
      "main_item_ingr",
      "mainIngr",
    ]);
    const permitDate = pick(item, ["ITEM_PERMIT_DATE", "item_permit_date"]);
    const className = pick(item, [
      "SPCLTY_PBLC",
      "spclty_pblc",
      "ETC_OTC_CODE",
      "etc_otc_code",
    ]);
    const productType = pick(item, ["PRDUCT_TYPE", "prduct_type"]);
    const image = pick(item, ["BIG_PRDT_IMG_URL", "big_prdt_img_url"]);
    const status = pick(item, ["CANCEL_NAME", "cancel_name"]);
    const ediCode = pick(item, ["EDI_CODE", "edi_code"]);

    return {
      name,
      effect: productType || "",
      usage: "",
      caution: "",
      sideEffect: "",
      image,

      company,
      ingredient,
      storageMethod: "",
      validTerm: "",
      permitDate,
      className,

      productType,
      status,
      ediCode,

      source: "permit",
    };
  } catch (err) {
    console.error("[PERMIT DRUG API ERROR STATUS]", err.response?.status);
    console.error("[PERMIT DRUG API ERROR DATA]", err.response?.data);
    console.error("[PERMIT DRUG API ERROR MESSAGE]", err.message);
    return null;
  }
}

async function fetchMedicineInfo(itemName) {
  try {
    if (!API_KEY) {
      throw new Error("MEDICINE_API_KEY가 .env에 설정되지 않았습니다.");
    }

    // 1차: e약은요 API
    const easyDrug = await fetchEasyDrugInfo(itemName);
    if (easyDrug) return easyDrug;

    // 2차: 의약품 제품 허가정보 API
    const permitDrug = await fetchPermitDrugInfo(itemName);
    if (permitDrug) return permitDrug;

    return null;
  } catch (err) {
    console.error("[MEDICINE API ERROR]", err.response?.data || err.message);
    return null;
  }
}

module.exports = { fetchMedicineInfo };
