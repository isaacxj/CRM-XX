import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { archiveCompany, getCompany } from "@/server/db/companies";
import { deleteContact, listContactsForCompany } from "@/server/db/contacts";
import { createNote, deleteNote, listNotesForCompany } from "@/server/db/notes";
import {
  completeTask,
  createTask,
  deleteTask,
  listTasksForCompany,
  reopenTask,
} from "@/server/db/tasks";
import type { Business, CompanyStatus } from "@/server/db/schema";

function formatDueDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const STATUS_LABEL: Record<CompanyStatus, string> = {
  prospect: "Prospect",
  client: "Client",
  past: "Past client",
};

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  const company = Number.isInteger(companyId)
    ? await getCompany(companyId)
    : null;

  if (!company) {
    notFound();
  }

  const contacts = await listContactsForCompany(companyId);
  const notes = await listNotesForCompany(companyId);
  const tasks = await listTasksForCompany(companyId);

  async function archive() {
    "use server";
    await archiveCompany(companyId);
    redirect("/companies");
  }

  async function removeContact(formData: FormData) {
    "use server";
    const contactId = Number(formData.get("contactId"));
    await deleteContact(contactId);
    redirect(`/companies/${companyId}`);
  }

  async function addNote(formData: FormData) {
    "use server";
    const body = formData.get("body");
    if (typeof body !== "string" || body.trim().length === 0) {
      throw new Error("Note can't be empty.");
    }
    await createNote(companyId, body.trim());
    redirect(`/companies/${companyId}`);
  }

  async function removeNote(formData: FormData) {
    "use server";
    const noteId = Number(formData.get("noteId"));
    await deleteNote(noteId);
    redirect(`/companies/${companyId}`);
  }

  async function addTask(formData: FormData) {
    "use server";
    const title = formData.get("title");
    const dueDate = formData.get("dueDate");
    if (typeof title !== "string" || title.trim().length === 0) {
      throw new Error("Follow-up needs a title.");
    }
    await createTask(companyId, {
      title: title.trim(),
      dueDate:
        typeof dueDate === "string" && dueDate.trim() ? dueDate.trim() : null,
    });
    redirect(`/companies/${companyId}`);
  }

  async function toggleTask(formData: FormData) {
    "use server";
    const taskId = Number(formData.get("taskId"));
    const wasDone = formData.get("done") === "1";
    if (wasDone) {
      await reopenTask(taskId);
    } else {
      await completeTask(taskId);
    }
    redirect(`/companies/${companyId}`);
  }

  async function removeTask(formData: FormData) {
    "use server";
    const taskId = Number(formData.get("taskId"));
    await deleteTask(taskId);
    redirect(`/companies/${companyId}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
          <p className="text-sm text-zinc-500">
            {BUSINESS_LABEL[company.business]} · {STATUS_LABEL[company.status]}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${company.id}/edit`}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Edit
          </Link>
          <form action={archive}>
            <button
              type="submit"
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-red-600 dark:border-zinc-700"
            >
              Archive
            </button>
          </form>
        </div>
      </div>

      <dl className="grid max-w-md grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-zinc-500">Website</dt>
          <dd>{company.website ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Source</dt>
          <dd>{company.source ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Added</dt>
          <dd>{new Date(company.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <Link
            href={`/companies/${company.id}/contacts/new`}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            Add contact
          </Link>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No contacts yet. Add the people you work with at this company.
          </p>
        ) : (
          <table className="w-full max-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Title</th>
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Phone</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="py-2 font-medium">{contact.name}</td>
                  <td className="py-2 text-zinc-500">{contact.title ?? "—"}</td>
                  <td className="py-2 text-zinc-500">{contact.email ?? "—"}</td>
                  <td className="py-2 text-zinc-500">{contact.phone ?? "—"}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/companies/${company.id}/contacts/${contact.id}/edit`}
                        className="text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        Edit
                      </Link>
                      <form action={removeContact}>
                        <input
                          type="hidden"
                          name="contactId"
                          value={contact.id}
                        />
                        <button
                          type="submit"
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Follow-ups</h2>
        <form
          action={addTask}
          className="flex max-w-2xl flex-wrap items-end gap-3"
        >
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label htmlFor="title" className="text-sm font-medium">
              What&apos;s next
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Send proposal"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dueDate" className="text-sm font-medium">
              Due
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add follow-up
          </button>
        </form>

        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No follow-ups yet. Add one so nothing slips.
          </p>
        ) : (
          <ul className="flex max-w-2xl flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-4 border-b border-zinc-100 py-2 text-sm dark:border-zinc-900"
              >
                <div
                  className={task.doneAt ? "text-zinc-400 line-through" : ""}
                >
                  <span className="font-medium">{task.title}</span>
                  {task.dueDate && (
                    <span className="ml-2 text-zinc-500">
                      {formatDueDate(task.dueDate)}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-3">
                  <form action={toggleTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input
                      type="hidden"
                      name="done"
                      value={task.doneAt ? "1" : "0"}
                    />
                    <button
                      type="submit"
                      className="text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                      {task.doneAt ? "Reopen" : "Mark done"}
                    </button>
                  </form>
                  <form action={removeTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button
                      type="submit"
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Notes</h2>
        <form action={addNote} className="flex max-w-2xl flex-col gap-2">
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Log what happened…"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add note
          </button>
        </form>

        {notes.length === 0 ? (
          <p className="text-sm text-zinc-500">No notes yet.</p>
        ) : (
          <ul className="flex max-w-2xl flex-col gap-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded border border-zinc-100 p-3 text-sm dark:border-zinc-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="whitespace-pre-wrap">{note.body}</p>
                  <form action={removeNote}>
                    <input type="hidden" name="noteId" value={note.id} />
                    <button
                      type="submit"
                      className="shrink-0 text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/companies" className="text-sm text-zinc-500 hover:underline">
        ← Back to companies
      </Link>
    </div>
  );
}
