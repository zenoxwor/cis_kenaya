type WizardProgressProps = {
  labels: string[];
  shortLabels?: string[];
  currentStep: number;
};

export function WizardProgress({ labels, shortLabels, currentStep }: WizardProgressProps) {
  const progress = Math.round((currentStep / labels.length) * 100);

  return (
    <div className="admin-content-card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          Registration Progress
        </h2>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          {progress}%
        </span>
      </div>

      {/* Step indicators with connecting lines */}
      <div className="flex items-start overflow-x-auto pb-1" role="list" aria-label="Registration steps">
        {labels.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isDone = stepNumber < currentStep;
          const isLast = index === labels.length - 1;
          const displayLabel = shortLabels?.[index] ?? label.split(" ")[0].replace(",", "");

          return (
            <div key={label} className="flex min-w-0 flex-1 items-start" role="listitem">
              <div className="flex flex-col items-center">
                <div
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Step ${stepNumber}: ${label}${isActive ? " – current" : isDone ? " – completed" : ""}`}
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300",
                    isActive
                      ? "border-brand-500 bg-gradient-to-br from-brand-700 to-brand-300 text-white shadow-md shadow-brand-500/30"
                      : isDone
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-slate-100 text-slate-500"
                  ].join(" ")}
                >
                  {isDone ? (
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={[
                    "mt-1.5 max-w-[60px] text-center text-[11px] font-semibold leading-tight",
                    isActive ? "text-brand-700" : isDone ? "text-emerald-600" : "text-slate-400"
                  ].join(" ")}
                >
                  {displayLabel}
                </span>
              </div>

              {/* Connecting line between steps */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={[
                    "mx-1 mt-5 h-0.5 flex-1 transition-all duration-500",
                    isDone ? "bg-brand-400" : "bg-slate-200"
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Gradient progress bar */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-300 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
