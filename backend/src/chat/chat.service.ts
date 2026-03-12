import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

@Injectable()
export class ChatService {
  constructor(private readonly config: ConfigService) {}

  async getBotResponse(
    userMessage: string,
    jobTitle: string,
    conversationHistory: ChatMessage[],
    candidateName = 'المرشح',
  ): Promise<string> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    const systemPrompt = `أنت مساعد توظيف ذكي ومحترف اسمك "نوفا" تعمل لصالح منصة JobNova المصرية.
تجري الآن مقابلة تعارف مع مرشح اسمه "${candidateName}" لوظيفة "${jobTitle}".

🎯 شخصيتك:
- ودود، ذكي، ومحترف كمحاور بشري حقيقي
- تتكلم بالعربية الفصحى البسيطة
- تستخدم emoji بشكل طبيعي ومعتدل
- ردودك قصيرة ومركزة (2-3 جمل كحد أقصى)
- تخاطب المرشح باسمه "${candidateName}" بشكل طبيعي أحياناً

💼 مهمتك:
اجمع هذه المعلومات بشكل محادثة طبيعية (لا تسألها كقائمة):
1. الخلفية المهنية والتجربة
2. سنوات الخبرة في المجال
3. أهم المهارات التقنية
4. الراتب المتوقع (بالجنيه المصري فقط)
5. موعد الإتاحة للعمل

📋 قواعد صارمة:
- العملة دائماً الجنيه المصري (EGP) فقط - لا تذكر أي عملة أخرى
- لا تذكر أي دولة غير مصر
- علّق على كل إجابة بجملة مشجعة قصيرة ثم اسأل السؤال التالي بشكل طبيعي
- لا تكرر أسئلة سبق طرحها
- بعد جمع كل المعلومات اشكر "${candidateName}" وأخبره أن بياناته ستُرسل لمسؤول التوظيف
- تصرف كمحاور بشري مصري محترف وليس روبوت`;

    if (!apiKey) {
      return this.getRuleBasedResponse(conversationHistory.length);
    }

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            max_tokens: 200,
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
              { role: 'user', content: userMessage },
            ],
          }),
        },
      );

      const data = await response.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (text) return text;
      return this.getRuleBasedResponse(conversationHistory.length);
    } catch {
      return this.getRuleBasedResponse(conversationHistory.length);
    }
  }

  private getRuleBasedResponse(historyLength: number): string {
    const step = Math.floor(historyLength / 2);
    const responses = [
      'ممتاز! 🎯 كم سنة خبرتك في هذا المجال؟',
      'رائع! 💪 ما هي أهم مهاراتك التقنية؟',
      'ممتاز! 💰 ما هو الراتب الشهري المتوقع؟',
      'شكراً! 📅 متى يمكنك البدء في العمل؟',
      '✅ تم تسجيل جميع بياناتك. سيتواصل معك مسؤول التوظيف قريباً. بالتوفيق! 🌟',
    ];
    return responses[Math.min(step, responses.length - 1)];
  }
}
