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

const parseCandidates = (text) => {
  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.candidates)) {
    return [];
  }

  return [...new Set(
    parsed.candidates
      .map((item) => String(item).trim())
      .filter(Boolean)
  )];
};

const extractMedicines = async (rawText) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  if (!rawText || !rawText.trim()) {
    return [];
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
              text: buildPrompt(rawText),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
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
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[GEMINI ERROR]', data);
    throw new Error('Gemini API 요청에 실패했습니다.');
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return [];
  }

  return parseCandidates(text);
};

module.exports = {
  extractMedicines,
};