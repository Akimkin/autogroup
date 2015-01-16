Components.utils.import("resource://autogroup/settings.js");

if ("undefined" === typeof(autoGroupOpts)) {

    var autoGroupOpts = {};

    (function(){
        /**
         * Settings manager object
         */
        var settings = autoGroupSettings;

        /**
         * Immediate apply
         */
        var immediate = false;

        /**
         * A helper object to find elements by XPath
         */
        var dom_helper = new function() {
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
            };
        };

        var immediateState = function(state) {
            immediate = state;
        };

        /**
         * _controllerFeatures - controller configuration
         * @type {{group: {dataProvider: *, isTree: boolean, treeIndexObject, uiPath: string}, nogroup: {dataProvider: *, uiPath: string}}}
         * @private
         */
        var _controllerFeatures = {
            group: new function() {
                var data_provider = settings.getFilterObject("group");

                var ui_list_path = "//xul:prefpane[@id='autogroup-pane-groups']/xul:tree[@id='group-list']";
                var selection_mode = "group";
                var input_mode = "add";

                // Most required dialog controls
                var locale_strings;
                var tree;
                var btn_addsave;
                var btn_remove;
                var btn_up;
                var btn_down;
                var in_objname;
                var in_filter_expr;
                var sel_filter_match;
                var sel_filter_search;
                var box_filter;

                var tree_helper = new function() {
                    var idx = [];

                    this.groupIndex = function(tree_index) {
                        return idx.indexOf(idx.filter(function(i) { return (i <= tree_index) }).pop());
                    };

                    this.treeIndex = function(group_index) {
                        return idx[group_index];
                    };

                    this.update = function(tree_element) {
                        idx = [];
                        for (var i = 0; i < tree_element.view.rowCount; i++) {
                            if (tree_element.view.getLevel(i) === 0) {
                                idx.push(i);
                            }
                        }
                    };
                };

                var addGroup = function() {
                    // Get group data
                    var data = data_provider.data();
                    if(typeof(data) === "undefined") {
                        return;
                    }
                    // Add new group and save it to preferences
                    data.push({
                        'groupName': in_objname.value,
                        'groupFilters': []
                    });
                    data_provider.save(data, immediate);
                    // Rebuild list
                    tree.disabled = true;
                    buildTree(tree);
                    tree.disabled = false;
                    tree.view.selection.select(tree.view.rowCount-3);
                };

                var updateGroup = function() {
                    // Get group data
                    var data = data_provider.data();
                    var curr_idx = tree.currentIndex;
                    // Find group index
                    var group_idx = tree_helper.groupIndex(curr_idx);
                    // Rename group and save new name
                    data[group_idx].groupName = in_objname.value;
                    data_provider.save(data, immediate);
                    // Rebuild list
                    tree.disabled = true;
                    buildTree(tree);
                    tree.disabled = false;
                    tree.view.selection.select(curr_idx);
                };

                var removeGroup = function() {
                    // Get group data
                    var data = data_provider.data();
                    var curr_idx = tree.currentIndex;
                    // Find group index
                    var group_idx = tree_helper.groupIndex(curr_idx);
                    // Select after deleting
                    var sel = (group_idx === 0) ? group_idx : (tree_helper.treeIndex(group_idx - 1));
                    // Confirm deletion if group has any filters
                    if (data[group_idx].groupFilters.length > 0) {
                        if (!confirm(locale_strings.getFormattedString('confirmDeleteGroup',
                                [data[group_idx].groupName, data[group_idx].groupFilters.length]))) {
                            return;
                        }
                    }
                    // Remove group and save options
                    data.splice(group_idx, 1);
                    data_provider.save(data, immediate);
                    // Rebuild list
                    tree.disabled = true;
                    buildTree(tree);
                    tree.disabled = false;
                    tree.view.selection.select(sel);
                };

                var addFilter = function() {
                    // Get group data
                    var data = data_provider.data();
                    if(typeof(data) === "undefined") {
                        return;
                    }

                    var filter_expr = in_filter_expr.value;
                    // Check for empty expressions
                    if (!filter_expr.replace(/(^\s+)|(\s+$)/g, "")) {
                        return;
                    }
                    var curr_idx = tree.currentIndex;
                    var group_idx = tree_helper.groupIndex(curr_idx);
                    // Update data
                    data[group_idx].groupFilters.push({
                        'fName':  in_objname.value,
                        'fsType': sel_filter_match.selectedIndex,
                        'fgType': sel_filter_search.selectedIndex,
                        'fCheck': filter_expr
                    });
                    // Save data
                    data_provider.save(data, immediate);
                    // Refresh tree
                    tree.disabled = true;
                    buildTree(tree);
                    tree.disabled = false;
                    tree.view.selection.select(curr_idx);
                };

                var updateFilter = function() {
                    // Get group data
                    var data = data_provider.data();
                    var curr_idx = tree.currentIndex;
                    var group_idx = tree_helper.groupIndex(curr_idx);
                    // Update filter data
                    var filter = data[group_idx].groupFilters[tree.currentIndex - tree.view.getParentIndex(tree.currentIndex) - 1];
                    filter.fName = in_objname.value;
                    filter.fsType = sel_filter_match.selectedIndex;
                    filter.fgType = sel_filter_search.selectedIndex;
                    filter.fCheck = in_filter_expr.value;
                    // Save data
                    data_provider.save(data, immediate);
                    // Rebuild list
                    tree.disabled = true;
                    buildTree(tree);
                    tree.disabled = false;
                    tree.view.selection.select(curr_idx);
                };

                var removeFilter = function() {
                    // Get group data
                    var data = data_provider.data();
                    var curr_idx = tree.currentIndex;
                    var group_idx = tree_helper.groupIndex(curr_idx);
                    // Remove selected filter
                    data[group_idx].groupFilters.splice(tree.currentIndex - tree.view.getParentIndex(tree.currentIndex) - 1, 1);
                    // Save data
                    data_provider.save(data, immediate);
                    // Rebuild list
                    tree.disabled = true;
                    buildTree(tree);
                    tree.disabled = false;
                    tree.view.selection.select(curr_idx - 1);
                };

                var setSelectionMode = function(selection, input) {
                    var data = data_provider.data();
                    in_objname = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-groups']/xul:textbox[@id='object_name']");
                    var label_objname = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-groups']/xul:label[@id='obj-name']");

                    if ('group' == selection) {
                        selection_mode = selection;
                        box_filter.style.display = 'none';
                        label_objname.value = locale_strings.getString('groupName');
                        if ('edit' == input) {
                            input_mode = input;
                            in_objname.value = tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(0));
                            btn_addsave.label = locale_strings.getString('editButtonCaption');
                            btn_addsave.setAttribute('icon', 'apply');
                            btn_remove.disabled = false;
                            btn_up.disabled = (tree.currentIndex === 0);
                            btn_down.disabled = (tree_helper.groupIndex(tree.currentIndex) == data.length - 1);
                        } else {
                            input_mode = input;
                            in_objname.value = locale_strings.getString('newGroupName');
                            btn_addsave.label = locale_strings.getString('addButtonCaption');
                            btn_addsave.setAttribute('icon', 'add');
                            btn_remove.disabled = true;
                            btn_up.disabled = true;
                            btn_down.disabled = true;
                        }
                    } else if ('filter' == selection) {
                        selection_mode = selection;
                        box_filter.style.display = '';
                        label_objname.value = locale_strings.getString('filterName');
                        if ('edit' == input) {
                            input_mode = input;
                            in_objname.value = tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(0));
                            btn_addsave.label = locale_strings.getString('editButtonCaption');
                            btn_addsave.setAttribute('icon', 'apply');
                            var group_idx = tree_helper.groupIndex(tree.currentIndex);
                            var filter = data[group_idx].groupFilters[tree.currentIndex-tree.view.getParentIndex(tree.currentIndex)-1];
                            in_filter_expr.value = filter.fCheck;
                            sel_filter_match.selectedIndex = filter.fsType;
                            sel_filter_search.selectedIndex = filter.fgType;
                            btn_remove.disabled = false;
                            btn_up.disabled = (tree.view.getLevel(tree.currentIndex - 1) <= 0);
                            btn_down.disabled = (tree.view.getLevel(tree.currentIndex + 2) <= 0);
                        } else {
                            input_mode = input;
                            in_objname.value = locale_strings.getString('newFilterName');
                            btn_addsave.label = locale_strings.getString('addButtonCaption');
                            btn_addsave.setAttribute('icon', 'add');
                            in_filter_expr.value = '';
                            sel_filter_match.selectedIndex = 1;
                            sel_filter_search.selectedIndex = 0;
                            btn_remove.disabled = true;
                            btn_up.disabled = true;
                            btn_down.disabled = true;
                        }
                    } else {
                        throw ("Unknown selection mode: " + selection.toString());
                    }
                };

                var buildTree = function(tree_element) {
                    var data = data_provider.data();
                    if ("undefined" === typeof data) {
                        return;
                    }

                    // Actions hereinafter (in this function) are performed only with tree's 'treechildren'
                    tree_element = tree_element.getElementsByTagName('treechildren')[0];

                    var appendFilterToTree = function(container, filter) {
                        var filter_item = dom_helper.create(null, null, 'treeitem');
                        var filter_row = dom_helper.create(null, null, 'treerow');
                        var filter_cell = dom_helper.create(null, null, 'treecell', {
                            'label': (filter.fName.length > 0) ? filter.fName : ('(' + locale_strings.getString('unNamedFilter').toString() + ')')
                        });
                        filter_row.appendChild(filter_cell);
                        filter_item.appendChild(filter_row);
                        container.appendChild(filter_item);
                        return true;
                    };

                    var appendGroupToTree = function(group) {
                        var group_item = dom_helper.create(null, null, 'treeitem', {
                            'container': true, 'open': true
                        });
                        var group_row = dom_helper.create(null, null, 'treerow');
                        var group_cell = dom_helper.create(null, null, 'treecell', {
                            'label': (group.groupName.length > 0) ? group.groupName : ('(' + locale_strings.getString('unNamedGroup').toString() + ')')
                        });
                        group_row.appendChild(group_cell);
                        group_item.appendChild(group_row);
                        var filter_container = dom_helper.create(null, null, 'treechildren');
                        group.groupFilters.every(function(filter) {
                            return appendFilterToTree(filter_container, filter);
                        });
                        group_item.appendChild(filter_container);
                        // Add "+New"-cell for adding new filters
                        var new_item = dom_helper.create(null, null, 'treeitem');
                        var new_row = dom_helper.create(null, null, 'treerow');
                        var new_cell = dom_helper.create(null, null, 'treecell', {
                            'label': '(+) '+locale_strings.getString('newFilterCaption')
                        });
                        new_row.appendChild(new_cell);
                        new_item.appendChild(new_row);
                        filter_container.appendChild(new_item);
                        tree_element.appendChild(group_item);
                        return true;
                    };

                    // Clear tree view
                    while (tree_element.hasChildNodes()) {
                        tree_element.removeChild(tree_element.lastChild);
                    }

                    // Add groups to tree
                    data.every(function(group) {
                        return appendGroupToTree(group);
                    });

                    // Add "*New"-cell for adding new groups
                    var new_item = window.document.createElement('treeitem');
                    var new_row = window.document.createElement('treerow');
                    var new_cell = dom_helper.create(null, null, 'treecell', {
                        'label': '(*) ' + locale_strings.getString('newGroupCaption').toString()
                    });
                    new_row.appendChild(new_cell);
                    new_item.appendChild(new_row);
                    tree_element.appendChild(new_item);
                    tree_helper.update(tree_element.parentNode);
                    return true;
                };

                this.submit = function() {
                    if ('group' == selection_mode && 'add' == input_mode) {
                        addGroup();
                    } else if ('filter' == selection_mode && 'add' == input_mode) {
                        addFilter();
                    } else if ('group' == selection_mode && 'edit' == input_mode) {
                        updateGroup();
                    } else if ('filter' == selection_mode && 'edit' == input_mode) {
                        updateFilter();
                    } else {
                        throw ("Unknown edit modes set (selection_mode=" + selection_mode.toString() + ", input_mode=" + input_mode.toString() + ")");
                    }
                };

                this.remove = function () {
                    if ('group' == selection_mode) {
                        removeGroup();
                    } else if ('filter' == selection_mode) {
                        removeFilter();
                    }
                };

                this.moveup = function() {
                    // Get group data
                    var data = data_provider.data();
                    var curr_idx = tree.currentIndex;
                    if ((curr_idx === 0) || (curr_idx == tree.view.rowCount-1) || (tree.view.getLevel(tree.currentIndex+1) === 0)
                        || (tree.view.getLevel(tree.currentIndex-1) === 0)) {
                        return;
                    }
                    var level = tree.view.getLevel(curr_idx);
                    var new_idx = (level === 0) ? tree.view.getParentIndex(curr_idx - 1) : curr_idx - 1;
                    var group_idx = tree_helper.groupIndex(curr_idx);
                    var tmp;
                    if (level === 0) {
                        // Swap groups
                        tmp = data[group_idx];
                        data[group_idx] = data[group_idx-1];
                        data[group_idx-1] = tmp;
                    } else {
                        // Swap filters
                        var parent_idx = tree.view.getParentIndex(curr_idx);
                        tmp = data[group_idx].groupFilters[curr_idx - parent_idx - 1];
                        data[group_idx].groupFilters[curr_idx - parent_idx - 1] = data[group_idx].groupFilters[curr_idx-parent_idx-2];
                        data[group_idx].groupFilters[curr_idx - parent_idx - 2] = tmp;
                    }
                    // Save data
                    data_provider.save(data, immediate);
                    // Rebuild list
                    tree.disabled = true;
                    buildTree(tree);
                    tree.disabled = false;
                    tree.view.selection.select(new_idx);
                };

                this.movedown = function() {
                    // Get group data
                    var data = data_provider.data();
                    var curr_idx = tree.currentIndex;
                    var level = tree.view.getLevel(curr_idx);
                    if ((curr_idx == tree.view.rowCount - 1) || (curr_idx == tree.view.rowCount - 2)
                        || (tree.view.getLevel(tree.currentIndex + 1) === 0)
                        || ((level > 0) && (tree.view.getLevel(tree.currentIndex + 2) === 0))) {
                        return;
                    }
                    var group_idx = tree_helper.groupIndex(curr_idx);
                    var new_idx = curr_idx + 1;

                    var tmp;
                    if (level === 0) {
                        // Swap groups
                        if ("undefined" === typeof data[group_idx + 1]) {
                            return;
                        }
                        new_idx += data[group_idx + 1].groupFilters.length + 1;
                        tmp = data[group_idx];
                        data[group_idx] = data[group_idx + 1];
                        data[group_idx+1] = tmp;
                    } else {
                        // Swap filters
                        var parent_idx = tree.view.getParentIndex(curr_idx);
                        tmp = data[group_idx].groupFilters[curr_idx - parent_idx - 1];
                        data[group_idx].groupFilters[curr_idx - parent_idx - 1] = data[group_idx].groupFilters[curr_idx - parent_idx];
                        data[group_idx].groupFilters[curr_idx - parent_idx] = tmp;
                    }

                    // Save data
                    data_provider.save(data, immediate);
                    // Rebuild list
                    tree.disabled = true;
                    buildTree(tree);
                    tree.disabled = false;
                    tree.view.selection.select(new_idx);
                };

                this.select = function() {
                    var sel_mode;
                    var inp_mode = 'edit';
                    var level;
                    // NOTE: dirty solution for NS_ILLEGAL_VALUE exception that sometimes raises on getLevel()
                    try {
                        level = tree.view.getLevel(tree.currentIndex);
                    } catch(e) {
                        if ("integer" !== typeof level) {
                            return;
                        }
                    }

                    if (level === 0) {
                        sel_mode = 'group';
                        if (tree.currentIndex == tree.view.rowCount - 1) {
                            inp_mode = 'add';
                        }
                    } else {
                        sel_mode = 'filter';
                        if (tree.view.getLevel(tree.currentIndex + 1) === 0) {
                            inp_mode = 'add';
                        }
                    }
                    setSelectionMode(sel_mode, inp_mode);
                };

                this.accept = function() {
                    try {
                        data_provider.commit();
                    } catch(e) {
                        alert("Failed to save settings (" + e.toString() + ")!");
                        return false;
                    }
                    return true;
                };

                this.discard = function() {
                    if (false === data_provider.load()) {
                        alert("Failed to reset settings!");
                    }
                    return true;
                };

                this.load = function() {
                    // Load localized strings
                    locale_strings = dom_helper.get(window.document, '//*[@id="autogroup-opts-string-bundle"]');
                    // Get dialog control objects
                    btn_addsave = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-groups']/*/xul:button[@id='btn-group-addsave']");
                    btn_remove = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-groups']/*/xul:button[@id='btn-group-remove']");
                    btn_up = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-groups']/*/xul:button[@id='btn-group-up']");
                    btn_down = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-groups']/*/xul:button[@id='btn-group-down']");
                    tree = dom_helper.get(window.document, ui_list_path);
                    // Get filter input controls
                    box_filter = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-groups']/xul:vbox[@id='filter-box']");
                    in_filter_expr = dom_helper.get(box_filter, "//xul:textbox[@id='f_expression']");
                    sel_filter_match = dom_helper.get(box_filter, "//xul:radiogroup[@id='match-select']");
                    sel_filter_search = dom_helper.get(box_filter, "//xul:radiogroup[@id='search-select']");

                    // Set instant apply property
                    var instant = dom_helper.get(window.document, '//*[@id="autogroup-preferences"]').instantApply;
                    immediateState(instant);

                    // Load settings
                    try {
                        data_provider.load();
                    } catch (e) {
                        alert("An error occurred when loading settings:\n" + e.toString());
                        return;
                    }

                    // Build tree
                    tree.disabled = true;
                    buildTree(tree);
                    tree.disabled = false;

                    // Set event handlers to controls
                    tree.addEventListener('select', this.select);
                    btn_addsave.addEventListener('click', this.submit);
                    btn_remove.addEventListener('click', this.remove);
                    btn_up.addEventListener('click', this.moveup);
                    btn_down.addEventListener('click', this.movedown);

                    // NOTE: this MUST be done after select event handler is set!
                    tree.view.selection.select(tree.view.rowCount - 1);
                };
            },
            nogroup: new function() {
                var data_provider = settings.getFilterObject("nogroup");
                var ui_list_path = "//xul:prefpane[@id='autogroup-pane-nogroup']/xul:listbox[@id='nogroup-list']";
                var input_mode = "add";

                // Most required dialog controls
                var locale_strings;
                var filter_list;
                var btn_addsave;
                var btn_remove;
                var btn_up;
                var btn_down;
                var in_objname;
                var in_filter_expr;
                var sel_filter_match;
                var sel_filter_search;
                var box_filter;

                this.moveup = function() {
                };

                this.movedown = function() {
                };

                this.submit = function() {
                    // TODO: add filter
                };

                this.select = function() {
                    // TODO: load filter
                };

                this.accept = function() {
                };

                this.discard = function() {
                };

                this.load = function() {
                    // Load localized strings
                    locale_strings = dom_helper.get(window.document, '//*[@id="autogroup-opts-string-bundle"]');
                    // Get dialog control objects
                    btn_addsave = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-nogroup']/*/xul:button[@id='btn-group-addsave']");
                    btn_remove = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-nogroup']/*/xul:button[@id='btn-group-remove']");
                    btn_up = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-nogroup']/*/xul:button[@id='btn-group-up']");
                    btn_down = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-nogroup']/*/xul:button[@id='btn-group-down']");
                    filter_list = dom_helper.get(window.document, ui_list_path);
                    // Get filter input controls
                    box_filter = dom_helper.get(window.document, "//xul:prefpane[@id='autogroup-pane-groups']/xul:vbox[@id='filter-box']");
                    in_filter_expr = dom_helper.get(box_filter, "//xul:textbox[@id='f_expression']");
                    sel_filter_match = dom_helper.get(box_filter, "//xul:radiogroup[@id='match-select']");
                    sel_filter_search = dom_helper.get(box_filter, "//xul:radiogroup[@id='search-select']");
                    // Set instant apply property
                    var instant = dom_helper.get(window.document, '//*[@id="autogroup-preferences"]').instantApply;
                    immediateState(instant);
                };
            }
        };

        var _requestedControllers = {};

        this.getPaneController = function(pane) {
            if (!(pane in _controllerFeatures)) {
                alert ("Controller for unknown pane '" + pane.toString() + "' requested");
                return;
            }

            if (pane in _requestedControllers) {
                return _requestedControllers[pane];
            }

            /**
             * Filter access object
             */
            var controller = {};
            (function() {
                var paneFeatures = _controllerFeatures[pane];

                var paneCall = function (method) {
                    if ("function" === typeof paneFeatures[method]) {
                        return paneFeatures[method]();
                    }
                };

                this.onLoad = function () {
                    return paneCall('load');
                };

                this.onSubmit = function() {
                    return paneCall('submit');
                };

                this.onRemove = function() {
                    return paneCall('remove');
                };

                this.onMoveUp = function() {
                    return paneCall('moveup');
                };

                this.onMoveDown = function() {
                    return paneCall('movedown');
                };

                this.onSelect = function() {
                    return paneCall('select');
                };

                this.refreshData = function() {
                    return paneCall('refresh');
                };

                this.onAccept = function() {
                    return paneCall('accept');
                };

                this.onDiscard = function() {
                    return paneCall('discard');
                }
            }).apply(controller);
            _requestedControllers[pane] = controller;
            return controller;
        };

        this.accept = function(){
            return Object.keys(_requestedControllers).every(function(key) {
                return _requestedControllers[key].onAccept();
            });
        };

        this.discard = function(){
            return Object.keys(_requestedControllers).every(function(key) {
                return _requestedControllers[key].onDiscard();
            });
        };
    }).apply(autoGroupOpts);
}