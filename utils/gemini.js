// utils/gemini.js

const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const requestGemini = async (
  prompt,
  { json = false, maxOutputTokens = 500 } = {},
) => {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Gemini prompt가 비어 있습니다.");
  }

  try {
    const generationConfig = {
      temperature: 0.1,
      maxOutputTokens,
    };

    if (json) {
      generationConfig.responseMimeType = "application/json";
    }

    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000,
      },
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("[GEMINI ERROR]", error.response?.data || error.message);
    throw new Error("Gemini API 요청에 실패했습니다.");
  }
};

// 기존에 있던 extractMedicines 함수 유지
const extractMedicines = async (rawText) => {
  const prompt = `
다음 OCR 텍스트에서 의약품명만 추출해줘.

조건:
- 반드시 JSON 배열만 반환해.
- 설명 문장 쓰지 마.
- 마크다운 코드블록 쓰지 마.
- 약품명으로 보이는 항목만 반환해.

OCR 텍스트:
${rawText}
`;

  const text = await requestGemini(prompt, {
    json: true,
    maxOutputTokens: 300,
  });

  const cleanedText = String(text)
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(cleanedText);

  return Array.isArray(parsed) ? parsed : [];
};

// 기존 fallback 함수 유지
const extractMedicinesFallback = (rawText = "") => {
  const matches = String(rawText).match(
    /[가-힣A-Za-z0-9]+(?:정|캡슐|시럽|현탁액|액|과립|산|주사|주|크림|연고|겔|패취|점안액)/g,
  );

  return [...new Set(matches || [])];
};

// 기존 약 1개 요약 함수 유지
const summarizeMedicineBrief = async ({ medicine, durList = [] }) => {
  const prompt = `
다음 의약품 정보를 간단히 요약해줘.

조건:
- 2~4문장 정도로 짧게 작성해.
- 주의사항, 보관방법, 복용 관련 핵심 정보를 포함해.
- 확인되지 않는 내용은 단정하지 마.

의약품 정보:
${JSON.stringify({ medicine, durList }, null, 2)}
`;

  const text = await requestGemini(prompt, {
    maxOutputTokens: 250,
  });

  return String(text).trim();
};

const normalizeSummaryText = (text = "") =>
  String(text)
    .replace(/\.\.\./g, "")
    .replace(/…/g, "")
    .replace(/\s+/g, " ")
    .trim();

