"use client";

import { DEFAULT_EXAM_STATE } from "@/lib/exams/mock-data";
import type { ExamModuleState } from "@/lib/exams/types";

const EXAMS_STORAGE_KEY = "cis-kenya-exams-module-v1";

function cloneState(state: ExamModuleState): ExamModuleState {
  return {
    marks: state.marks.map(mark => ({ ...mark })),
    reportCards: state.reportCards.map(reportCard => ({ ...reportCard }))
  };
}

export function createExamRepository() {
  return {
    async load() {
      if (typeof window === "undefined") {
        return cloneState(DEFAULT_EXAM_STATE);
      }

      const raw = window.localStorage.getItem(EXAMS_STORAGE_KEY);
      if (!raw) {
        return cloneState(DEFAULT_EXAM_STATE);
      }

      try {
        const parsed = JSON.parse(raw) as ExamModuleState;
        return cloneState(parsed);
      } catch (error) {
        console.warn("Failed to parse exams module state; falling back to defaults.", error);
        return cloneState(DEFAULT_EXAM_STATE);
      }
    },
    async save(state: ExamModuleState) {
      if (typeof window === "undefined") {
        return;
      }
      window.localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(state));
    }
  };
}
