const fs = require("fs");

function timeToSeconds(timeStr) {
    let parts = timeStr.trim().split(':');
    let h = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    let s = parseInt(parts[2]);
    return h*3600 + m*60 + s;
}

function secondsToTime(seconds) {
    let h = Math.floor(seconds / 3600);
    seconds %= 3600;
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function time12ToSeconds(timeStr) {
    let [time, period] = timeStr.trim().split(' ');
    let [h, m, s] = time.split(':').map(Number);
    if (period.toLowerCase() === 'pm' && h !== 12) h += 12;
    if (period.toLowerCase() === 'am' && h === 12) h = 0;
    return h*3600 + m*60 + s;
}

