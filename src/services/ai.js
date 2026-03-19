import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
let genAI = null;
const getGenAI = () => {
    if (!genAI && GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
    return genAI;
};

export async function analyzeFoodImage(base64Image, extraDescription = '') {
    try {
        const ai = getGenAI();
        if (!ai) throw new Error('API key missing');
        const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

        const extraText = extraDescription ? `\nUser provided extra context: "${extraDescription}". Please consider this to adjust your estimation accurately.` : '';
        const prompt = `You are a professional nutritionist analyzing food images. Follow this systematic approach:${extraText}

STEP 1: IDENTIFY THE FOOD
- What is the main dish?
- What are ALL visible components?
- What cooking method was used?
- Estimate the portion size

STEP 2: BREAK DOWN EACH COMPONENT WITH POSITION
For each visible food item, provide:
- Name of the component
- Estimated calories for that component
- Approximate position in the image (x, y as percentage 0-100 from top-left)

STEP 3: CALCULATE TOTAL CALORIES
Sum all component calories to get the total.

STEP 4: DETERMINE RANGE AND MID-POINT
- Calculate MINIMUM (if portions are smaller, less oil)
- Calculate MAXIMUM (if portions are larger, more oil/sauce)
- Use MID-POINT as final estimate

Return ONLY a JSON object:
{
  "description": "Detailed food name",
  "reasoning": "Component breakdown → Total estimate",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "components": [
    {"name": "Rice", "calories": 260, "x": 50, "y": 60},
    {"name": "Beef", "calories": 200, "x": 50, "y": 30}
  ]
}`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        let jsonText = text;
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (codeBlockMatch) {
            jsonText = codeBlockMatch[1];
        } else {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonText = jsonMatch[0];
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (parseError) {
            const lowerText = text.toLowerCase();
            if (lowerText.includes('not contain') || lowerText.includes('no food') || lowerText.includes('cannot analyze')) {
                throw new Error('NOT_FOOD');
            }
            return { description: 'Unable to analyze', calories: 0, protein: 0, carbs: 0, fat: 0, components: [] };
        }

        const description = (parsed.description || '').toLowerCase();
        if (description.includes('not contain') || description.includes('no food')) {
            throw new Error('NOT_FOOD');
        }

        return {
            description: parsed.description || 'Food',
            reasoning: parsed.reasoning || '',
            calories: Math.round(parsed.calories || 0),
            protein: Math.round(parsed.protein || 0),
            carbs: Math.round(parsed.carbs || 0),
            fat: Math.round(parsed.fat || 0),
            components: parsed.components || [],
        };
    } catch (error) {
        if (error?.message === 'NOT_FOOD') throw error;
        console.error('AI analysis error:', error);
        return { description: 'Food', calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
}

export async function analyzeFoodText(foodDescription) {
    try {
        const ai = getGenAI();
        if (!ai) throw new Error('API key missing');
        const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `You are a professional nutritionist. The user describes a food they ate:
"${foodDescription}"

Estimate the nutritional information for this food.

Return ONLY a JSON object:
{
  "description": "Detailed food name",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let jsonText = text;
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (codeBlockMatch) {
            jsonText = codeBlockMatch[1];
        } else {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonText = jsonMatch[0];
        }

        const parsed = JSON.parse(jsonText);
        return {
            description: parsed.description || foodDescription,
            calories: Math.round(parsed.calories || 0),
            protein: Math.round(parsed.protein || 0),
            carbs: Math.round(parsed.carbs || 0),
            fat: Math.round(parsed.fat || 0),
        };
    } catch (error) {
        console.error('AI text analysis error:', error);
        return { description: foodDescription, calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
}

export async function analyzeExerciseText(exerciseDescription, bodyWeightKg) {
    try {
        const ai = getGenAI();
        if (!ai) throw new Error('API key missing');
        const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `You are a professional fitness coach. The user describes an exercise they did:
"${exerciseDescription}"
Their current body weight is ${bodyWeightKg || 70}kg.

Based on the exercise type, intensity, and duration described (or assuming a standard 30 min session if duration is missing), estimate the calories burned.

Return ONLY a JSON object exactly like this:
{
  "activityName": "Short standard name for the activity (e.g. Swimming)",
  "durationMinutes": number,
  "caloriesBurned": number
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let jsonText = text;
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (codeBlockMatch) {
            jsonText = codeBlockMatch[1];
        } else {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonText = jsonMatch[0];
        }

        const parsed = JSON.parse(jsonText);
        return {
            activityName: parsed.activityName || "Exercise",
            durationMinutes: parsed.durationMinutes || 30,
            caloriesBurned: Math.round(parsed.caloriesBurned || 0)
        };
    } catch (error) {
        console.error('AI exercise analysis error:', error);
        return null;
    }
}

export async function generateDailyTrainerMessage(profile, yesterdayData) {
    try {
        const ai = getGenAI();
        if (!ai) return null;
        const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

        const isDieting = profile?.target_weight && profile?.weight && (profile.weight > profile.target_weight);
        const weightDiff = isDieting ? profile.weight - profile.target_weight : 0;
        
        const foodNames = yesterdayData?.meals?.map(m => m.description).join(', ') || 'None';
        const hasLogs = yesterdayData?.caloriesConsumed > 0;

        const prompt = `You are a professional, analytical, yet encouraging daily health trainer (PT).
It is morning time. Review the user's profile and their behavior from yesterday, then provide a short, practical 2-to-3 sentence review and advice for today.

User Profile:
- Current Weight: ${profile?.weight || 'Unknown'} kg
${isDieting ? `- Target Weight: ${profile.target_weight} kg (Needs to lose ${weightDiff.toFixed(1)}kg)` : '- Goal: maintain or generally stay healthy'}
- Gender: ${profile?.gender || 'Unknown'}

Yesterday's Data:
- Calories Consumed: ${yesterdayData?.caloriesConsumed || 0} kcal
- Foods Logged: ${foodNames}
- Steps Taken: ${yesterdayData?.steps || 0}
- Active Calories Burned: ${yesterdayData?.exerciseCalories || 0} kcal

Guidelines:
1. Speak in natural, friendly English.
2. Keep it to a maximum of 3 short sentences.
3. Don't be generic. Reference what they did yesterday! For example, if they ate something specific, mention it. If they didn't log anything, remind them to log their meals. If they walked a lot, praise their steps. If they went over their calories, suggest a lighter meal today. 
4. DO NOT say "Good morning!" or "Hi!". Start the review directly.
5. Provide actionable advice for today based on yesterday's results.

Make it feel like a minimalist push notification from a caring, observant trainer.

Return ONLY the plain text English message. No JSON, no formatting block.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error('AI trainer message error:', error);
        return "Good morning! Don't forget to log your meals today and stay hydrated. You've got this!";
    }
}
