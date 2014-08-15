
/*Does authorization and sends requests*/
function RequestProcessor() {
    var self = this;
    self.requestQueue = [];     // the request queue (as an array)
    self.token = null;          // current token
    self.tokenExpiresIn = 0;    // the timespan during which token is actual
    self.tokenGetTime = 0;      // the time we got token
    self.isRevoked = false;     // sets to true when user revokes rights from this app
    var currTokenOk = false;    // the current state of token (we are going to compare old and ne states)

    /*Adds request to request queue
    * string request - the request,
    * string body - the request`s body
    * blindMode - if true authorization window won`t be shown*/
    self.Add = function(request, body, blindMode) {
        self.requestQueue.push({"request": request, "body": body, "blindMode": blindMode});
    }

    /*Adds request to request queue and sends all requests in queue
     * string request - the request,
     * string body - the request`s body
     * blindMode - if true authorization window won`t be shown*/
    self.AddAndDo = function(request, body, blindMode) {
        self.Add(request, body, blindMode);
        self.ProcessAll();
    }

    /*Sends all requests in queue*/
    self.ProcessAll = function() {
        while (self.requestQueue.length > 0) {
            var requestToProcess = self.requestQueue.shift();
            self.Process(requestToProcess);
        }
    }

    /* Sends Request
    * object requestToProcess {"request": request, "body": body, "blindMode": blindMode}
    * if requestToProcess = null this function only gets auth token
    * */
    self.Process = function(requestToProcess) {
        chrome.identity.getAuthToken({'interactive': !requestToProcess.blindMode},
            function (access_token) {
                try {
                    if (chrome.runtime.lastError) {
                        self.token = null;
                        self.tokenExpiresIn = 0;
                        self.tokenGetTime = 0;
                        LogMsg(chrome.runtime.lastError);
                        throw new Error(chrome.runtime.lastError);
                    }

                    self.token = access_token;
                    self.tokenExpiresIn = 3600;
                    self.tokenGetTime = getCurrentTime();
                    self.isRevoked = false;

                }
                finally {
                    if (requestToProcess.request != null) {
                        requestToProcess.request.setRequestHeader('Authorization', 'Bearer ' + self.token );
                        requestToProcess.request.send(requestToProcess.body);
                    }

                }

            });
    }

    /* The event handler of onSignInChanged in Chrome
      string account - new account that logged in in Chrome
      bool signedIn - if true user logged in
     */
    self.SignInChanged = function( account, signedIn) {
        LogMsg("Sign in changed " + account + ' ' + signedIn);
        if (signedIn) {
            self.Authorize();
        }
        else {
            self.ClearToken();
        }
    }

    /*  Gets the token
     */
    self.Authorize = function() {
        var requestToProcess = {"request": null, "body": null, "blindMode": true};
        self.Process(requestToProcess);
    }

    /*
     clears token (sets it to null)
     callback - the callback function
     */
    self.ClearToken = function(callback){
        if (self.token == null) {
            LogMsg('ClearToken: token is bad or exprired');
            return;
        }

        chrome.identity.removeCachedAuthToken({ token:  self.token},
            function() {
                if (chrome.runtime.lastError) {
                    LogMsg("revokeError " + chrome.runtime.lastError.message);
                    return;
                }

                self.token = null;
                self.tokenExpiresIn = 0;
                self.tokenGetTime = 0;

                LogMsg("revoke ok");
            });
    }

    /*
    revokes rights from the app (we are not able to get tokens after that)
    callback - the callback function
     */
    self.Revoke = function(callback) {
        if (self.token == null)  {
            LogMsg('Revoke: token is bad or exprired');
            return;
        }

        var tokenSv = self.token;
        self.ClearToken();

        var xhr = new XMLHttpRequest();

        try {
            xhr.onreadystatechange = OnRevokeStatusChanged(xhr, callback);
            xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
                tokenSv);
            xhr.send();
        }
        catch (e) {
            LogMsg('ex: ' + e);
            throw e;
        }
    }

    /*  Revoke status changed event handler
      xhr - the processed request
      callback - the callback function
     */
    var OnRevokeStatusChanged = function(xhr, callback) {
        return function () {
            if (xhr.readyState != 4) {
                return;
            }

            LogMsg('Revoke ' + xhr.readyState + ' ' + xhr.status + ' ' + xhr.response);
            self.isRevoked = xhr.status == ST_REQUEST_OK;
            callback();
        }
    }

    /*
       Initializes object Must be called after creation
     */
    self.Init = function() {
        chrome.identity.onSignInChanged.addListener(self.SignInChanged);
        window.setInterval(ConnectionAnalyzer, 1000);
    }

    /*
         Is called every 1000 ms to analyze connection
         Sends a message to all {greeting: "token", state: isTokenOk} when connection state changes
     */
    var ConnectionAnalyzer = function() {
        var isTokenOk = self.token != null;

        if (currTokenOk != isTokenOk) {
            chrome.runtime.sendMessage({greeting: "token", state: isTokenOk});
        }

        currTokenOk = isTokenOk;
    }
}

