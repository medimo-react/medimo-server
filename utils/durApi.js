const axios = require("axios");

const API_KEY = process.env.MEDICINE_API_KEY;

// DUR 성분정보 - 병용금기 정보조회
const DUR_INGREDIENT_CONTRA_URL =
  "https://apis.data.go.kr/1471000/DURIrdntInfoService03/getUsjntTabooInfoList02";

// DUR 품목정보 - 병용금기 정보조회
const DUR_PRODUCT_CONTRA_URL =
  "https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03";

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

const includesText = (target, keyword) => {
  if (!target || !keyword) return false;

  return String(target).toLowerCase().includes(String(keyword).toLowerCase());
};

const normalizeDurItem = (item) => {
  return {
    durType: pick(item, [
      "TYPE_NAME",
      "DUR_TYPE",
      "DUR_TY",
      "DUR_TYPE_NAME",
      "typeName",
    ]),

    ingredientKor: pick(item, [
      "INGR_KOR_NAME",
      "DUR_INGR_KOR_NAME",
      "INGR_NAME",
      "ingrKorName",
    ]),

    ingredientEng: pick(item, [
      "INGR_ENG_NAME",
      "DUR_INGR_ENG_NAME",
      "ingrEngName",
    ]),

    relatedIngredientKor: pick(item, [
      "MIXTURE_INGR_KOR_NAME",
      "USJNT_INGR_KOR_NAME",
      "RELATE_INGR_KOR_NAME",
      "REL_INGR_KOR_NAME",
      "INGR_KOR_NAME2",
      "mixtureIngrKorName",
    ]),

    relatedIngredientEng: pick(item, [
      "MIXTURE_INGR_ENG_NAME",
      "USJNT_INGR_ENG_NAME",
      "RELATE_INGR_ENG_NAME",
      "REL_INGR_ENG_NAME",
      "INGR_ENG_NAME2",
      "mixtureIngrEngName",
    ]),

    itemName: pick(item, ["ITEM_NAME", "PRDLST_NM", "itemName", "item_name"]),

    relatedItemName: pick(item, [
      "MIXTURE_ITEM_NAME",
      "USJNT_ITEM_NAME",
      "RELATE_ITEM_NAME",
      "relatedItemName",
    ]),

    company: pick(item, ["ENTP_NAME", "entpName"]),

    relatedCompany: pick(item, ["MIXTURE_ENTP_NAME", "relatedEntpName"]),

    content: pick(item, [
      "PROHBT_CONTENT",
      "BAN_CONTENT",
      "DUR_CONTENT",
      "CONTENT",
      "NOTE",
      "prohibitContent",
    ]),

    noticeDate: pick(item, [
      "NOTIFICATION_DATE",
      "NOTICE_DATE",
      "NOTI_DATE",
      "REG_DATE",
      "noticeDate",
    ]),

    raw: item,
  };
};

const dedupeDurList = (durList) => {
  const map = new Map();

  durList.forEach((item) => {
    const key = [
      item.durType,
      item.ingredientKor || item.ingredientEng,
      item.relatedIngredientKor || item.relatedIngredientEng,
      item.content,
    ].join("|");

    if (!map.has(key)) {
      map.set(key, {
        ...item,
        relatedItems: [],
      });
    }

    const saved = map.get(key);

    if (item.relatedItemName) {
      saved.relatedItems.push({
        name: item.relatedItemName,
        company: item.relatedCompany,
      });
    }
  });

  return Array.from(map.values());
};

const isMatchedDurItem = (item, keyword) => {
  const values = [
    item.INGR_KOR_NAME,
    item.INGR_ENG_NAME,
    item.DUR_INGR_KOR_NAME,
    item.DUR_INGR_ENG_NAME,
    item.itemName,
    item.PRDLST_NM,
    item.itemName,
  ];

  return values.some((value) => includesText(value, keyword));
};

async function fetchDurByIngredient(ingredient) {
  if (!API_KEY) {
    throw new Error("MEDICINE_API_KEY가 .env에 설정되지 않았습니다.");
  }

  if (!ingredient) return [];

  const paramCandidates = [
    { ingr_eng_name: ingredient },
    { ingr_kor_name: ingredient },
    { ingr_name: ingredient },
  ];

  for (const params of paramCandidates) {
    try {
      console.log("[DUR INGREDIENT QUERY]", ingredient, params);

      const res = await axios.get(DUR_INGREDIENT_CONTRA_URL, {
        params: {
          serviceKey: API_KEY,
          pageNo: 1,
          numOfRows: 100,
          type: "json",
          ...params,
        },
      });

      const items = getItems(res.data);
      const matchedItems = items.filter((item) =>
        isMatchedDurItem(item, ingredient),
      );

      if (matchedItems.length > 0) {
        return matchedItems.map(normalizeDurItem);
      }
    } catch (err) {
      console.error(
        "[DUR INGREDIENT API ERROR]",
        err.response?.data || err.message,
      );
    }
  }

  return [];
}

async function fetchDurByProductName(itemName) {
  if (!API_KEY) {
    throw new Error("MEDICINE_API_KEY가 .env에 설정되지 않았습니다.");
  }

  if (!itemName) return [];

  try {
    console.log("[DUR PRODUCT QUERY]", itemName);

    const getServiceKey = () => {
      if (!API_KEY) return "";
      return API_KEY.includes("%") ? decodeURIComponent(API_KEY) : API_KEY;
    };

    const serviceKey = getServiceKey();

    const res = await axios.get(DUR_PRODUCT_CONTRA_URL, {
      params: {
        serviceKey,
        itemName,
        numOfRows: 100,
        pageNo: 1,
        type: "json",
      },
    });

    console.log("[DUR PRODUCT RESPONSE]", JSON.stringify(res.data, null, 2));

    const items = getItems(res.data);

    console.log("[DUR PRODUCT ITEMS LENGTH]", items.length);

    return dedupeDurList(items.map(normalizeDurItem));
  } catch (err) {
    console.error("[DUR PRODUCT API ERROR STATUS]", err.response?.status);
    console.error("[DUR PRODUCT API ERROR DATA]", err.response?.data);
    console.error("[DUR PRODUCT API ERROR MESSAGE]", err.message);

    return [];
  }
}

module.exports = {
  fetchDurByIngredient,
  fetchDurByProductName,
};
