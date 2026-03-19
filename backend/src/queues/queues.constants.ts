export const QUEUE_EMAIL = 'email' as const;
export const QUEUE_AI = 'ai' as const;

export const EmailJobName = {
  SEND_VERIFICATION: 'send-verification',
  SEND_PASSWORD_RESET: 'send-password-reset',
  SEND_APPLICATION_STATUS: 'send-application-status',
} as const;

export const AiJobName = {
  ANALYZE_CV: 'analyze-cv',
  GENERATE_INTERVIEW_SUMMARY: 'generate-interview-summary',
} as const;
