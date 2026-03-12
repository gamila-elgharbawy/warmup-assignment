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
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
     let startSec = time12ToSeconds(startTime);
    let endSec = time12ToSeconds(endTime);
    let durationSec = endSec - startSec;
    if (durationSec < 0) durationSec += 24*3600; // handle overnight shifts
    return secondsToTime(durationSec);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let startSec = time12ToSeconds(startTime);
    let endSec = time12ToSeconds(endTime);
    let deliveryStart = 8*3600;
    let deliveryEnd = 22*3600;
    let idle = 0;
    if (startSec < deliveryStart) idle += Math.min(deliveryStart - startSec, endSec - startSec);
    if (endSec > deliveryEnd) idle += endSec - Math.max(deliveryEnd, startSec);
    return secondsToTime(idle);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    let shiftSec = timeToSeconds(shiftDuration);
    let idleSec = timeToSeconds(idleTime);
    let activeSec = shiftSec - idleSec;
    if (activeSec < 0) activeSec = 0;
    return secondsToTime(activeSec);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    let quota = 8*3600 + 24*60; // 8h24m
    let eidStart = new Date("2025-04-10");
    let eidEnd = new Date("2025-04-30");
    let d = new Date(date);
    if (d >= eidStart && d <= eidEnd) quota = 6*3600;
    let activeSec = timeToSeconds(activeTime);
    return activeSec >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
   let data = fs.readFileSync(textFile, 'utf8').trim().split('\n');
    let headers = ['driverID','driverName','date','startTime','endTime','shiftDuration','idleTime','activeTime','metQuota','hasBonus'];

    for (let line of data) {
        let cols = line.split(',');
        if (cols[0] === shiftObj.driverID && cols[2] === shiftObj.date) return {};
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quotaMet = metQuota(shiftObj.date, activeTime);
    let hasBonus = false;

    let newRecord = `${shiftObj.driverID},${shiftObj.driverName},${shiftObj.date},${shiftObj.startTime},${shiftObj.endTime},${shiftDuration},${idleTime},${activeTime},${quotaMet},${hasBonus}`;

    let inserted = false;
    for (let i = data.length-1; i>=0; i--) {
        if (data[i].startsWith(shiftObj.driverID+',')) {
            data.splice(i+1,0,newRecord);
            inserted = true;
            break;
        }
    }
    if (!inserted) data.push(newRecord);

    fs.writeFileSync(textFile,data.join('\n'));

    return {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quotaMet,
        hasBonus: hasBonus
    };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
   let data = fs.readFileSync(textFile,'utf8').trim().split('\n');
    for (let i=0;i<data.length;i++) {
        let cols = data[i].split(',');
        if (cols[0]===driverID && cols[2]===date) {
            cols[9] = newValue;
            data[i] = cols.join(',');
            break;
        }
    }
    fs.writeFileSync(textFile, data.join('\n'));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile,'utf8').trim().split('\n');
    let found = false, count = 0;
    month = parseInt(month);
    for (let line of data) {
        let cols = line.split(',');
        if (cols[0]===driverID) {
            found = true;
            let m = parseInt(cols[2].split('-')[1]);
            if (m===month && cols[9]==='true') count++;
        }
    }
    if (!found) return -1;
    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile,'utf8').trim().split('\n');
    let totalSec = 0;
    for (let line of data) {
        let cols = line.split(',');
        if (cols[0]===driverID && parseInt(cols[2].split('-')[1])===month) {
            totalSec += timeToSeconds(cols[7]);
        }
    }
    return secondsToTime(totalSec);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    let rates = fs.readFileSync(rateFile,'utf8').trim().split('\n');
    let dayOff = '';
    for (let line of rates) {
        let cols = line.split(',');
        if (cols[0]===driverID) { dayOff = cols[1]; break; }
    }
    let data = fs.readFileSync(textFile,'utf8').trim().split('\n');
    let totalSec = 0;
    for (let line of data) {
        let cols = line.split(',');
        if (cols[0]===driverID && parseInt(cols[2].split('-')[1])===month) {
            let d = new Date(cols[2]);
            let weekday = d.toLocaleDateString('en-US',{weekday:'long'});
            if (weekday===dayOff) continue;
            let quota = 8*3600 + 24*60;
            if (d >= new Date('2025-04-10') && d <= new Date('2025-04-30')) quota = 6*3600;
            totalSec += quota;
        }
    }
    totalSec -= bonusCount*2*3600;
    if (totalSec<0) totalSec=0;
    return secondsToTime(totalSec);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let rates = fs.readFileSync(rateFile,'utf8').trim().split('\n');
    let basePay=0, tier=0;
    for (let line of rates) {
        let cols = line.split(',');
        if (cols[0]===driverID) { basePay=parseInt(cols[2]); tier=parseInt(cols[3]); break; }
    }
    let allowed = [0,50,20,10,3][tier]; // index = tier
    let actualSec = timeToSeconds(actualHours);
    let requiredSec = timeToSeconds(requiredHours);
    let missingSec = requiredSec - actualSec;
    if (missingSec <= allowed*3600) return basePay;
    missingSec -= allowed*3600;
    let missingH = Math.floor(missingSec/3600);
    let rate = Math.floor(basePay/185);
    return basePay - missingH*rate;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
