"use client";

import { useEffect, useMemo, useState } from "react";
import { getAvailableWorkflowActions, applyWorkflowAction } from "@/lib/workflow/engine";
import { createWorkflowRepository } from "@/lib/workflow/repository";
import type { WorkflowActionId, WorkflowApplicationRecord } from "@/lib/workflow/types";
import type { AppRole } from "@/lib/rbac/roles";
import { getErrorMessage } from "@/lib/observability/app-error";

type RoleWorkflowBoardProps = {
  role: AppRole;
  heading: string;
  subtitle: string;
};

export function RoleWorkflowBoard({ role, heading, subtitle }: RoleWorkflowBoardProps) {
  const repository = useMemo(() => createWorkflowRepository(), []);
  const [records, setRecords] = useState<WorkflowApplicationRecord[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    repository
      .list()
      .then(data => {
        if (active) {
          setRecords(data);
        }
      })
      .catch(error => {
        if (active) {
          setNotice(getErrorMessage(error, "Failed to load workflow records."));
        }
      });

    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (records.length === 0) {
      return;
    }

    repository.save(records).catch(error => {
      setNotice(getErrorMessage(error, "Failed to persist workflow records."));
    });
  }, [records, repository]);

  async function logWorkflowEvent(record: WorkflowApplicationRecord, actionId: WorkflowActionId, status: "success" | "failure") {
    await fetch("/api/audit/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: `workflow.${actionId}`,
        entity: "Application",
        entityId: record.applicationNo,
        module: "admissions",
        status,
        metadata: {
          recordId: record.id,
          applicationStatus: record.applicationStatus,
          enrollmentStatus: record.enrollmentStatus
        }
      })
    });
  }

  function handleAction(recordId: string, actionId: WorkflowActionId) {
    setRecords(prev =>
      prev.map(record => {
        if (record.id !== recordId) {
          return record;
        }

        try {
          const updated = applyWorkflowAction(role, actionId, record);
          void logWorkflowEvent(updated, actionId, "success").catch(error => {
            setNotice(getErrorMessage(error, "Failed to publish workflow audit event."));
          });
          setNotice(`${record.applicationNo}: ${actionId.replaceAll("_", " ")} completed.`);
          return updated;
        } catch (error) {
          void logWorkflowEvent(record, actionId, "failure").catch(logError => {
            setNotice(getErrorMessage(logError, "Failed to publish workflow audit event."));
          });
          setNotice(error instanceof Error ? error.message : "Workflow action failed.");
          return record;
        }
      })
    );
  }

  const submittedCount = records.filter(record => record.applicationStatus === "SUBMITTED").length;
  const reviewCount = records.filter(record =>
    ["UNDER_REVIEW", "INTERVIEW_SCHEDULED", "DOCUMENTS_PENDING"].includes(record.applicationStatus)
  ).length;
  const approvedCount = records.filter(record => record.applicationStatus === "APPROVED").length;
  const enrolledCount = records.filter(record => record.enrollmentStatus === "ENROLLED").length;

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
        <p className="mt-2 text-slate-600">{subtitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Submitted" value={String(submittedCount)} />
        <MetricCard label="In review pipeline" value={String(reviewCount)} />
        <MetricCard label="Approved" value={String(approvedCount)} />
        <MetricCard label="Converted to enrolled" value={String(enrolledCount)} />
      </div>

      {notice && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {notice}
        </div>
      )}

      <article className="admin-content-card">
        <h2 className="text-lg font-semibold text-slate-900">Operational workflow board</h2>
        <p className="mt-1 text-sm text-slate-600">
          Application lifecycle with document verification, decisioning, enrollment conversion, and
          finance hooks.
        </p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Application</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Application status</th>
                <th className="px-3 py-2">Docs</th>
                <th className="px-3 py-2">Finance</th>
                <th className="px-3 py-2">Enrollment</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => {
                const actions = getAvailableWorkflowActions(role, record);
                const verifiedDocs = record.documents.filter(doc => doc.status === "VERIFIED").length;
                return (
                  <tr key={record.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{record.applicationNo}</p>
                      <p className="text-xs text-slate-500">Owner: {record.ownerName}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p>{record.studentName}</p>
                      <p className="text-xs text-slate-500">{record.appliedGrade}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p>{record.applicationStatus}</p>
                      <p className="text-xs text-slate-500">Student: {record.studentStatus}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p>
                        {verifiedDocs}/{record.documents.length} verified
                      </p>
                      <p className="text-xs text-slate-500">
                        {record.documents
                          .map(document => `${document.type}: ${document.status}`)
                          .slice(0, 2)
                          .join(" · ")}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p>{record.finance.invoiceNo ?? "No invoice"}</p>
                      <p className="text-xs text-slate-500">
                        {record.finance.invoiceStatus} / {record.finance.paymentStatus}
                      </p>
                    </td>
                    <td className="px-3 py-2">{record.enrollmentStatus}</td>
                    <td className="px-3 py-2">
                      {actions.length === 0 ? (
                        <span className="text-xs text-slate-500">No actions for this role/status.</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {actions.map(action => (
                            <button
                              key={action.id}
                              className="rounded border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-100"
                              onClick={() => handleAction(record.id, action.id)}
                              type="button"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="admin-content-card">
        <h2 className="text-lg font-semibold text-slate-900">Recent workflow events</h2>
        <div className="mt-3 space-y-2">
          {records
            .flatMap(record => record.events.map(event => ({ ...event, applicationNo: record.applicationNo })))
            .slice(0, 8)
            .map(event => (
              <div
                key={`${event.applicationNo}-${event.at}-${event.message}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-medium text-slate-900">
                  {event.applicationNo} • {event.actorRole}
                </p>
                <p className="text-xs text-slate-500">{event.at}</p>
                <p className="mt-1 text-sm text-slate-700">{event.message}</p>
              </div>
            ))}
        </div>
      </article>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="admin-content-card">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
