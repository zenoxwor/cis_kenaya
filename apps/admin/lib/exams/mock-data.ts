import type {
  ClassRoom,
  ExamComponent,
  ExamModuleState,
  ExamTerm,
  ReportCard,
  Student,
  StudentMark,
  StudentTermResult,
  Subject
} from "@/lib/exams/types";

export const EXAM_TERMS: ExamTerm[] = [
  {
    id: "term-1-2026",
    name: "Term 1",
    year: 2026,
    startDate: "2026-01-08",
    endDate: "2026-04-05",
    status: "closed"
  },
  {
    id: "term-2-2026",
    name: "Term 2",
    year: 2026,
    startDate: "2026-05-06",
    endDate: "2026-08-03",
    status: "active"
  },
  {
    id: "term-3-2026",
    name: "Term 3",
    year: 2026,
    startDate: "2026-09-02",
    endDate: "2026-12-03",
    status: "upcoming"
  }
];

export const EXAM_COMPONENTS: ExamComponent[] = [
  { id: "term1-cat", termId: "term-1-2026", name: "CAT", weight: 30, maxMarks: 30 },
  { id: "term1-midterm", termId: "term-1-2026", name: "Midterm", weight: 30, maxMarks: 30 },
  { id: "term1-final", termId: "term-1-2026", name: "Final", weight: 40, maxMarks: 40 },
  { id: "term2-cat", termId: "term-2-2026", name: "CAT", weight: 30, maxMarks: 30 },
  { id: "term2-midterm", termId: "term-2-2026", name: "Midterm", weight: 30, maxMarks: 30 },
  { id: "term2-final", termId: "term-2-2026", name: "Final", weight: 40, maxMarks: 40 },
  { id: "term3-cat", termId: "term-3-2026", name: "CAT", weight: 30, maxMarks: 30 },
  { id: "term3-midterm", termId: "term-3-2026", name: "Midterm", weight: 30, maxMarks: 30 },
  { id: "term3-final", termId: "term-3-2026", name: "Final", weight: 40, maxMarks: 40 }
];

export const EXAM_CLASSES: ClassRoom[] = [
  { id: "grade7-lions", name: "Grade 7 - Lions" },
  { id: "grade8-eagles", name: "Grade 8 - Eagles" }
];

export const EXAM_SUBJECTS: Subject[] = [
  { id: "math-grade7", name: "Mathematics", classId: "grade7-lions" },
  { id: "eng-grade7", name: "English", classId: "grade7-lions" },
  { id: "sci-grade7", name: "Integrated Science", classId: "grade7-lions" },
  { id: "kis-grade7", name: "Kiswahili", classId: "grade7-lions" },
  { id: "math-grade8", name: "Mathematics", classId: "grade8-eagles" },
  { id: "eng-grade8", name: "English", classId: "grade8-eagles" },
  { id: "sci-grade8", name: "Integrated Science", classId: "grade8-eagles" },
  { id: "sst-grade8", name: "Social Studies", classId: "grade8-eagles" }
];

export const EXAM_STUDENTS: Student[] = [
  { id: "st-001", admissionNo: "CIS/2024/071", fullName: "Amina Hassan", classId: "grade7-lions" },
  { id: "st-002", admissionNo: "CIS/2024/072", fullName: "Brian Odhiambo", classId: "grade7-lions" },
  { id: "st-003", admissionNo: "CIS/2024/073", fullName: "Caroline Wanjiku", classId: "grade7-lions" },
  { id: "st-004", admissionNo: "CIS/2024/074", fullName: "Daniel Mwangi", classId: "grade7-lions" },
  { id: "st-005", admissionNo: "CIS/2024/081", fullName: "Eunice Njeri", classId: "grade8-eagles" },
  { id: "st-006", admissionNo: "CIS/2024/082", fullName: "Faisal Noor", classId: "grade8-eagles" },
  { id: "st-007", admissionNo: "CIS/2024/083", fullName: "Grace Kemunto", classId: "grade8-eagles" },
  { id: "st-008", admissionNo: "CIS/2024/084", fullName: "Henry Kiptoo", classId: "grade8-eagles" }
];

