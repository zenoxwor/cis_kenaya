type WizardProgressProps = {
  labels: string[];
  currentStep: number;
};

export function WizardProgress({ labels, currentStep }: WizardProgressProps) {
  const progress = Math.round((currentStep / labels.length) * 100);

  return (
    <div className="admin-content-card">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Registration Progress</h2>
        <span className="text-sm font-semibold text-slate-600">{progress}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <ol className="mt-4 grid gap-2 md:grid-cols-3">
        {labels.map((label, index) => {
          const stepNumber = index + 1;
          const active = currentStep === stepNumber;
          const done = stepNumber < currentStep;
          return (
            <li
              key={label}
              className={[
                "rounded-lg border px-3 py-2 text-sm",
                active
                  ? "border-brand-500 bg-brand-50 text-brand-900"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600"
              ].join(" ")}
            >
              <span className="font-semibold">Step {stepNumber}</span>
              <p>{label}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
