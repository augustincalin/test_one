/**
 * CMJSContext!
 */

var CMJSContext = CMJSContext || {};

CMJSContext.namespace = function (ns_string) {
	var parts = ns_string.split('.'),
		parent = CMJSContext,
		i;
		
		// strip redundant leading global
	if (parts[0] === "CMJSContext") {
		parts = parts.slice(1);
	}
		
	for (i = 0; i < parts.length; i += 1) {
		// create property if it doesn't exist
		if (typeof parent[parts[i]] === "undefined") {
			parent[parts[i]] = {};
		}
		parent = parent[parts[i]];
	}
	return parent;
};

CMJSContext.namespace('CMJSContext.page.properties');
CMJSContext.namespace('CMJSContext.page.elements');

CMJSContext.page.getProperty = function(key) {
	return CMJSContext.page.properties[key];
};

CMJSContext.isDisplayMode = function(mode) {
	return CMJSContext.page.properties.displayMode == mode;
};


/**
 * Elements
 */
CMJSContext.namespace('CMJSContext.Element');

/**
 * Constructor
 */
CMJSContext.Element = (function () {
	// dependencies
	if (!jQuery()) {
		if (typeof console !== "undefined") {
			console.warn("jQuery library is required.");
		}
	}
	
	// private properties

	var Constr, didInit = false;
	// private methods
	
	// init
	
	// Public API
	Constr = function () {};
	Constr.prototype = {
		constructor: CMJSContext.Element,
		version: "1.0"
	};
	
	return Constr;
}());

/**
  * calls init() when document is ready.
  */
CMJSContext.Element.prototype.willInit = function () {
	var self = this;
	
	if (!self.didInit && typeof this.init === 'function') {
		jQuery().ready(function () { 
			return self.init(); 
		});
	}	
	
	return this;
};
 

/**
 *
 * Factory Method
 * 
 * Returns null if an Element for the elemId has already been created
 */
CMJSContext.Element.factory = function (type, elemId, jsProperties, pageProperties) {
	
	if (CMJSContext.page.elements[elemId] !== undefined) {
		return null;
	}
	
	
	var constr = type,
		newElement;
	
	// error if the constructor does not exist
	if (!constr || typeof CMJSContext.Element[constr] !== "function") {
		constr = "Data";
		if (typeof console !== "undefined") {
			console.log("undefined type '"+type+"', defaulting to 'Data'.");
		}
	}
	
	// setup prototype for type
	if (typeof CMJSContext.Element[constr].prototype.willInit !== "function") {
		CMJSContext.Element[constr].prototype = new CMJSContext.Element();
	}
	
	newElement = new CMJSContext.Element[constr]();
	newElement.elemId = elemId;
	if (pageProperties) {
		newElement.pageProperties = pageProperties;
	}
	else {
		newElement.pageProperties = {};		
	}
	
	if (jsProperties) {
		newElement.jsProperties = jsProperties;
	} 
	else {
		newElement.jsProperties = {};		
	}
	
	newElement.children = [];
	
	CMJSContext.page.elements[elemId] = newElement;
	
	return newElement;
};

CMJSContext.Element.destroy = function(elemId) {
	if (CMJSContext.page.elements[elemId] === undefined) {
		return null;
	}

	var destroyElement = function(element) {
		if (!element) {
			return;
		}
		
		for (var i = 0; i < element.children.length; i++) {
			destroyElement(element.children[i]);
		}
		
		if (typeof element.destroy === "function") {
			element.destroy();
		}		
	};

	destroyElement(CMJSContext.page.elements[elemId]);

	delete CMJSContext.page.elements[elemId];
};



CMJSContext.Element.getElementById = function (elemId) {
	if (CMJSContext.page.elements[elemId] !== undefined) {
		return CMJSContext.page.elements[elemId];
	}
	return null;
}

/**
 * returns the elements "class" name
 */ 
CMJSContext.Element.prototype.getName = function () {
	return this.name;
};


/**
 * @return the corresponding DOM Element
 */
CMJSContext.Element.prototype.domElement = function () {
	if (this._domElement === undefined) {
		this._domElement = document.getElementById(this.elemId);
	}
	
	return this._domElement;
};

/**
 * @return the corresponding jQuery Element
 */
CMJSContext.Element.prototype.j = function () {
	return jQuery("#" + this.elemId);
};


/**
 * @return the parent Element
 */
CMJSContext.Element.prototype.parent = function () {
	
	if (this._parentElement === undefined) {
		var parentNode = this.domElement().parentNode,
			parentElement = null;
	
		while (parentNode !== null) {
			if (CMJSContext.page.elements[parentNode.id] !== null) {
				parentElement = CMJSContext.page.elements[parentNode.id];
				break;
			}
			parentNode = parentNode.parentNode;		
		}
		this._parentElement = parentElement;
	}
	
	return this._parentElement;
};

