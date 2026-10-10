import { IUser } from '../models/User.js';

export interface PeerMatchRanking {
  peer: IUser;
  matchScore: number;
  scoreBreakdown: {
    skillRelevance: number; // Max 35
    topicSimilarity: number; // Max 25
    competencyLevel: number; // Max 20
    availabilityScore: number; // Max 10
    experienceAndRating: number; // Max 10
  };
  matchedSkills: Array<{
    skillName: string;
    category: string;
    proficiencyLevel: string;
    isVerified: boolean;
    verifiedScore?: number;
  }>;
  explanation: string;
}

function normalizeToken(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9+#]/g, ' ').trim();
}

export function rankPeersDeterministically(
  candidates: IUser[],
  extractedTopics: string[],
  extractedCompetencies: string[],
  recommendedProficiency: 'Beginner' | 'Intermediate' | 'Advanced',
  rawQueryText: string
): PeerMatchRanking[] {
  const normalizedTopics = extractedTopics.map(normalizeToken);
  const normalizedCategories = extractedCompetencies.map((c) => c.toLowerCase());
  const queryWords = normalizeToken(rawQueryText)
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const rankings: PeerMatchRanking[] = [];

  for (const candidate of candidates) {
    const userSkills = candidate.competencies || [];
    const matchedSkills: PeerMatchRanking['matchedSkills'] = [];

    let skillMatchPoints = 0;
    let verifiedBonusPoints = 0;
    let maxProficiencyWeight = 0;

    for (const comp of userSkills) {
      const skillNorm = normalizeToken(comp.skillName);
      const catNorm = comp.category.toLowerCase();

      const directTopicHit = normalizedTopics.some(
        (t) => skillNorm.includes(t) || t.includes(skillNorm)
      );
      const queryWordHit = queryWords.some((w) => skillNorm.includes(w));
      const categoryHit = normalizedCategories.includes(catNorm);

      if (directTopicHit || queryWordHit || categoryHit) {
        matchedSkills.push({
          skillName: comp.skillName,
          category: comp.category,
          proficiencyLevel: comp.proficiencyLevel,
          isVerified: comp.isVerified,
          verifiedScore: comp.verifiedScore,
        });

        if (directTopicHit || queryWordHit) {
          skillMatchPoints += 16;
        } else if (categoryHit) {
          skillMatchPoints += 8;
        }

        const levelWeight =
          comp.proficiencyLevel === 'Advanced'
            ? 10
            : comp.proficiencyLevel === 'Intermediate'
            ? 7
            : 4;
        if (levelWeight > maxProficiencyWeight) {
          maxProficiencyWeight = levelWeight;
        }

        if (comp.isVerified) {
          verifiedBonusPoints += 6;
        }
      }
    }

    const skillRelevance = Math.min(35, skillMatchPoints);

    // Topic similarity across bio, major, and skills (max 25)
    const bioAndMajor = normalizeToken(
      `${candidate.bio || ''} ${candidate.academicDetails?.major || ''}`
    );
    let bioHits = 0;
    for (const topic of normalizedTopics) {
      if (topic && bioAndMajor.includes(topic)) {
        bioHits += 7;
      }
    }
    for (const word of queryWords) {
      if (word.length > 3 && bioAndMajor.includes(word)) {
        bioHits += 3;
      }
    }
    const topicSimilarity = Math.min(25, bioHits + (matchedSkills.length > 0 ? 8 : 0));

    // Competency & verification level (max 20)
    const targetWeight =
      recommendedProficiency === 'Advanced'
        ? 10
        : recommendedProficiency === 'Intermediate'
        ? 7
        : 4;
    const levelAlignment = maxProficiencyWeight >= targetWeight ? 10 : maxProficiencyWeight;
    const competencyLevel = Math.min(20, levelAlignment + verifiedBonusPoints);

    // Availability score (max 10)
    const availabilityScore =
      candidate.availability?.status === 'Available'
        ? 10
        : candidate.availability?.status === 'Busy'
        ? 5
        : 2;

    // Previous learning-session experience & ratings (max 10)
    const sessionsScore = Math.min(5, (candidate.stats?.sessionsMentored || 0) * 0.8);
    const ratingScore = Math.min(5, ((candidate.stats?.averageRating || 4.5) / 5) * 5);
    const experienceAndRating = Math.round((sessionsScore + ratingScore) * 10) / 10;

    const totalScore = Math.min(
      99,
      Math.round(
        skillRelevance +
          topicSimilarity +
          competencyLevel +
          availabilityScore +
          experienceAndRating
      )
    );

    const verifiedNames = matchedSkills
      .filter((s) => s.isVerified)
      .map((s) => `${s.skillName} (${s.verifiedScore || 85}% verified)`);
    const selfReportedNames = matchedSkills
      .filter((s) => !s.isVerified)
      .map((s) => `${s.skillName} (${s.proficiencyLevel})`);

    const explanationParts: string[] = [];
    if (verifiedNames.length > 0) {
      explanationParts.push(`Assessment-verified in ${verifiedNames.join(', ')}`);
    }
    if (selfReportedNames.length > 0) {
      explanationParts.push(`Competent in ${selfReportedNames.slice(0, 2).join(', ')}`);
    }
    explanationParts.push(
      `${candidate.availability?.status || 'Available'} (${candidate.availability?.preferredHours || 'Flexible'})`
    );
    explanationParts.push(
      `${candidate.stats?.sessionsMentored || 0} sessions mentored (${(candidate.stats?.averageRating || 5.0).toFixed(1)}★)`
    );

    rankings.push({
      peer: candidate,
      matchScore: Math.max(totalScore, 25),
      scoreBreakdown: {
        skillRelevance,
        topicSimilarity,
        competencyLevel,
        availabilityScore,
        experienceAndRating,
      },
      matchedSkills,
      explanation: explanationParts.join(' · '),
    });
  }

  return rankings.sort((a, b) => b.matchScore - a.matchScore);
}
