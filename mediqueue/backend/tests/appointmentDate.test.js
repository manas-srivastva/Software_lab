const assert = require('assert');
const {
  getAvailableAppointmentDate,
  getLocalDateString,
  getWeekdayName,
  isBookableDate,
  isValidDateString,
} = require('../utils/appointmentDate');

assert.strictEqual(isValidDateString('2024-02-29'), true);
assert.strictEqual(isValidDateString('2025-02-29'), false);
assert.strictEqual(isValidDateString('2025-13-01'), false);
assert.strictEqual(isValidDateString('2025-2-01'), false);

const today = getLocalDateString();
const weekday = getWeekdayName(today);
assert.strictEqual(isBookableDate(today, [weekday]), true);
assert.strictEqual(isBookableDate(today, []), false);
assert.strictEqual(isBookableDate('2000-01-01', ['Saturday']), false);
assert.strictEqual(isBookableDate('2025-02-30', ['Sunday']), false);
assert.strictEqual(
  getAvailableAppointmentDate([weekday], new Date(`${today}T12:00:00`)),
  today
);

console.log('Appointment date validation tests passed.');
