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
  "McGill University": "Large public university · Canada",
  "University of Washington": "Large public university · US",
  "UT Austin": "Large public university · US",
  "UC Santa Cruz": "Large public university · CA",
  "San Francisco State": "Public university · CA",
  "Northeastern University": "Private university · US",
  "Morehouse College": "Private college · US",
};

export function generaliseSchool(school: string | null): string {
  if (!school) return "Not given";
  // Object.hasOwn rather than a plain lookup: SCHOOL_GROUPS is an object
  // literal, so "__proto__" would resolve to Object.prototype and
  // "constructor" to a function. Both are truthy, so `??` would not catch
  // them and a non-string would reach the blind queue.
  return Object.hasOwn(SCHOOL_GROUPS, school) ? SCHOOL_GROUPS[school] : "School withheld";
}
