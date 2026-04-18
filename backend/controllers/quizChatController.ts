import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Donor from '../models/Donor';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a professional blood donation eligibility screening assistant for BloodSync, a blood donation platform in Muscat, Oman.

Your role is to assess whether a donor is eligible to donate blood through a natural, conversational interview. You must be professional, empathetic, and concise — not robotic.

RULES:
- Ask ONE question at a time. Never list multiple questions at once.
- Adapt follow-up questions based on previous answers. Skip irrelevant questions (e.g., skip pregnancy/breastfeeding questions if the donor identifies as male).
- If a medical document or report is shared, analyze it and extract relevant health information to factor into your assessment.
- Be conversational but medically accurate.
- Do not reveal scoring weights or internal logic.

SCREENING AREAS TO COVER (adapt order and phrasing naturally):
1. Recent illness (cold/flu in last 2 weeks)
2. Current medications (especially antibiotics)
3. Travel to malaria-endemic zones in last 3 months
4. Tattoos or piercings in last 6 months
5. Pregnancy or breastfeeding (skip if male)
6. Chronic conditions: HIV, Hepatitis B/C, cancer, heart disease
7. Weight (must be at least 50 kg)
8. Last donation date (90-day cooldown between donations)
9. Alcohol consumption in last 24 hours
10. Recent surgery in last 6 months
11. Vaccinations in last 4 weeks
12. Hemoglobin levels (must be above 12.5 g/dL)
13. Blood pressure (uncontrolled hypertension is disqualifying)

ENDING THE CONVERSATION:
When you have gathered sufficient information to make a recommendation (typically after 8-12 exchanges, or sooner if a permanent disqualifier is confirmed), end the screening and provide your assessment.

RESPONSE FORMAT:
You MUST always respond with valid JSON only. No markdown, no code blocks, just raw JSON.

During screening:
{"message": "Your conversational message here", "isComplete": false}

When done:
{"message": "Your closing message explaining the result", "isComplete": true, "recommendation": "eligible" | "temporarily_ineligible" | "permanently_ineligible", "reason": "Brief clinical reason for the decision"}

RECOMMENDATIONS:
- "eligible": No disqualifying factors found
- "temporarily_ineligible": Temporary deferral needed (illness, recent tattoo, medication, etc.) — include estimated timeframe in reason
- "permanently_ineligible": Permanent disqualifier found (HIV, Hepatitis B/C, cancer, heart disease, weight under 50kg)

Start the conversation by warmly introducing yourself and asking the donor's first name and age to personalize the screening.`;

interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

/**
 * POST /api/quiz/chat
 * Proxies conversation to Gemini and returns the AI response.
 */
export const chatWithGemini = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!GEMINI_API_KEY) {
      res.status(503).json({ success: false, message: 'AI screening is not configured. GEMINI_API_KEY is missing.' });
      return;
    }

    const { messages } = req.body as {
      messages: Array<{
        role: 'user' | 'ai';
        content: string;
        files?: Array<{ mimeType: string; data: string }>;
      }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, message: 'messages array is required' });
      return;
    }

    // Convert frontend message format to Gemini format
    const geminiHistory: ChatMessage[] = messages.map((msg) => {
      const parts: ChatMessage['parts'] = [];

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (msg.files?.length) {
        for (const file of msg.files) {
          parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
        }
      }

      return {
        role: msg.role === 'ai' ? 'model' : 'user',
        parts,
      };
    });

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: geminiHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Gemini] API error:', errText);
      res.status(502).json({ success: false, message: 'AI service error. Please try again.' });
      return;
    }

    const data = await response.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let parsed: {
      message: string;
      isComplete: boolean;
      recommendation?: 'eligible' | 'temporarily_ineligible' | 'permanently_ineligible';
      reason?: string;
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Gemini occasionally returns markdown-wrapped JSON despite the instruction
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { message: rawText, isComplete: false };
      }
    }

    res.json({ success: true, response: parsed });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/quiz/submit-ai
 * Accepts the AI recommendation and updates the donor's eligibility status directly.
 */
export const submitAiResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { recommendation, reason } = req.body as {
      recommendation: 'eligible' | 'temporarily_ineligible' | 'permanently_ineligible';
      reason?: string;
    };

    if (!recommendation) {
      res.status(400).json({ success: false, message: 'recommendation is required' });
      return;
    }

    const statusMap = {
      eligible: 'ELIGIBLE',
      temporarily_ineligible: 'TEMPORARILY_BLOCKED',
      permanently_ineligible: 'PERMANENTLY_BLOCKED',
    } as const;

    const eligibilityStatus = statusMap[recommendation];

    // For temporary blocks, set a 90-day default expiry
    let blockExpiryDate: Date | null = null;
    if (eligibilityStatus === 'TEMPORARILY_BLOCKED') {
      blockExpiryDate = new Date();
      blockExpiryDate.setDate(blockExpiryDate.getDate() + 90);
    }

    const donor = await Donor.findOneAndUpdate(
      { userId: authReq.user!._id },
      {
        $set: {
          eligibilityStatus,
          eligibilityScore: eligibilityStatus === 'ELIGIBLE' ? 100 : eligibilityStatus === 'TEMPORARILY_BLOCKED' ? 50 : 0,
          blockReason: reason ?? null,
          blockExpiryDate,
          medicalHistory: { aiScreening: true, recommendation, reason },
        },
      },
      { new: true }
    );

    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor profile not found.' });
      return;
    }

    res.json({ success: true, status: eligibilityStatus });
  } catch (err) {
    next(err);
  }
};
