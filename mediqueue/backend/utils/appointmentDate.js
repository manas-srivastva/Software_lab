const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isValidDateString = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const getWeekdayName = (date) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });

const getAvailableAppointmentDate = (availableDays, startDate = new Date()) => {
  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(startDate);
    candidate.setDate(candidate.getDate() + offset);
    const date = getLocalDateString(candidate);
    if (isBookableDate(date, availableDays, getLocalDateString(startDate))) {
      return date;
    }
  }

  throw new Error('No appointment date is available in the next 14 days');
};

const isBookableDate = (date, availableDays, today = getLocalDateString()) =>
  isValidDateString(date) &&
  date >= today &&
  Array.isArray(availableDays) &&
  availableDays.includes(getWeekdayName(date));

module.exports = {
  getLocalDateString,
  isValidDateString,
  getWeekdayName,
  isBookableDate,
  getAvailableAppointmentDate,
};
