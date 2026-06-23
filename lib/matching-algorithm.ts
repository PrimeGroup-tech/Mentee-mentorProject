import { Mentee, Mentor } from '@prisma/client';

export interface MatchingScoreBreakdown {
  competencyAlignmentScore: number;
  experienceGapScore: number;
  crossFunctionalScore: number;
  careerAspirationScore: number;
  leadershipStyleScore: number;
  personalInterestsScore: number;
  wildcardAlignmentScore: number;
  availabilityFormatScore: number;
  preferenceScore: number;
  totalScore: number;
}

const WEIGHTS = {
  competencyAlignment: 0.35,
  experienceGap: 0.15,
  crossFunctional: 0.10,
  careerAspiration: 0.15,
  leadershipStyle: 0.05,
  personalInterests: 0.05,
  wildcardAlignment: 0.10,
  availabilityFormat: 0.03,
  preference: 0.02,
};

export function calculateMatchingScore(
  mentee: Mentee & { preferences?: any[] },
  mentor: Mentor & { assignments?: any[] }
): MatchingScoreBreakdown {
  let competencyScore = 0;
  let experienceScore = 0;
  let crossFunctionalScore = 0;
  let careerScore = 0;
  let leadershipScore = 0;
  let interestScore = 0;
  let wildcardScore = 0;
  let availabilityScore = 0;
  let preferenceScore = 0;

  // 1. Competency Alignment (35%)
  // Match mentee gaps with mentor expertise
  const competencyGaps = mentee.competencyGaps ?? [];
  const mentorExpertise = mentor.areasOfExpertise ?? [];
  
  if (competencyGaps.length > 0 && mentorExpertise.length > 0) {
    const matches = competencyGaps.filter(gap =>
      mentorExpertise.some(exp =>
        exp.toLowerCase().includes(gap.toLowerCase()) ||
        gap.toLowerCase().includes(exp.toLowerCase())
      )
    ).length;
    competencyScore = (matches / competencyGaps.length) * 100;
  }

  // 2. Experience Gap (15%)
  // Mentor should have significantly higher experience
  const experienceGap = mentor.yearsOfExperience - mentee.yearsOfExperience;
  if (experienceGap > 0) {
    experienceScore = Math.min((experienceGap / 20) * 100, 100);
  }

  // 3. Cross-Functional Exposure (10%)
  // Prefer different business units
  crossFunctionalScore = mentor.businessUnit !== mentee.businessUnit ? 100 : 50;

  // 4. Career Aspiration Alignment (15%)
  // Check if mentor's experience aligns with mentee's goals
  const menteeGoals = (mentee.careerGoals ?? '').toLowerCase();
  const mentorRole = (mentor.role ?? '').toLowerCase();
  const mentorExpertiseStr = mentor.areasOfExpertise?.join(' ').toLowerCase() ?? '';
  
  if (menteeGoals) {
    const goalMatches =
      menteeGoals.includes(mentorRole) ||
      menteeGoals.split(' ').some(goal => mentorExpertiseStr.includes(goal));
    careerScore = goalMatches ? 100 : 50;
  } else {
    careerScore = 50;
  }

  // 5. Leadership Style Compatibility (5%)
  // Similar or complementary styles
  leadershipScore = 70; // Default reasonable score

  // 6. Personal Interests (5%)
  // Shared interests for rapport
  const menteeInterests = mentee.personalInterests ?? [];
  const mentorInterests = mentor.personalInterests ?? [];
  
  if (menteeInterests.length > 0 && mentorInterests.length > 0) {
    const sharedInterests = menteeInterests.filter(interest =>
      mentorInterests.some(mi => mi.toLowerCase() === interest.toLowerCase())
    ).length;
    interestScore = (sharedInterests / menteeInterests.length) * 100;
  } else {
    interestScore = 50;
  }

  // 7. Wildcard Alignment (10%)
  // Similar organizational challenge focus
  const menteeChallenge = (mentee.organizationalChallenge ?? '').toLowerCase();
  const mentorChallenge = (mentor.organizationalChallenge ?? '').toLowerCase();
  
  if (menteeChallenge && mentorChallenge) {
    wildcardScore = menteeChallenge === mentorChallenge ? 100 : 50;
  } else {
    wildcardScore = 40;
  }

  // 8. Availability & Format Preference (3%)
  // Check if mentor has capacity
  const hasCapacity = mentor.currentMenteeCount < mentor.maxMentees;
  availabilityScore = hasCapacity ? 100 : 0;

  // 9. Preference Score (2%)
  // Placeholder for manual preference weighting
  preferenceScore = 50;

  // Calculate weighted total
  const totalScore =
    competencyScore * WEIGHTS.competencyAlignment +
    experienceScore * WEIGHTS.experienceGap +
    crossFunctionalScore * WEIGHTS.crossFunctional +
    careerScore * WEIGHTS.careerAspiration +
    leadershipScore * WEIGHTS.leadershipStyle +
    interestScore * WEIGHTS.personalInterests +
    wildcardScore * WEIGHTS.wildcardAlignment +
    availabilityScore * WEIGHTS.availabilityFormat +
    preferenceScore * WEIGHTS.preference;

  return {
    competencyAlignmentScore: competencyScore,
    experienceGapScore: experienceScore,
    crossFunctionalScore,
    careerAspirationScore: careerScore,
    leadershipStyleScore: leadershipScore,
    personalInterestsScore: interestScore,
    wildcardAlignmentScore: wildcardScore,
    availabilityFormatScore: availabilityScore,
    preferenceScore,
    totalScore,
  };
}
