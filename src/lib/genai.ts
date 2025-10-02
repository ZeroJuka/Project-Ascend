import { GEMINI_KEY, GEMINI_URL } from '@env';
import logger from '../utils/logger';

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
    logger.info('Chamando Gemini API');

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
      throw new Error(`Gemini API error. Status: ${response.status}. Message: ${errorBody || 'No error message available'}`);
    }

    const data = await response.json();
    return data as GeminiResponse;

  } catch (error) {
    logger.error('Erro ao chamar Gemini API:', error);
    throw error;
  }
}


