// src/utils/dateTime.utils.js

export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const APP_LOCALE = "vi-VN";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isDateObject(value) {
  return value instanceof Date;
}

export function isCalendarDate(value) {
  return typeof value === "string" && DATE_ONLY_PATTERN.test(value.trim());
}

export function parseUtcDate(value) {
  if (value === undefined || value === null || value === "") return null;

  if (isDateObject(value)) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = String(value).trim();
  if (!text || isCalendarDate(text)) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCalendarDate(value, fallback = "—") {
  if (!value) return fallback;

  const text = String(value).trim();
  if (!isCalendarDate(text)) {
    return formatDate(value, fallback);
  }

  const [year, month, day] = text.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDate(value, fallback = "—") {
  if (isCalendarDate(value)) {
    return formatCalendarDate(value, fallback);
  }

  const date = parseUtcDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value, fallback = "—") {
  const date = parseUtcDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTimeWithSeconds(value, fallback = "—") {
  const date = parseUtcDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatTime(value, fallback = "") {
  const date = parseUtcDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getVietnamDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [
      part.type,
      part.value,
    ])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function calendarDayNumber(date) {
  const { year, month, day } = getVietnamDateParts(date);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function formatRelativeTime(value, options = {}) {
  const date = parseUtcDate(value);
  if (!date) return options.fallback || "No date";

  const now = options.now ? parseUtcDate(options.now) : new Date();
  if (!now) return options.fallback || "No date";

  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    return options.full ? formatDateTime(date) : "Just now";
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const calendarDiffDays = calendarDayNumber(now) - calendarDayNumber(date);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24 && calendarDiffDays === 0) return `${diffHours}h ago`;

  if (calendarDiffDays === 1) {
    return options.full ? `Yesterday ${formatTime(date)}` : "Yesterday";
  }

  if (calendarDiffDays > 1 && calendarDiffDays < 7) {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      weekday: "short",
    }).format(date);

    return options.full ? `${weekday} ${formatTime(date)}` : weekday;
  }

  return options.full ? formatDateTime(date) : formatDate(date);
}

export function toUtcISOString(value) {
  const date = parseUtcDate(value);

  if (!date) {
    throw new Error("A valid timestamp with Z or an explicit offset is required.");
  }

  return date.toISOString();
}

function vietnamLocalPartsToUtcDate({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
}) {
  // Việt Nam hiện dùng UTC+07:00 quanh năm và không có DST.
  return new Date(
    Date.UTC(year, month - 1, day, hour - 7, minute, second, millisecond)
  );
}

export function vietnamLocalDateTimeToUtcIso(value) {
  if (!value) return "";

  const match = String(value)
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
    );

  if (!match) {
    throw new Error("Invalid Vietnam local date-time value.");
  }

  const [, year, month, day, hour, minute, second = "0"] = match;

  return vietnamLocalPartsToUtcDate({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  }).toISOString();
}

export function vietnamDateStartToUtcIso(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return "";

  const [, year, month, day] = match;

  return vietnamLocalPartsToUtcDate({
    year: Number(year),
    month: Number(month),
    day: Number(day),
  }).toISOString();
}

export function vietnamDateEndToUtcIso(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return "";

  const [, year, month, day] = match;

  return vietnamLocalPartsToUtcDate({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
  }).toISOString();
}

export function isExpired(value, now = Date.now()) {
  const date = parseUtcDate(value);
  if (!date) return false;

  const nowMs = isDateObject(now)
    ? now.getTime()
    : typeof now === "number"
      ? now
      : parseUtcDate(now)?.getTime();

  if (!Number.isFinite(nowMs)) return false;

  return date.getTime() <= nowMs;
}

export function compareDateAsc(first, second) {
  const firstTime = parseUtcDate(first)?.getTime();
  const secondTime = parseUtcDate(second)?.getTime();

  if (!Number.isFinite(firstTime) && !Number.isFinite(secondTime)) return 0;
  if (!Number.isFinite(firstTime)) return 1;
  if (!Number.isFinite(secondTime)) return -1;

  return firstTime - secondTime;
}

export function compareDateDesc(first, second) {
  return compareDateAsc(second, first);
}
