/** Practice points from completed simulation plans, not professional credentials. */
export const SKILL_DOMAINS = ["learning", "technical", "service", "commerce", "fitness", "mobility", "ecology", "community"] as const;
export type SkillDomain = typeof SKILL_DOMAINS[number];
export const SKILL_LABELS: Record<SkillDomain,string> = {
  learning: "Học tập", technical: "Kỹ thuật", service: "Phục vụ", commerce: "Công việc & mua sắm",
  fitness: "Vận động", mobility: "Đi lại", ecology: "Chăm cây & thú", community: "Cộng đồng",
};
export type DomainGain = { domain: SkillDomain; before: number; after: number; amount: number };
