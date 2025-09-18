import fetch from 'node-fetch';

// هذا هو مفتاح Google Cloud Speech-to-Text API، وليس مفتاح Gemini.
// يجب تخزينه كمتغير بيئة في Vercel.
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!GOOGLE_API_KEY) {
        return response.status(500).json({ error: 'Google API key is not set' });
    }

    try {
        // قراءة ملف الصوت من جسم الطلب
        const audioBuffer = await new Promise((resolve, reject) => {
            let chunks = [];
            request.on('data', (chunk) => chunks.push(chunk));
            request.on('end', () => resolve(Buffer.concat(chunks)));
            request.on('error', reject);
        });

        // تحويل الصوت إلى صيغة base64 لطلبه في الـ API
        const audioBase64 = audioBuffer.toString('base64');

        const apiResponse = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config: {
                    encoding: 'MP3',
                    sampleRateHertz: 16000, // عدلها حسب خصائص ملف الصوت
                    languageCode: 'ar-AR',
                },
                audio: {
                    content: audioBase64,
                },
            }),
        });

        const data = await apiResponse.json();

        if (apiResponse.ok && data.results && data.results.length > 0) {
            const transcript = data.results[0].alternatives[0].transcript;
            response.status(200).json({ text: transcript });
        } else {
            response.status(apiResponse.status).json({ error: data.error?.message || 'Transcription failed' });
        }
    } catch (error) {
        console.error('Error in Vercel function:', error);
        response.status(500).json({ error: 'Internal Server Error' });
    }
}