const term2Components = EXAM_COMPONENTS.filter(component => component.termId === "term-2-2026");
const scoreMap: Record<string, [number, number, number]> = {
  "st-001:math-grade7": [24, 24, 31],
  "st-002:math-grade7": [18, 19, 25],
  "st-003:math-grade7": [22, 21, 30],
  "st-004:math-grade7": [12, 15, 18],
  "st-001:eng-grade7": [20, 21, 29],
  "st-002:eng-grade7": [17, 20, 24],
  "st-003:eng-grade7": [23, 24, 33],
  "st-004:eng-grade7": [14, 13, 17],
  "st-001:sci-grade7": [22, 20, 28],
  "st-002:sci-grade7": [16, 18, 23],
  "st-003:sci-grade7": [24, 25, 34],
  "st-004:sci-grade7": [11, 12, 16],
  "st-001:kis-grade7": [21, 20, 27],
  "st-002:kis-grade7": [18, 17, 21],
  "st-003:kis-grade7": [25, 24, 33],
  "st-004:kis-grade7": [13, 14, 18],
  "st-005:math-grade8": [23, 24, 32],
  "st-006:math-grade8": [16, 18, 25],
  "st-007:math-grade8": [24, 25, 35],
  "st-008:math-grade8": [15, 14, 19],
  "st-005:eng-grade8": [22, 20, 30],
  "st-006:eng-grade8": [17, 16, 23],
  "st-007:eng-grade8": [25, 24, 34],
  "st-008:eng-grade8": [14, 15, 18],
  "st-005:sci-grade8": [21, 22, 31],
  "st-006:sci-grade8": [18, 17, 24],
  "st-007:sci-grade8": [24, 25, 36],
  "st-008:sci-grade8": [12, 13, 18],
  "st-005:sst-grade8": [20, 21, 29],
  "st-006:sst-grade8": [17, 16, 22],
  "st-007:sst-grade8": [23, 24, 35],
  "st-008:sst-grade8": [13, 14, 19]
};

export const SEED_MARKS: StudentMark[] = Object.entries(scoreMap).flatMap(([key, values]) => {
  const [studentId, subjectId] = key.split(":");
  return values.map((rawMark, index) => {
    const component = term2Components[index];
    return {
      id: `${studentId}-${subjectId}-${component.id}`,
      studentId,
      subjectId,
      componentId: component.id,
      rawMark,
      grade: gradeFromScore(rawMark, component.maxMarks),
      enteredById: "mock-teacher",
      verifiedById: component.id.endsWith("cat") ? null : "mock-principal",
      status: component.id.endsWith("cat") ? "draft" : "verified"
    };
  });
});

export const SEED_REPORT_CARDS: ReportCard[] = EXAM_STUDENTS.map(student => ({
  id: `report-term2-${student.id}`,
  studentId: student.id,
  termId: "term-2-2026",
  status: "draft",
  generatedAt: "2026-07-10T10:30:00.000Z",
  approvedById: null
}));

export const DEFAULT_EXAM_STATE: ExamModuleState = {
  marks: SEED_MARKS,
  reportCards: SEED_REPORT_CARDS
};

export function gradeFromScore(rawMark: number, maxMarks: number) {
  const normalized = maxMarks <= 0 ? 0 : (rawMark / maxMarks) * 100;
  if (normalized >= 80) {
    return "A";
  }
  if (normalized >= 70) {
    return "B";
  }
  if (normalized >= 60) {
    return "C";
  }
  if (normalized >= 50) {
    return "D";
  }
  return "E";
}

export function calculateStudentTermResults(termId: string, marks: StudentMark[]) {
  const termComponents = EXAM_COMPONENTS.filter(component => component.termId === termId);
  const weightsByComponent = new Map(termComponents.map(component => [component.id, component.weight]));
  const maxMarksByComponent = new Map(termComponents.map(component => [component.id, component.maxMarks]));
  const grouped = new Map<string, Map<string, StudentMark[]>>();

  for (const mark of marks) {
    if (!weightsByComponent.has(mark.componentId)) {
      continue;
    }
    const studentBucket = grouped.get(mark.studentId) ?? new Map<string, StudentMark[]>();
    const subjectBucket = studentBucket.get(mark.subjectId) ?? [];
    subjectBucket.push(mark);
    studentBucket.set(mark.subjectId, subjectBucket);
    grouped.set(mark.studentId, studentBucket);
  }

  const results: StudentTermResult[] = [];
  for (const [studentId, subjectMarks] of grouped) {
    const subjects = [...subjectMarks.entries()].map(([subjectId, entries]) => {
      const weightedScore = entries.reduce((sum, mark) => {
        const weight = weightsByComponent.get(mark.componentId) ?? 0;
        const maxMarks = maxMarksByComponent.get(mark.componentId) ?? 1;
        return sum + (mark.rawMark / maxMarks) * weight;
      }, 0);

      const totalWeight = entries.reduce((sum, mark) => sum + (weightsByComponent.get(mark.componentId) ?? 0), 0);
      const percentage = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
      return {
        subjectId,
        percentage,
        grade: gradeFromScore(percentage, 100)
      };
    });

    const average = subjects.length > 0 ? subjects.reduce((sum, subject) => sum + subject.percentage, 0) / subjects.length : 0;
    results.push({
      studentId,
      average,
      subjects
    });
  }

  return results;
}
