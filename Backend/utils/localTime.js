const { appTimezone } = require('../config/env');

const DAYS = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];

const clockFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: appTimezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: appTimezone, year: 'numeric', month: '2-digit', day: '2-digit' });

// The weekday (0 = Sunday) and minutes since midnight of a moment, in the app's time zone.
module.exports.localClock = (date) => {
    const parts = Object.fromEntries(clockFormat.formatToParts(date).map(part => [ part.type, part.value ]));
    return { day: DAYS.indexOf(parts.weekday), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

// The calendar day of a moment in the app's time zone, as YYYY-MM-DD.
module.exports.localDay = (date) => dayFormat.format(date);

// 'HH:mm' as minutes since midnight.
module.exports.toMinutes = (time) => {
    const [ hours, minutes ] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
