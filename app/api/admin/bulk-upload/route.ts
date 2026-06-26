import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const VALID_BUSINESS_UNITS = ['PACE', 'PASS', 'WAEL', 'CINALT', 'MILE SQUARE', 'WESTON', 'PAL', 'PAGES', 'SYNERPET'];
const VALID_LEADERSHIP_STYLES = ['DIRECT', 'COLLABORATIVE', 'ANALYTICAL', 'SUPPORTIVE', 'VISIONARY'];
const VALID_MEETING_FORMATS = ['IN_PERSON', 'VIRTUAL', 'HYBRID'];

function parseCommaSeparated(val: any): string[] {
  if (!val) return [];
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
}

function cleanStr(val: any): string {
  return val ? String(val).trim() : '';
}

function cleanNum(val: any, fallback: number = 0): number {
  const n = parseInt(String(val), 10);
  return isNaN(n) ? fallback : n;
}

export async function POST(request: Request) {
  try {
    // Rate limit bulk uploads
    const rateLimitResp = applyRateLimit(request, 'bulk-upload', RATE_LIMITS.UPLOAD);
    if (rateLimitResp) return rateLimitResp;

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'mentor' or 'mentee'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!type || !['mentor', 'mentee'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be "mentor" or "mentee"' }, { status: 400 });
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    
    // Get the first data sheet (skip instructions)
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('data')) || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (rows.length < 2) {
      return NextResponse.json({ error: 'The file has no data rows. Please add data below the header row.' }, { status: 400 });
    }

    // Skip header row
    const dataRows = rows.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== null && cell !== ''));

    if (dataRows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in the file.' }, { status: 400 });
    }

    const results: { row: number; name: string; email: string; status: 'created' | 'skipped' | 'error'; message: string }[] = [];

    if (type === 'mentor') {
      await processMentors(dataRows, admin.email, results);
    } else {
      await processMentees(dataRows, admin.email, results);
    }

    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    // Log the bulk upload
    await prisma.auditLog.create({
      data: {
        action: 'BULK_UPLOAD',
        description: `Admin bulk uploaded ${type}s: ${created} created, ${skipped} skipped, ${errors} errors`,
        performedByEmail: admin.email,
      },
    });

    return NextResponse.json({
      success: true,
      summary: { total: dataRows.length, created, skipped, errors },
      results,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Bulk upload failed: ${msg}` }, { status: 500 });
  }
}

async function processMentors(
  rows: any[][],
  adminEmail: string,
  results: any[]
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row
    const name = cleanStr(row[0]);
    const email = cleanStr(row[1]).toLowerCase();
    const password = cleanStr(row[2]);
    const role = cleanStr(row[3]);
    const businessUnit = cleanStr(row[4]).toUpperCase();
    const yearsOfExperience = cleanNum(row[5]);
    const areasOfExpertise = parseCommaSeparated(row[6]);
    const leadershipStyle = cleanStr(row[7]).toUpperCase();
    const personalInterests = parseCommaSeparated(row[8]);
    const allSkills = parseCommaSeparated(row[9]);
    // Split combined skills: first 17 known expertise items go to areasOfExpertise if not already parsed from col 6
    const shadowSkills = allSkills.length > 0 ? allSkills.filter((s: string) => !areasOfExpertise.includes(s)) : [];
    const commitmentAvailability = cleanStr(row[10]);
    const maxMentees = cleanNum(row[11], 5);
    const tier = row[12] ? cleanNum(row[12]) : null;
    const level = row[13] ? cleanNum(row[13]) : null;
    const shortBio = cleanStr(row[14]);
    // row[15] = Photo Filename (informational only)

    // Validate required fields
    if (!name || !email || !password || !role || !businessUnit) {
      results.push({ row: rowNum, name: name || '(empty)', email: email || '(empty)', status: 'error', message: 'Missing required fields (Name, Email, Password, Role, Business Unit)' });
      continue;
    }

    if (password.length < 6) {
      results.push({ row: rowNum, name, email, status: 'error', message: 'Password must be at least 6 characters' });
      continue;
    }

    if (!VALID_BUSINESS_UNITS.includes(businessUnit)) {
      results.push({ row: rowNum, name, email, status: 'error', message: `Invalid business unit "${businessUnit}". Must be one of: ${VALID_BUSINESS_UNITS.join(', ')}` });
      continue;
    }

    const finalLeadershipStyle = VALID_LEADERSHIP_STYLES.includes(leadershipStyle) ? leadershipStyle : 'COLLABORATIVE';

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      results.push({ row: rowNum, name, email, status: 'skipped', message: 'Entry skipped' });
      continue;
    }

    try {
      const hashed = await bcrypt.hash(password, 12);

      await prisma.$transaction(async (tx: any) => {
        const user = await tx.user.create({
          data: { email, name, password: hashed, role: 'MENTOR' },
        });

        await tx.mentor.create({
          data: {
            userId: user.id,
            role,
            businessUnit,
            yearsOfExperience,
            areasOfExpertise,
            leadershipStyle: finalLeadershipStyle,
            coachingGoals: '',
            personalInterests,
            shadowSkills,
            commitmentAvailability: commitmentAvailability || '',
            maxMentees,
            tier: tier && tier >= 1 && tier <= 3 ? tier : null,
            level: level && level >= 11 && level <= 22 ? level : null,
            shortBio: shortBio || null,
            profileComplete: true,
          },
        });
      });

      results.push({ row: rowNum, name, email, status: 'created', message: 'Mentor account created successfully' });
    } catch (err: any) {
      results.push({ row: rowNum, name, email, status: 'error', message: err.message || 'Database error' });
    }
  }
}

async function processMentees(
  rows: any[][],
  adminEmail: string,
  results: any[]
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const name = cleanStr(row[0]);
    const email = cleanStr(row[1]).toLowerCase();
    const password = cleanStr(row[2]);
    const role = cleanStr(row[3]);
    const businessUnit = cleanStr(row[4]).toUpperCase();
    const yearsOfExperience = cleanNum(row[5]);
    const employmentDateStr = cleanStr(row[6]);
    let tenure = 0;
    let employmentDate: string | null = null;
    if (employmentDateStr) {
      const empDate = new Date(employmentDateStr);
      if (!isNaN(empDate.getTime())) {
        employmentDate = empDate.toISOString().split('T')[0];
        tenure = Math.max(0, Math.floor((Date.now() - empDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
      }
    }
    const competencyGaps = parseCommaSeparated(row[7]);
    const careerGoals = cleanStr(row[8]);
    const personalInterests = parseCommaSeparated(row[9]);
    const preferredMeetingFormat = cleanStr(row[10]).toUpperCase();

    if (!name || !email || !password || !role || !businessUnit) {
      results.push({ row: rowNum, name: name || '(empty)', email: email || '(empty)', status: 'error', message: 'Missing required fields (Name, Email, Password, Role, Business Unit)' });
      continue;
    }

    if (password.length < 6) {
      results.push({ row: rowNum, name, email, status: 'error', message: 'Password must be at least 6 characters' });
      continue;
    }

    if (!VALID_BUSINESS_UNITS.includes(businessUnit)) {
      results.push({ row: rowNum, name, email, status: 'error', message: `Invalid business unit "${businessUnit}". Must be one of: ${VALID_BUSINESS_UNITS.join(', ')}` });
      continue;
    }

    const finalMeetingFormat = VALID_MEETING_FORMATS.includes(preferredMeetingFormat) ? preferredMeetingFormat : 'HYBRID';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      results.push({ row: rowNum, name, email, status: 'skipped', message: 'Entry skipped' });
      continue;
    }

    try {
      const hashed = await bcrypt.hash(password, 12);

      await prisma.$transaction(async (tx: any) => {
        const user = await tx.user.create({
          data: { email, name, password: hashed, role: 'MENTEE' },
        });

        await tx.mentee.create({
          data: {
            userId: user.id,
            role,
            businessUnit,
            yearsOfExperience,
            tenure,
            employmentDate,
            competencyGaps,
            careerGoals: careerGoals || '',
            personalInterests,
            preferredMeetingFormat: finalMeetingFormat,
            profileComplete: true,
          },
        });
      });

      results.push({ row: rowNum, name, email, status: 'created', message: 'Mentee account created successfully' });
    } catch (err: any) {
      results.push({ row: rowNum, name, email, status: 'error', message: err.message || 'Database error' });
    }
  }
}