type TopbarProps = {
  roleLabel: string;
  userName: string;
  onToggleSidebar: () => void;
  onToggleMobileMenu: () => void;
};

export function Topbar({
  roleLabel,
  userName,
  onToggleSidebar,
  onToggleMobileMenu
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
          onClick={onToggleMobileMenu}
        >
          ☰
        </button>
        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:inline-flex"
          onClick={onToggleSidebar}
        >
          ⇆
        </button>
        <div>
          <p className="text-sm font-semibold text-slate-900">Kenaya CIS Administration</p>
          <p className="text-xs text-slate-500">Role: {roleLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 sm:inline-flex"
        >
          Notifications
        </button>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <p className="text-sm font-medium text-slate-900">{userName}</p>
          <p className="text-xs text-slate-500">Profile controls placeholder</p>
        </div>
      </div>
    </header>
  );
}
