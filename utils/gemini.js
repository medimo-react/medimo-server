// utils/gemini.js

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const buildPrompt = (rawText) => `
너는 OCR로 추출된 약 봉투, 처방전, 약품 설명서 텍스트에서
식약처 API 검색에 사용할 약품명 후보만 추출한다.

규칙:
1. OCR 원문에 없는 약품명은 추측하지 않는다.
2. 병원명, 약국명, 주소, 전화번호, 보험자명, 환자명은 제외한다.
3. "1일 3회", "식후", "복용", "처방", "조제" 같은 복약 안내 문구는 제외한다.
4. 실제 약품명 또는 성분명으로 보이는 값만 candidates 배열에 넣는다.
5. 중복은 제거한다.
6. 확실한 후보가 없으면 빈 배열을 반환한다.
7. 반드시 JSON 형식으로만 응답한다.

응답 형식:
{
  "candidates": ["약품명1", "약품명2"]
}

OCR 원문:
${rawText}
`;

const buildSummaryPrompt = ({ medicine, durList = [] }) => `
너는 사용자가 의약품 정보를 빠르게 이해할 수 있도록 한 줄로 정리한다.

반드시 아래 JSON 데이터에 있는 내용만 근거로 작성한다.
데이터에 없는 효능, 복용법, 부작용, 주의사항, 병용금기 정보는 절대 추측하지 않는다.

규칙:
1. 한국어로 작성한다.
2. 한 문장만 작성한다.
3. 90자 이내로 작성한다.
4. 쉬운 말로 작성한다.
5. 병용금기 정보가 있으면 반드시 포함한다.
6. 병용금기 정보가 없으면 억지로 언급하지 않는다.
7. "안전하다", "문제없다" 같은 단정 표현은 쓰지 않는다.
8. 반드시 JSON 형식으로만 응답한다.

응답 형식:
{
  "summary": "한 줄 요약 문장"
}

의약품 데이터:
${JSON.stringify({ medicine, durList }, null, 2)}
`;

const parseCandidates = (text) => {
  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.candidates)) {
    return [];
  }

  return [
    ...new Set(
      parsed.candidates
        .map((item) => String(item).trim())
        .filter(Boolean)
    ),
  ];
};

const parseSummary = (text) => {
  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!parsed.summary) {
    return '';
  }

  return String(parsed.summary).trim();
};

const requestGemini = async ({ prompt, responseSchema }) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[GEMINI ERROR]', data);
    throw new Error('Gemini API 요청에 실패했습니다.');
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const extractMedicines = async (rawText) => {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const text = await requestGemini({
    prompt: buildPrompt(rawText),
    responseSchema: {
      type: 'OBJECT',
      properties: {
        candidates: {
          type: 'ARRAY',
          items: {
            type: 'STRING',
          },
        },
      },
      required: ['candidates'],
    },
  });

  if (!text) {
    return [];
  }

  return parseCandidates(text);
};

const extractMedicinesFallback = (rawText) => {
  if (!rawText || !rawText.trim()) return [];

  const medicinePattern =
    /[#]?[가-힣A-Za-z0-9]+(?:정|캡슐|시럽|현탁액|액|과립|산|주사|주|크림|연고|겔|패취|점안액)(?:\s?\[[^\]]+\])?/g;

  const matches = rawText.match(medicinePattern) || [];

  const excludeWords = [
    "복약지도",
    "약품명",
    "먹는약",
    "영수증",
    "조제약",
    "처방약",
    "현금영수증",
    "사업자등록번호",
  ];

  return [
    ...new Set(
      matches
        .map((item) =>
          item
            .replace(/^#/, "")
            .replace(/\s?\[.*?\]/g, "")
            .trim()
        )
        .filter(Boolean)
        .filter((item) => item.length >= 2)
        .filter((item) => !excludeWords.some((word) => item.includes(word)))
    ),
  ];
};

const summarizeMedicineBrief = async ({ medicine, durList = [] }) => {
  if (!medicine) {
    return '';
  }

  const text = await requestGemini({
    prompt: buildSummaryPrompt({ medicine, durList }),
    responseSchema: {
      type: 'OBJECT',
      properties: {
        summary: {
          type: 'STRING',
        },
      },
      required: ['summary'],
    },
  });

  if (!text) {
    return '';
  }

  return parseSummary(text);
};

module.exports = {
  extractMedicines,
  summarizeMedicineBrief,
  extractMedicinesFallback,
};