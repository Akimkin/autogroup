var EXPORTED_SYMBOLS = ["autoGroupSettings"];

/**
 * autoGroupSettings module
 */
if ("undefined" === typeof autoGroupSettings) {
    var autoGroupSettings = {};
    (function() {
        var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.autogroup.");

        var _isArray = function(x) {
            return ("object" === typeof x) && ("Array" === x.constructor.name);
        };

        /**
         * _filterQueries - filter query objects
         * @type {{group: {prefVar: string, checkFilter: Function, validate: Function}, nogroup: {prefVar: string, checkFilter: Function, validate: Function}}}
         * @private
         */
        var _filterQueries = {
            group: {
                prefVar: "groups",
                checkFilter:  function(fl) {
                    return ("string" === typeof fl.fName) && ("undefined" !== typeof fl.fgType)
                        && ("undefined" !== typeof fl.fsType) && ("string" === typeof fl.fCheck);
                },
                validate: function(data) {
                    if (!_isArray(data)) {
                        return false;
                    }

                    return data.every(function(group) {
                        if ("string" !== typeof group.groupName) {
                            return false;
                        }

                        if (!_isArray(group.groupFilters)) {
                            return false;
                        }

                        return group.groupFilters.every(_filterQueries.group.checkFilter);
                    });
                }
            },
            nogroup: {
                prefVar: "nogroup",
                checkFilter:  function(fl) {
                    return ("string" === typeof fl.fName) && ("undefined" !== typeof fl.fgType)
                        && ("undefined" !== typeof fl.fsType) && ("string" === typeof fl.fCheck);
                },
                validate: function(data) {
                    if (!_isArray(data)) {
                        return false;
                    }

                    return data.every(_filterQueries.nogroup.checkFilter);
                }
            }
        };

        var _requestedFilterObjects = {};

        this.getFilterObject = function (filter_type) {
            if (!(filter_type in _filterQueries)) {
                throw ("Filter object of unknown type '" + filter_type.toString() + "' requested");
            }

            if (filter_type in _requestedFilterObjects) {
                return _requestedFilterObjects[filter_type];
            }

            /**
             * Filter access object
             */
            var filterProvider = {};
            (function() {
                var _data = undefined;
                var _query = _filterQueries[filter_type];

                this.data = function() {
                    if ("undefined" === typeof(_data)) {
                        this.load();
                    }
                    return _data;
                };

                this.load = function() {
                    var prefString = prefManager.getComplexValue(_query.prefVar, Components.interfaces.nsISupportsString).data;
                    _data = (JSON.parse(prefString));

                    if (!_query.validate(_data)) {
                        _data = undefined;
                        throw ("[" + filter_type.toString() + "] Data validation failed");
                    }
                };

                this.save = function(newData, commit) {
                    if (!_isArray(newData)) {
                        throw ("[" + filter_type.toString() + "] Bad format of filter data!");
                    }
                    _data = newData;
                    if (commit) {
                        this.commit();
                    }
                };

                this.commit = function() {
                    if (!_query.validate(_data)) {
                        throw ("[" + filter_type.toString() + "] Data validation failed");
                    }

                    var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
                    str.data = (JSON.stringify(_data));
                    prefManager.setComplexValue(_query.prefVar, Components.interfaces.nsISupportsString, str);
                    this.load();
                }
            }).apply(filterProvider);
            _requestedFilterObjects[filter_type] = filterProvider;
            return filterProvider;
        };
    }).apply(autoGroupSettings);
}
