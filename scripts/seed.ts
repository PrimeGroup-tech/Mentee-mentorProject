import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const BUSINESS_UNITS = [
  'SYNERPET',
  'PACE',
  'PASS',
  'WAEL',
  'CINALT',
  'SYNERPET',
  'WESTON',
  'PAL',
  'PAGES',
];

const EXPERTISE_AREAS = [
  'Technical Leadership',
  'Project Management',
  'Safety Management',
  'Financial Planning',
  'Team Development',
];

const INTERESTS = ['Golf', 'Technology', 'Reading', 'Hiking', 'Photography'];

const CHALLENGES = [
  'Digital Transformation',
  'Succession Planning',
  'Safety Culture',
];

function getRandomElements<T>(arr: T[], count: number): T[] {
  return arr.sort(() => Math.random() - 0.5).slice(0, count);
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log('Starting database seed...');

  try {
    // Create HR Admin
    const hashedPassword = await bcrypt.hash('johndoe123', 10);
    
    await prisma.user.upsert({
      where: { email: 'john@doe.com' },
      update: {},
      create: {
        email: 'john@doe.com',
        name: 'John Doe',
        password: hashedPassword,
        role: 'HR_ADMIN',
      },
    });

    // Create 15 mentors
    const mentorData = [
      { name: 'Sarah Johnson', email: 'sarah@pass.com', role: 'Engineering Manager', unit: 'PACE', exp: 15 },
      { name: 'Michael Chen', email: 'michael@pass.com', role: 'Operations Director', unit: 'PASS', exp: 18 },
      { name: 'Emma Williams', email: 'emma@pass.com', role: 'HSE Manager', unit: 'WAEL', exp: 12 },
      { name: 'James Smith', email: 'james@pass.com', role: 'Finance Manager', unit: 'CINALT', exp: 16 },
      { name: 'Patricia Martinez', email: 'patricia@pass.com', role: 'HR Director', unit: 'SYNERPET', exp: 14 },
      { name: 'Robert Taylor', email: 'robert@pass.com', role: 'Commercial Lead', unit: 'WESTON', exp: 17 },
      { name: 'Susan Anderson', email: 'susan@pass.com', role: 'Supply Chain Manager', unit: 'PAL', exp: 13 },
      { name: 'David Thomas', email: 'david@pass.com', role: 'Quality Manager', unit: 'PAGES', exp: 11 },
      { name: 'Lisa White', email: 'lisa@pass.com', role: 'Engineering Director', unit: 'PACE', exp: 19 },
      { name: 'Christopher Harris', email: 'chris@pass.com', role: 'Operations Manager', unit: 'PASS', exp: 14 },
      { name: 'Angela Clark', email: 'angela@pass.com', role: 'Safety Director', unit: 'WAEL', exp: 16 },
      { name: 'Daniel Lewis', email: 'daniel@pass.com', role: 'Finance Director', unit: 'CINALT', exp: 18 },
      { name: 'Jessica Walker', email: 'jessica@pass.com', role: 'HR Manager', unit: 'SYNERPET', exp: 10 },
      { name: 'Matthew Hall', email: 'matthew@pass.com', role: 'Commercial Manager', unit: 'WESTON', exp: 12 },
      { name: 'Jennifer Allen', email: 'jennifer@pass.com', role: 'Engineering Lead', unit: 'PAL', exp: 11 },
    ];

    for (const mentor of mentorData) {
      const hashedPwd = await bcrypt.hash('password123', 10);
      const user = await prisma.user.upsert({
        where: { email: mentor.email },
        update: {},
        create: {
          email: mentor.email,
          name: mentor.name,
          password: hashedPwd,
          role: 'MENTOR',
        },
      });

      await prisma.mentor.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          role: mentor.role,
          businessUnit: mentor.unit,
          yearsOfExperience: mentor.exp,
          areasOfExpertise: getRandomElements(EXPERTISE_AREAS, 2),
          leadershipStyle: 'COLLABORATIVE',
          shortBio: `Experienced ${mentor.unit} leader focused on mentoring talent.`,
          personalInterests: getRandomElements(INTERESTS, 2),
          shadowSkills: ['Communication', 'Problem Solving'],
          maxMentees: 5,
          currentMenteeCount: 0,
          profileComplete: true,
        },
      });
    }

    console.log('✓ Created 15 mentors');

    // Create 28 mentees
    const menteeData = [
      'alice@pass.com', 'ben@pass.com', 'caroline@pass.com', 'david@pass.com', 'elena@pass.com',
      'frank@pass.com', 'grace@pass.com', 'henry@pass.com', 'iris@pass.com', 'jack@pass.com',
      'karen@pass.com', 'liam@pass.com', 'maria@pass.com', 'nicholas@pass.com', 'olivia@pass.com',
      'paul@pass.com', 'quinn@pass.com', 'rachel@pass.com', 'simon@pass.com', 'tara@pass.com',
      'ulysses@pass.com', 'violet@pass.com', 'william@pass.com', 'xenia@pass.com', 'yuki@pass.com',
      'zoe@pass.com', 'aaron@pass.com', 'bella@pass.com',
    ];

    for (let i = 0; i < menteeData.length; i++) {
      const hashedPwd = await bcrypt.hash('password123', 10);
      const name = menteeData[i].split('@')[0].charAt(0).toUpperCase() + menteeData[i].split('@')[0].slice(1);
      const unit = getRandomElement(BUSINESS_UNITS);
      const exp = Math.floor(Math.random() * 5) + 1;

      const user = await prisma.user.upsert({
        where: { email: menteeData[i] },
        update: {},
        create: {
          email: menteeData[i],
          name: name,
          password: hashedPwd,
          role: 'MENTEE',
        },
      });

      await prisma.mentee.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          role: exp < 3 ? 'Junior Officer' : 'Senior Officer',
          businessUnit: unit,
          yearsOfExperience: exp,
          tenure: Math.floor(Math.random() * 4) + 1,
          competencyGaps: getRandomElements(['Leadership', 'Finance', 'Strategy'], 2),
          careerGoals: 'Advance to senior management',
          personalInterests: getRandomElements(INTERESTS, 2),
          preferredMeetingFormat: 'HYBRID',
          profileComplete: false,
        },
      });
    }

    console.log('✓ Created 28 mentees');
    console.log('✅ Seed completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seed().catch(() => process.exit(1));
