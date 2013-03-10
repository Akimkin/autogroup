Components.utils.import("resource://autogroup/settings.js");

if("undefined" === typeof(autoGroupOpts)){

 var autoGroupOpts = {};

(function(){
  
  /**
   * Settings manager object
   */
  var settings = autoGroupSettings;
  
  // Check for correct settings
  if(false === settings.load()){
    alert("Failed to parse group list!");
    return;
  }
  
  /**
   * Immediate apply
   */
  var immediate = false;
  
  /**
   * Data->tree mapping
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
  
  this.immediateState = function(state){
    if(!state)
      immediate = false;
    else
      immediate = true;
  }
  
  /**
  * buildList - rebuild tree in groups TreeView for new group filter list
  * @param tree - groups TreeView
  */
  this.buildList = function(tree){
    var data = settings.data();
    if(typeof(data) === "undefined") return;

    // Actions hereinafter (in this function) are performed only with tree's 'treechildren'
    tree = tree.getElementsByTagName('treechildren')[0];
    
    // Clear tree view
    while(tree.hasChildNodes()){
      tree.removeChild(tree.lastChild);
    }
    
    // Load localized strings
    var lStr = document.getElementById('autogroup-opts-string-bundle');
    
      for(var i = 0; i < data.length; i++){
	var gItem = window.document.createElement('treeitem');
	gItem.setAttribute('container', true);
	gItem.setAttribute('open', true);
	var gRow = window.document.createElement('treerow');
	var gCell = window.document.createElement('treecell');
	gCell.setAttribute('label', (data[i].groupName.length > 0)?data[i].groupName:('('+lStr.getString('unNamedGroup')+')'));
	gRow.appendChild(gCell);
	gItem.appendChild(gRow);
	
	var fCnt = window.document.createElement('treechildren');
	for(var t = 0; t < data[i].groupFilters.length; t++){
	  var fItem = window.document.createElement('treeitem');
	  var fRow = window.document.createElement('treerow');
	  var fCell = window.document.createElement('treecell');
	  fCell.setAttribute('label', (data[i].groupFilters[t].fName.length > 0)?data[i].groupFilters[t].fName:('('+lStr.getString('unNamedFilter')+')'));
	  fRow.appendChild(fCell);
	  fItem.appendChild(fRow);
	  fCnt.appendChild(fItem);
	  gItem.appendChild(fCnt);
	}
	// Add "+New"-cell for adding new filters
	var nfItem = window.document.createElement('treeitem');
	var nfRow = window.document.createElement('treerow');
	var nfCell = window.document.createElement('treecell');
	nfCell.setAttribute('label', '(+) '+lStr.getString('newFilterCaption'));
	nfRow.appendChild(nfCell);
	nfItem.appendChild(nfRow);
	fCnt.appendChild(nfItem);
	gItem.appendChild(fCnt);
	
	tree.appendChild(gItem);
      }
      // Add "*New"-cell for adding new groups
      var ngItem = window.document.createElement('treeitem');
      var ngRow = window.document.createElement('treerow');
      var ngCell = window.document.createElement('treecell');
      ngCell.setAttribute('label', '(*) '+lStr.getString('newGroupCaption'));
      ngRow.appendChild(ngCell);
      ngItem.appendChild(ngRow);
      tree.appendChild(ngItem);

    dTree.update(tree.parentNode);
     
    return true;
  };


  /**
  * listAddGroup - add new group to list
  * */
  this.listAddGroup = function(tree){
    // Get group data
    var data = settings.data();
    if(typeof(data) === "undefined") return;
    
    // Add new group and save it to preferences
    data.push({'groupName': document.getElementById('object_name').value, 'groupFilters': []});
    settings.save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildList(tree);
    tree.disabled = false;
    tree.view.selection.select(tree.view.rowCount-3);
  };

  /**
  * listSaveGroup - apply group changes
  * */
  this.listSaveGroup = function(tree){
    // Get group data
    var data = settings.data();
    if(typeof(data) === "undefined") return;
    
    var c = tree.currentIndex;
    // Find group index
    var p = dTree.groupIndex(c);
    // Rename group and save new name
    data[p].groupName = document.getElementById('object_name').value;
    settings.save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildList(tree);
    tree.disabled = false;  
    tree.view.selection.select(c);
  };

  /**
  * listDelGroup - remove group from list
  * */
  this.listDelGroup = function(tree){
    // Get group data
    var data = settings.data();
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
    settings.save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildList(tree);
    tree.disabled = false;  
    tree.view.selection.select(sel);
  };


  /**
  * listAddFilter - add new filter to selected group in list
  * */
  this.listAddFilter = function(tree){
    // Get group data
    var data = settings.data();
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
    settings.save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildList(tree);
    tree.disabled = false; 
    tree.view.selection.select(c);
  };

  /**
  * listSaveFilter - apply filter changes
  * */
  this.listSaveFilter = function(tree){
    // Get group data
    var data = settings.data();
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
    settings.save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildList(tree);
    tree.disabled = false; 
    tree.view.selection.select(c);
  };

  /**
  * listDelFilter - remove selected filter from its group in list
  * */
  this.listDelFilter = function(tree){
    // Get group data
    var data = settings.data();
    if(typeof(data) === "undefined") return;

    var c = tree.currentIndex;
    var p = dTree.groupIndex(c);
    // Remove selected filter
    data[p].groupFilters.splice(tree.currentIndex-tree.view.getParentIndex(tree.currentIndex)-1, 1);
    // Save data
    settings.save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildList(tree);
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
    var addsave = document.getElementById('addsave');
    var btnRemove = document.getElementById('btn-remove');
    var btnUp = document.getElementById('btn-up');
    var btnDown = document.getElementById('btn-down');
    
    
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
    var data = settings.data();
    if(typeof(data) === "undefined") return;


    if(tree.view.getLevel(tree.currentIndex) == 0){
      document.getElementById('filter-box').style.display = 'none';
      document.getElementById('obj-name').value = lStr.getString('groupName');
      if(tree.currentIndex != tree.view.rowCount-1){
	document.getElementById('object_name').value = tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(0));
	addsave.label = lStr.getString('editButtonCaption');
	addsave.setAttribute('icon', 'apply');
	addsave.onclick = function(){autoGroupOpts.listSaveGroup(tree)};
	btnRemove.disabled = false;
	btnRemove.onclick = function(){autoGroupOpts.listDelGroup(tree)};
	// Disable Up-button for first group in list and Down-button for last one
	btnUp.disabled = (tree.currentIndex == 0)?(true):false;
	btnDown.disabled = (dTree.groupIndex(tree.currentIndex) == data.length-1)?(true):false;
      }else{
	document.getElementById('object_name').value = lStr.getString('newGroupName');
	addsave.label = lStr.getString('addButtonCaption');
	addsave.setAttribute('icon', 'add');
	addsave.onclick = function(){autoGroupOpts.listAddGroup(tree)};
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
	addsave.onclick = function(){autoGroupOpts.listSaveFilter(tree)};
	var p = dTree.groupIndex(tree.currentIndex);
	var cf = data[p].groupFilters[tree.currentIndex-tree.view.getParentIndex(tree.currentIndex)-1];
	// NOTE: Another dirty solution for 'cf is undefined message'
	if(typeof cf === "undefined")
	  return;
	document.getElementById('f_expression').value = cf.fCheck;
	document.getElementById('match-select').selectedIndex = cf.fsType;
	document.getElementById('search-select').selectedIndex = cf.fgType;
	btnRemove.disabled = false;
	btnRemove.onclick = function(){autoGroupOpts.listDelFilter(tree)};
	// Disable Up-button for first filter in list and Down-button for last
	btnUp.disabled = (tree.view.getLevel(tree.currentIndex-1) > 0)?(false):true;
	btnDown.disabled = (tree.view.getLevel(tree.currentIndex+2) > 0)?(false):true;
      }else{
	document.getElementById('object_name').value = lStr.getString('newFilterName');
	addsave.label = lStr.getString('addButtonCaption');
	addsave.setAttribute('icon', 'add');
	addsave.onclick = function(){autoGroupOpts.listAddFilter(tree)};
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
  * listMoveUp - move up the selected tree or list item
  * */
  this.listMoveUp = function(tree){
    // Get group data
    var data = settings.data();
    if(typeof(data) === "undefined") return;
    
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
    settings.save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildList(tree);
    tree.disabled = false;
    tree.view.selection.select(lh);
    
  };

  /**
  * listMoveDown - move down the selected tree or list item
  * */
  this.listMoveDown = function(tree){
    // Get group data
    var data = settings.data();
    if(typeof(data) === "undefined") return;

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
    settings.save(data, immediate);

    tree.disabled = true;
    // Rebuild list
    this.buildList(tree);
    tree.disabled = false;
    tree.view.selection.select(lh);
  };

  
  this.accept = function(){
    try {
      settings.commit(settings.data());
    } catch(e) {
      alert("Failed to save settings ("+e+")!");
      return false;
    }
    return true;
  }
  
  this.discard = function(){
    if(false === settings.load())
      alert("Failed to reset settings!");
    return true;
  }
  
}).apply(autoGroupOpts);

}