/**
 * set the parent and calls didSetParent. That method may be implemented e.g to subscribe to notifications
 */ 
CMJSContext.Element.prototype.setParent = function (parent) {
	var self = this;
	this._parentElement = parent;

	if (typeof this.didSetParent === "function") {
		this.didSetParent();
	}

	return this;
};

CMJSContext.Element.prototype.addToChildren = function (newChild) {
	if (typeof newChild.setParent === "function") { // type check
		this.children.push(newChild);
		newChild.setParent(this);
	}
	
	return this;
};

CMJSContext.Element.prototype.childIndex = function () {
	var index = -1;
	
	for(var i = 0; i < this.parent().children.length; i++) {
		if(this.parent().children[i] === this) {
			index = i;
			break;
		}
	}
	if(index == -1) {
		log.console(this.elemId + " is not in its parents children :-(");
	}
	
	return index;
};

CMJSContext.Element.prototype.previousSibling = function () {
	var returnValue = undefined;
	
	for(var i = 1; i < this.parent().children.length; i++) {
		if(this.parent().children[i] === this) {
			returnValue = this.parent().children[i-1];
			break;
		}
	}
	
	return returnValue;
};

CMJSContext.Element.prototype.nextSibling = function () {
	var returnValue = undefined;
	
	for(var i = 0; i < this.parent().children.length - 1 ; i++) {
		if(this.parent().children[i] === this) {
			returnValue = this.parent().children[i+1];
			break;
		}
	}

	return returnValue;
};

/**
 * Default Element, containing only data.
 */ 
CMJSContext.Element.Data = function () {
	this.name = "Data";
};

/*
CMJSContext.Element.Data.prototype = new CMJSContext.Element();
CMJSContext.Element.Data.prototype.willInit = function () {
	console.log("data will not init");
	return this;
};

CMJSContext.Element.Data.prototype.didSetParent = function () {
	console.log(this.getName() + "_" + this.elemId + ".didSetParent");
};
*/


/************************************************************************************
 * Notification Center stuff 
 *
 */

CMJSContext.namespace('CMJSContext.Notification');

/**
  * notification object passed around during notifications
  */
CMJSContext.Notification = (function () {
	
	// Public API
	var Constr = function (notificationName, notificationObject, userInfo) {
		this._notificationName = notificationName;
		this._notificationObject = notificationObject;
		this._userInfo = userInfo;
	};
	Constr.prototype = {
		constructor: CMJSContext.NotificationCenter,
		version: "1.0",

		notificationName : (function () { 
			return this._notificationName; 
		}),
		
		notificationObject : (function () { 
			return this._notificationObject; 
		}),
		
		userInfo : (function () {
			return this._userInfo;
		})
	};
	
	return Constr;
}());

CMJSContext.namespace('CMJSContext.NotificationCenter');
CMJSContext.NotificationCenter = (function () {
	
	// Public API
	var Constr = function () {};
	Constr.prototype = {
		constructor: CMJSContext.NotificationCenter,
		version: "1.0",
		name: "NotificationCenter",
		
		_observerList: [],
		
		/**
		 * Adds a observer to the {object} listening the the Notification with {name}.
		 * If the Notification is sent, the {fn} of {obs} is called.
		 * @param obs The observing object
		 * @param fn The callback function (required)
		 * @param name The name of the notification (required)
		 * @param object The object which will be observed
		 */
		addObserver : (function (obs, fn, name, object) {
			// Remove alreay registered functions.
			// But make sure to not remove anonymus functions without object and direct passed callback function
			if (!(obs == null && typeof fn == "function")) {
				this.removeObserver(obs, name, object);
			}
			
			var method = fn;
			if (typeof method == "string") {
				if (typeof obs == "object") {
					method = obs[method];
				}
				else {
					method = window[method];
				}
			}
			
			if (typeof method == "undefined" || typeof name == "undefined" || method == null || name == null) {
				if (typeof console !== "undefined") console.log('method and notification name must be set');
				return;
			}
			
			var newObserver = {
				observer: obs,
				method: method,
				selector_name: name,
				selector_object: object
			};

			this._observerList.push(newObserver);
			
		}),
		
		/**
		 * @return Returns the total number of observers registered in the system
		 */
		observerCount : (function () { 
			return this._observerList.length;
		}),
		
		/**
		 * Removes an observer for the given parameters.
		 * @param observerObject The observing object
		 * @param name The name of the notification
		 * @param object The object wich is observed.
		 */
		removeObserver: (function (observerObject, name, object) {
			var list = this._observerList, doRemoveObserver, n, anObserver;
			
			for (n in list) {
				doRemoveObserver = false;
				
				anObserver = list[n];
				if (observerObject === anObserver.observer) {
					if (anObserver.selector_name !== null && anObserver.selector_object !== null) {
						if (anObserver.selector_object === object && anObserver.selector_name === name) {
							doRemoveObserver = true;
						}
					}
					else if (anObserver.selector_name !== null) {
						if (anObserver.selector_name === name) {
							doRemoveObserver = true;
						}
					}
					else if (anObserver.selector_object !== null) {
						if (anObserver.selector_object === object) {
							doRemoveObserver = true;
						}
					}
					else {
						// we don't care about 'listen to everything' observer
					}
				
					if (doRemoveObserver) {
						this._observerList.splice(n, 1);
					}	
				}			
			}
			
		}),
		
		/**
		 * Sends a notification to all matching observers.
		 * The registered method is called and the notification is passed as argument.
		 * @param notificationName The name of the Notification
		 * @param notificationObject The object sending the Notification
		 * @param userInfo Additional data passed within the notification to the observers 
		 */
		postNotification: (function (notificationName, notificationObject, userInfo) {
			var notification = new CMJSContext.Notification(notificationName, notificationObject, userInfo),
				list = this._observerList, n, anObserver, 
				doSendNotification;
			
			for (n in list) {
				doSendNotification = false;
				
				anObserver = list[n];
				if (anObserver.selector_name !== null && anObserver.selector_object !== null) {
					if (anObserver.selector_object === notificationObject && anObserver.selector_name === notificationName) {
						doSendNotification = true;
					}
				}
				else if (anObserver.selector_name !== null) {
					if (anObserver.selector_name === notificationName) {
						doSendNotification = true;
					}
				}
				else if (anObserver.selector_object !== null) {
					if (anObserver.selector_object === notificationObject) {
						doSendNotification = true;
					}
				}
				else {
					// we don't care about 'listen to everything' observer
				}
				
				if (doSendNotification) {
					anObserver.method.call(anObserver.observer, notification);
				}				
			}
		})

	};
	return Constr;
}());

