Components.utils.import("resource://autogroup/settings.js");

if("undefined" === typeof(autogroup)){

  var autogroup = {};

(function() {
//   var _log =  function(str) {
//     Components.classes['@mozilla.org/consoleservice;1']
//     .getService(Components.interfaces.nsIConsoleService)
//     .logStringMessage(str);
//   };
  
  var _executeSoon = function(aFunc){
    var tm = Components.classes['@mozilla.org/thread-manager;1']
	     .getService(Components.interfaces.nsIThreadManager);

    tm.mainThread.dispatch({
      run: function()
      {
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
  
  this.checkFilters = function(tab){
    // Fitler search types
    const FILTER_REGEX = 0;
    const FILTER_FULLTEXT = 1;

    // Filter group types
    const FILTER_URI = 0;
    const FILTER_TITLE = 1;

    var groups = autoGroupSettings.data();
    window.TabView._initFrame();
    contentWindow = window.TabView.getContentWindow();

    if( "undefined" !== typeof groups )
    {
      for(var i = 0; i < groups.length; i++)
      {
	for(var t = 0; t < groups[i].groupFilters.length; t++)
	{
	  var fl = groups[i].groupFilters[t];
	  var sst = "";		// String to search in
	  var sr = null;	// Object to search for
	  var mv = false;	// Perform tab movement
	    
	  switch(fl.fgType)
	  {
	    case FILTER_URI:
	      sst = gBrowser.getBrowserForTab(tab).currentURI.spec;
	    break;
	    case FILTER_TITLE:
	      sst = gBrowser.getBrowserForTab(tab).contentDocument.title;
	    break;
	  }
	  
	  switch(fl.fsType)
	  {
	    case FILTER_REGEX:
	      sr = new RegExp(fl.fCheck, "i");
	      if(sr.test(sst))
		mv = true;
	    break;
	    case FILTER_FULLTEXT:
	      sr = fl.fCheck;
	      if(sst.toLowerCase().indexOf(sr.toLowerCase()) != -1)
	      mv = true;
	    break;
	  }
	  // If mv and groupname = '#CURRENT#', do not move
	  if ((mv) && (groups[i].groupName=="#CURRENT#")) return true;
          // No filter match - continue
	  if(!mv) continue;
	  // Move tab
	  var g;
	  var eg = contentWindow.GroupItems.groupItems.filter(function(groupItem){ return groupItem.getTitle() == groups[i].groupName });
	  if(eg.length == 0)
	  {
	    g = contentWindow.GroupItems.newGroup();
	    g.setTitle(groups[i].groupName);
	  }else
	    g = eg[0]
	  // Perform check if we really need to switch to new tab
	  if(g.getChildren().filter(function(tabItem){ return tabItem.tab === tab }).length == 0)
	  {
	    window.parent.TabView.moveTabTo(tab, g.id);
	    gBrowser.selectedTab = tab;
	  }
	  return true;
	}
      }
    }
    return false;
  };
  
  this.onTabOpen = function(e) {
    gBrowser.getBrowserForTab(e.target).addEventListener("load", function(){ autogroup.checkFilters(e.target); }, true);
  };

  this.onTabClose = function(e) {
    var eg = window.parent.TabView.getContentWindow().GroupItems;
    var g = eg.getActiveGroupItem();
    // HACK: seems dirty but works as expected
    _executeSoon(function(){
      if(g.getChildren().length == 0)
      {
	// Check if group is listed in group-list to avoid closing user-created groups.
	// Don't close unnamed groups (Firefox does this itself).
	var title = g.getTitle();
	if(title.length > 0)
	{
	  var groups = autoGroupSettings.data();
	  if( "undefined" === typeof groups ) return;
	  if(groups.filter(function(item){ return item.groupName == title }).length > 0)
	  {
	    g.setTitle("");
	    if(!g.closeIfEmpty())
	    {
	      g.setTitle(title);
	    }
	    // Perform switching to previously viewed group
	    eg.setActiveGroupItem(eg.groupItems[eg.groupItems.length-1]);
	    window.parent.TabView.hide();
	  }
	}
      }
    });
  };
  
  // Event listeners
  window.addEventListener("load", function(){ autogroup.onLoad(); }, false);
}).apply(autogroup);

}
