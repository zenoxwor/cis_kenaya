import { NextRequest, NextResponse } from "next/server";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { canPerformAction } from "@/lib/rbac/permissions";
import {
  evaluateFinanceAutomation,
  getFinanceAutomationRules,
  getFinanceAutomationSummary,
  listFinanceAutomationOutcomes,
  updateFinanceAutomationRules,
  type FinanceAutomationRules
} from "@/lib/finance/automation";

function getSessionUser(req: NextRequest) {
  const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  return parseSessionPayload(rawSession)?.user ?? null;
}

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(user.role, "finance_automation", "view")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  evaluateFinanceAutomation({ id: user.id, role: user.role });

  return NextResponse.json({
    success: true,
    rules: getFinanceAutomationRules(),
    summary: getFinanceAutomationSummary(),
    outcomes: listFinanceAutomationOutcomes(50)
  });
}

export async function PATCH(req: NextRequest) {
  const user = getSessionUser(req);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(user.role, "finance_automation", "edit")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Partial<FinanceAutomationRules>;
  const rules = updateFinanceAutomationRules(body);
  const run = evaluateFinanceAutomation(
    { id: user.id, role: user.role },
    { force: true }
  );

  return NextResponse.json({
    success: true,
    rules,
    summary: getFinanceAutomationSummary(),
    outcomes: run.outcomes
  });
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(user.role, "finance_automation", "view")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const run = evaluateFinanceAutomation(
    { id: user.id, role: user.role },
    { force: true }
  );

  return NextResponse.json({
    success: true,
    rules: getFinanceAutomationRules(),
    summary: getFinanceAutomationSummary(),
    outcomes: run.outcomes
  });
}
