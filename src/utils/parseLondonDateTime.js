const TIME_ZONE = "Europe/London";

const getLondonParts = (date) => {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
};

const londonWallClockToUtcDate = ({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
}) => {
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));

  for (let i = 0; i < 4; i++) {
    const actual = getLondonParts(candidate);

    const desiredAsUTC = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualAsUTC = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );

    const diffMs = actualAsUTC - desiredAsUTC;
    if (diffMs === 0) return candidate;

    candidate = new Date(candidate.getTime() - diffMs);
  }

  return candidate;
};

const parseLondonDateTime = (value, { endOfDay = false } = {}) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }

  const raw = String(value).trim();

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);

    if (endOfDay) {
      return londonWallClockToUtcDate({
        year,
        month,
        day,
        hour: 23,
        minute: 59,
        second: 59,
        ms: 999,
      });
    }

    return londonWallClockToUtcDate({ year, month, day });
  }

  const localDateTime = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/
  );
  if (localDateTime && !raw.endsWith("Z") && !raw.match(/[+-]\d{2}:\d{2}$/)) {
    const year = Number(localDateTime[1]);
    const month = Number(localDateTime[2]);
    const day = Number(localDateTime[3]);
    const hour = Number(localDateTime[4]);
    const minute = Number(localDateTime[5]);
    const second = Number(localDateTime[6] || 0);
    const ms = Number((localDateTime[7] || "0").padEnd(3, "0"));
    return londonWallClockToUtcDate({ year, month, day, hour, minute, second, ms });
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

module.exports = parseLondonDateTime;

