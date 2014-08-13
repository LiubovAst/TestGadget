/**
 * Created by AstafyevaLA on 13.08.2014.
 */

var backGround;

function init() {
    backGround = chrome.extension.getBackgroundPage();
    backGround.LogMsg('!!! Popup init started');

    if (!backGround.loader.TokenNotNull) {
        var personalize = document.getElementById('personalize');
        personalize.onclick = createOpenerOnClick();
        var approvaldone = document.getElementById('approvaldone');
        approvaldone.onclick = createApprovedOnClick();
        showOneSection('approval');
    }
    else {
        createApprovedOnClick();
    }

    chrome.runtime.onMessage.addListener(OnGotMessage);
}

/* Function that is called when we get message*/
function OnGotMessage(request, sender, sendResponse) {
    if (!request.greeting) {
        return;
    }

    backGround.LogMsg('Popup OnGotMessage ' + request.greeting);

    switch (request.greeting) {

        case "Done":
            generateList(backGround.loader.taskLists);
            CollapsibleLists.applyTo(document.getElementById('listId'));
            showOneSection('main');
            break;
        case "Error":
            var main = document.getElementById('main');
            var err = document.createTextNode('OAuth error: ' +
                request.error);
            main.appendChild(err);
            showOneSection('main');
            break;
    }
}

function createOpenerOnClick() {
    backGround.loader.Load(true);
    showOneSection('waiting');
}

function createApprovedOnClick() {
    if (!backGround.loader.isLoading()) {
        backGround.loader.Load();
        showOneSection('waiting');
    }
}

    // Display UI depending on OAuth access state of the gadget (see <divs> above).
    // If user hasn't approved access to data, provide a "Personalize this gadget" link
    // that contains the oauthApprovalUrl returned from makeRequest.
    //
    // If the user has opened the popup window but hasn't yet approved access, display
    // text prompting the user to confirm that s/he approved access to data.  The user
    // may not ever need to click this link, if the gadget is able to automatically
    // detect when the user has approved access, but showing the link gives users
    // an option to fetch their data even if the automatic detection fails.
    //
    // When the user confirms access, the fetchData() function is invoked again to
    // obtain and display the user's data.
 function showOneSection(toshow) {
    var sections = [ 'main', 'approval', 'waiting' ];
    for (var i=0; i < sections.length; ++i) {
        var s = sections[i];
        var el = document.getElementById(s);
        if (s === toshow) {
            el.style.display = "block";
        } else {
            el.style.display = "none";
        }
    }
}

function generateList(taskLists) {
    var i;

    var ulMain = document.getElementById('listId');

    for (i = 0; i < taskLists.length; ++i) {
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(taskLists[i].title));
        ulMain.appendChild(li); // create <li>

        if (taskLists[i].tasks.length > 0) {
            var ul = document.createElement('ul'); // assume + create <ul>
            li.appendChild(ul);

            for (var j=0; j < taskLists[i].tasks.length; j++) {
                var liChild = document.createElement('li');
                liChild.appendChild(document.createTextNode(taskLists[i].tasks[j].title));
                liChild.appendChild(document.createElement("br"));

                var span = createColoredTextNode(taskLists[i].tasks[j].updated);
                liChild.appendChild(span);
                liChild.appendChild(document.createElement("br"));
                span = createColoredTextNode(taskLists[i].tasks[j].status);
                liChild.appendChild(span);
                ul.appendChild(liChild);
            }
        }
    }

    return ulMain;
}

function createColoredTextNode(text) {
    var span = document.createElement('span');
    span.style.fontSize = "10px";
    span.style.color = '#666666';
    span.appendChild(document.createTextNode(text));
    return span;
}

window.addEventListener('load', init, false);
