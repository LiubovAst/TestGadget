var shindig = shindig || {};
shindig.oauth = shindig.oauth || {};

/**
 * Initialize a new OAuth popup manager.  Parameters must be specified as
 * an object, e.g. shindig.oauth.popup({destination: somewhere,...});
 *
 * @param {String} destination Target URL for the popup window.
 * @param {String} windowOptions Options for window.open, used to specify
 *     look and feel of the window.
 * @param {function} onOpen Function to call when the window is opened.
 * @param {function} onClose Function to call when the window is closed.
 */
shindig.oauth.popup = function(options) {
    if (!("destination" in options)) {
        throw "Must specify options.destination";
    }
    if (!("windowOptions" in options)) {
        throw "Must specify options.windowOptions";
    }
    if (!("onOpen" in options)) {
        throw "Must specify options.onOpen";
    }
    if (!("onClose" in options)) {
        throw "Must specify options.onClose";
    }
    var destination = options.destination;
    var windowOptions = options.windowOptions;
    var onOpen = options.onOpen;
    var onClose = options.onClose;

    // created window
    var win = null;
    // setInterval timer
    var timer = null;

    // Called when we recieve an indication the user has approved access, either
    // because they closed the popup window or clicked an "I've approved" button.
    function handleApproval() {
        if (timer) {
            window.clearInterval(timer);
            timer = null;
        }
        if (win) {
            win.close();
            win = null;
        }
        onClose();
        return false;
    }

    // Called at intervals to check whether the window has closed.  If it has,
    // we act as if the user had clicked the "I've approved" link.
    function checkClosed() {
        if ((!win) || win.closed) {
            win = null;
            handleApproval();
        }
    }

    /**
     * @return an onclick handler for the "open the approval window" link
     */
    function createOpenerOnClick() {
        return function() {
            // If a popup blocker blocks the window, we do nothing.  The user will
            // need to approve the popup, then click again to open the window.
            // Note that because we don't call window.open until the user has clicked
            // something the popup blockers *should* let us through.
            win = window.open(destination, "_blank", windowOptions);
            if (win) {
                // Poll every 100ms to check if the window has been closed
                timer = window.setInterval(checkClosed, 100);
                onOpen();
            }
            return false;
        };
    }

    /**
     * @return an onclick handler for the "I've approved" link.  This may not
     * ever be called.  If we successfully detect that the window was closed,
     * this link is unnecessary.
     */
    function createApprovedOnClick() {
        return handleApproval;
    }

    return {
        createOpenerOnClick: createOpenerOnClick,
        createApprovedOnClick: createApprovedOnClick
    };
};
