"use client";

import { useState, useTransition } from "react";

import { parseCsv } from "@/lib/csv";
import {
  IMPORT_FIELDS,
  type ImportField,
  type ImportMapping,
} from "@/lib/import";
import { BUSINESSES, type Business } from "@/server/db/schema";
import { runImport } from "./actions";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const FIELD_LABELS: Record<ImportField, string> = {
  companyName: "Company name",
  companyWebsite: "Website",
  companyStatus: "Status",
  companySource: "Source",
  contactName: "Contact name",
  contactEmail: "Contact email",
  contactPhone: "Contact phone",
  contactTitle: "Contact title",
};

function guessField(header: string): ImportField | "" {
  const value = header.toLowerCase();
  if (value.includes("company")) return "companyName";
  if (value.includes("website") || value.includes("url"))
    return "companyWebsite";
  if (value.includes("status")) return "companyStatus";
  if (value.includes("source")) return "companySource";
  if (value.includes("contact") && value.includes("name")) return "contactName";
  if (value.includes("email")) return "contactEmail";
  if (value.includes("phone")) return "contactPhone";
  if (value.includes("title") || value.includes("role")) return "contactTitle";
  if (value === "name") return "companyName";
  return "";
}

function buildMapping(columnFields: (ImportField | "")[]): ImportMapping {
  const mapping = Object.fromEntries(
    IMPORT_FIELDS.map((field) => [field, null]),
  ) as ImportMapping;
  columnFields.forEach((field, index) => {
    if (field) mapping[field] = index;
  });
  return mapping;
}

export default function ImportCompaniesPage() {
  const [business, setBusiness] = useState<Business>(BUSINESSES[0]);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnFields, setColumnFields] = useState<(ImportField | "")[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError("");
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setError(
          "That file doesn't have a header row and at least one data row.",
        );
        return;
      }
      const [headerRow, ...dataRows] = parsed;
      setFileName(file.name);
      setHeaders(headerRow);
      setRows(dataRows);
      setColumnFields(headerRow.map(guessField));
    } catch {
      setError("Couldn't read that file. Make sure it's a CSV export.");
    }
  }

  const hasCompanyName = columnFields.includes("companyName");

  function handleImport() {
    setError("");
    const mapping = buildMapping(columnFields);
    startTransition(async () => {
      await runImport(business, rows, mapping);
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Import companies</h1>
      <p className="max-w-2xl text-sm text-zinc-500">
        Upload a CSV export from a spreadsheet, match its columns to fields
        below, then preview and import. Companies that already exist for the
        selected business (matched by name) are skipped.
      </p>

      <div className="flex max-w-xs flex-col gap-1">
        <label htmlFor="business" className="text-sm font-medium">
          Business
        </label>
        <select
          id="business"
          value={business}
          onChange={(e) => setBusiness(e.target.value as Business)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {BUSINESSES.map((value) => (
            <option key={value} value={value}>
              {BUSINESS_LABEL[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex max-w-xs flex-col gap-1">
        <label htmlFor="file" className="text-sm font-medium">
          CSV file
        </label>
        <input
          id="file"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="text-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {headers.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">
              Match columns from {fileName}
            </h2>
            <div className="flex flex-wrap gap-4">
              {headers.map((header, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500">{header}</label>
                  <select
                    value={columnFields[index] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value as ImportField | "";
                      setColumnFields((prev) => {
                        const next = [...prev];
                        next[index] = value;
                        return next;
                      });
                    }}
                    className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="">Don&apos;t import</option>
                    {IMPORT_FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {FIELD_LABELS[field]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {!hasCompanyName && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Match at least one column to Company name before importing.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">
              Preview ({rows.length} row{rows.length === 1 ? "" : "s"})
            </h2>
            <table className="w-full max-w-3xl text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  {IMPORT_FIELDS.map((field) => (
                    <th key={field} className="py-2 pr-4 font-medium">
                      {FIELD_LABELS[field]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    {IMPORT_FIELDS.map((field) => {
                      const columnIndex = columnFields.indexOf(field);
                      const value =
                        columnIndex === -1 ? "" : (row[columnIndex] ?? "");
                      return (
                        <td
                          key={field}
                          className="py-2 pr-4 text-zinc-600 dark:text-zinc-400"
                        >
                          {value || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled={!hasCompanyName || isPending}
            onClick={handleImport}
            className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isPending
              ? "Importing…"
              : `Import ${rows.length} row${rows.length === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    </div>
  );
}
