import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const prisma = new PrismaClient();
  try {
    const results: string[] = [];
    
    // Add isActive to User
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`);
      results.push("Added isActive to User");
    } catch (e: any) { results.push("isActive: " + e.message); }
    
    // Add hasDualRole to User
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasDualRole" BOOLEAN NOT NULL DEFAULT false`);
      results.push("Added hasDualRole to User");
    } catch (e: any) { results.push("hasDualRole: " + e.message); }
    
    // Add session feedback fields to MentoringSession
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "MentoringSession" ADD COLUMN IF NOT EXISTS "sessionHeldMentee" BOOLEAN`);
      results.push("Added sessionHeldMentee");
    } catch (e: any) { results.push("sessionHeldMentee: " + e.message); }
    
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "MentoringSession" ADD COLUMN IF NOT EXISTS "sessionHeldMentor" BOOLEAN`);
      results.push("Added sessionHeldMentor");
    } catch (e: any) { results.push("sessionHeldMentor: " + e.message); }
    
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "MentoringSession" ADD COLUMN IF NOT EXISTS "menteeFeedback" TEXT`);
      results.push("Added menteeFeedback");
    } catch (e: any) { results.push("menteeFeedback: " + e.message); }
    
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "MentoringSession" ADD COLUMN IF NOT EXISTS "mentorFeedback" TEXT`);
      results.push("Added mentorFeedback");
    } catch (e: any) { results.push("mentorFeedback: " + e.message); }
    
    await prisma.$disconnect();
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    await prisma.$disconnect();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