/* Loades task lists and calendars
* Adds events and tasks
* All requests to Google Calendar API, Google Task API are here*/
function Loader() {
    var parent = this;
    parent.taskLists = []; // the tasks lists array (loaded with askForTaskLists)
    parent.calendarLists = []; // the calendar lists array (loaded with askForCalendars)
    parent.userName = null; // the user name (loaded with askForName)
    parent.requestProcessor = new RequestProcessor(); // the request processor
    parent.isLoadingTaskLists = false; // is true tasksLists loading is in process (don`t use taskLists)
    parent.isLoadingTasks = false;
    parent.isErrorLoadingTask = false;

    parent.requestProcessor.Init();

    /* returns true if connection is ok, false otherwise*/
    parent.TokenNotNull = function() {
        return parent.requestProcessor.token != null;
    }

    /*returns true if rights has been revoked from app (from options page)*/
    parent.IsRevoked = function() {
        return parent.requestProcessor.isRevoked;
    }

    /*Loads taskLists, calendars and user Name*/
    /*bool withAuth - if true we should show authorization windows*/
    parent.Load = function (withAuth) {
        if (withAuth) {
            parent.authAndAskForTaskLists();
        }
        else {
            parent.askForTaskLists(true);
        }

        //parent.askForName(true);
        //parent.askForCalendars(true);
        parent.requestProcessor.ProcessAll();
    }

    /*Clears taskLists, calendarLists and userName*/
    parent.Clear = function () {
        parent.taskLists = [];
        //parent.calendarLists = [];
        //parent.userName = null;
    }

    /*returns true if loading is in process (use it after calling Load function to wait when load ends)*/
    parent.isLoading = function () {
        return /*parent.isLoadingCalendars || parent.isLoadingName ||*/ parent.isLoadingTaskLists || parent.isLoadingTasks;
    }

    /*returns true if all entities - taskLists, calendarLists and userName has been successfully loaded*/
    parent.isLoadedOk = function () {
        return !parent.isLoading() && parent.taskLists.length > 0 /*&& parent.calendarLists.length > 0 && parent.userName != null*/;
    }

    /*creates ask for task lists request and Adds it to requestProcessor`s request queue
    * bool blindMode - if true we shouldn`t show authorization windows while processing request*/
    parent.askForTaskLists = function (blindMode) {

        var xhr = new XMLHttpRequest();
        try {
            parent.isLoadingTaskLists = true;
            parent.taskLists = [];
            xhr.onreadystatechange = onGotTaskLists(xhr);
            xhr.onerror = function (error) {
                parent.isLoadingTaskLists = false;
                LogMsg('Loader AskForTaskLists: error: ' + error);
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, blindMode);
        }
        catch (e) {
            parent.isLoadingTaskLists = false;
            LogMsg('Loader AskForTaskLists: ex: ' + e);
            throw e;
        }
    }

    /* Ask for task lists with select Google account*/
    /* the result is put to calendar lists*/
    parent.authAndAskForTaskLists = function () {

        var xhr = new XMLHttpRequest();
        try {
            parent.isLoadingTaskLists = true;
            parent.taskLists = [];
            xhr.onreadystatechange = onGotTaskLists(xhr);
            xhr.onerror = function (error) {
                parent.isLoadingTaskLists = false;
                LogMsg('Loader AuthAndAskForTaskLists: error: ' + error);
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, false);
        }
        catch (e) {
            parent.isLoadingTaskLists = false;
            LogMsg('Loader AuthAndAskForTaskLists: ex: ' + e);
            throw e;
        }
    }

    parent.getAllTasks = function() {
        LogMsg("Task list length = " + parent.taskLists.length);
        parent.isLoadingTasks = true;
        parent.isErrorLoadingTask = false;
        for(var i=0; i< parent.taskLists.length; i++) {
            LogMsg("Asking tasks for " + parent.taskLists[i].id);
            parent.taskLists[i].isLoading = true;
            parent.getTasksForTaskList(parent.taskLists[i]);
        }

        parent.requestProcessor.ProcessAll();
    }

    parent.getTasksForTaskList = function(taskList) {
        var xhr = new XMLHttpRequest();
        try {
            taskList.tasks = [];
            xhr.onreadystatechange = onGotTasks(xhr, taskList);
            xhr.onerror = function (error) {
                LogMsg('getEventsForTaskList: error: ' + error);
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/tasks/v1/lists/' + taskList.id + '/tasks?showCompleted=true';
            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, false);
        }
        catch (e) {
            LogMsg('Loader getEventsForTaskList: ex: ' + e);
            throw e;
        }
    }

    var onGotTasks = function (xhr, taskList) {
        return function () {
            if (xhr.readyState != 4) {
                return;
            }

            var isOk;
            var exception = null;

            LogMsg('Loader On Got Tasks ' + xhr.readyState + ' ' + xhr.status);

            try {
                var text = xhr.response;
                isOk = xhr.status == ST_REQUEST_OK;

                if (!isOk) {
                    var text = xhr.response;
                    var obj = JSON.parse(text);
                    var error = xhr.statusText + ' ' + xhr.status + '\n' + obj.error.code + ' ' + obj.error.message;
                    chrome.runtime.sendMessage({greeting: "Error", error: error});
                }

                var obj = JSON.parse(text);

                if (obj.items) {
                    taskList.tasks = obj.items;
                    LogMsg(JSON.stringify(/*obj.items*/ taskList));
                }
                else {
                    isOk = false;
                }
            }
            catch (e) {
                LogMsg('Loader onGotTasks ex: ' + e);
                taskList.tasks = [];
                isOk = false;
                throw e;
            }
            finally {
                parent.isErrorLoadingTask = parent.isErrorLoadingTask && isOk;
                taskList.isLoading = false;

                if (allLoaded()) {
                    parent.isLoadingTasks = false;
                    if (!parent.isErrorLoadingTask) {
                        chrome.runtime.sendMessage({greeting: "Done"});
                    }
                    var msg = parent.isErrorLoadingTask ? "!!! Loading tasks finished with error": "!!! Loading tasks finished ok";
                    LogMsg(msg);
                }
            }
        }
    }

    var allLoaded = function() {
        var i;
        for(var i=0; i< parent.taskLists.length; i++) {
            if (parent.taskLists[i].isLoading) {
                break;
            }
        }

        return i == parent.taskLists.length;
    }

    /* Callback function for AskForTaskLists*/
    /* xhr - request*/
    var onGotTaskLists = function (xhr) {
        return function () {
            if (xhr.readyState != 4) {
                return;
            }

            var isOk;
            var exception = null;

            LogMsg('Loader On Got TaskLists ' + xhr.readyState + ' ' + xhr.status);

            try {
                var text = xhr.response;
                isOk = xhr.status == ST_REQUEST_OK;

                if (!isOk) {
                    var text = xhr.response;
                    var obj = JSON.parse(text);
                    var error = xhr.statusText + ' ' + xhr.status + '\n' + obj.error.code + ' ' + obj.error.message;
                    chrome.runtime.sendMessage({greeting: "Error", error: error});
                }

                var obj = JSON.parse(text);

                if (obj.items) {
                    parent.taskLists = obj.items;
                    LogMsg(JSON.stringify(obj.items));
                }
                else {
                    isOk = false;
                }
            }
            catch (e) {
                LogMsg('Loader onGotTaskLists ex: ' + e);
                parent.taskLists = [];
                isOk = false;
                throw e;
            }
            finally {
                // sending a message to popup window
                // chrome.runtime.sendMessage({greeting: "taskListReady", isOk: isOk});
                if (isOk) {
                    parent.getAllTasks();
                }
                parent.isLoadingTaskLists = false;
            }
        }
    }

    parent.changeTaskStatus = function(taskListId, taskId, isCompleted) {
        var url;
        var xhr = new XMLHttpRequest();
        try
        {
            xhr.onreadystatechange = onChangeTask(xhr);
            xhr.onerror = function(error)
            {
                LogMsg('Loader ChangeTask: error: ' + error);
                throw new Error(error);
            };

            //url  = 'https://www.googleapis.com/tasks/v1/lists/' + listId + '/tasks';
            url =  'https://www.googleapis.com/tasks/v1/lists/' + taskListId + '/tasks/' + taskId + '?fields=id%2Cstatus';
            var status = isCompleted ? 'completed':'needsAction';

            xhr.open('PATCH', url);
            xhr.setRequestHeader('Content-Type', 'application/json');
            var params =  isCompleted? '{"status":"' + status + '"}' : '{"status":"' + status + '", "completed": null}';
            parent.requestProcessor.AddAndDo(xhr, params, true);
        }
        catch (e)
        {
            LogMsg('Loader AddTask ex: ' + e);
            throw e;
        }

    }

    /* Callback function for AddTask */
    /*xhr - request*/
    var onChangeTask = function(xhr)
    {
        return function()
        {
            if (xhr.readyState != 4) {
                return;
            }

            LogMsg(xhr.response);
            var text = xhr.response;
            var obj = JSON.parse(text);

            if (xhr.status != ST_REQUEST_OK) {
                try {

                    var error = xhr.statusText + ' ' + xhr.status + '\n' + obj.error.code + ' ' + obj.error.message;
                    chrome.runtime.sendMessage({greeting: "UpdateError", error: error});
                    throw new Error(error);
                }
                catch (e) {
                    LogMsg('ex: ' + e);
                    throw e;
                }
            }
            else {

               chrome.runtime.sendMessage({greeting: "UpdateOk", id: obj.id, status: obj.status});
            }
        };
    }


    return parent;
}
