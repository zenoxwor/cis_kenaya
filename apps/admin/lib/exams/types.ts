export type TermStatus = "upcoming" | "active" | "closed";
export type StudentMarkStatus = "draft" | "submitted" | "verified";
export type ReportCardStatus = "draft" | "approved" | "published";

export type ExamTerm = {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  status: TermStatus;
};

export type ExamComponent = {
  id: string;
  termId: string;
  name: string;
  weight: number;
  maxMarks: number;
};

export type Subject = {
  id: string;
  name: string;
  classId: string;
};

export type ClassRoom = {
  id: string;
  name: string;
};

export type Student = {
  id: string;
  admissionNo: string;
  fullName: string;
  classId: string;
};

export type StudentMark = {
  id: string;
  studentId: string;
  subjectId: string;
  componentId: string;
  rawMark: number;
  grade: string;
  enteredById: string;
  verifiedById: string | null;
  status: StudentMarkStatus;
};

export type ReportCard = {
  id: string;
  studentId: string;
  termId: string;
  status: ReportCardStatus;
  generatedAt: string;
  approvedById: string | null;
};

export type ExamModuleState = {
  marks: StudentMark[];
  reportCards: ReportCard[];
};

export type StudentTermResult = {
  studentId: string;
  average: number;
  subjects: Array<{
    subjectId: string;
    percentage: number;
    grade: string;
  }>;
};