// 새로 추가한 약 여러 개 일괄 요약 함수
const summarizeMedicinesBrief = async (medicines = []) => {
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return [];
  }

  const prompt = `
아래는 요약용으로 축약된 의약품 데이터다.
각 약마다 사용자가 복용 전 확인해야 할 내용을 쉬운 말로 한 문장 요약해라.

조건:
- 반드시 JSON 배열만 반환해라.
- 마크다운 코드블록을 사용하지 마라.
- JSON 밖에 설명 문장을 쓰지 마라.
- 각 항목은 반드시 id, keyword, summary를 포함해라.
- id는 입력받은 id와 정확히 같은 값으로 반환해라.
- keyword는 입력받은 keyword와 정확히 같은 값으로 반환해라.

summary 작성 규칙:
- 한국어 한 문장으로 작성해라.
- 100자 이내로 작성해라.
- 초등학생도 이해할 수 있는 쉬운 말로 작성해라.
- 식약처 원문 문장을 그대로 복사하지 마라.
- 어려운 의학 용어는 쉬운 말로 바꿔라.
- 말줄임표(...)를 절대 사용하지 마라.
- 문장을 중간에서 끊지 말고 완성된 문장으로 끝내라.
- 효능 설명보다 복용 전 주의할 점을 우선해라.

durWarnings가 있는 경우:
- 절대 "다른 약과 함께 먹으면 위험할 수 있다"처럼 막연하게 쓰지 마라.
- 반드시 relatedIngredientKor 또는 relatedIngredientEng 성분명을 포함해라.
- 반드시 content의 위험 이유를 쉬운 말로 바꿔 포함해라.
- 반드시 사용자가 해야 할 행동을 포함해라.
- 형식은 가능하면 "OO 성분과 함께 복용하면 XX 위험이 커질 수 있어 복용 전 확인하세요."처럼 작성해라.
- "QTc 연장", "Torsade de Pointes", "심실성 부정맥"은 "심장 리듬 이상" 또는 "심장 박동 이상"으로 바꿔라.
- "병용금기"는 "함께 복용하면 안 되는 조합" 또는 "함께 복용 주의"로 쉽게 바꿔라.

source가 permit인 경우:
- 제품 허가정보만으로 확인된 약이라는 점을 반영해라.
- 단, durWarnings가 있으면 제품 허가정보 문구보다 병용 주의 내용을 우선해라.
- durWarnings가 없고 복용법, 부작용 정보가 부족하면 처방전 또는 약사 안내 확인이 필요하다고 표현해라.

금지 표현:
- "다른 약과 함께 먹으면 위험할 수 있으니 약사에게 꼭 확인하세요."
- "함께 먹으면 주의가 필요한 약이 있을 수 있습니다."
- "복용 전 확인이 필요합니다."
- "주의가 필요합니다."만 단독으로 쓰지 마라.
- "위험할 수 있습니다"처럼 이유 없이 막연하게 쓰지 마라.

좋은 예시:
[
  {
    "id": "0",
    "keyword": "맥페란정",
    "summary": "돔페리돈 성분 약과 함께 먹으면 심장 박동 이상 위험이 커질 수 있어 확인하세요."
  },
  {
    "id": "1",
    "keyword": "보나링에이정",
    "summary": "졸음이 올 수 있어 운전이나 기계 조작 전에는 복용 여부를 확인하세요."
  }
]

반환 형식:
[
  {
    "id": "0",
    "keyword": "약 이름",
    "summary": "복용 전 확인할 쉬운 주의사항"
  }
]

의약품 목록:
${JSON.stringify(medicines)}
`;

  const text = await requestGemini(prompt, {
    json: true,
    maxOutputTokens: 600,
  });

  const cleanedText = String(text)
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanedText);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => ({
      id: String(item.id ?? ""),
      keyword: item.keyword || "",
      summary: normalizeSummaryText(item.summary || ""),
    }));
  } catch (error) {
    console.error("[SUMMARY JSON PARSE ERROR]", {
      text: cleanedText,
      message: error.message,
    });

    return [];
  }
};

const summarizePrescriptionBrief = async ({ medicines = [], durList = [] }) => {
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return "";
  }

  const prompt = `
아래 의약품 목록을 바탕으로 사용자가 복용 전 확인해야 할 핵심 내용을 짧게 요약해라.

조건:
- 한국어로 작성해라.
- 2~4문장으로 작성해라.
- 너무 길게 쓰지 마라.
- 효능 설명보다 주의사항, 복용 확인, 병용 주의 정보를 우선해라.
- durList가 있으면 함께 복용 주의가 필요한 성분이 있다는 내용을 포함해라.
- 제공된 데이터에 없는 내용은 추측하지 마라.
- 위험을 과장하지 마라.
- 의학적 단정 표현은 피하고, "확인이 필요합니다", "주의가 필요합니다"처럼 작성해라.
- JSON이 아니라 일반 문장만 반환해라.
- 마크다운 코드블록을 사용하지 마라.

의약품 정보:
${JSON.stringify({ medicines, durList }, null, 2)}
`;

  const text = await requestGemini(prompt, {
    maxOutputTokens: 300,
  });

  return String(text).trim();
};

module.exports = {
  extractMedicines,
  extractMedicinesFallback,
  summarizeMedicineBrief,
  summarizeMedicinesBrief,
  summarizePrescriptionBrief,
};
