const axios = require("axios");

const API_KEY = process.env.MEDICINE_API_KEY;

const getServiceKey = () => {
  if (!API_KEY) return "";
  return API_KEY.includes("%") ? decodeURIComponent(API_KEY) : API_KEY;
};

// 1차: e약은요 API
const EASY_DRUG_URL =
  "http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList";

// 2차: 의약품 제품 허가정보 API
const PERMIT_DRUG_URL =
  "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07";

const getItems = (data) => {
  const items = data?.body?.items;

  if (!items) return [];

  if (Array.isArray(items)) return items;

  if (Array.isArray(items.item)) return items.item;
  if (items.item) return [items.item];

  return [];
};

const pick = (obj, keys) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") {
      return obj[key];
    }
  }

  return "";
};

const cleanDisplayName = (value = "") =>
  String(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeName = (value = "") =>
  String(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const isMatchedMedicine = (apiName, keyword) => {
  const name = normalizeName(apiName);
  const query = normalizeName(keyword);

  if (!name || !query) return false;

  return name.includes(query) || query.includes(name);
};

async function fetchEasyDrugInfo(itemName) {
  try {
    console.log("[EASY DRUG API QUERY]", itemName);

    const serviceKey = getServiceKey();

    const res = await axios.get(EASY_DRUG_URL, {
      params: {
        serviceKey,
        itemName,
        numOfRows: 1,
        pageNo: 1,
        type: "json",
      },
    });

    const item = getItems(res.data)[0];

    if (!item) return null;

    return {
      name: item.itemName || "",
      normalizedName: cleanDisplayName(item.itemName || ""),

      effect: item.efcyQesitm || "",
      usage: item.useMethodQesitm || "",
      dosage: item.useMethodQesitm || "",

      caution: item.atpnQesitm || "",
      interaction: item.intrcQesitm || "",
      sideEffect: item.seQesitm || "",
      storageMethod: item.depositMethodQesitm || "",
      validTerm: "",
      image: item.itemImage || "",

      company: "",
      ingredient: "",
      permitDate: "",
      className: "",
      productType: "",
      status: "",
      ediCode: "",

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

    const serviceKey = getServiceKey();

    const res = await axios.get(PERMIT_DRUG_URL, {
      params: {
        serviceKey,
        item_name: itemName,
        numOfRows: 10,
        pageNo: 1,
        type: "json",
      },
    });

    console.log(
      "[PERMIT DRUG API RESPONSE]",
      JSON.stringify(res.data, null, 2),
    );

    const items = getItems(res.data);

    console.log("[PERMIT DRUG ITEMS LENGTH]", items.length);
    console.log("[PERMIT DRUG FIRST ITEM]", items[0]?.ITEM_NAME);

    const item = items.find((item) => {
      const name = pick(item, [
        "ITEM_NAME",
        "itemName",
        "ITEM_NM",
        "PRDLST_NM",
      ]);
      return isMatchedMedicine(name, itemName);
    });

    if (!item) {
      console.warn("[PERMIT DRUG NO MATCH]", {
        query: itemName,
        totalCount: res.data?.body?.totalCount,
        firstItem: items[0]?.ITEM_NAME,
      });

      return null;
    }

    const name = pick(item, ["ITEM_NAME", "itemName", "ITEM_NM", "PRDLST_NM"]);

    const company = pick(item, [
      "ENTP_NAME",
      "entp_name",
      "entpName",
      "BIZRNO_NM",
    ]);

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
      normalizedName: cleanDisplayName(name),

      effect: productType || "",
      usage: "",
      dosage: "",

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

    const easyDrug = await fetchEasyDrugInfo(itemName);
    if (easyDrug) return easyDrug;

    const permitDrug = await fetchPermitDrugInfo(itemName);
    if (permitDrug) return permitDrug;

    console.warn("[MEDICINE API NO RESULT]", itemName);
    return null;
  } catch (err) {
    console.error("[MEDICINE API ERROR]", err.response?.data || err.message);
    return null;
  }
}

module.exports = { fetchMedicineInfo };
