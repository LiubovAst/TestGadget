/**
 * Created by AstafyevaLA on 13.08.2014.
 */

var backGround;
var offsetY = 0;

function init() {
    backGround = chrome.extension.getBackgroundPage();
    backGround.LogMsg('!!! Popup init started');

    var backToList = document.getElementById('href-back');
    backToList.onclick = returnToList;

    if (!backGround.loader.TokenNotNull) {
        var personalize = document.getElementById('personalize');
        personalize.onclick = createOpenerOnClick;
        var approvaldone = document.getElementById('approvaldone');
        approvaldone.onclick = createApprovedOnClick;
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
        case "UpdateError":
            alert('Error occured: ' + request.error);
            break;
        case "UpdateOk":
            checkTaskStatus(request.id, request.status);
            break;
    }
}

function checkTaskStatus(taskId, taskStatus) {
    var isCompleted = taskStatus == 'completed';

    if (document.getElementById('ch_' + taskId).checked != isCompleted) {
        alert('Different statuses for task ' + taskId);
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

function returnToList() {
    var taskId = document.getElementById('label-id').innerText;
    showOneSection('main');
    setTimeout( function() {window.scrollBy(0, offsetY);}, 40);
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
    var sections = [ 'main', 'approval', 'waiting', 'watch' ];
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
        li.taskListId = taskLists[i].id;
        ulMain.appendChild(li); // create <li>

        if (taskLists[i].tasks.length > 0) {
            var ul = document.createElement('ul'); // assume + create <ul>
            li.appendChild(ul);

            for (var j=0; j < taskLists[i].tasks.length; j++) {
                var liChild = document.createElement('li');
                liChild.task =  taskLists[i].tasks[j];
                var span = createSimpleTextNode(taskLists[i].tasks[j].title, 't_' + taskLists[i].tasks[j].id);
                var checkBox = createCheckBoxForTask(taskLists[i].tasks[j]);
                liChild.appendChild(checkBox);
                liChild.appendChild(span);
                liChild.appendChild(document.createElement("br"));

                var notesOrig = taskLists[i].tasks[j].notes || '';
                var notes = getNotes(taskLists[i].tasks[j]);
                var dueTo = getDueTo(taskLists[i].tasks[j]);


                if (canBeConvertedToSubtasks(notesOrig)) {
                    var subTasks = convertToSubTasks(notesOrig);
                    var ulChild = drawSubTasks(subTasks, taskLists[i].tasks[j].id);
                    span = createColoredTextNode(notes, taskLists[i].tasks[j]);
                    liChild.appendChild(span);
                    liChild.appendChild(document.createElement("br"));
                    span = createColoredTextNode(dueTo);
                    liChild.appendChild(span);
                    liChild.appendChild(ulChild);
                }
                else
                {
                    span = createColoredTextNode(notes, taskLists[i].tasks[j]);
                    liChild.appendChild(span);
                    liChild.appendChild(document.createElement("br"));
                    span = createColoredTextNode(dueTo);
                    liChild.appendChild(span);
                }

                ul.appendChild(liChild);
            }
        }
    }

    return ulMain;
}

function getNotes(task) {
    var notes = task.notes || '<Без описания>';

    if (canBeConvertedToSubtasks(notes)) {
        notes = '<Без описания>';
    }

    return notes;
}

function getDueTo(task) {
    if (task.due) {
        var d = new Date(task.due);
        return d.toDateString();
    }

    return '<Без даты>';
}

function createSimpleTextNode(text, id) {
    var span = document.createElement('span');
    span.appendChild(document.createTextNode(text));
    span.setAttribute("id", id);
    return span;
}

function createColoredTextNode(text, task) {
    var span = document.createElement('span');
    span.style.fontSize = "10px";
    span.style.color = '#666666';
    span.style.textIndent = '25px';
    span.style.display = 'inline-block';
    span.style.cursor = 'pointer';
    span.appendChild(document.createTextNode(text));
    span.task = task;
    span.addEventListener('click', function(e) {
        var targ;

        if (!e) var e = window.event;
        if (e.target) targ = e.target;
        else if (e.srcElement) targ = e.srcElement;
        document.getElementById('label-id').innerText = targ.task.id;
        document.getElementById('label-name').innerText = targ.task.title;
        document.getElementById('label-due-to').innerText = targ.task.due;
        document.getElementById('label-notes').innerText = targ.task.notes;
        offsetY = window.pageYOffset;
        showOneSection('watch');
    });
    return span;
}

function createButtonShowTask(taskId) {
    var button = document.createElement("button");
    button.setAttribute("id", taskId);
    button.innerText = "Подробнее...";
    button.type = 'button';
    button.addEventListener('click', function(e) {
        var targ;

        if (!e) var e = window.event;
        if (e.target) targ = e.target;
        else if (e.srcElement) targ = e.srcElement;
        var isHidden = targ.innerText == "Подробнее...";
        targ.innerText = isHidden ? "Скрыть" : "Подробнее...";
        backGround.LogMsg(targ.id);
        document.getElementById('div_' + targ.id).style.display = isHidden? '': 'none';
    });

    return button;
}

function createCheckBoxForTask(task) {
    var checkBox = document.createElement("input");
    checkBox.type = 'checkbox';
    checkBox.setAttribute("id", "ch_" + task.id);

    checkBox.addEventListener('change', function(e) {
        var targ;

        if (!e) var e = window.event;
        if (e.target) targ = e.target;
        else if (e.srcElement) targ = e.srcElement;
        OnChangeTaskStatusCB(targ);

        var li = targ;
        while (li != null && li.task == undefined) li = li.parentNode;
        var task = li.task;

        while (li != null && li.taskListId == undefined) li = li.parentNode;

        var m_taskId = targ.id.substring('ch_'.length);
        var taskListId = li? li.taskListId: '';
        task.status = targ.checked ? 'completed' : 'needsAction';
        backGround.loader.changeTaskStatus(taskListId, m_taskId, targ.checked);

    });

    if (task.status == 'completed') {
        checkBox.checked = true;
        setTimeout(function () { OnChangeTaskStatusCB(checkBox); }, 15);
    }
    return checkBox;
}


function drawSubTask(li, subTask, taskId, subTaskNum) {
    var isDone = subTask.substring(0,1) == 'T';
    var text = subTask.substring(1);
    var checkBox = document.createElement("input");
    checkBox.type = 'checkbox';
    checkBox.setAttribute("id", "ch_" + taskId + "_" + subTaskNum);
    checkBox.addEventListener('change', function(e) {
        var targ;

        if (!e) var e = window.event;
        if (e.target) targ = e.target;
        else if (e.srcElement) targ = e.srcElement;
        OnChangeSubTaskStatusCB(targ);

        var li = targ;


        while (li != null && li.task == undefined) li = li.parentNode;
        var m_taskId = li ? li.task.id : '';
        var oldNotes = li ? li.task.notes : '';
        var task = li.task;
        alert(JSON.stringify(li.task));

        while (li != null && li.taskListId == undefined) li = li.parentNode;


        var taskListId = li? li.taskListId: '';
        alert(taskListId);
        var subTaskId = parseInt(targ.id.substring('ch_'.length).substring(m_taskId.length + 1));
        alert(subTaskId);
       // var oldNotes = document.getElementById(m_taskId).task.notes;
        var arr = convertToSubTasks(oldNotes);
        arr[subTaskId] = (targ.checked ? 'T' : 'F') + arr[subTaskId].substring('T'.length);
        var newNotes = convertFromSubTasks(arr);
        alert(newNotes);
        task.notes = newNotes;
      //  backGround.loader.changeSubTaskStatus(taskListId, m_taskId, newNotes);
    });

    //var span = createColoredTextNode(text);
    li.appendChild(checkBox);
    li.appendChild(/*document.createTextNode(text)*/ createSimpleTextNode(text, 't_' + taskId + "_" + subTaskNum));

    if (isDone) {
        checkBox.checked = true;
        setTimeout(function () { OnChangeSubTaskStatusCB(checkBox);}, 15);

    }

}

function OnChangeTaskStatusCB(targ) {
    var taskId = targ.id.substring('ch_'.length);
    var spanId = 't_' + taskId;

    document.getElementById(spanId).style.textDecoration = targ.checked ? 'line-through':'none';
}

function OnChangeSubTaskStatusCB(targ) {
    var taskId = targ.id.substring('ch_'.length);
    var spanId = 't_' + taskId;

    var li = targ;
    while (li != null && li.taskListId == undefined) li = li.parentNode;


    document.getElementById(spanId).style.textDecoration = targ.checked ? 'line-through':'none';
}

function drawSubTasks(subTasks, taskId) {
    var ul = document.createElement('ul');

    for (var k = 0; k< subTasks.length; k++) {
        if (subTasks[k].trim() == '') {
            continue;
        }

        var li = document.createElement('li');
        drawSubTask(li, subTasks[k], taskId, k);
        ul.appendChild(li);
    }

    return ul;
}

function canBeConvertedToSubtasks(text) {
    text = text.trim();
    if (text.indexOf('[ ]') != 0 && text.indexOf('[x]') != 0) {
        return false;
    }

    return true;
}

function convertToSubTasks(text) {
   if (!canBeConvertedToSubtasks(text)) {
       return null;
   }
    var textCpy = text;
    textCpy =  textCpy.split('[ ]').join('^&^F');
    textCpy =  textCpy.split('[x]').join('^&^T');

   var subTasksList = textCpy.split('^&^');
   return subTasksList;
}

function convertFromSubTasks(arr) {
    var str = arr.join('^&^');
    str = str.split('^&^F').join('[ ]');
    str = str.split('^&^T').join('[x]');
    return str;
}

window.addEventListener('load', init, false);
