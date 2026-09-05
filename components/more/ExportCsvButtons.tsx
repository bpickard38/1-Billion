"use client";

import { useTransition } from "react";
import { exportContactsCsv, exportInterviewsCsv, exportProblemsCsv } from "@/app/(app)/crm/actions";

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const EXPORTS = [
  { label: "Export contacts CSV", filename: "contacts.csv", run: exportContactsCsv },
  { label: "Export interviews CSV", filename: "interviews.csv", run: exportInterviewsCsv },
  { label: "Export problems CSV", filename: "problems.csv", run: exportProblemsCsv },
] as const;

export default function ExportCsvButtons() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      {EXPORTS.map(({ label, filename, run }) => (
        <button
          key={filename}
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const csv = await run();
              download(filename, csv);
            })
          }
          className="rounded-lg border border-border px-3 py-2 text-left text-sm disabled:opacity-50"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
