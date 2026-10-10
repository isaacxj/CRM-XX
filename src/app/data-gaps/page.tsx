import Link from "next/link";
import { redirect } from "next/navigation";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge, StatusBadge } from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  companyDetailsInput,
  contactEmailInput,
  firstProblem,
  formObject,
  withProblem,
} from "@/lib/action-input";
import {
  DATA_GAPS_CAP,
  fillCompanyDetails,
  fillContactEmail,
  getDataGapCounts,
  listCompaniesMissingDetails,
  listCompaniesWithoutContacts,
  listContactsMissingEmail,
} from "@/server/db/dataGaps";
import { BUSINESSES, type Business } from "@/server/db/schema";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;

const VIEWS = ["details", "contacts", "email"] as const;
type View = (typeof VIEWS)[number];

const VIEW_LABEL: Record<View, string> = {
  details: "Company details",
  contacts: "No contacts",
  email: "Contact emails",
};

function href(view: View, business?: Business) {
  const query = new URLSearchParams();
  if (view !== "details") query.set("view", view);
  if (business) query.set("business", business);
  return query.size ? `/data-gaps?${query}` : "/data-gaps";
}

export default async function DataGapsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = VIEWS.find((v) => v === params.view) ?? "details";
  const business = BUSINESSES.find((value) => value === params.business);
  const saved = typeof params.saved === "string" ? params.saved : "";
  const here = href(view, business);

  async function saveDetails(formData: FormData) {
    "use server";
    const parsed = companyDetailsInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    const { companyId, website, source } = parsed.data;
    await fillCompanyDetails(companyId, { website, source });
    redirect(`${here}${here.includes("?") ? "&" : "?"}saved=details`);
  }

  async function saveEmail(formData: FormData) {
    "use server";
    const parsed = contactEmailInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    await fillContactEmail(parsed.data.contactId, parsed.data.email);
    redirect(`${here}${here.includes("?") ? "&" : "?"}saved=email`);
  }

  const counts = await getDataGapCounts(business);
  const total = counts[view === "contacts" ? "contacts" : view];

  const pill = (active: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm transition-colors ${
      active
        ? "bg-surface-hover text-foreground font-medium"
        : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
    }`;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Data gaps"
        description="Records with details missing. Fill them in here, row by row, or open the record to do more."
      />

      {saved ? (
        <p role="status" className="text-success text-sm">
          {saved === "email" ? "Email saved." : "Details saved."}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Data gap views" className="flex flex-wrap gap-1">
          {VIEWS.map((v) => (
            <Link
              key={v}
              href={href(v, business)}
              aria-current={v === view ? "page" : undefined}
              className={pill(v === view)}
            >
              {VIEW_LABEL[v]}
              <span className="num text-muted-foreground text-xs">
                {counts[v]}
              </span>
            </Link>
          ))}
        </nav>
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Business filter"
        >
          {[undefined, ...BUSINESSES].map((b) => (
            <Link
              key={b ?? "all"}
              href={href(view, b)}
              aria-current={b === business ? "true" : undefined}
              className={pill(b === business)}
            >
              {b ? BUSINESS_LABEL[b] : "All"}
            </Link>
          ))}
        </div>
      </div>

      {view === "details" ? (
        <DetailsTable business={business} save={saveDetails} />
      ) : view === "contacts" ? (
        <NoContactsTable business={business} />
      ) : (
        <EmailTable business={business} save={saveEmail} />
      )}

      {total > DATA_GAPS_CAP ? (
        <p className="text-muted-foreground text-sm">
          Showing the first {DATA_GAPS_CAP} of {total}. Fill some in and the
          rest move up, or filter by business.
        </p>
      ) : null}
    </div>
  );
}

function Done({ what }: { what: string }) {
  return (
    <EmptyState
      title={`Nothing missing: ${what}.`}
      action={
        <Link
          href="/companies"
          className="text-accent text-sm font-medium hover:underline"
        >
          Go to companies
        </Link>
      }
    />
  );
}

async function DetailsTable({
  business,
  save,
}: {
  business?: Business;
  save: (formData: FormData) => Promise<void>;
}) {
  const rows = await listCompaniesMissingDetails(business);
  if (rows.length === 0)
    return <Done what="every company has a website and a source" />;
  return (
    <DataTable>
      <thead>
        <tr>
          <Th>Company</Th>
          <Th>Status</Th>
          <Th>Website</Th>
          <Th>Source</Th>
          <Th>
            <span className="sr-only">Save</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const formId = `details-${row.id}`;
          const needsWebsite = !row.website?.trim();
          const needsSource = !row.source?.trim();
          return (
            <Tr key={row.id}>
              <Td className="font-medium">
                <Link href={`/companies/${row.id}`} className="hover:underline">
                  {row.name}
                </Link>{" "}
                <BusinessBadge business={row.business} />
              </Td>
              <Td>
                <StatusBadge status={row.status} />
              </Td>
              <Td>
                {needsWebsite ? (
                  <Input
                    form={formId}
                    name="website"
                    aria-label={`Website for ${row.name}`}
                    placeholder="example.com"
                    className="w-56"
                  />
                ) : (
                  <span className="text-muted-foreground">{row.website}</span>
                )}
              </Td>
              <Td>
                {needsSource ? (
                  <Input
                    form={formId}
                    name="source"
                    aria-label={`Source for ${row.name}`}
                    placeholder="Referral, event, site"
                    className="w-48"
                  />
                ) : (
                  <span className="text-muted-foreground">{row.source}</span>
                )}
              </Td>
              <Td>
                <form id={formId} action={save}>
                  <input type="hidden" name="companyId" value={row.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    Save
                  </Button>
                </form>
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

async function NoContactsTable({ business }: { business?: Business }) {
  const rows = await listCompaniesWithoutContacts(business);
  if (rows.length === 0)
    return <Done what="every prospect and client has a contact" />;
  return (
    <DataTable>
      <thead>
        <tr>
          <Th>Company</Th>
          <Th>Status</Th>
          <Th>Add a contact</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.id}>
            <Td className="font-medium">
              <Link href={`/companies/${row.id}`} className="hover:underline">
                {row.name}
              </Link>{" "}
              <BusinessBadge business={row.business} />
            </Td>
            <Td>
              <StatusBadge status={row.status} />
            </Td>
            <Td>
              <Link
                href={`/companies/${row.id}`}
                className="text-accent text-sm font-medium hover:underline"
              >
                Open company to add a contact
              </Link>
            </Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}

async function EmailTable({
  business,
  save,
}: {
  business?: Business;
  save: (formData: FormData) => Promise<void>;
}) {
  const rows = await listContactsMissingEmail(business);
  if (rows.length === 0) return <Done what="every contact has an email" />;
  return (
    <DataTable>
      <thead>
        <tr>
          <Th>Contact</Th>
          <Th>Company</Th>
          <Th>Phone</Th>
          <Th>Email</Th>
          <Th>
            <span className="sr-only">Save</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const formId = `email-${row.id}`;
          return (
            <Tr key={row.id}>
              <Td className="font-medium">
                <Link href={`/contacts/${row.id}`} className="hover:underline">
                  {row.name}
                </Link>
                {row.title ? (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {row.title}
                  </span>
                ) : null}
              </Td>
              <Td>
                <Link
                  href={`/companies/${row.companyId}`}
                  className="hover:underline"
                >
                  {row.companyName}
                </Link>{" "}
                <BusinessBadge business={row.business} />
              </Td>
              <Td className="num">{row.phone ?? ""}</Td>
              <Td>
                <Input
                  form={formId}
                  name="email"
                  type="email"
                  required
                  aria-label={`Email for ${row.name}`}
                  placeholder="name@company.com"
                  className="w-64"
                />
              </Td>
              <Td>
                <form id={formId} action={save}>
                  <input type="hidden" name="contactId" value={row.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    Save
                  </Button>
                </form>
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}
