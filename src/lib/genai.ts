import { GEMINI_KEY, GEMINI_URL } from '@env';

const geminikey = GEMINI_KEY;
const geminiUri = GEMINI_URL;

export type GeminiResponse = {
  candidates: {
    content: {
      parts: [{ text: string }];
      role: 'model';
    };
    finishReason: 'STOP' | 'MAX_TOKENS';
    index: 0;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  promptFeedback: {
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  };
};

export async function callGeminiAPI(prompt: string): Promise<GeminiResponse> {
  try {
    console.warn(`
        ==================================================
        Gemini Key Used: ${geminikey}
        URI Fetched: ${geminiUri}
        ==================================================
      `);

    const response = await fetch(
      geminiUri,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminikey,
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
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! Status: ${response.status},
        ==================================================
        Gemini Key Used: ${geminikey}
        URI Fetched: ${geminiUri}
        ==================================================
        Message: ${errorBody || 'No error message available'}`);
    }

    const data = await response.json();
    return data as GeminiResponse;

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}


