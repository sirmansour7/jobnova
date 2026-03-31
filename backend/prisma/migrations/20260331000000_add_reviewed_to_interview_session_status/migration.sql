-- Add 'reviewed' value to InterviewSessionStatus enum
-- Required by HR decision flow (updateDecision sets status = 'reviewed')
ALTER TYPE "InterviewSessionStatus" ADD VALUE IF NOT EXISTS 'reviewed';
