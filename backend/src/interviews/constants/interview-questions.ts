/** Fixed list of 8 Arabic interview questions in order (0-indexed). */
export const INTERVIEW_QUESTIONS: readonly string[] = [
  'عرفنا بنفسك باختصار',
  'ايه خبرتك في المجال؟',
  'اشتغلت قبل كده في نفس الوظيفة؟',
  'ايه المهارات اللي بتعتمد عليها؟',
  'متاح تبدأ إمتى؟',
  'متوقع الراتب كام؟',
  'هل عندك أعمال سابقة أو Portfolio أو CV؟',
  'ليه شايف نفسك مناسب للوظيفة؟',
] as const;

export const INTERVIEW_QUESTIONS_COUNT = INTERVIEW_QUESTIONS.length;
