Components.utils.import("resource://autogroup/settings.js");

if("undefined" === typeof(autogroup)){

    var autogroup = {};

(function() {
//     var _log =    function(str) {
//         Components.classes['@mozilla.org/consoleservice;1']
//         .getService(Components.interfaces.nsIConsoleService)
//         .logStringMessage(str);
//     };

    var _executeSoon = function(aFunc) {
        var tm = Components.classes['@mozilla.org/thread-manager;1'].getService(Components.interfaces.nsIThreadManager);

        tm.mainThread.dispatch({
            run: function() {
                aFunc();
            }
        }, Ci.nsIThread.DISPATCH_NORMAL);
    };

    this.onLoad = function() {
        // initialization code
        this.initialized = true;
        this.strings = document.getElementById("autogroup-strings");
        gBrowser.tabContainer.addEventListener("TabOpen", autogroup.onTabOpen, false);
        gBrowser.tabContainer.addEventListener("TabClose", autogroup.onTabClose, false);
    };

    this.checkFilters = function(tab) {
        // Fitler search types
        const FILTER_REGEX = 0;
        const FILTER_FULLTEXT = 1;

        // Filter group types
        const FILTER_URI = 0;
        const FILTER_TITLE = 1;

        var nogroup = autoGroupSettings.getFilterObject("nogroup").data();
        var groups = autoGroupSettings.getFilterObject("group").data();
        window.TabView._initFrame();
        contentWindow = window.TabView.getContentWindow();

        var checkFilterMatch = function(filter) {
            var subject = "";
            var search_expr = null;
            var matches = false;

            switch (filter.fgType) {
                case FILTER_URI:
                    subject = gBrowser.getBrowserForTab(tab).currentURI.spec;
                    break;
                case FILTER_TITLE:
                    subject = gBrowser.getBrowserForTab(tab).contentDocument.title;
                    break;
            }

            switch (filter.fsType) {
                case FILTER_REGEX:
                    search_expr = new RegExp(filter.fCheck, "i");
                    if (search_expr.test(subject)) {
                        matches = true;
                    }
                    break;
                case FILTER_FULLTEXT:
                    search_expr = filter.fCheck;
                    if (subject.toLowerCase().indexOf(search_expr.toLowerCase()) != -1) {
                        matches = true;
                    }
                    break;
            }
            return matches;
        };

        var moveTabToGroup = function(group) {
            var target;
            var existing_groups = contentWindow.GroupItems.groupItems.filter(function(groupItem) {
                return groupItem.getTitle() == group.groupName
            });

            if(existing_groups.length == 0) {
                target = contentWindow.GroupItems.newGroup();
                target.setTitle(group.groupName);
            } else {
                target = existing_groups[0];
            }

            // Perform check if we really need to switch to new tab
            var isTabInGroup = function(tab_item) {
                return tab_item.tab === tab
            };

            if (!target.getChildren().some(isTabInGroup)) {
                window.parent.TabView.moveTabTo(tab, target.id);
                gBrowser.selectedTab = tab;
            }
            return true;
        };

        if ("undefined" !== typeof groups) {
            if (nogroup.some(checkFilterMatch)) {
                return true;
            }

            groups.every(function(group) {
                if (group.groupFilters.some(checkFilterMatch)) {
                    moveTabToGroup(group);
                    return false;
                }
                return true;
            });
        }
        return false;
    };

    this.onTabOpen = function(e) {
        gBrowser.getBrowserForTab(e.target).addEventListener("load", function() {
            autogroup.checkFilters(e.target);
        }, true);
    };

    this.onTabClose = function(e) {
        var window_groups = window.parent.TabView.getContentWindow().GroupItems;
        var active_window_group = window_groups.getActiveGroupItem();
        // HACK: seems dirty but works as expected
        _executeSoon(function() {
            if(active_window_group.getChildren().length == 0) {
                // Check if group is listed in group-list to avoid closing user-created groups.
                // Don't close unnamed groups (Firefox does this itself).
                var title = active_window_group.getTitle();
                if (title.length > 0) {
                    var groups = autoGroupSettings.getFilterObject("group").data();
                    if ( "undefined" === typeof groups ) {
                        return;
                    }

                    if (groups.some(function(item) { return item.groupName == title })) {
                        active_window_group.setTitle("");
                        if (!active_window_group.closeIfEmpty()) {
                            active_window_group.setTitle(title);
                        }
                        // Perform switching to previously viewed group
                        window_groups.setActiveGroupItem(window_groups.groupItems[window_groups.groupItems.length - 1]);
                        window.parent.TabView.hide();
                    }
                }
            }
        });
    };

    // Event listeners
    window.addEventListener("load", function() { autogroup.onLoad(); }, false);
}).apply(autogroup);

}
