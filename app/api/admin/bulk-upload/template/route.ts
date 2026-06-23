import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'mentor') {
      return generateMentorTemplate();
    } else if (type === 'mentee') {
      return generateMenteeTemplate();
    } else {
      return NextResponse.json({ error: 'Invalid type. Use ?type=mentor or ?type=mentee' }, { status: 400 });
    }
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

function generateMentorTemplate() {
  const wb = XLSX.utils.book_new();

  // Data sheet with headers and 2 sample rows
  const headers = [
    'Full Name*', 'Email*', 'Password*', 'Job Title/Role*', 'Business Unit*',
    'Years of Experience*', 'Areas of Expertise*', 'Leadership Style*',
    'Personal Interests', 'Skills (Expertise & Soft Skills)',
    'Commitment/Availability', 'Max Mentees', 'Organizational Challenge',
    'Tier (1-3)', 'Level (11-22)', 'Short Bio', 'Photo Filename'
  ];

  const sample1 = [
    'Sarah Johnson', 'sarah@primeatlanticnigeria.com', 'TempPass123!', 'Engineering Manager', 'PACE',
    '15', 'Leadership, Finance, Strategy', 'COLLABORATIVE',
    'Develop next generation of leaders', 'Golf, Technology, Reading', 'Public Speaking, Negotiation',
    'Available weekly for 1-hour sessions', '3', 'Digital Transformation',
    '1', '15', 'Experienced leader passionate about mentoring', 'sarah_johnson.jpg'
  ];

  const sample2 = [
    'Michael Chen', 'michael@paboriconsulting.com', 'TempPass456!', 'Operations Director', 'PASS',
    '18', 'Operations, Technical Skills, Project Management', 'DIRECT',
    'Share operational excellence knowledge', 'Hiking, Sports', 'Strategic Planning, Change Management',
    'Bi-weekly availability', '2', 'Cost Optimization',
    '2', '18', 'Operations expert with 18 years experience', 'michael_chen.jpg'
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sample1, sample2]);

  // Set column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 20) }));

  XLSX.utils.book_append_sheet(wb, ws, 'Mentor Data');

  // Instructions sheet
  const instructions = [
    ['PASS Mentoring System - Mentor Bulk Upload Template'],
    [''],
    ['INSTRUCTIONS:'],
    ['1. Fill in the "Mentor Data" sheet with mentor information'],
    ['2. Fields marked with * are required'],
    ['3. Delete the sample rows before uploading'],
    ['4. Save as .xlsx format'],
    [''],
    ['FIELD GUIDE:'],
    ['Full Name*', 'Full name of the mentor'],
    ['Email*', 'Company email address (must be from an allowed domain)'],
    ['Password*', 'Temporary password (min 6 characters, mentor can change later)'],
    ['Job Title/Role*', 'Current job title or role in the organization'],
    ['Business Unit*', 'Must be one of: PACE, PASS, WAEL, CINALT, MILE SQUARE, WESTON, PAL, PAGES'],
    ['Years of Experience*', 'Total years of professional experience (number)'],
    ['Areas of Expertise*', 'Comma-separated list. Options: Strategic Thinking & Visioning, Financial Oversight & Acumen, Stakeholder Management, Leading Diverse Teams, Emotional Intelligence, Change Management & Resilience, Technology & AI Integration, Communication & Public Speaking, Team Building, People Management, Problem Solving, Technical Acumen, Industry Knowledge, Functional Knowledge, Conflict Resolution, Executive Presence, Culture Building'],
    ['Leadership Style*', 'Must be one of: DIRECT, COLLABORATIVE, ANALYTICAL, SUPPORTIVE, VISIONARY'],
    ['Personal Interests', 'Comma-separated list. Options: Golf, Technology, Reading, Hiking, Photography, Cooking, Travel, Music, Sports, Volunteering, Negotiation, Networking, Current Affairs, Movies, Geography, Socializing, Animals'],
    ['Skills (Expertise & Soft Skills)', 'Comma-separated list. Options: Strategic Thinking & Visioning, Financial Oversight & Acumen, Stakeholder Management, Leading Diverse Teams, Emotional Intelligence, Change Management & Resilience, Technology & AI Integration, Communication & Public Speaking, Team Building, People Management, Problem Solving, Technical Acumen, Industry Knowledge, Functional Knowledge, Conflict Resolution, Executive Presence, Culture Building, Active Listening, Constructive Conflict Resolution, Adaptability, Constructive Feedback Reception, Time Management & Organisation, Mentoring & Coaching, Negotiation & Influence, Cross-functional Collaboration, Strategic Networking, Innovation & Creative Thinking'],
    ['Commitment/Availability', 'Description of availability for mentoring sessions'],
    ['Max Mentees', 'Maximum number of mentees to take on (default: 5)'],
    ['Organizational Challenge', 'Options: Digital Transformation, Succession Planning, Safety Culture, Cost Optimization'],
    ['Tier (1-3)', 'Mentor tier level: 1, 2, or 3'],
    ['Level (12-23)', 'Mentor level: any number from 12 to 23'],
    ['Short Bio', 'Brief biography or description'],
    ['Photo Filename', 'Filename of photo to upload (e.g., john_doe.jpg). Upload photos separately after importing data.'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 30 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="mentor_upload_template.xlsx"',
    },
  });
}

function generateMenteeTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Full Name*', 'Email*', 'Password*', 'Job Title/Role*', 'Business Unit*',
    'Years of Experience*', 'Employment Date*', 'Development Areas*',
    'Career Goals*', 'Personal Interests*', 'Preferred Meeting Format*',
    'Organizational Challenge'
  ];

  const sample1 = [
    'Alice Brown', 'alice@primeatlanticnigeria.com', 'TempPass123!', 'Junior Analyst', 'PACE',
    '3', '2', 'Leadership, Finance',
    'Develop leadership skills for management track', 'Technology, Reading', 'HYBRID',
    'Digital Transformation'
  ];

  const sample2 = [
    'Ben Wilson', 'ben@paboriconsulting.com', 'TempPass456!', 'Field Engineer', 'PASS',
    '5', '3', 'Strategy, Communication',
    'Transition to project management role', 'Hiking, Sports', 'VIRTUAL',
    'Safety Culture'
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sample1, sample2]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 20) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Mentee Data');

  // Instructions sheet
  const instructions = [
    ['PASS Mentoring System - Mentee Bulk Upload Template'],
    [''],
    ['INSTRUCTIONS:'],
    ['1. Fill in the "Mentee Data" sheet with mentee information'],
    ['2. Fields marked with * are required'],
    ['3. Delete the sample rows before uploading'],
    ['4. Save as .xlsx format'],
    [''],
    ['FIELD GUIDE:'],
    ['Full Name*', 'Full name of the mentee'],
    ['Email*', 'Company email address (must be from an allowed domain)'],
    ['Password*', 'Temporary password (min 6 characters, mentee can change later)'],
    ['Job Title/Role*', 'Current job title or role in the organization'],
    ['Business Unit*', 'Must be one of: PACE, PASS, WAEL, CINALT, MILE SQUARE, WESTON, PAL, PAGES'],
    ['Years of Experience*', 'Total years of professional experience (number)'],
    ['Employment Date*', 'Date of employment in Prime Atlantic Group (format: YYYY-MM-DD)'],
    ['Development Areas*', 'Comma-separated list. Options: Strategic Thinking & Execution, Financial Oversight & Acumen, Stakeholder Management, Leading Diverse Teams, Emotional Intelligence, Change Management & Resilience, Technology & AI Integration, Communication, Team Building, People Management, Problem Solving, Technical Acumen, Active Listening, Constructive Conflict Resolution, Adaptability, Constructive Feedback Reception, Time Management & Organisation'],
    ['Career Goals*', 'Description of career aspirations and goals'],
    ['Personal Interests*', 'Comma-separated list. Options: Golf, Technology, Reading, Hiking, Photography, Cooking, Travel, Music, Sports, Volunteering, Negotiation, Networking, Current Affairs, Movies, Geography, Socializing, Animals'],
    ['Preferred Meeting Format*', 'Must be one of: IN_PERSON, VIRTUAL, HYBRID'],
    ['Organizational Challenge', 'Options: Digital Transformation, Succession Planning, Safety Culture, Cost Optimization'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 30 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="mentee_upload_template.xlsx"',
    },
  });
}
