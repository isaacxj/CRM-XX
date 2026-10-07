"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormErrorsContext, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form-state";
import type { ImportPreview } from "@/server/db/import";
import { PageHeader } from "@/components/kit/page-header";
import { parseCsv } from "@/lib/csv";
import {
  IMPORT_FIELDS,
  type ImportField,
  type ImportMapping,
} from "@/lib/import";
import { BUSINESSES, type Business } from "@/server/db/schema";
import { previewImportAction, runImport } from "./actions";

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
  const [formState, setFormState] = useState<FormState>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fileRef.current?.focus();
  }, []);

  // Ask the server what this mapping would do (new, blank, already there).
  useEffect(() => {
    if (!columnFields.includes("companyName")) return;
    let stale = false;
    void previewImportAction({
      business,
      rows,
      mapping: buildMapping(columnFields),
    }).then((result) => {
      if (!stale) setPreview(result);
    });
    return () => {
      stale = true;
    };
  }, [business, rows, columnFields]);

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
    setFormState(null);
    const mapping = buildMapping(columnFields);
    startTransition(async () => {
      const result = await runImport({ business, rows, mapping });
      if (result) setFormState(result);
    });
  }

  return (
    <div
      className="flex flex-1 flex-col gap-6 p-8 max-md:p-4"
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          (e.metaKey || e.ctrlKey) &&
          hasCompanyName &&
          !isPending &&
          rows.length > 0
        ) {
          e.preventDefault();
          handleImport();
        }
      }}
    >
      <PageHeader
        title="Import companies"
        description="Upload a CSV export from a spreadsheet, match its columns to fields below, then preview and import. Companies that already exist for the selected business (matched by name) are skipped."
      />

      <FormErrorsContext.Provider value={formState?.errors ?? {}}>
        <div className="flex max-w-xs flex-col gap-4">
          <Field label="Business" name="business">
            {(p) => (
              <Select
                {...p}
                value={business}
                onChange={(e) => setBusiness(e.target.value as Business)}
              >
                {BUSINESSES.map((value) => (
                  <option key={value} value={value}>
                    {BUSINESS_LABEL[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="CSV file"
            name="rows"
            hint="A spreadsheet export with a header row."
          >
            {(p) => (
              <input
                {...p}
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="file:border-border-strong file:bg-surface-raised file:hover:bg-surface-hover text-sm file:mr-3 file:min-h-8 file:rounded-md file:border file:px-3 file:text-sm max-md:file:min-h-(--tap-target)"
              />
            )}
          </Field>
        </div>
        {formState?.message && (
          <p role="alert" className="text-danger text-sm">
            {formState.message}{" "}
            {formState.errors.mapping ?? formState.errors.business}
          </p>
        )}
      </FormErrorsContext.Provider>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
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
                  <label
                    htmlFor={`column-${index}`}
                    className="text-muted-foreground text-xs"
                  >
                    {header || `Column ${index + 1}`}
                  </label>
                  <Select
                    id={`column-${index}`}
                    value={columnFields[index] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value as ImportField | "";
                      setColumnFields((prev) => {
                        const next = [...prev];
                        next[index] = value;
                        return next;
                      });
                    }}
                  >
                    <option value="">Don&apos;t import</option>
                    {IMPORT_FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {FIELD_LABELS[field]}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            {!hasCompanyName && (
              <p role="alert" className="text-danger text-sm">
                Match at least one column to Company name before importing.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">
              Preview ({rows.length} row{rows.length === 1 ? "" : "s"})
            </h2>
            {preview && hasCompanyName && (
              <p className="text-sm" aria-live="polite">
                <span className="num font-medium">{preview.willImport}</span>{" "}
                new {preview.willImport === 1 ? "company" : "companies"} will be
                added.{" "}
                <span className="text-muted-foreground">
                  {preview.duplicates} already exist or repeat in the file and{" "}
                  {preview.blankName} have no company name, so they&apos;ll be
                  skipped.
                </span>
              </p>
            )}
            <div className="max-w-3xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b">
                    {IMPORT_FIELDS.map((field) => (
                      <th key={field} className="py-2 pr-4 font-medium">
                        {FIELD_LABELS[field]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-border border-b">
                      {IMPORT_FIELDS.map((field) => {
                        const columnIndex = columnFields.indexOf(field);
                        const value =
                          columnIndex === -1 ? "" : (row[columnIndex] ?? "");
                        return (
                          <td
                            key={field}
                            className="text-muted-foreground py-2 pr-4"
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
          </div>

          <Button
            type="button"
            disabled={!hasCompanyName || isPending}
            onClick={handleImport}
            className="self-start"
          >
            {isPending
              ? "Importing…"
              : preview && hasCompanyName
                ? `Import ${preview.willImport} ${preview.willImport === 1 ? "company" : "companies"}`
                : `Import ${rows.length} row${rows.length === 1 ? "" : "s"}`}
          </Button>
          <p className="text-muted-foreground -mt-4 hidden text-xs md:block">
            ⌘Enter to import
          </p>
        </>
      )}
    </div>
  );
}
