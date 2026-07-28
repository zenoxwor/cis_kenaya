export function getDisplayStudentCode(studentCode: string, graduationYear?: number | null): string {
  if (graduationYear) {
    return `${studentCode} (${graduationYear})`;
  }

  return studentCode;
}
