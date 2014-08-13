/**
 * Created by AstafyevaLA on 24.04.2014.
 */

// loads taskLists, calendarLists, userName
var loader = new Loader();

/* updating icon and popup page */
function updateView() {
    var isTokenOk = loader.TokenNotNull();

    if (isTokenOk) {
        chrome.browserAction.setIcon({ 'path' : '../images/icon-16.gif'});

        //loader.Load(false);
    }
    else {
        chrome.browserAction.setIcon({ 'path' : '../images/icon-16gray.gif'});
        //chrome.browserAction.setPopup({popup : ""});
        //loader.Clear();
    }
};

/* Ask for taskLists, calendarLists, userName with select Google account*/
function AuthAndAskForTaskLists() {
    loader.Load(true);
}

/* Logs msg to console with current date and time*/
function LogMsg(message) {
    console.log(GetDateTimeStr() + ' ' + message);
}

/* On Got Message event handler
   When connection appears/disappears we should update view
*/
function OnGotMessage(request, sender, sendResponse) {
    if (request.greeting && request.greeting == "token") {
       updateView();
    }
}

/* Background page initialization*/
function init () {

    updateView();
    chrome.browserAction.setIcon({ 'path' : '../images/icon-16gray.gif'});
    // chrome.browserAction.onClicked.addListener(AuthAndAskForTaskLists);
    chrome.browserAction.setPopup({popup : "views/popup.html"});
    chrome.runtime.onMessage.addListener(OnGotMessage);
    loader.requestProcessor.Authorize();
}

window.addEventListener('load', init, false);




