/**
 * Created by AstafyevaLA on 29.04.2014.
 */

ST_REQUEST_OK = 200;
TEXT_VALUE_SPLITTER = '$';

/* string id
  returns object by its id*/
function $(id) {
    return document.getElementById(id);
};

/*
    date theDay,
    returns date as string YYYY-MM-DD
*/
function CurrDateStr(theDay) {
    var dd = theDay.getDate();
    var mm = theDay.getMonth()+1;
    var yyyy = theDay.getFullYear();

    dd = AddZero(dd);
    mm = AddZero(mm);

    theDay = yyyy + '-' + mm + '-' + dd;
    return theDay;
};



/*
 date theTime,
 returns time of date as string HH:MM:SS
 */
function CurrTimeStr(theTime) {

    var hh =  theTime.getHours();
    var mm = theTime.getMinutes();
    var ss = theTime.getSeconds();

    hh = AddZero(hh);
    mm = AddZero(mm);
    ss = AddZero(ss);

    return hh + ":" + mm + ":" + ss;
};

/*
    returns current date and time as a formatted string YYYY-MM-DD HH:MM:SS
 */
function GetDateTimeStr() {
    var today = new Date();
    return CurrDateStr(today) + ' ' + CurrTimeStr(today);
};

/*
    int a,
    returns string 0a if a<10, a if a>10
*/
function AddZero(a) {
    var b = parseInt(a);
    if (b < 10) {
        return '0' + b;
    }
    else {
        return b;
    }
}

/*
    int min - min value,
    int max - max value
    returns random number between min and max
*/
function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

/*
    returns random letter between a and z as string
*/
function getRandomLetter() {
    return String.fromCharCode(getRandomNumber(97, 122));
}

/*
    returns random string of letters a-z with defined length
    int length - length of the string
 */
function getRandomString(length) {
    var i = 0;
    var s = "";
    while (i < length) {
        s+= getRandomLetter();
        i++;
    }

    return s;
}

/*
 * Substitute special chars for JSON
 * string data
 * returns string
 */
function filterSpecialChar(data) {
    if (data) {
        data = data.replace(/"/g, "\\\"");
        data = data.replace(/\n/g, "\\n");
        data = data.replace(/\//g, "\\/");
        data = data.replace(/\r/g, "\\r");
        data = data.replace(/\t/g, "\\t");
    }

    return data;
}


/* make button disabled
  Button (getElementById) button*/
function disableButton(button) {
    button.setAttribute('disabled', 'disabled');
}

/* make button enabled
 Button (getElementById) button*/
function enableButton(button) {
    button.removeAttribute('disabled');
}

/*
check button is disabled */
function IsButtonDisabled(button) {
    return button.hasAttribute('disabled');
}


/*
    Returns right part of string left_part$right_part, $ - TEXT_VALUE_SPLITTER
    string value
    returns string right_part
*/
function GetGoogleNameByValue(value) {
    if (!value || value.indexOf(TEXT_VALUE_SPLITTER) < 0) {
        return null;
    }

    return value.substring(value.indexOf(TEXT_VALUE_SPLITTER) + 1);
}

/*
    Builds recurrence rule for periods - DAILY, MONTHLY etc
    returns string attribute for request
 */
function BuildRecurrenceRule(recurrenceTypeValue) {
    var period = GetGoogleNameByValue(recurrenceTypeValue);
    if (!period) {
        return null;
    }

    return "RRULE:FREQ=" + period;
}

/*
    Gives times array from reminderTimearray
    reminderTimeArray - array of strings from reminderPeriods
    returns array - array of right parts of reminderPeriods as strings
 */
function BuildReminderTimeArrayMins(reminderTimeArray) {
    var times = [];
    reminderTimeArray.forEach(function(item, i, arr) {times.push(GetGoogleNameByValue(arr[i]))});
    return times;
}

/*
    Fills combo with values from array from
    Combo combo - (got with getelementById)
    array[string] arrayFrom - array of strings to add as combo values
*/
function FillCombo(combo, arrayFrom) {
    var x = combo;

    // clears options
    x.options.length = 0;

    for (var i = arrayFrom.length - 1; i >= 0; i--)
    {
        var option = document.createElement("option");
        option.text = arrayFrom[i];
        x.add(option,x[0]);
    }
}

/*
 returns current time as integer (in ms)
 */
function getCurrentTime() {
    return (new Date()).getTime();
};










