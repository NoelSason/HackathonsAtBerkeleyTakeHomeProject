/**
 * Coarse descriptors used in place of school names during blind review.
 *
 * Hiding the school outright would throw away context a reviewer genuinely
 * needs: an applicant with no CS department and no hackathon club is being
 * judged on a different baseline than one with both. What blind review is
 * meant to remove is the prestige cue attached to a specific name, not the
 * circumstances behind the application.
 *
 * This is a maintained lookup rather than anything inferred. An unknown
 * school is withheld rather than guessed at, because guessing wrong here
 * reintroduces exactly the bias the queue exists to avoid.
 */
const SCHOOL_GROUPS: Record<string, string> = {
  "UC Berkeley": "Large public university · CA",
  "UC Davis": "Large public university · CA",
  "UC Irvine": "Large public university · CA",
  "UC San Diego": "Large public university · CA",
  "UCLA": "Large public university · CA",
  "San José State": "Public university · CA",
  "Cal Poly SLO": "Public university · CA",
  "Fresno State": "Public university · CA",
  "Stanford": "Private university · CA",
  "Georgia Tech": "Large public university · US",
  "Howard University": "Private university · US",
  "University of Waterloo": "Large public university · Canada",
};

export function generaliseSchool(school: string | null): string {
  if (!school) return "Not given";
  return SCHOOL_GROUPS[school] ?? "School withheld";
}