CMJSContext.NotificationCenter.defaultCenter = new CMJSContext.NotificationCenter();



/************************************************************************************
 * Localization \o/ 
 */
CMJSContext.Localization = function(){
		this.localizations = {};
};

CMJSContext.Localization.prototype.localize = function(input, languageOverride, regionOverride) {
	//log('CMJSContext.Localization.localize', input, languageOverride, regionOverride);
	
	if (!input) {
		return '';
	}
	
	// get localization
	var retVal = false;
	if (languageOverride && regionOverride) {
		retVal = this._localizeForLangAndReg(input, languageOverride, regionOverride);
	}
	if (!retVal && languageOverride) {
		retVal = this._localizeForLangAndReg(input, languageOverride);
	}
	if (!retVal && CMJSContext.page.properties.languageCode && CMJSContext.page.properties.region) {
		retVal = this._localizeForLangAndReg(input, CMJSContext.page.properties.languageCode, CMJSContext.page.properties.region);
	}
	if (!retVal && CMJSContext.page.properties.languageCode) {
		retVal = this._localizeForLangAndReg(input, CMJSContext.page.properties.languageCode);
	}
	if (!retVal) {
		retVal = this._localizeForLangAndReg(input, 'en');
	}
	if (!retVal) {
		retVal = input;
		//log('no loc found for', languageOverride, regionOverride, 'or', CMJSContext.page.properties.languageCode, CMJSContext.page.properties.region)
	}
	
	return retVal;
};
/**
 * Internal localization -_-
 */
CMJSContext.Localization.prototype._localizeForLangAndReg = function(input, lang, region) {
	//log('CMJSContext.Localization._localizeForLangAndReg', input, lang, region);

	if (!lang) {
		return false;
	}
	var lKey = lang;
	if (region) {
		lKey += '-' + region;
	}
	
	lKey = lKey.toLowerCase();
	
	if (this.localizations[lKey] && this.localizations[lKey][input]) {
		//log('found loca for', lKey);
		return this.localizations[lKey][input];
	}
	
	return false;
};

CMJSContext.Localization.prototype.registerLocalizations = function(dict) {
	if (typeof dict == 'object') {
		for (var langkey in dict) {
			var region = langkey.toLowerCase();
			if (typeof dict[langkey] == 'object') {
				for (var locKey in dict[langkey]) {
					if (typeof dict[langkey][locKey] == 'string') {
						if (!this.localizations[region]) {
							this.localizations[region] = {};
						}
						this.localizations[region][locKey] = dict[langkey][locKey];
					}
				}
			}
		}
	}
	return this.localizations;
};

CMJSContext.Localization.defaultLocalizer = new CMJSContext.Localization();

/**
 * e.g. CMJSContext.L('foo');
 */
CMJSContext.L = function(input, languageOverride, regionOverride) {
	return CMJSContext.Localization.defaultLocalizer.localize(input, languageOverride, regionOverride);
};
/**
 * e.g. CMJSContext.LL({'de-DE':{'foo':'kekse!'}});
 */
CMJSContext.LL = function(dict) {
	CMJSContext.Localization.defaultLocalizer.registerLocalizations(dict);
};