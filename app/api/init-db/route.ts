// @ts-nocheck
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CREATE_TABLES_SQL = `
DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('MENTEE', 'MENTOR', 'HR_ADMIN'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "LeadershipStyle" AS ENUM ('DIRECT', 'COLLABORATIVE', 'ANALYTICAL', 'SUPPORTIVE', 'VISIONARY'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PreferredMeetingFormat" AS ENUM ('IN_PERSON', 'VIRTUAL', 'HYBRID'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "email" TEXT NOT NULL, "name" TEXT, "password" TEXT, "role" "UserRole" NOT NULL DEFAULT 'MENTEE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

CREATE TABLE IF NOT EXISTS "Account" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL, "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER, "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT, CONSTRAINT "Account_pkey" PRIMARY KEY ("id"), CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

CREATE TABLE IF NOT EXISTS "Session" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL, CONSTRAINT "Session_pkey" PRIMARY KEY ("id"), CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

CREATE TABLE IF NOT EXISTS "Mentee" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "userId" TEXT NOT NULL, "role" TEXT NOT NULL, "businessUnit" TEXT NOT NULL, "yearsOfExperience" INTEGER NOT NULL, "tenure" INTEGER NOT NULL, "employmentDate" TEXT, "competencyGaps" TEXT[] DEFAULT ARRAY[]::TEXT[], "careerGoals" TEXT NOT NULL, "personalInterests" TEXT[] DEFAULT ARRAY[]::TEXT[], "preferredMeetingFormat" "PreferredMeetingFormat" NOT NULL, "organizationalChallenge" TEXT, "softSkillsGap" TEXT[] DEFAULT ARRAY[]::TEXT[], "gradeLevel" INTEGER, "profileComplete" BOOLEAN NOT NULL DEFAULT false, "submittedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Mentee_pkey" PRIMARY KEY ("id"), CONSTRAINT "Mentee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "Mentee_userId_key" ON "Mentee"("userId");
CREATE INDEX IF NOT EXISTS "Mentee_businessUnit_idx" ON "Mentee"("businessUnit");
CREATE INDEX IF NOT EXISTS "Mentee_submittedAt_idx" ON "Mentee"("submittedAt");

CREATE TABLE IF NOT EXISTS "Mentor" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "userId" TEXT NOT NULL, "role" TEXT NOT NULL, "businessUnit" TEXT NOT NULL, "yearsOfExperience" INTEGER NOT NULL, "areasOfExpertise" TEXT[] DEFAULT ARRAY[]::TEXT[], "leadershipStyle" "LeadershipStyle" NOT NULL, "coachingGoals" TEXT, "personalInterests" TEXT[] DEFAULT ARRAY[]::TEXT[], "shadowSkills" TEXT[] DEFAULT ARRAY[]::TEXT[], "commitmentAvailability" TEXT, "maxMentees" INTEGER NOT NULL DEFAULT 2, "currentMenteeCount" INTEGER NOT NULL DEFAULT 0, "organizationalChallenge" TEXT, "tier" INTEGER, "level" INTEGER, "profileComplete" BOOLEAN NOT NULL DEFAULT false, "profilePhotoUrl" TEXT, "shortBio" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id"), CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "Mentor_userId_key" ON "Mentor"("userId");
CREATE INDEX IF NOT EXISTS "Mentor_businessUnit_idx" ON "Mentor"("businessUnit");
CREATE INDEX IF NOT EXISTS "Mentor_currentMenteeCount_idx" ON "Mentor"("currentMenteeCount");

CREATE TABLE IF NOT EXISTS "MenteePreference" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "menteeId" TEXT NOT NULL, "mentorId" TEXT NOT NULL, "preferenceRank" INTEGER NOT NULL, "matchingScore" DOUBLE PRECISION, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MenteePreference_pkey" PRIMARY KEY ("id"), CONSTRAINT "MenteePreference_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "Mentee"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "MenteePreference_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "MenteePreference_menteeId_mentorId_key" ON "MenteePreference"("menteeId", "mentorId");
CREATE INDEX IF NOT EXISTS "MenteePreference_menteeId_idx" ON "MenteePreference"("menteeId");
CREATE INDEX IF NOT EXISTS "MenteePreference_preferenceRank_idx" ON "MenteePreference"("preferenceRank");

CREATE TABLE IF NOT EXISTS "MentorMenteeAssignment" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "menteeId" TEXT NOT NULL, "mentorId" TEXT NOT NULL, "assignedByHrEmail" TEXT NOT NULL, "assignmentReason" TEXT, "isOverride" BOOLEAN NOT NULL DEFAULT false, "originalSystemRank" INTEGER, "status" TEXT NOT NULL DEFAULT 'CONFIRMED', "menteeAccepted" BOOLEAN NOT NULL DEFAULT false, "mentorAccepted" BOOLEAN NOT NULL DEFAULT false, "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MentorMenteeAssignment_pkey" PRIMARY KEY ("id"), CONSTRAINT "MentorMenteeAssignment_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "Mentee"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "MentorMenteeAssignment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE NO ACTION ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "MentorMenteeAssignment_menteeId_key" ON "MentorMenteeAssignment"("menteeId");
CREATE INDEX IF NOT EXISTS "MentorMenteeAssignment_mentorId_idx" ON "MentorMenteeAssignment"("mentorId");
CREATE INDEX IF NOT EXISTS "MentorMenteeAssignment_status_idx" ON "MentorMenteeAssignment"("status");

CREATE TABLE IF NOT EXISTS "MatchingScore" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "menteeId" TEXT NOT NULL, "mentorId" TEXT NOT NULL, "competencyAlignmentScore" DOUBLE PRECISION NOT NULL, "experienceGapScore" DOUBLE PRECISION NOT NULL, "crossFunctionalScore" DOUBLE PRECISION NOT NULL, "careerAspirationScore" DOUBLE PRECISION NOT NULL, "leadershipStyleScore" DOUBLE PRECISION NOT NULL, "personalInterestsScore" DOUBLE PRECISION NOT NULL, "wildcardAlignmentScore" DOUBLE PRECISION NOT NULL, "availabilityFormatScore" DOUBLE PRECISION NOT NULL, "preferenceScore" DOUBLE PRECISION NOT NULL, "totalScore" DOUBLE PRECISION NOT NULL, "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MatchingScore_pkey" PRIMARY KEY ("id"), CONSTRAINT "MatchingScore_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "Mentee"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "MatchingScore_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "MatchingScore_menteeId_mentorId_key" ON "MatchingScore"("menteeId", "mentorId");
CREATE INDEX IF NOT EXISTS "MatchingScore_menteeId_idx" ON "MatchingScore"("menteeId");
CREATE INDEX IF NOT EXISTS "MatchingScore_mentorId_idx" ON "MatchingScore"("mentorId");
CREATE INDEX IF NOT EXISTS "MatchingScore_totalScore_idx" ON "MatchingScore"("totalScore");

CREATE TABLE IF NOT EXISTS "AuditLog" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "action" TEXT NOT NULL, "description" TEXT NOT NULL, "performedByEmail" TEXT NOT NULL, "menteeId" TEXT, "mentorId" TEXT, "assignmentId" TEXT, "metadata" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"), CONSTRAINT "AuditLog_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "Mentee"("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "AuditLog_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "AuditLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MentorMenteeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE);
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_performedByEmail_idx" ON "AuditLog"("performedByEmail");
CREATE INDEX IF NOT EXISTS "AuditLog_menteeId_idx" ON "AuditLog"("menteeId");
CREATE INDEX IF NOT EXISTS "AuditLog_mentorId_idx" ON "AuditLog"("mentorId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE TABLE IF NOT EXISTS "MentoringSession" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "menteeId" TEXT NOT NULL, "mentorId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "scheduledDate" TIMESTAMP(3) NOT NULL, "scheduledTime" TEXT NOT NULL, "duration" INTEGER NOT NULL DEFAULT 60, "meetingFormat" "PreferredMeetingFormat" NOT NULL DEFAULT 'VIRTUAL', "meetingLink" TEXT, "location" TEXT, "status" "SessionStatus" NOT NULL DEFAULT 'PENDING', "menteeConfirmed" BOOLEAN NOT NULL DEFAULT false, "mentorConfirmed" BOOLEAN NOT NULL DEFAULT false, "sessionNotes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MentoringSession_pkey" PRIMARY KEY ("id"), CONSTRAINT "MentoringSession_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "Mentee"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "MentoringSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX IF NOT EXISTS "MentoringSession_menteeId_idx" ON "MentoringSession"("menteeId");
CREATE INDEX IF NOT EXISTS "MentoringSession_mentorId_idx" ON "MentoringSession"("mentorId");
CREATE INDEX IF NOT EXISTS "MentoringSession_scheduledDate_idx" ON "MentoringSession"("scheduledDate");
CREATE INDEX IF NOT EXISTS "MentoringSession_status_idx" ON "MentoringSession"("status");

CREATE TABLE IF NOT EXISTS "VerificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
`;

