import { redirect } from "next/navigation";
import { BackupRecoveryPanel } from "@/components/operations/backup-recovery-panel";
import { requireCurrentUser } from "@/lib/auth/session";
import { getBackupRecoverySnapshot } from "@/lib/backup-recovery/operations";
import { canPerformAction } from "@/lib/rbac/permissions";

export default async function AdminOperationsPage() {
  const user = await requireCurrentUser("/admin/operations");

  if (!canPerformAction(user.role, "backup_recovery", "view")) {
    redirect("/admin/unauthorized");
  }

  const snapshot = getBackupRecoverySnapshot();

  return (
    <BackupRecoveryPanel
      canManageBackups={canPerformAction(user.role, "backup_recovery", "create")}
      canRunRestore={canPerformAction(user.role, "backup_recovery", "override")}
      initialSnapshot={snapshot}
      viewerRole={user.role}
    />
  );
}
