export interface StageGradesMap {
  [stageName: string]: string[];
}

export const STAGES_GRADES: StageGradesMap = {
  الإبتدائية: [
    "الصف الأول",
    "الصف الثاني",
    "الصف الثالث",
    "الصف الرابع",
    "الصف الخامس",
    "الصف السادس",
  ],
  الإعدادية: ["الصف الأول", "الصف الثاني", "الصف الثالث"],
  الثانوية: ["الصف الأول", "الصف الثاني", "الصف الثالث"],
};

export const STAGES: string[] = Object.keys(STAGES_GRADES);

export default STAGES;