export async function GET() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const statements = CREATE_TABLES_SQL.split(';').filter((s: string) => s.trim().length > 0);
    const results: string[] = [];
    
    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt + ';');
        results.push('OK');
      } catch (e: any) {
        if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
          results.push('WARN: ' + e.message?.substring(0, 80));
        } else {
          results.push('SKIP (exists)');
        }
      }
    }

    // Create admin
    const bcrypt = require('bcryptjs');
    let adminMsg = '';
    try {
      const existing = await prisma.user.findUnique({ where: { email: 'admin@primeatlanticnigeria.com' } });
      if (!existing) {
        const hash = await bcrypt.hash('admin123', 12);
        await prisma.user.create({ data: { name: 'HR Administrator', email: 'admin@primeatlanticnigeria.com', password: hash, role: 'HR_ADMIN' } });
        adminMsg = 'Admin created: admin@primeatlanticnigeria.com / admin123';
      } else {
        adminMsg = 'Admin already exists';
      }
    } catch (e: any) {
      adminMsg = 'Admin error: ' + e.message?.substring(0, 100);
    }

    await prisma.$disconnect();
    return NextResponse.json({ success: true, admin: adminMsg, tableOps: results.length, warnings: results.filter((r: string) => r.startsWith('WARN')).length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.substring(0, 300) }, { status: 500 });
  }
}
