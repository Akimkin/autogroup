Components.utils.import("resource://autogroup/settings.js");

if("undefined" === typeof(autoGroupOpts)){

 var autoGroupOpts = {};

(function(){
  // TODO: assign list objects to settings, Up/Down/Add/Del should be wrapped independently to list type.

  /**
   * Settings manager object
   */
  var settings = autoGroupSettings;

  // Check for correct settings
  try {
      settings.getFilterObject("group").load();
  } catch (e) {
      alert("Failed to parse group list!");
      return;
  }

  try {
      settings.getFilterObject("nogroup").load();
  } catch (e) {
      alert("Failed to parse nogroup list!");
      return;
  }

  /**
   * Immediate apply
   */
  var immediate = false;
  
  /**
   * Group data->tree mapping
   */
  var dTree = new function(){
    
    var idx = [];
 
    this.groupIndex = function(treeIndex){
      return idx.indexOf(idx.filter(function(i){ return (i <= treeIndex) }).pop());
    };
    
    this.treeIndex = function(groupIndex){
      return idx[groupIndex];
    };
    
    this.update = function(tree){
      idx = [];
      
      for(var i = 0; i < tree.view.rowCount; i++)
	if(tree.view.getLevel(i) == 0) idx.push(i);
    };
    
  };

  /**
   * A helper object to find elements by XPath
   */
  var docElement = new function() {

    var xulNsResolver = function(prefix) {
      return "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    };

    this.create = function(root, path, tagname, attributes, instant_append) {
      var parentIter = null;
      var parent = null;
      var newElem = null;

      if (root) {
        path = path || '/';
        parentIter = window.document.evaluate(path, root, xulNsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        parent = parentIter.singleNodeValue;
      }

      if (parent || !root) {
        newElem = window.document.createElement(tagname);
        for(var key in attributes) {
          if (attributes.hasOwnProperty(key)) {
            newElem.setAttribute(key, attributes[key]);
          }
        }

        if (parent && instant_append) {
          parent.appendChild(newElem);
        }
      }
      return newElem;
    };

    this.getAll = function(root, path) {
      var found = [];
      var res = null;
      var elemIter = window.document.evaluate(path, root, xulNsResolver, XPathResult.ANY_TYPE, null);

      while (res = elemIter.iterateNext()) {
        found.push(res);
      }
      return found;
    };

    this.get = function(root, path) {
      return window.document.evaluate(path, root, xulNsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    };

    this.delete = function(root, path) {
      var found = [];
      var res = null;
      var elemIter = window.document.evaluate(path, root, xulNsResolver, XPathResult.ANY_TYPE, null);

      while (res = elemIter.iterateNext()) {
        // NOTE: do we need it at all?
      }
    }
  };

  this.immediateState = function(state){
    if(!state)
      immediate = false;
    else
      immediate = true;
  }
  
  /**
  * buildTree - rebuild tree in groups TreeView for new group filter list
  * TODO: rewrite using XPATH routines from above
  * @param tree - groups TreeView
  */
  this.buildTree = function(tree){
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;

    // Actions hereinafter (in this function) are performed only with tree's 'treechildren'
    tree = tree.getElementsByTagName('treechildren')[0];
    
    // Clear tree view
    while(tree.hasChildNodes()){
      tree.removeChild(tree.lastChild);
    }
    
    // Load localized strings
    var lStr = docElement.get(window.document, '//*[@id="autogroup-opts-string-bundle"]');
    
      for(var i = 0; i < data.length; i++){
	var gItem = docElement.create(null, null, 'treeitem', {
          'container': true, 'open': true
        });
	var gRow = docElement.create(null, null, 'treerow');
	var gCell = docElement.create(null, null, 'treecell', {
          'label': (data[i].groupName.length > 0)?data[i].groupName:('('+lStr.getString('unNamedGroup')+')')
        });
	gRow.appendChild(gCell);
	gItem.appendChild(gRow);
	
	var fCnt = docElement.create(null, null, 'treechildren');
	for(var t = 0; t < data[i].groupFilters.length; t++){
	  var fItem = docElement.create(null, null, 'treeitem');
	  var fRow = docElement.create(null, null, 'treerow');
	  var fCell = docElement.create(null, null, 'treecell', {
            'label': (data[i].groupFilters[t].fName.length > 0)?data[i].groupFilters[t].fName:('('+lStr.getString('unNamedFilter')+')')
          });
	  fRow.appendChild(fCell);
	  fItem.appendChild(fRow);
	  fCnt.appendChild(fItem);
	  gItem.appendChild(fCnt);
	}
	// Add "+New"-cell for adding new filters
	var nfItem = docElement.create(null, null, 'treeitem');
	var nfRow = docElement.create(null, null, 'treerow');
	var nfCell = docElement.create(null, null, 'treecell', {
          'label': '(+) '+lStr.getString('newFilterCaption')
        });
	nfRow.appendChild(nfCell);
	nfItem.appendChild(nfRow);
	fCnt.appendChild(nfItem);
	gItem.appendChild(fCnt);
	
	tree.appendChild(gItem);
      }
      // Add "*New"-cell for adding new groups
      var ngItem = window.document.createElement('treeitem');
      var ngRow = window.document.createElement('treerow');
      var ngCell = docElement.create(null, null, 'treecell', {
        'label': '(*) '+lStr.getString('newGroupCaption')
      });
      ngRow.appendChild(ngCell);
      ngItem.appendChild(ngRow);
      tree.appendChild(ngItem);

    dTree.update(tree.parentNode);
    return true;
  };


  /**
  * treeAddGroup - add new group to list
  * */
  this.treeAddGroup = function(tree){
    // Get group data
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;
    
    // Add new group and save it to preferences
    data.push({'groupName': document.getElementById('object_name').value, 'groupFilters': []});
    settings.getFilterObject("group").save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildTree(tree);
    tree.disabled = false;
    tree.view.selection.select(tree.view.rowCount-3);
  };

  /**
  * treeSaveGroup - apply group changes
  * */
  this.treeSaveGroup = function(tree){
    // Get group data
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;
    
    var c = tree.currentIndex;
    // Find group index
    var p = dTree.groupIndex(c);
    // Rename group and save new name
    data[p].groupName = document.getElementById('object_name').value;
    settings.groupFilters.save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildTree(tree);
    tree.disabled = false;  
    tree.view.selection.select(c);
  };

  /**
  * treeDelGroup - remove group from list
  * */
  this.treeDelGroup = function(tree){
    // Get group data
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;
    var c = tree.currentIndex;
    // Find group index
    var p = dTree.groupIndex(c);
    // Select after deleting
    var sel = (p == 0)?(p):(dTree.treeIndex(p-1));
    // Confirm deletion if group has any filters
    if(data[p].groupFilters.length > 0){
      var lStr = document.getElementById('autogroup-opts-string-bundle');
      if(!confirm(lStr.getFormattedString('confirmDeleteGroup', [data[p].groupName, data[p].groupFilters.length]))) return;
    }
    // Remove group and save options
    data.splice(p, 1);
    settings.getFilterObject("group").save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildTree(tree);
    tree.disabled = false;  
    tree.view.selection.select(sel);
  };


  /**
  * treeAddFilter - add new filter to selected group in list
  * */
  this.treeAddFilter = function(tree){
    // Get group data
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;
 
    var fExp = document.getElementById('f_expression').value;
    // Check for empty expressions
    if(fExp.replace(/(^\s+)|(\s+$)/g, "") == "") return;
    var c = tree.currentIndex;
    var p = dTree.groupIndex(c);
    // Update data
    data[p].groupFilters.push({
      'fName':  document.getElementById('object_name').value, 
      'fsType': document.getElementById('match-select').selectedIndex,
      'fgType': document.getElementById('search-select').selectedIndex,
      'fCheck': fExp
    });
    // Save data
    settings.getFilterObject("group").save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildTree(tree);
    tree.disabled = false; 
    tree.view.selection.select(c);
  };

  /**
  * treeSaveFilter - apply filter changes
  * */
  this.treeSaveFilter = function(tree){
    // Get group data
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;
 
    var c = tree.currentIndex;
    var p = dTree.groupIndex(c);
    // Update filter data
    var cf = data[p].groupFilters[tree.currentIndex-tree.view.getParentIndex(tree.currentIndex)-1];
    cf.fName = document.getElementById('object_name').value;
    cf.fsType = document.getElementById('match-select').selectedIndex;
    cf.fgType = document.getElementById('search-select').selectedIndex;
    cf.fCheck = document.getElementById('f_expression').value;
    // Save data
    settings.getFilterObject("group").save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildTree(tree);
    tree.disabled = false; 
    tree.view.selection.select(c);
  };

  /**
  * treeDelFilter - remove selected filter from its group in list
  * */
  this.treeDelFilter = function(tree){
    // Get group data
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;

    var c = tree.currentIndex;
    var p = dTree.groupIndex(c);
    // Remove selected filter
    data[p].getFilterObject("group").splice(tree.currentIndex-tree.view.getParentIndex(tree.currentIndex)-1, 1);
    // Save data
    settings.getFilterObject("group").save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildTree(tree);
    tree.disabled = false; 
    tree.view.selection.select(c-1); 
  };

  /**
  * treeItemSelected - change the editing frame according to selection
  * */
  this.treeItemSelected = function(tree){
    // Get localized strings
    var lStr = document.getElementById('autogroup-opts-string-bundle');
    // Some frequently referenced buttons
    var addsave = document.getElementById('btn-group-addsave');
    var btnRemove = document.getElementById('btn-group-remove');
    var btnUp = document.getElementById('btn-group-up');
    var btnDown = document.getElementById('btn-group-down');
    
    
    // NOTE: dirty solution for NS_ILLEGAL_VALUE exception
    // that raises when using getLevel() here
    var cl = null;
    try{
      cl = tree.view.getLevel(tree.currentIndex)
    }catch(e){
      if(typeof cl !== "integer")
	return;
    }

    // Get group data.
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;


    if(tree.view.getLevel(tree.currentIndex) == 0){
      document.getElementById('filter-box').style.display = 'none';
      document.getElementById('obj-name').value = lStr.getString('groupName');
      if(tree.currentIndex != tree.view.rowCount-1){
	document.getElementById('object_name').value = tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(0));
	addsave.label = lStr.getString('editButtonCaption');
	addsave.setAttribute('icon', 'apply');
	addsave.onclick = function(){autoGroupOpts.treeSaveGroup(tree)};
	btnRemove.disabled = false;
	btnRemove.onclick = function(){autoGroupOpts.treeDelGroup(tree)};
	// Disable Up-button for first group in list and Down-button for last one
	btnUp.disabled = (tree.currentIndex == 0)?(true):false;
	btnDown.disabled = (dTree.groupIndex(tree.currentIndex) == data.length-1)?(true):false;
      }else{
	document.getElementById('object_name').value = lStr.getString('newGroupName');
	addsave.label = lStr.getString('addButtonCaption');
	addsave.setAttribute('icon', 'add');
	addsave.onclick = function(){autoGroupOpts.treeAddGroup(tree)};
	btnRemove.disabled = true;
	btnUp.disabled = true;
	btnDown.disabled = true;
      }
    }else{
      document.getElementById('filter-box').style.display = '';
      document.getElementById('obj-name').value = lStr.getString('filterName');
      if(tree.view.getLevel(tree.currentIndex+1) != 0){

	document.getElementById('object_name').value = tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(0));
	addsave.label = lStr.getString('editButtonCaption');
	addsave.setAttribute('icon', 'apply');
	addsave.onclick = function(){autoGroupOpts.treeSaveFilter(tree)};
	var p = dTree.groupIndex(tree.currentIndex);
	var cf = data[p].groupFilters[tree.currentIndex-tree.view.getParentIndex(tree.currentIndex)-1];
	// NOTE: Another dirty solution for 'cf is undefined message'
	if(typeof cf === "undefined")
	  return;
	document.getElementById('f_expression').value = cf.fCheck;
	document.getElementById('match-select').selectedIndex = cf.fsType;
	document.getElementById('search-select').selectedIndex = cf.fgType;
	btnRemove.disabled = false;
	btnRemove.onclick = function(){autoGroupOpts.treeDelFilter(tree)};
	// Disable Up-button for first filter in list and Down-button for last
	btnUp.disabled = (tree.view.getLevel(tree.currentIndex-1) > 0)?(false):true;
	btnDown.disabled = (tree.view.getLevel(tree.currentIndex+2) > 0)?(false):true;
      }else{
	document.getElementById('object_name').value = lStr.getString('newFilterName');
	addsave.label = lStr.getString('addButtonCaption');
	addsave.setAttribute('icon', 'add');
	addsave.onclick = function(){autoGroupOpts.treeAddFilter(tree)};
	document.getElementById('f_expression').value = '';
	document.getElementById('match-select').selectedIndex = 1;
	document.getElementById('search-select').selectedIndex = 0;
	btnRemove.disabled = true;
	btnUp.disabled = true;
	btnDown.disabled = true;
      }
    }
  };

  /**
  * treeMoveUp - move up the selected tree item
  * */
  this.treeMoveUp = function(tree_path){
    // Get group data
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;

    var tree = docElement.get(window.document, tree_path);
    if (!tree) {
      throw ("Element not found by path: ".concat(tree_path));
    }

    var c = tree.currentIndex;
    if((c == 0) || (c == tree.view.rowCount-1) || (tree.view.getLevel(tree.currentIndex+1) == 0) || (tree.view.getLevel(tree.currentIndex-1) == 0)) return;
    var lv = tree.view.getLevel(c)
    
    var lh = (lv == 0)?tree.view.getParentIndex(c-1):c-1;
    
    // Find group index
    var p = dTree.groupIndex(c);
    
    if(lv == 0){
      // Swap groups
      var tmp = data[p];
      data[p] = data[p-1];
      data[p-1] = tmp;
    }else{
      // Swap filters
      var pr = tree.view.getParentIndex(c);
      var tmp = data[p].groupFilters[c-pr-1];
      data[p].groupFilters[c-pr-1] = data[p].groupFilters[c-pr-2];
      data[p].groupFilters[c-pr-2] = tmp;
    }
    
    // Save data
    settings.getFilterObject("group").save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildTree(tree);
    tree.disabled = false;
    tree.view.selection.select(lh);
    
  };

  /**
  * treeMoveDown - move down the selected tree item
  * */
  this.treeMoveDown = function(tree_path){
    // Get group data
    var data = settings.getFilterObject("group").data();
    if(typeof(data) === "undefined") return;

    var tree = docElement.get(window.document, tree_path);
    if (!tree) {
      throw ("Element not found by path: ".concat(tree_path));
    }

    var c = tree.currentIndex;
    var lv = tree.view.getLevel(c)
    if((c == tree.view.rowCount-1) || (c == tree.view.rowCount-2) || (tree.view.getLevel(tree.currentIndex+1) == 0) || ((lv > 0) && (tree.view.getLevel(tree.currentIndex+2) == 0))) return;
    
    // Find group index
    var p = dTree.groupIndex(c);
    
    var lh = c+1;
      
    if(lv == 0){
      // Swap groups
      if(typeof data[p+1] === "undefined") return;
      lh += data[p+1].groupFilters.length+1;
      
      var tmp = data[p];
      data[p] = data[p+1];
      data[p+1] = tmp;
    }else{
      // Swap filters
      var pr = tree.view.getParentIndex(c);
      var tmp = data[p].groupFilters[c-pr-1];
      data[p].groupFilters[c-pr-1] = data[p].groupFilters[c-pr];
      data[p].groupFilters[c-pr] = tmp;
    }
    
    // Save data
    settings.getFilterObject("group").save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildTree(tree);
    tree.disabled = false;
    tree.view.selection.select(lh);
  };

  this.listMoveUp = function(list_path){
  };

  this.listMoveDown = function(list_path){
  };

  this.listItemSelected = function(list) {
  };

  this.accept = function(){
    try {
      settings.getFilterObject("group").commit(/*settings.getFilterObject("group").data()*/);
    } catch(e) {
      alert("Failed to save settings (" + e + ")!");
      return false;
    }
    return true;
  };
  
  this.discard = function(){
    if(false === settings.getFilterObject("group").load())
      alert("Failed to reset settings!");
    return true;
  };
  
}).apply(autoGroupOpts);

}