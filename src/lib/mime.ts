// A small MIME reader for the alerts Worker's email handler. It reads what the
// logging address needs (headers, plain text, an attached original message, and
// a calendar invite) and nothing else.

export type ParsedMessage = {
  headers: Map<string, string>;
  text: string;
  // Raw iCalendar text from a text/calendar part or an .ics attachment.
  calendar: string | null;
  // The original message when this one is a forward-as-attachment.
  attached: ParsedMessage | null;
};

export function header(msg: ParsedMessage, name: string) {
  return msg.headers.get(name.toLowerCase()) ?? "";
}

export function addresses(value: string): string[] {
  const found = value.match(/[^\s<>,;"'()]+@[^\s<>,;"'()]+/g) ?? [];
  return [
    ...new Set(found.map((a) => a.replace(/^mailto:/i, "").toLowerCase())),
  ];
}

// Message-IDs from In-Reply-To / References, without the angle brackets.
export function messageIds(value: string): string[] {
  return (value.match(/<[^<>\s]+>/g) ?? []).map((id) => id.slice(1, -1));
}

function splitHeadBody(raw: string): [string, string] {
  const match = /\r?\n\r?\n/.exec(raw);
  if (!match) return [raw, ""];
  return [raw.slice(0, match.index), raw.slice(match.index + match[0].length)];
}

function parseHeaders(head: string) {
  const headers = new Map<string, string>();
  const unfolded = head.replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx < 1) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    if (!headers.has(name)) headers.set(name, line.slice(idx + 1).trim());
  }
  return headers;
}

function param(value: string, name: string) {
  const match = new RegExp(
    `${name}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`,
    "i",
  ).exec(value);
  return match ? (match[1] ?? match[2]) : null;
}

function decodeBody(body: string, encoding: string) {
  const enc = encoding.toLowerCase();
  const bytes: number[] = [];
  if (enc === "base64") {
    const binary = atob(body.replace(/[^A-Za-z0-9+/=]/g, ""));
    for (let i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i));
  } else if (enc === "quoted-printable") {
    const joined = body.replace(/=\r?\n/g, "");
    for (let i = 0; i < joined.length; i++) {
      const hex = joined.slice(i + 1, i + 3);
      if (joined[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
      } else {
        bytes.push(...new TextEncoder().encode(joined[i]));
      }
    }
  } else {
    return body;
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export function parseMessage(raw: string, depth = 0): ParsedMessage {
  const [head, body] = splitHeadBody(raw);
  const msg: ParsedMessage = {
    headers: parseHeaders(head),
    text: "",
    calendar: null,
    attached: null,
  };
  readPart(msg, msg.headers, body, depth);
  return msg;
}

function readPart(
  msg: ParsedMessage,
  headers: Map<string, string>,
  body: string,
  depth: number,
) {
  const type = headers.get("content-type") ?? "text/plain";
  const lower = type.toLowerCase();
  const boundary = param(type, "boundary");

  if (lower.startsWith("multipart/") && boundary && depth < 5) {
    const marker = `--${boundary}`;
    for (const chunk of body.split(marker).slice(1)) {
      if (chunk.startsWith("--")) break;
      const [partHead, partBody] = splitHeadBody(chunk.replace(/^\r?\n/, ""));
      readPart(msg, parseHeaders(partHead), partBody, depth + 1);
    }
    return;
  }

  const decoded = decodeBody(
    body,
    headers.get("content-transfer-encoding") ?? "",
  );
  const filename = `${param(headers.get("content-disposition") ?? "", "filename") ?? ""}${param(type, "name") ?? ""}`;
  if (lower.startsWith("message/rfc822") && depth < 5) {
    msg.attached ??= parseMessage(decoded, depth + 1);
  } else if (
    lower.startsWith("text/calendar") ||
    filename.toLowerCase().endsWith(".ics")
  ) {
    msg.calendar ??= decoded;
  } else if (lower.startsWith("text/plain") && !msg.text) {
    msg.text = decoded.trim();
  }
}

export type CalendarInvite = {
  uid: string | null;
  summary: string | null;
  start: string;
  end: string | null;
  attendees: string[];
  cancelled: boolean;
};

// "20260930T150000Z" or "20260930" to "2026-09-30 15:00:00" (UTC). Times with a
// TZID or no zone are read as UTC.
function icsDate(value: string) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/.exec(value);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4] ?? "00"}:${m[5] ?? "00"}:${m[6] ?? "00"}`;
}

export function parseInvite(ics: string): CalendarInvite | null {
  const lines = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const event = new Map<string, string>();
  const attendees: string[] = [];
  let method = "";
  let inEvent = false;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") inEvent = true;
    else if (line === "END:VEVENT") break;
    const idx = line.indexOf(":");
    if (idx < 1) continue;
    const name = line.slice(0, idx).split(";")[0].toUpperCase();
    const value = line.slice(idx + 1).trim();
    if (name === "METHOD") method = value.toUpperCase();
    if (!inEvent) continue;
    if (name === "ATTENDEE" || name === "ORGANIZER") {
      attendees.push(...addresses(value));
    } else if (!event.has(name)) {
      event.set(name, value);
    }
  }
  const start = icsDate(event.get("DTSTART") ?? "");
  if (!start) return null;
  const unescape = (v: string | undefined) =>
    v ? v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1") : null;
  return {
    uid: event.get("UID") ?? null,
    summary: unescape(event.get("SUMMARY")),
    start,
    end: icsDate(event.get("DTEND") ?? ""),
    attendees: [...new Set(attendees)],
    cancelled: method === "CANCEL" || event.get("STATUS") === "CANCELLED",
  };
}
