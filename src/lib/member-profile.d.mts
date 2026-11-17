export type MemberProfile = {
  university: "msu" | "hse" | "rudn" | "other";
  stage: "prospective" | "newArrival" | "enrolled";
  faculty: "" | "physics" | "economics" | "journalism";
  degreeLevel: "unknown" | "preparatory" | "bachelor" | "master" | "postgraduate";
  interests: ("documents" | "study" | "health" | "banking" | "living" | "transport")[];
  cityId: "moscow";
};
export function parseMemberProfile(value: unknown): MemberProfile | null;
