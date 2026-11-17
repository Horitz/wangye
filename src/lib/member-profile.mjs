const schools = new Set(["msu", "hse", "rudn", "other"]);
const stages = new Set(["prospective", "newArrival", "enrolled"]);
const degrees = new Set(["unknown", "preparatory", "bachelor", "master", "postgraduate"]);
const faculties = new Set(["physics", "economics", "journalism"]);
const interests = new Set(["documents", "study", "health", "banking", "living", "transport"]);
const fields = ["university", "stage", "faculty", "degreeLevel", "interests", "cityId"];

/** Validate a complete profile against the choices available in the onboarding form. */
export function parseMemberProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== fields.length || !fields.every(field => Object.hasOwn(value, field))
    || !schools.has(value.university) || !stages.has(value.stage) || !degrees.has(value.degreeLevel)
    || !(value.faculty === "" || value.university === "msu" && faculties.has(value.faculty))
    || value.cityId !== "moscow" || !Array.isArray(value.interests) || value.interests.length > interests.size
    || !value.interests.every(interest => interests.has(interest))) return null;
  return {
    university: value.university, stage: value.stage, faculty: value.faculty,
    degreeLevel: value.degreeLevel, interests: [...new Set(value.interests)], cityId: "moscow",
  };
}
