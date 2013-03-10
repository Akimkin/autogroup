var EXPORTED_SYMBOLS = ["autoGroupSettings"];

/*
 * autoGroupSettings module
 */
if("undefined" === typeof(autoGroupSettings)){
  var autoGroupSettings = {};
  (function(){
    
    var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.autogroup.");
    var _data = undefined;
    
    var _isArray = function(x)
    {
      return ( "object" === typeof(x) )  && ( "Array" === x.constructor.name );
    }
    
    this.data = function()
    {
      if("undefined" === typeof(_data))
	this.load();
      return _data;
    };
    
    this.load = function()
    {
      var fs = prefManager.getComplexValue("groups", Components.interfaces.nsISupportsString).data;
      try {
	_data = (JSON.parse(fs));
	
	if ( !_isArray( _data ) ) throw(1);

	// Check for correct data
	for(var i = 0; i < _data.length; i++)
	{
	  if( "string" !== typeof _data[i].groupName ) throw(2);

	  if( !_isArray( _data[i].groupFilters ) ) throw(3);

	  for(var t = 0; t < _data[i].groupFilters.length; t++)
	  {
	    var fl = _data[i].groupFilters[t];
	    if( ( "string" !== typeof fl.fName ) || ( "undefined" === typeof fl.fgType ) || ( "undefined" === typeof fl.fsType ) || ( "string" !== typeof fl.fCheck ) )
	    	throw(4);
	  }
	  
	}
	
      }
      catch(e) {
	_data = undefined;
	return false;
      }
      
      return true;
    };
    
    this.save = function(newData, commit)
    {
      if ( !_isArray( newData ) ) throw(1);
      _data = newData;
      if( commit )
	this.commit();
    };
    
    this.commit = function()
    {
      // Check for correct data
      for( var i = 0; i < _data.length; i++ )
      {
	if ( !_isArray( _data ) ) throw(1);

	if(typeof _data[i].groupName !== "string") throw(2);

	if( !_isArray( _data[i].groupFilters ) )
	{
	  throw(3);
	}
   
	for( var t = 0; t < _data[i].groupFilters.length; t++ )
	{
	  var fl = _data[i].groupFilters[t];
	  if( ( "string" !== typeof fl.fName ) || ( "undefined" === typeof fl.fgType ) || ( "undefined" === typeof fl.fsType ) || ( "string" !== typeof fl.fCheck ) )
	  	throw(4);
	}
      }
      
      var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
      str.data = ( JSON.stringify( _data ) );
      prefManager.setComplexValue("groups", Components.interfaces.nsISupportsString, str);
      this.load();
    };
  }).apply(autoGroupSettings);
}
