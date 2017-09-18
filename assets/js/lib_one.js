/*!*
 * project: digitalstrategie / one
 * release: trunk
 * build-date: 21.04.2017 / 16:25
 */

/**
 * Terrific JavaScript Framework v2.0.2
 * http://terrifically.org
 *
 * Copyright 2013, Remo Brunschwiler
 * @license MIT Licensed.
 *
 * Date: Wed, 17 Jul 2013 09:31:41 GMT
 *
 *
 * Includes:
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 *
 * @module Tc
 *
 */
(function(){

    var root = this; // save a reference to the global object
    var Tc = {};

    /*
     * The base library object.
     */
    var $ = Tc.$ = root.jQuery || root.Zepto || root.$;
/*
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
(function(){
    var initializing = false, fnTest = /xyz/.test(function() { xyz; }) ? /\b_super\b/ : /.*/;
    
    // The base Class implementation (does nothing)
    this.Class = function(){
    };
    
    // Create a new Class that inherits from this class
    Class.extend = function(prop){
        var _super = this.prototype;
        
        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var prototype = new this();
        initializing = false;
        
        // Copy the properties over onto the new prototype
        for (var name in prop) {
            // Check if we're overwriting an existing function
            prototype[name] = typeof prop[name] == "function" &&
            typeof _super[name] == "function" &&
            fnTest.test(prop[name]) ? (function(name, fn){
                return function(){
                    var tmp = this._super;
                    
                    // Add a new ._super() method that is the same method
                    // but on the super-class
                    this._super = _super[name];
                    
                    // The method only need to be bound temporarily, so we
                    // remove it when we're done executing
                    var ret = fn.apply(this, arguments);
                    this._super = tmp;
                    
                    return ret;
                };
            })(name, prop[name]) : prop[name];
        }
        
        // The dummy class constructor
        function Class(){
            // All construction is actually done in the init method
            if (!initializing && this.init) {
				this.init.apply(this, arguments);
			}
        }
        
        // Populate our constructed prototype object
        Class.prototype = prototype;
        
        // Enforce the constructor to be what we expect
        Class.constructor = Class;
        
        // And make this class extendable
        Class.extend = arguments.callee;
        
        return Class;
    };
})();

/**
 * Responsible for application-wide issues such as the creation of modules and establishing connections between them.
 *
 * @author Remo Brunschwiler
 * @namespace Tc
 * @class Application
 */
Tc.Application = Class.extend({

    /**
     * Initializes the application.
     *
     * @method init
     * @constructor
     * @param {jQuery} $ctx
     *      The jQuery context
     * @param {Object} config
     *      The configuration
     */
    init: function ($ctx, config) {
        /**
         * The configuration.
         *
         * @property config
         * @type Object
         */
        this.config = $.extend(Tc.Config, config);

        /**
         * The jQuery context.
         *
         * @property $ctx
         * @type jQuery
         */
        this.$ctx = $ctx || $('body');

        /**
         * Contains references to all modules on the page. This can, for
         * example, be useful when there are interactions between Flash
         * objects and Javascript.
         *
         * @property modules
         * @type Array
         */
        this.modules = [];

        /**
         * Contains references to all connectors on the page.
         *
         * @property connectors
         * @type Object
         */
        this.connectors = {};

        /**
         * The sandbox to get the resources from
         * This sandbox is shared between all modules.
         *
         * @property sandbox
         * @type Sandbox
         */
        this.sandbox = new Tc.Sandbox(this, this.config);
    },

    /**
     * Register modules withing scope
     * Automatically registers all modules within the scope,
     * as long as the modules use the OOCSS naming conventions.
     *
     * @method registerModules
     * @param {jQuery} $ctx
     *      The jQuery context
     * @return {Array}
     *      A list containing the references of the registered modules
     */
    registerModules: function ($ctx) {
        var self = this,
            modules = [],
            stringUtils = Tc.Utils.String;

        $ctx = $ctx || this.$ctx;

        $ctx.find('.mod:not([data-ignore="true"])').add($ctx).each(function () {
            var $this = $(this),
                classes = $this.attr('class') || '';

            classes = classes.split(' ');

            /*
             * A module can have several different classes and data attributes.
             * See below for possible values.
             */

            /*
             * @config .mod
             *
             * Indicates that it is a base module, this is the default and
             * no JavaScript needs to be involved. It must occur excactly
             * once.
             */

            /*
             * @config .mod{moduleName} || .mod-{module-name}
             *
             * Indicates that it is a module of type basic, which is
             * derived from the base module. It can occur at most
             * once. Example: .modBasic || .mod-basic
             */

            /*
             * @config .skin{moduleName}{skinName} || .skin-{module-name}-{skin-name}
             *
             * Indicates that the module basic has the submarine skin. It
             * will be decorated by the skin JS (if it exists). It can occur
             * arbitrarily. Example: .skinBasicSubmarine || .skin-basic-submarine
             */

            /*
             * @config data-connectors
             *
             * A module can have a comma-separated list of data connectors.
             * The list contains the IDs of the connectors in the following
             * schema: {connectorType}-{connectorId}
             *
             * {connectorType} is optional. If only the {connectorId} is given, the
             * default connector is instantiated.
             *
             * The example MasterSlave-Navigation decodes to: type =
             * MasterSlave, id = Navigation. This instantiates the MasterSlave
             * connector (as mediator) with the connector id Navigation.
             * The connector id is used to chain the appropriate (the ones with the same id)
             * modules together and to improve the reusability of the connector.
             * It can contain multiple connector ids (e.g. 1,2,MasterSlave-Navigation).
             */

            if (classes.length > 1) {
                var modName,
                    skins = [],
                    connectors = [],
                    dataConnectors;

                for (var i = 0, len = classes.length; i < len; i++) {
                    var part = $.trim(classes[i]);

                    // do nothing for empty parts
                    if (part) {
                        // convert to camel if necessary
                        if (part.indexOf('-') > -1) {
                            part = stringUtils.toCamel(part);
                        }

                        if (part.indexOf(self.config.modPrefix) === 0 && part.length > self.config.modPrefix.length) {
                            modName = part.substr(self.config.modPrefix.length);
                        }
                        else if (part.indexOf(self.config.skinPrefix) === 0) {
                            // Remove the mod name part from the skin name
                            skins.push(part.substr(self.config.skinPrefix.length).replace(modName, ''));
                        }
                    }
                }

                /*
                 * This needs to be done via attr() instead of data().
                 * As data() cast a single number-only connector to an integer, the split will fail.
                 */
                dataConnectors = $this.attr('data-connectors');

                if (dataConnectors) {
                    connectors = dataConnectors.split(',');
                    for (var i = 0, len = connectors.length; i < len; i++) {
                        var connector = $.trim(connectors[i]);
                        // do nothing for empty connectors
                        if (connector) {
                            connectors[i] = connector;
                        }
                    }
                }

                if (modName && self.config.modules[modName]) {
                    modules.push(self.registerModule($this, modName, skins, connectors));
                }
            }
        });

        return modules;
    },

    /**
     * Unregisters the modules given by the module instances.
     *
     * @method unregisterModule
     * @param {Array} modules
     *      A list containing the module instances to unregister
     */
    unregisterModules: function (modules) {
        var connectors = this.connectors;

        modules = modules || this.modules;

        if (modules === this.modules) {
            // Clear everything if the arrays are equal
            this.connectors = [];
            this.modules = [];
        }
        else {
            // Unregister the given modules
            for (var i = 0, len = modules.length; i < len; i++) {
                var module = modules[i],
                    index;

                // Delete the references in the connectors
                for (var connectorId in connectors) {
                    if (connectors.hasOwnProperty(connectorId)) {
                        connectors[connectorId].unregisterComponent(module);
                    }
                }

                // Delete the module instance itself
                index = $.inArray(module, this.modules);
                if (index > -1) {
                    delete this.modules[index];
                }
            }
        }
    },

    /**
     * Starts (intializes) the registered modules.
     *
     * @method start
     * @param {Array} modules
     *      A list of the modules to start
     */
    start: function (modules) {
        modules = modules || this.modules;

        // Start the modules
        for (var i = 0, len = modules.length; i < len; i++) {
            modules[i].start();
        }
    },

    /**
     * Stops the registered modules.
     *
     * @method stop
     * @param {Array} modules
     *      A list containing the module instances to stop
     */
    stop: function (modules) {
        modules = modules || this.modules;

        // Stop the modules
        for (var i = 0, len = modules.length; i < len; i++) {
            modules[i].stop();
        }
    },

    /**
     * Registers a module.
     *
     * @method registerModule
     * @param {jQuery} $node
     *      The module node
     * @param {String} modName
     *      The module name. It must match the class name of the module
     * @param {Array} skins
     *      A list of skin names. Each entry must match a class name of a skin
     * @param {Array} connectors
     *      A list of connectors identifiers (e.g. MasterSlave-Navigation)
     *      Schema: {connectorName}-{connectorId}
     * @return {Module}
     *      The reference to the registered module
     */
    registerModule: function ($node, modName, skins, connectors) {
        var modules = this.modules;

        modName = modName || undefined;
        skins = skins || [];
        connectors = connectors || [];

        if (modName && this.config.modules[modName]) {
            // Generate a unique ID for every module
            var id = modules.length;
            $node.data('id', id);

            // Instantiate module
            modules[id] = new this.config.modules[modName]($node, this.sandbox, id);

            // Decorate it
            for (var i = 0, len = skins.length; i < len; i++) {
                var skinName = skins[i];
                if (this.config.modules[modName][skinName]) {
                    modules[id] = modules[id].getDecoratedModule(modName, skinName);
                }
            }

            // Register connections
            for (var i = 0, len = connectors.length; i < len; i++) {
                this.registerConnection(connectors[i], modules[id]);
            }

            return modules[id];
        }

        return null;
    },

    /**
     * Registers a connection between a module and a connector.
     *
     * @method registerConnection
     * @param {String} connector
     *      The full connector name (e.g. MasterSlave-Navigation)
     * @param {Module} component
     *      The module instance
     */
    registerConnection: function (connector, component) {
        connector = $.trim(connector);

        var parts = connector.split('-'),
            connectorType,
            connectorId,
            identifier;

        if (parts.length === 1) {
            // default connector
            identifier = connectorId = parts[0];
        }
        else if (parts.length === 2) {
            // a specific connector type is given
            connectorType = parts[0];
            connectorId = parts[1];
            identifier = connectorType + connectorId;
        }

        if (identifier) {
            var connectors = this.connectors;

            if (!connectors[identifier]) {
                // Instantiate the appropriate connector if it does not exist yet
                if (!connectorType) {
                    connectors[identifier] = new Tc.Connector(connectorId);
                }
                else if (this.config.connectors[connectorType]) {
                    connectors[identifier] = new this.config.connectors[connectorType](connectorId);
                }
            }

            if (connectors[identifier]) {
                /*
                 * The connector observes the component and attaches it as
                 * an observer.
                 */
                component.attachConnector(connectors[identifier]);

                /*
                 * The component wants to be informed over state changes.
                 * It registers it as connector member.
                 */
                connectors[identifier].registerComponent(component);
            }
        }
    },

    /**
     * Unregisters a module from a connector.
     *
     * @method unregisterConnection
     * @param {String} connectorId
     *      The connector channel id (e.g. 2)
     * @param {Module} component
     *      The module instance
     */
    unregisterConnection: function (connectorId, component) {
        var connector = this.connectors[connectorId];

        // Delete the references in the connector and the module
        if (connector) {
            connector.unregisterComponent(component);
            component.detachConnector(connector);
        }
    }
});

/**
 * The sandbox is used as a central point to get resources from, grant
 * permissions, etc.  It is shared between all modules.
 *
 * @author Remo Brunschwiler
 * @namespace Tc
 * @class Sandbox
 */
Tc.Sandbox = Class.extend({

    /**
     * Initializes the Sandbox.
     *
     * @method init
     * @constructor
     * @param {Applicaton} application
     *      The application reference
     * @param {Object} config
     *      The configuration
     */
    init: function (application, config) {

        /**
         * The application
         *
         * @property application
         * @type Application
         */
        this.application = application;

        /**
         * The configuration.
         *
         * @property config
         * @type Object
         */
        this.config = config;

        /**
         * Contains the 'after' hook module callbacks.
         *
         * @property afterCallbacks
         * @type Array
         */
        this.afterCallbacks = [];
    },

    /**
     * Adds (register and start) all modules in the given context scope.
     *
     * @method addModules
     * @param {jQuery} $ctx
     *      The jQuery context
     * @return {Array}
     *      A list containing the references of the registered modules
     */
    addModules: function ($ctx) {
        var modules = [],
            application = this.application;

        if ($ctx) {
            // Register modules
            modules = application.registerModules($ctx);

            // Start modules
            application.start(modules);
        }

        return modules;
    },

    /**
     * Removes a module by module instances.
     * This stops and unregisters a module through a module instance.
     *
     * @method removeModules
     * @param {Array} modules
     *      A list containing the module instances to remove
     */
    removeModules: function (modules) {
        var self = this,
            application = this.application;

        if (!$.isArray(modules)) {
            var $ctx = modules;

            // get modules
            var tmpModules = [];

            $ctx.find('.mod').add($ctx).each(function () {
                // check for instance
                var id = $(this).data('id');

                if (id !== undefined) {
                    module = self.getModuleById(id);

                    if (module) {
                        tmpModules.push(module);
                    }
                }
            });

            modules = tmpModules;
        }

        if (modules) {
            // Stop modules
            application.stop(modules);

            // Unregister modules
            application.unregisterModules(modules);
        }
    },

    /**
     * Subscribes a module to a connector.
     *
     * @method subscribe
     * @param {String} connector The full connector name (e.g. MasterSlave-Navigation)
     * @param {Module} module The module instance
     */
    subscribe: function (connector, module) {
        var application = this.application;

        if (module instanceof Tc.Module && connector) {
            // explicitly cast connector to string
            connector = connector + '';
            application.registerConnection(connector, module);
        }
    },

    /**
     * Unsubscribes a module from a connector.
     *
     * @method unsubscribe
     * @param {String} connectorId The connector channel id (e.g. 2 or Navigation)
     * @param {Module} module The module instance
     */
    unsubscribe: function (connectorId, module) {
        var application = this.application;

        if (module instanceof Tc.Module && connectorId) {
            // explicitly cast connector id to string
            connectorId = connectorId + '';
            application.unregisterConnection(connectorId, module);
        }
    },

    /**
     * Gets the appropriate module for the given ID.
     *
     * @method getModuleById
     * @param {int} id
     *      The module ID
     * @return {Module}
     *      The appropriate module
     */
    getModuleById: function (id) {
        var application = this.application;

        if (application.modules[id] !== undefined) {
            return application.modules[id];
        }
        else {
            throw new Error('the module with the id ' + id +
                ' does not exist');
        }
    },

    /**
     * Gets the application config.
     *
     * @method getConfig
     * @return {Object}
     *      The configuration object
     */
    getConfig: function () {
        return this.config;
    },

    /**
     * Gets an application config param.
     *
     * @method getConfigParam
     * @param {String} name
     *      The param name
     * @return {mixed}
     *      The appropriate configuration param
     */
    getConfigParam: function (name) {
        var config = this.config;

        if (config[name] !== undefined) {
            return config[name];
        }
        else {
            throw new Error('the config param ' + name + ' does not exist');
        }
    },

    /**
     * Collects the module status messages and handles the callbacks.
     * This means that it is ready for the 'after' hook.
     *
     * @method ready
     * @param {Function} callback
     *      The 'after' hook module callback
     */
    ready: function (callback) {
        var afterCallbacks = this.afterCallbacks;

        // Add the callback to the stack
        afterCallbacks.push(callback);

        // Check whether all modules are ready for the 'after' hook
        if (this.application.modules.length === afterCallbacks.length) {
            for (var i = 0; i < afterCallbacks.length; i++) {
                var afterCallback = afterCallbacks[i];

                if (typeof afterCallback === "function") {
                    // make sure the callback is only executed once (and is not called during addModules)
                    delete afterCallbacks[i];
                    afterCallback();
                }
            }
        }
    }
});

/**
 * Base class for the different modules.
 *
 * @author Remo Brunschwiler
 * @namespace Tc
 * @class Module
 */
Tc.Module = Class.extend({

    /**
     * Initializes the Module.
     *
     * @method init
     * @constructor
     * @param {jQuery} $ctx
     *      The jQuery context
     * @param {Sandbox} sandbox
     *      The sandbox to get the resources from
     * @param {String} id
     *      The Unique module ID
     */
    init: function ($ctx, sandbox, id) {
        /**
         * Contains the module context.
         *
         * @property $ctx
         * @type jQuery
         */
        this.$ctx = $ctx;

        /**
         * Contains the unique module ID.
         *
         * @property id
         * @type String
         */
        this.id = id;

        /**
         * Contains the attached connectors.
         *
         * @property connectors
         * @type Object
         */
        this.connectors = {};

        /**
         * The sandbox to get the resources from.
         *
         * @property sandbox
         * @type Sandbox
         */
        this.sandbox = sandbox;
    },

    /**
     * Template method to start (i.e. init) the module.
     * This method provides hook functions which can be overridden
     * by the individual instance.
     *
     * @method start
     */
    start: function () {
        var self = this;

        // Call the hook method from the individual instance and provide the appropriate callback
        if (this.on) {
            this.on(function () {
                self.initAfter();
            });
        }
    },

    /**
     * Template method to stop the module.
     *
     * @method stop
     */
    stop: function () {
        var $ctx = this.$ctx;

        // Remove all bound events and associated jQuery data
        $('*', $ctx).unbind().removeData();
        $ctx.unbind().removeData();
    },

    /**
     * Initialization callback.
     *
     * @method initAfter
     * @protected
     */
    initAfter: function () {
        var self = this;

        this.sandbox.ready(function () {
            /*
             * Call the 'after' hook method from the individual instance
             */
            if (self.after) {
                self.after();
            }
        });
    },

    /**
     * Notifies all attached connectors about changes.
     *
     * @method fire
     * @param {String} state The new state
     * @param {Object} data The data to provide to your connected modules (optional)
     * @param {Array} channels  A list containing the channel ids to send the event to (optional)
     * @param {Function} defaultAction The default action to perform (optinal)
     */
    fire: function (state, data, channels, defaultAction) {
        var self = this,
            connectors = this.connectors,
            shouldBeCalled = true;  // indicates whether the default handler should be called

        // validate params
        if (channels == null && defaultAction == null) {
            // Max. 2 params
            if (typeof data === 'function') {
                // (state, defaultAction)
                defaultAction = data;
                data = undefined;
            }
            else if ($.isArray(data)) {
                // (state, channels)
                channels = data;
                data = undefined;
            }
        }
        else if (defaultAction == null) {
            // 2-3 params
            if (typeof channels === 'function') {
                // (state, data, defaultAction)
                defaultAction = channels;
                channels = undefined;
            }

            if ($.isArray(data)) {
                // (state, channels, defaultAction)
                channels = data;
                data = undefined;
            }
        }

        state = Tc.Utils.String.capitalize(state);
        data = data || {};
        channels = channels || Object.keys(connectors);

        for (var i = 0, len = channels.length; i < len; i++) {
            var connectorId = channels[i];
            if (connectors.hasOwnProperty(connectorId)) {
                var connector = connectors[connectorId],
                    proceed = connector.notify(self, 'on' + state, data) || false;

                if (!proceed) {
                    shouldBeCalled = false;
                }

            } else {
                throw new Error('the module #' + self.id + ' is not connected to connector ' + connectorId);
            }
        }

        // Execute default action unless a veto is provided
        if (shouldBeCalled) {
            if (typeof defaultAction === 'function') {
                defaultAction();
            }
        }
    },

    /**
     * Attaches a connector (observer).
     *
     * @method attachConnector
     * @param {Connector} connector
     *      The connector to attach
     */
    attachConnector: function (connector) {
        this.connectors[connector.connectorId] = connector;
    },

    /**
     * Detaches a connector (observer).
     *
     * @method detachConnector
     * @param {Connector} connector The connector to detach
     */
    detachConnector: function (connector) {
        delete this.connectors[connector.connectorId];
    },

    /**
     * Decorates itself with the given skin.
     *
     * @method getDecoratedModule
     * @param {String} module The name of the module
     * @param {String} skin The name of the skin
     * @return {Module} The decorated module
     */
    getDecoratedModule: function(module, skin) {
    	var modules = this.sandbox.getConfigParam('modules');

        if (modules[module][skin]) {
            var Decorator = modules[module][skin];

            /*
             * Sets the prototype object to the module.
             * So the "non-decorated" functions will be called on the module
             * without implementing the whole module interface.
             */
            Decorator.prototype = this;
            Decorator.prototype.constructor = modules[module][skin];

            return new Decorator(this);
        }

        return null;
    }
});

/**
 * Base class for the different connectors.
 *
 * @author Remo Brunschwiler
 * @namespace Tc
 * @class Connector
 */
Tc.Connector = Class.extend({

    /**
     * Initializes the Connector.
     *
     * @method init
     * @constructor
     * @param {String} connectorId
     *      The unique connector ID
     */
    init: function (connectorId) {
        this.connectorId = connectorId;
        this.components = {};
    },

    /**
     * Registers a component.
     *
     * @method registerComponent
     * @param {Module} component
     *      The module to register
     */
    registerComponent: function (component) {
        this.components[component.id] = {
            'component': component
        };
    },

    /**
     * Unregisters a component.
     *
     * @method unregisterComponent
     * @param {Module} component
     *      The module to unregister
     */
    unregisterComponent: function (component) {
        var components = this.components;

        if (components[component.id]) {
            delete components[component.id];
        }
    },

    /**
     * Notifies all registered components about a state change
     * This can be be overriden in the specific connectors.
     *
     * @method notify
     * @param {Module} origin
     *      The module that sends the state change
     * @param {String} state
     *      The component's state
     * @param {Object} data
     *      Contains the state relevant data (if any)
     * @return {boolean}
     *      Indicates whether the default action should be excuted or not
     */
    notify: function (origin, state, data, callback) {
        /*
         * Gives the components the ability to prevent the default- and
         * after action from the events by returning false in the
         * on {Event}-Handler.
         */
        var proceed = true,
            components = this.components;

        for (var id in components) {
            if (components.hasOwnProperty(id)) {
                var component = components[id].component;
                if (component !== origin && component[state]) {
                    if (component[state](data) === false) {
                        proceed = false;
                    }
                }
            }
        }

        return proceed;
    }
});

/*
 * Contains utility functions for several tasks.
 */
Tc.Utils = {};

// Helper
if (!Object.keys) {
    Object.keys = function (obj) {
        var keys = [], k;
        for (k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                keys.push(k);
            }
        }
        return keys;
    };
}
/**
 * Contains utility functions for string concerning tasks.
 *
 * @author Remo Brunschwiler
 * @namespace Tc
 * @class Utils.String
 * @static
 */
Tc.Utils.String = {
    /**
     * Capitalizes the first letter of the given string.
     *
     * @method capitalize
     * @param {String} str
     *      The original string
     * @return {String}
     *      The capitalized string
     */
    capitalize: function (str) {
        // Capitalize the first letter
        return str.substr(0, 1).toUpperCase().concat(str.substr(1));
    },

    /**
     * Camelizes the given string.
     *
     * @method toCamel
     * @param {String} str
     *      The original string
     * @return {String}
     *      The camelized string
     */
    toCamel: function (str) {
        return str.replace(/(\-[A-Za-z])/g, function ($1) {
            return $1.toUpperCase().replace('-', '');
        });
    }
};

/**
 * Contains the application base config.
 * The base config can be extended or overwritten either via
 * new Application ($ctx, config) during bootstrapping the application or via
 * overriding the Tc.Config object in your project.
 *
 * @author Remo Brunschwiler
 * @namespace Tc
 * @class Config
 * @static
 */
Tc.Config = {
		modules   : Tc.Module,
		connectors: Tc.Connector,
		modPrefix : 'mod',
		skinPrefix: 'skin'
};

if (typeof define === 'function' && define.amd) {
    define(['jquery'], function() {
        return Tc;
    });
} else {
    root.Tc = Tc;
}

}).call(this);
;
// Underscore.js 1.4.4
// ===================

// > http://underscorejs.org
// > (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
// > Underscore may be freely distributed under the MIT license.

// Baseline setup
// --------------
(function() {

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);
;
/**
 * h5Validate
 * @version v0.9.0
 * Using semantic versioning: http://semver.org/
 * @author Eric Hamilton http://ericleads.com/
 * @copyright 2010 - 2012 Eric Hamilton
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * Developed under the sponsorship of RootMusic, Zumba Fitness, LLC, and Rese Property Management
 */

/*global jQuery, window, console */
(function ($) {
	'use strict';
	var console = window.console || function () {},
		h5 = { // Public API
			defaults : {
				debug: false,

				RODom: false,

				// HTML5-compatible validation pattern library that can be extended and/or overriden.
				patternLibrary : { //** TODO: Test the new regex patterns. Should I apply these to the new input types?
					// **TODO: password
					phone: /([\+][0-9]{1,3}([ \.\-])?)?([\(]{1}[0-9]{3}[\)])?([0-9A-Z \.\-]{1,32})((x|ext|extension)?[0-9]{1,4}?)/,

					// Shamelessly lifted from Scott Gonzalez via the Bassistance Validation plugin http://projects.scottsplayground.com/email_address_validation/
					email: /((([a-zA-Z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-zA-Z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?/,

					// Shamelessly lifted from Scott Gonzalez via the Bassistance Validation plugin http://projects.scottsplayground.com/iri/
					url: /(https?|ftp):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?/,

					// Number, including positive, negative, and floating decimal. Credit: bassistance
					number: /-?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d+)?/,

					// Date in ISO format. Credit: bassistance
					dateISO: /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/,

					alpha: /[a-zA-Z]+/,
					alphaNumeric: /\w+/,
					integer: /-?\d+/
				},

				// The prefix to use for dynamically-created class names.
				classPrefix: 'h5-',

				errorClass: 'ui-state-error', // No prefix for these.
				validClass: 'ui-state-valid', // "
				activeClass: 'active', // Prefix will get prepended.
				requiredClass: 'required',
				requiredAttribute: 'required',
				patternAttribute: 'pattern',

				// Attribute which stores the ID of the error container element (without the hash).
				errorAttribute: 'data-h5-errorid',

				// Events API
				customEvents: {
					'validate': true
				},

				// Setup KB event delegation.
				kbSelectors: ':input:not(:button):not(:disabled):not(.novalidate)',
				focusout: true,
				focusin: false,
				change: true,
				keyup: false,
				activeKeyup: true,

				// Setup mouse event delegation.
				mSelectors: '[type="range"]:not(:disabled):not(.novalidate), :radio:not(:disabled):not(.novalidate), :checkbox:not(:disabled):not(.novalidate), select:not(:disabled):not(.novalidate), option:not(:disabled):not(.novalidate)',
				click: true,

				// What do we name the required .data variable?
				requiredVar: 'h5-required',

				// What do we name the pattern .data variable?
				patternVar: 'h5-pattern',
				stripMarkup: true,

				// Run submit related checks and prevent form submission if any fields are invalid?
				submit: true,

				// Move focus to the first invalid field on submit?
				focusFirstInvalidElementOnSubmit: true,

				// When submitting, validate elements that haven't been validated yet?
				validateOnSubmit: true,

				// Callback stubs
				invalidCallback: function () {},
				validCallback: function () {},

				// Elements to validate with allValid (only validating visible elements)
				allValidSelectors: ':input:visible:not(:button):not(:disabled):not(.novalidate)',

				// Mark field invalid.
				// ** TODO: Highlight labels
				// ** TODO: Implement setCustomValidity as per the spec:
				// http://www.whatwg.org/specs/web-apps/current-work/multipage/association-of-controls-and-forms.html#dom-cva-setcustomvalidity
				markInvalid: function markInvalid(options) {
					var $element = $(options.element),
						$errorID = $(options.errorID);
					$element.addClass(options.errorClass).removeClass(options.validClass);

					// User needs help. Enable active validation.
					$element.addClass(options.settings.activeClass);

					if ($errorID.length) { // These ifs are technically not needed, but improve server-side performance 
						if ($element.attr('title')) {
							$errorID.text($element.attr('title'));
						}
						$errorID.show();
					}
					$element.data('valid', false);
					options.settings.invalidCallback.call(options.element, options.validity);
					return $element;
				},

				// Mark field valid.
				markValid: function markValid(options) {
					var $element = $(options.element),
						$errorID = $(options.errorID);

					$element.addClass(options.validClass).removeClass(options.errorClass);
					if ($errorID.length) {
						$errorID.hide();
					}
					$element.data('valid', true);
					options.settings.validCallback.call(options.element, options.validity);
					return $element;
				},

				// Unmark field
				unmark: function unmark(options) {
					var $element = $(options.element);
					$element.removeClass(options.errorClass).removeClass(options.validClass);
					$element.form.find("#" + options.element.id).removeClass(options.errorClass).removeClass(options.validClass);
					return $element;
				}
			}
		},

		// Aliases
		defaults = h5.defaults,
		patternLibrary = defaults.patternLibrary,

		createValidity = function createValidity(validity) {
			return $.extend({
				customError: validity.customError || false,
				patternMismatch: validity.patternMismatch || false,
				rangeOverflow: validity.rangeOverflow || false,
				rangeUnderflow: validity.rangeUnderflow || false,
				stepMismatch: validity.stepMismatch || false,
				tooLong: validity.tooLong || false,
				typeMismatch: validity.typeMismatch || false,
				valid: validity.valid || true,
				valueMissing: validity.valueMissing || false
			}, validity);
		},

		methods = {
			/**
			 * Check the validity of the current field
			 * @param  {object}  settings   instance settings
			 * @param  {object}  options
			 *			.revalidate - trigger validation function first?
			 * @return {Boolean}
			 */
			isValid: function (settings, options) {
				var $this = $(this);

				options = (settings && options) || {};

				// Revalidate defaults to true
				if (options.revalidate !== false) {
					$this.trigger('validate');
				}

				return $this.data('valid'); // get the validation result
			},
			allValid: function (config, options) {
				var valid = true,
					formValidity = [],
					$this = $(this),
					$allFields,
					$filteredFields,
					radioNames = [],
					getValidity = function getValidity(e, data) {
						data.e = e;
						formValidity.push(data);
					},
					settings = $.extend({}, config, options); // allow options to override settings

				options = options || {};

				$this.trigger('formValidate', {settings: $.extend(true, {}, settings)});

				// Make sure we're not triggering handlers more than we need to.
				$this.undelegate(settings.allValidSelectors,
					'.allValid', getValidity);
				$this.delegate(settings.allValidSelectors,
					'validated.allValid', getValidity);

				$allFields = $this.find(settings.allValidSelectors);

				// Filter radio buttons with the same name and keep only one,
				// since they will be checked as a group by isValid()
				$filteredFields = $allFields.filter(function(index) {
					var name;

					if(this.tagName === "INPUT"
						&& this.type === "radio") {
						name = this.name;
						if(radioNames[name] === true) {
							return false;
						}
						radioNames[name] = true;
					}
					return true;
				});

				$filteredFields.each(function () {
					var $this = $(this);
					valid = $this.h5Validate('isValid', options) && valid;
				});

				$this.trigger('formValidated', {valid: valid, elements: formValidity});
				return valid;
			},
			validate: function (settings) {
				// Get the HTML5 pattern attribute if it exists.
				// ** TODO: If a pattern class exists, grab the pattern from the patternLibrary, but the pattern attrib should override that value.
				var $this = $(this),
					pattern = $this.filter('[pattern]')[0] ? $this.attr('pattern') : false,

					// The pattern attribute must match the whole value, not just a subset:
					// "...as if it implied a ^(?: at the start of the pattern and a )$ at the end."
					re = new RegExp('^(?:' + pattern + ')$'),
					$radiosWithSameName = null,
					value = ($this.is('[type=checkbox]')) ?
							$this.is(':checked') : ($this.is('[type=radio]') ?
								// Cache all radio buttons (in the same form) with the same name as this one
								($radiosWithSameName = $this.parents('form')
									// **TODO: escape the radio buttons' name before using it in the jQuery selector
									.find('input[name="' + $this.attr('name') + '"]'))
									.filter(':checked')
									.length > 0 : $this.val()),
					errorClass = settings.errorClass,
					validClass = settings.validClass,
					errorIDbare = $this.attr(settings.errorAttribute) || false, // Get the ID of the error element.
					errorID = errorIDbare ? '#' + errorIDbare.replace(/(:|\.|\[|\])/g,'\\$1') : false, // Add the hash for convenience. This is done in two steps to avoid two attribute lookups.
					required = false,
					validity = createValidity({element: this, valid: true}),
					$checkRequired = $('<input required>'),
					maxlength;

				/*	If the required attribute exists, set it required to true, unless it's set 'false'.
				*	This is a minor deviation from the spec, but it seems some browsers have falsey 
				*	required values if the attribute is empty (should be true). The more conformant 
				*	version of this failed sanity checking in the browser environment.
				*	This plugin is meant to be practical, not ideologically married to the spec.
				*/
				// Feature fork
				if ($checkRequired.filter('[required]') && $checkRequired.filter('[required]').length) {
					required = ($this.filter('[required]').length && $this.attr('required') !== 'false');
				} else {
					required = ($this.attr('required') !== undefined);
				}

				if (settings.debug && window.console) {
					console.log('Validate called on "' + value + '" with regex "' + re + '". Required: ' + required); // **DEBUG
					console.log('Regex test: ' + re.test(value) + ', Pattern: ' + pattern); // **DEBUG
				}

				maxlength = parseInt($this.attr('maxlength'), 10);
				if (!isNaN(maxlength) && value.length > maxlength) {
						validity.valid = false;	
						validity.tooLong = true;
				}

				if (required && !value) {
					validity.valid = false;
					validity.valueMissing = true;
				} else if (pattern && !re.test(value) && value) {
					validity.valid = false;
					validity.patternMismatch = true;
				} else {
					if (!settings.RODom) {
						settings.markValid({
							element: this,
							validity: validity,
							errorClass: errorClass,
							validClass: validClass,
							errorID: errorID,
							settings: settings
						});
					}
				}

				if (!validity.valid) {
					if (!settings.RODom) {
						settings.markInvalid({
							element: this,
							validity: validity,
							errorClass: errorClass,
							validClass: validClass,
							errorID: errorID,
							settings: settings
						});
					}
				}
				$this.trigger('validated', validity);

				// If it's a radio button, also validate the other radio buttons with the same name
				// (while making sure the call is not recursive)
				if($radiosWithSameName !== null
					&& settings.alreadyCheckingRelatedRadioButtons !== true) {

					settings.alreadyCheckingRelatedRadioButtons = true;

					$radiosWithSameName
						.not($this)
						.trigger('validate');

					settings.alreadyCheckingRelatedRadioButtons = false;

				}
			},

			/**
			 * Take the event preferences and delegate the events to selected
			 * objects.
			 * 
			 * @param {object} eventFlags The object containing event flags.
			 * 
			 * @returns {element} The passed element (for method chaining).
			 */
			delegateEvents: function (selectors, eventFlags, element, settings) {
				var events = {},
					key = 0,
					validate = function () {
						settings.validate.call(this, settings);
					};
				$.each(eventFlags, function (key, value) {
					if (value) {
						events[key] = key;
					}
				});
				// key = 0;
				for (key in events) {
					if (events.hasOwnProperty(key)) {
						$(element).delegate(selectors, events[key] + '.h5Validate', validate);
					}
				}
				return element;
			},
			/**
			 * Prepare for event delegation.
			 * 
			 * @param {object} settings The full plugin state, including
			 * options. 
			 * 
			 * @returns {object} jQuery object for chaining.
			 */
			bindDelegation: function (settings) {
				var $this = $(this),
					$forms;
				// Attach patterns from the library to elements.
				// **TODO: pattern / validation method matching should
				// take place inside the validate action.
				$.each(patternLibrary, function (key, value) {
					var pattern = value.toString();
					pattern = pattern.substring(1, pattern.length - 1);
					$('.' + settings.classPrefix + key).attr('pattern', pattern);
				});

				$forms = $this.filter('form')
						.add($this.find('form'))
						.add($this.parents('form'));

				$forms
					.attr('novalidate', 'novalidate')
					.submit(checkValidityOnSubmitHandler);
					
				$forms.find("input[formnovalidate][type='submit']").click(function(){
					$(this).closest("form").unbind('submit', checkValidityOnSubmitHandler);
				});

				return this.each(function () {
					var kbEvents = {
							focusout: settings.focusout,
							focusin: settings.focusin,
							change: settings.change,
							keyup: settings.keyup
						},
						mEvents = {
							click: settings.click
						},
						activeEvents = {
							keyup: settings.activeKeyup
						};

					settings.delegateEvents(':input', settings.customEvents, this, settings);
					settings.delegateEvents(settings.kbSelectors, kbEvents, this, settings);
					settings.delegateEvents(settings.mSelectors, mEvents, this, settings);
					settings.delegateEvents(settings.activeClassSelector, activeEvents, this, settings);
					settings.delegateEvents('textarea[maxlength]', {keyup: true}, this, settings);
				});
			}
		},

		/**
		 * Event handler for the form submit event.
		 * When settings.submit is enabled:
		 *  - prevents submission if any invalid fields are found.
		 *  - Optionally validates all fields.
		 *  - Optionally moves focus to the first invalid field.
		 * 
		 * @param {object} evt The jQuery Event object as from the submit event. 
		 * 
		 * @returns {object} undefined if no validation was done, true if validation passed, false if validation didn't.
		 */
		checkValidityOnSubmitHandler = function(evt) {

			var $this,
				settings = getInstance.call(this),
				allValid;

			if(settings.submit !== true) {
				return;
			}

			$this = $(this);
			allValid = $this.h5Validate('allValid', { revalidate: settings.validateOnSubmit === true });

			if(allValid !== true) {
				evt.preventDefault();

				if(settings.focusFirstInvalidElementOnSubmit === true){
					var $invalid = $(settings.allValidSelectors, $this)
									.filter(function(index){
										return $(this).h5Validate('isValid', { revalidate: false }) !== true;
									});

					$invalid.first().focus();
				}
			}

			return allValid;
		},

		instances = [],

		buildSettings = function buildSettings(options) {
			// Combine defaults and options to get current settings.
			var settings = $.extend({}, defaults, options, methods),
				activeClass = settings.classPrefix + settings.activeClass;

			return $.extend(settings, {
				activeClass: activeClass,
				activeClassSelector: '.' + activeClass,
				requiredClass: settings.classPrefix + settings.requiredClass,
				el: this
			});
		},

		getInstance = function getInstance() {
			var $parent = $(this).closest('[data-h5-instanceId]');
			return instances[$parent.attr('data-h5-instanceId')];
		},

		setInstance = function setInstance(settings) {
			var instanceId = instances.push(settings) - 1;
			if (settings.RODom !== true) {
				$(this).attr('data-h5-instanceId', instanceId);
			}
			$(this).trigger('instance', { 'data-h5-instanceId': instanceId });
		};

	$.h5Validate = {
		/**
		 * Take a map of pattern names and HTML5-compatible regular
		 * expressions, and add them to the patternLibrary. Patterns in
		 * the library are automatically assigned to HTML element pattern
		 * attributes for validation.
		 * 
		 * @param {Object} patterns A map of pattern names and HTML5 compatible
		 * regular expressions.
		 * 
		 * @returns {Object} patternLibrary The modified pattern library
		 */
		addPatterns: function (patterns) {
			var patternLibrary = defaults.patternLibrary,
				key;
			for (key in patterns) {
				if (patterns.hasOwnProperty(key)) {
					patternLibrary[key] = patterns[key];
				}
			}
			return patternLibrary;
		},
		/**
		 * Take a valid jQuery selector, and a list of valid values to
		 * validate against.
		 * If the user input isn't in the list, validation fails.
		 * 
		 * @param {String} selector Any valid jQuery selector.
		 *
		 * @param {Array} values A list of valid values to validate selected 
		 * fields against.
		 */
		validValues: function (selector, values) {
			var i = 0,
				ln = values.length,
				pattern = '',
				re;
			// Build regex pattern
			for (i = 0; i < ln; i += 1) {
				pattern = pattern ? pattern + '|' + values[i] : values[i];
			}
			re = new RegExp('^(?:' + pattern + ')$');
			$(selector).data('regex', re);
		}
	};

	$.fn.h5Validate = function h5Validate(options) {
		var	action,
			args,
			settings;

		if (typeof options === 'string' && typeof methods[options] === 'function') {
			// Whoah, hold on there! First we need to get the instance:
			settings = getInstance.call(this);

			args = [].slice.call(arguments, 0);
			action = options;
			args.shift();
			args = $.merge([settings], args);

			// Use settings here so we can plug methods into the instance dynamically?
			return settings[action].apply(this, args);
		}

		settings = buildSettings.call(this, options);
		setInstance.call(this, settings);

		// Returning the jQuery object allows for method chaining.
		return methods.bindDelegation.call(this, settings);
	};
}(jQuery));
;
/*!
 * jQuery.PositionCalculator
 * https://github.com/tlindig/position-calculator
 *
 * v1.1.2 - 2014-07-01
 *
 * Copyright (c) 2014 Tobias Lindig
 * http://tlindig.de
 *
 * License: MIT
 *
 * Author: Tobias Lindig <dev@tlindig.de>
 */
/*!
 * class PositionCalculator
 * https://github.com/tlindig/position-calculator
 *
 * Copyright (c) 2014 Tobias Lindig
 * Licensed under the MIT license.
 */

/*global define:false*/
(function(factory) {
    // make it public
    if (typeof define === 'function' && define.amd) {
        // as __named__ AMD module
        define("position-calculator", ["jquery"], factory);
    } else {
        // as Browser globals
        jQuery.PositionCalculator = factory(jQuery);
    }
}(function($) {
    "use strict"; //enable ECMAScript 5 Strict Mode

    // //////////
    // private
    var __window = window;
    var __document = document;
    var __docElement = __document.documentElement;

    var __rgx_vertical = /top|middle|bottom/;
    var __rgx_horizontal = /left|center|right/;
    var __rgx_percent = /%$/;

    var __mirror = {
        left: "right",
        center: "center",
        right: "left",
        top: "bottom",
        middle: "middle",
        bottom: "top"
    };

    /**
     * prepare selector, because jQuery do not return "window" and "document"
     *
     * @param  {selector|DOM|jQuery|null} selector value given in options
     * @return {selector|DOM|jQuery|null}  if "selector" was a string and match "window" or
     *                                     "document", than the native object will be returned.
     */
    function __normalizeSlector(selector) {
        if (typeof selector === "string") {
            if (selector === "window") {
                selector = __window;
            } else if (selector === "document") {
                selector = __document;
            }
        }
        return selector;
    }

    /**
     * Normalize the given "at" specification.
     * Use default value ('top left'), if syntax is not correct.
     *
     * @param  {string} ref     syntax: <vertical> + " " + <horizontal>
     *                          vertical: "top" | "middle" | "bottom"
     *                          horizontal: "left" | "center" | "right"
     * @return {NormAt}         Object with {y:string, x:string}
     */
    function __normalizeAt(ref) {
        var values = ref.split(" ");
        return {
            y: __rgx_vertical.test(values[0]) ? values[0] : "top",
            x: __rgx_horizontal.test(values[1]) ? values[1] : "left"
        }
    }

    /**
     * compare to NormPos with {top:number, left:number, height:number, width:number}
     *
     * @param  {NormPos} normPos1
     * @param  {NormPos} normPos2
     * @return {boolean}          true, if values are equal
     */
    function __isEqualNormPos(normPos1, normPos2) {
        if (normPos1 === normPos2) {
            return true;
        }
        if(!normPos1 || !normPos2) {
            return false;
        }
        return (normPos1.top === normPos2.top && normPos1.left === normPos2.left &&
            normPos1.height === normPos2.height && normPos1.width === normPos2.width);
    }

    /**
     * read the correct value for top, left, width and height from the given $el.
     * Can handle "window", "document", "event" and "DOM node"
     * resulting "top" and "left" are relative to document top-left corner
     *
     * @param  {jQuery} $el     input to calculate the position
     * @return {NormPos}        Object with {top:number, left:number, height:number, width:number}
     *
     **/
    function __nomrmalizePosition($el) {
        var raw = $el[0];
        if (raw.nodeType === 9) {
            // is document node
            return {
                width: $el.outerWidth(),
                height: $el.outerHeight(),
                top: 0,
                left: 0
            };
        }
        if ($.isWindow(raw)) {
            return {
                width: $el.outerWidth(),
                height: $el.outerHeight(),
                top: $el.scrollTop(),
                left: $el.scrollLeft()
            };
        }
        if (raw.preventDefault) {
            // is event
            return {
                width: 0,
                height: 0,
                top: raw.pageY,
                left: raw.pageX
            };
        }
        var offset = $el.offset();
        return {
            width: $el.outerWidth(),
            height: $el.outerHeight(),
            top: offset.top,
            left: offset.left
        };
    }

    function __refreshPosition($el, normPos) {
        var raw = $el[0];
        if (raw.nodeType === 9) {
            // is document node, top and left are always 0
            return;
        }
        if ($.isWindow(raw)) {
            normPos.top = $el.scrollTop();
            normPos.left = $el.scrollLeft();
        }
        if (raw.preventDefault) {
            // is event
            normPos.top = raw.pageY;
            normPos.left = raw.pageX;
            return;
        }

        var offset = $el.offset();
        normPos.top = offset.top;
        normPos.left = offset.left;
        return;
    }

    /**
     * get the inner boundary box of given element. Take care of scrollbars, borders, padding and so on.
     * Can handle "window", "document" and "DOM node"
     * resulting "top" and "left" are relative to document top-left corner
     *
     * @param  {jQuery} $el [description]
     * @return {NormPos}    Object with {top:number, left:number, height:number, width:number}
     */
    function __normalizeBounding($el) {
        var domElm = $el[0];
        var offset;
        if (domElm.nodeType === 9) {
            // is document node
            domElm = __docElement;
            offset = {
                top: 0,
                left: 0
            };
        } else if ($.isWindow(domElm)) {
            domElm = __docElement;
            offset = {
                top: $el.scrollTop(),
                left: $el.scrollLeft()
            };
        } else {
            offset = $el.offset();
        }

        return {
            width: domElm.clientWidth,
            height: domElm.clientHeight,
            top: offset.top + domElm.clientTop,
            left: offset.left + domElm.clientLeft
        };
    }

    function __refreshBounding($el, normPos) {
        var domElm = $el[0];
        var offset;
        if (domElm.nodeType === 9) {
            // is document node
            domElm = __docElement;
            offset = {
                top: 0,
                left: 0
            };
        } else if ($.isWindow(domElm)) {
            domElm = __docElement;
            offset = {
                top: $el.scrollTop(),
                left: $el.scrollLeft()
            };
        } else {
            offset = $el.offset();
        }

        normPos.top = offset.top + domElm.clientTop;
        normPos.left = offset.left + domElm.clientLeft;
        return;
    }

    /**
     * normalize given offset, convert percent values in pixel values.
     *
     * @param  {Object} offset      offset object with property x:{number}, y:{number}, mirror:{boolean}
     * @param  {Object} size        with properties width:{number} and height:{number} }
     * @return {Object}             offset object
     */
    function __normalizeExtraOffset(offset, size) {
        return {
            y: parseFloat(offset.y) * (__rgx_percent.test(offset.y) ? size.height / 100 :
                1),
            x: parseFloat(offset.x) * (__rgx_percent.test(offset.x) ? size.width / 100 :
                1),
            mirror: offset.mirror
        };
    }

    /**
     * Calculate the relative offset from top-left corner to the reference points
     *
     * @param  {NormPos} pos          Object with normalized position
     * @param  {{x:number, y:number}} extraOffsets    [description]
     * @param  {{x:string, y:string}} initialRefpoint [description]
     * @return {RefPoints}            Object with offset for reference points
     *                                { top:number, left:number, middle:number,
     *                                  center:number, bottom:number, right:number }
     */
    function __calculateRefpointOffsets(pos, extraOffsets, initialRefpoint) {
        var result = {
            top: 0,
            left: 0,
            middle: pos.height * 0.5,
            center: pos.width * 0.5,
            bottom: pos.height,
            right: pos.width
        };

        //add extra offset
        if (extraOffsets.y !== 0) {
            result.middle += extraOffsets.y;
            if (extraOffsets.mirror) {
                result.top += ("top" !== initialRefpoint.y) ? (extraOffsets.y * -1) :
                    extraOffsets.y;
                result.bottom += ("bottom" !== initialRefpoint.y) ? (extraOffsets.y * -1) :
                    extraOffsets.y;
            } else {
                result.top += extraOffsets.y;
                result.bottom += extraOffsets.y;
            }
        }
        if (extraOffsets.x !== 0) {
            result.center += extraOffsets.x;
            if (extraOffsets.mirror) {
                result.left += ("left" !== initialRefpoint.x) ? (extraOffsets.x * -1) :
                    extraOffsets.x;
                result.right += ("right" !== initialRefpoint.x) ? (extraOffsets.x * -1) :
                    extraOffsets.x;
            } else {
                result.left += extraOffsets.x;
                result.right += extraOffsets.x;
            }
        }

        return result;
    }

    /**
     * collect all edges that have overflow between boundary and item.
     *
     * @param  {Distance} distance  Distance Object
     * @return {Distance}           Object with
     *                              { top:number, left:number, bottom:number, right:number,
     *                                overflow:{Array.<string>|null} }
     */
    function __updateOverflow(distance) {
        var overflow = [];
        distance.top > 0 && overflow.push("top");
        distance.left > 0 && overflow.push("left");
        distance.bottom < 0 && overflow.push("bottom");
        distance.right < 0 && overflow.push("right");

        if (overflow.length) {
            distance.overflow = overflow;
        } else {
            distance.overflow = null;
        }

        return distance;
    }

    /**
     * calculate distance / overflow between boundary and item.
     *
     * @param  {NormPos} bou_Pos    NormPos of boundary
     * @param  {NormPos} item_Pos   NormPos of item
     * @return {Distance}           Object with
     *                              { top:number, left:number, bottom:number, right:number,
     *                                overflow:{Array.<string>|null} }
     */
    function __calulateDistance(bou_Pos, item_Pos) {
        var result = {
            top: bou_Pos.top - item_Pos.top,
            left: bou_Pos.left - item_Pos.left,
            bottom: (bou_Pos.top + bou_Pos.height) - (item_Pos.top + item_Pos.height),
            right: (bou_Pos.left + bou_Pos.width) - (item_Pos.left + item_Pos.width),
            overflow: []
        };

        return __updateOverflow(result);
    }

    /**
     * calculate the new fliped placement.
     *
     * {NormAt} is Object with {x:string, y:string}
     *
     * @param  {string} flip    - flip option, "item", "target", "both", "none"
     * @param  {NormAt} itemAt  - NormAt of item
     * @param  {NormAt} tarAt   - NormAt of target
     * @param  {Distance}       - current calculated distance, needed to find out, which edge have overflow
     * @return {Object|null}    - Object with placement
     *                          {
     *                              item_at:NormAt,
     *                              tar_at:NormAt
     *                          }
     *                          - null, if no overflow or if overflow on all edges
     */
    function __flipPlacement(flip, itemAt, tarAt, distance) {
        var y_overflowEdge, x_overflowEdge, flipBits;
        var item_flipedAt = {
            y: itemAt.y,
            x: itemAt.x
        };
        var tar_flipedAt = {
            y: tarAt.y,
            x: tarAt.x
        };

        if (distance.overflow.indexOf("top") !== -1) {
            y_overflowEdge = "top";
        }
        if (distance.overflow.indexOf("bottom") !== -1) {
            if (y_overflowEdge) {
                //overflow in both sides, so item is larger than boundary. Can't be resolved
                y_overflowEdge = null;
            } else {
                y_overflowEdge = "bottom";
            }
        }

        if (distance.overflow.indexOf("left") !== -1) {
            x_overflowEdge = "left";
        }
        if (distance.overflow.indexOf("right") !== -1) {
            if (x_overflowEdge) {
                //overflow in both sides, so item is larger than boundary. Can't be resolved
                x_overflowEdge = null;
            } else {
                x_overflowEdge = "right";
            }
        }

        if (!y_overflowEdge && !x_overflowEdge) {
            return null;
        }

        flip = (flip === true) ? "both" : flip;
        flipBits = 0;
        switch (flip) {
            case "item":
                flipBits = 1;
                break;
            case "target":
                flipBits = 2;
                break;
            case "both":
                flipBits = 3;
                break;
        }

        if (flipBits & 1) {
            y_overflowEdge && (item_flipedAt.y = __mirror[item_flipedAt.y]);
            x_overflowEdge && (item_flipedAt.x = __mirror[item_flipedAt.x]);
        }
        if (flipBits & 2) {
            y_overflowEdge && (tar_flipedAt.y = __mirror[tar_flipedAt.y]);
            x_overflowEdge && (tar_flipedAt.x = __mirror[tar_flipedAt.x]);
        }

        return {
            item_at: item_flipedAt,
            tar_at: tar_flipedAt
        };
    }


    /**
     * compare overflow in distancaA with overflow in distanceB.
     *
     * @param  {Distance}  distanceA  distance object, with top, right, bottom, left
     * @param  {Distance}  distanceB  distance object, with top, right, bottom, left
     * @param  {boolean} isY        axis
     * @return {boolean}            return true, if overflow of A is less than overflow of B,
     *                                         otherwise false
     */
    function __overflowLT(distanceA, distanceB, isY) {
        var a1, a2, b1, b2, edges;

        if (isY) {
            edges = ["top", "bottom"];
        } else {
            edges = ["left", "right"];
        }
        a1 = distanceA[edges[0]];
        b1 = distanceB[edges[0]];
        a2 = distanceA[edges[1]] * -1; // * -1 to get positive values for overflow
        b2 = distanceB[edges[1]] * -1;

        // set values without overflow to zero
        a1 < 0 && (a1 = 0);
        a2 < 0 && (a2 = 0);
        b1 < 0 && (b1 = 0);
        b2 < 0 && (b2 = 0);

        if (a1 < 0 && a2 < 0) {
            //take a
            return true;
        }

        if (b1 < 0 && b2 < 0) {
            // take b
            return false;
        }

        return (a1 + a2) < (b1 + b2);
    }

    function __adaptSticking(data, edges) {
        if (edges === "all") {
            edges = true;
        }
        var overflow = data.distance.overflow;

        if(!overflow.length) {
            return data;
        }

        //to prevent handling overflow in both directions of on axis
        var skipX = false;
        var skipY = false;

        var edge, diff;
        for (var i = overflow.length - 1; i >= 0; i--) {
            edge = overflow[i];
            switch (edge) {
                case "top":
                case "bottom":
                    if (!skipY && edges === true || edges.indexOf(edge) !== -1) {
                        diff = data.distance[edge];
                        data.moveBy.y += diff;
                        data.distance.top -= diff;
                        data.distance.bottom -= diff;
                        skipY = true;
                    }
                    break;

                case "left":
                case "right":
                    if (!skipX && edges === true || edges.indexOf(edge) !== -1) {
                        diff = data.distance[edge];
                        data.moveBy.x += diff;
                        data.distance.left -= diff;
                        data.distance.right -= diff;
                        skipX = true;
                    }
                    break;
            }
        }

        __updateOverflow(data.distance);

        return data;
    }

    /**
     * Class PositionCalculator
     *
     * @param {Object} options
     *
     * {selector|DOM|jQuery} item       -required- the element being positioned
     * {selector|DOM|jQuery} target     -required- the element align the positioned item against
     * {selector|DOM|jQuery|null} boundary -optional- constraints the position of item
     *                                      default: window
     *
     * {string} itemAt          -optional- placement of reference point on the item
     *                                   syntax: <vertical> + " " + <horizontal>
     *                                   vertical: "top" | "middle" | "bottom"
     *                                   horizontal: "left" | "center" | "right"
     *                          default: "top left"
     * {string} targetAt        -optional- placement of reference point on the target
     *                                     same as for "itemAt"
     *                          default: "top left"
     * {Object} itemOffset      -optional- Object with {
     *                                         y:number,      // vertical offset
     *                                         x:number,      // horizontal offset
     *                                         mirror:boolean // if offset should mirror for flip
     *                                    }
     *                          default: { y:0, x:0, mirror:true }
     *
     * {Object} targetOffset    -optional- same as for "itemOffset"
     *                          default: { y:0, x:0, mirror:true }
     *
     * {string|boolean} flip    -optional- specify the strategy to prevent that "item"
     *                                    overflows the boundary.
     *                                    "item": Only change the itemAt
     *                                    "target": Only change the targetAt
     *                                    "both"|true: Change both the itemAt and targetAt at the same time
     *                                          (to 'flip' the item to the other side of the target)
     *                                    "none"|false: Don't change placement of reference point
     *                          default: "none"
     *
     * {string|boolean} stick   -optional- will keep the item within it's boundary by sticking it to
     *                                     the edges if it normally would overflow.
     *                                     Specify sides you'd like to control (space separated) or
     *                                     "none"|false or "all"|true.
     *                          default: "none"
     *
     *
     *  Main method is calculate()
     *
     */
    function PositionCalculator(options) {
        //ensure it called with 'new'
        if (!(this instanceof PositionCalculator)) {
            return new PositionCalculator(options);
        }

        this.options =
            this.$itm =
            this.$trg =
            this.$bnd =
            this.itmAt =
            this.trgAt =
            this.itmPos =
            this.trgPos =
            this.bndPos =
            this.itmOffset =
            this.trgOffset = null;

        this._init(options);
    }
    PositionCalculator.prototype._init = function(options) {
        var o = this.options = $.extend({}, PositionCalculator.defaults, options);

        if (!o.item) {
            return null;
        }
        this.$itm = o.item.jquery ? o.item : $(o.item);
        if (this.$itm.length === 0) {
            return null;
        }

        this.$trg = o.target && o.target.jquery ? o.target : $(__normalizeSlector(o.target));
        this.$bnd = o.boundary && o.boundary.jquery ? o.boundary : $(__normalizeSlector(o.boundary));

        this.itmAt = __normalizeAt(o.itemAt);
        this.trgAt = __normalizeAt(o.targetAt);

        this.resize();

        return this; // to allow chaining
    };

    /**
     * Update intern stored values depending on size and position of elements (item, target, boundary).
     * Should be called if dimensions of an element changed.
     *
     * @return {this} allow chaining
     */
    PositionCalculator.prototype.resize = function() {
        var o = this.options;

        var item_pos = __nomrmalizePosition(this.$itm);
        var targ_pos = this.$trg.length ? __nomrmalizePosition(this.$trg) : null;
        this.bndPos = this.$bnd.length ? __normalizeBounding(this.$bnd) : null;

        if (!this.itmPos || !__isEqualNormPos(item_pos, this.itmPos)) {
            this.itmPos = item_pos;
            var item_extraOffset = __normalizeExtraOffset(o.itemOffset, item_pos);
            // negate values, because it shall be defined relative to the item reference point
            // and not relative to the corner.
            item_extraOffset.x = item_extraOffset.x * -1;
            item_extraOffset.y = item_extraOffset.y * -1;

            this.itmOffset = __calculateRefpointOffsets(item_pos, item_extraOffset,
                this.itmAt);
        }
        if (!this.trgPos || !__isEqualNormPos(targ_pos, this.trgPos)) {
            this.trgPos = targ_pos;
            if(targ_pos) {
                this.trgOffset = __calculateRefpointOffsets(
                    targ_pos,
                    __normalizeExtraOffset(o.targetOffset, targ_pos),
                    this.trgAt
                );
            }
        }

        return this; // to allow chaining
    };

    /**
     * Calculate the resulting position and boundary distance for the given placement.
     * That will not handle flip and fit.
     *
     * If target was not specified, only boundary distance will be calculated.
     * If not "item_at" or "tar_at", only boundary distance will be calculated.
     * If boundary was set to null, only new position will be calculated.
     *
     * Current position of elements (item, target, boundary) will be read from DOM.
     *
     * @param  {{x:string, y:string}|null} item_at Placement for reference point on item
     * @param  {{x:string, y:string}|null} tar_at  Placement for reference point on target
     * @return {Object}         CalculationResult, see method calculate()
     */
    PositionCalculator.prototype.calcVariant = function(item_at, tar_at) {
        var result = {
            moveBy: null,
            distance: null,
            itemAt: null,
            targetAt: null
        };

        if(this.trgPos && item_at && tar_at) {
            var tar_refpoint = {
                top: this.trgPos.top + this.trgOffset[tar_at.y],
                left: this.trgPos.left + this.trgOffset[tar_at.x]
            };
            var item_newPos = {
                top: tar_refpoint.top - this.itmOffset[item_at.y],
                left: tar_refpoint.left - this.itmOffset[item_at.x],
                height: this.itmPos.height,
                width: this.itmPos.width
            };

            result.moveBy = {
                y: item_newPos.top - this.itmPos.top,
                x: item_newPos.left - this.itmPos.left
            };
            result.distance = this.bndPos ? __calulateDistance(this.bndPos, item_newPos) : null;
            result.itemAt = item_at.y + " " + item_at.x;
            result.targetAt = tar_at.y + " " + tar_at.x;
        } else {
            result.moveBy = { y:0, x:0 };
            result.distance = this.bndPos ? __calulateDistance(this.bndPos, this.itmPos) : null;
        }

        return result;
    };

    /**
     * Calculate the distance between reference point of item and reference point of target and
     * handle overflow in the specified matter.
     *
     * @return {Object}   with:
     *     moveBy: {{y:number, x:number}} - distance between target and item as pixel values
     *     distance: {Distance|null}    - distance between item and boundary
     *                                      null, if boundary was not given
     *                                  Distance is Object with: {
     *                                      top:number, left:number,
     *                                      bottom:number, right:number,
     *                                      overflow:{Array.<string>|null}
     *                                  }
     *                                  - top, left, buttom, right - distance/overflow for this edge
     *                                  - overflow - Array with edges has overflow
     *                                             - null for no collision detected
     *     itemAt: {string|null}        - used placement of reference point at item
     *                                    syntax: <vertical> + " " + <horizontal>
     *                                    vertical: "top" | "middle" | "bottom"
     *                                    horizontal: "left" | "center" | "right"
     *                                  - null, if target was not given
     *     targetAt: {string|null}      - used placement of reference point at target
     *                                    syntax: <vertical> + " " + <horizontal>
     *                                    vertical: "top" | "middle" | "bottom"
     *                                    horizontal: "left" | "center" | "right"
     *                                  - null, if target was not given
     */
    PositionCalculator.prototype.calculate = function() {
        if (this.itmPos === null) {
            return null; // init failed
        }

        var o = this.options;

        // refresh
        // only update the position off elements and scroll offsets, but not the width or height
        __refreshPosition(this.$itm, this.itmPos);
        this.trgPos && __refreshPosition(this.$trg, this.trgPos);
        this.bndPos && __refreshBounding(this.$bnd, this.bndPos);

        var result = this.calcVariant(this.itmAt, this.trgAt);
        if (!result.distance || !result.distance.overflow) {
            //finish, because no collision
            return result;
        }

        // ////////////////////
        // collision handling: flip
        if (o.flip && o.flip !== "none" && this.trgPos) {
            var newResult;
            var flipedPlacement = __flipPlacement(o.flip, this.itmAt, this.trgAt,
                result.distance);

            if (flipedPlacement) {
                newResult = this.calcVariant(flipedPlacement.item_at, flipedPlacement.tar_at);

                if (!newResult.distance.overflow) {
                    //finish, because found placement without collision
                    return newResult;
                }

                // look for combination with fewest overflow
                var useNew = {
                    y: false,
                    x: false
                };
                useNew.y = __overflowLT(newResult.distance, result.distance, true);
                useNew.x = __overflowLT(newResult.distance, result.distance, false);

                if (useNew.y !== useNew.x) {
                    //need new distance calculation
                    result = this.calcVariant({
                        y: useNew.y ? flipedPlacement.item_at.y : this.itmAt.y,
                        x: useNew.x ? flipedPlacement.item_at.x : this.itmAt.x
                    }, {
                        y: useNew.y ? flipedPlacement.tar_at.y : this.trgAt.y,
                        x: useNew.x ? flipedPlacement.tar_at.x : this.trgAt.x
                    });
                    if (!result.distance.overflow) {
                        //finish, because found position without collision
                        return result;
                    }
                } else if (useNew.y && useNew.x) {
                    result = newResult;
                } // else use "old" result
            }
        }

        // ////////////////////
        // collision handling: stick
        if (o.stick && o.stick !== "none") {
            return __adaptSticking(result, o.stick);
        } else {
            return result;
        }
    };

    // default options
    PositionCalculator.defaults = {
        item: null,
        target: null,
        boundary: window,
        itemAt: "top left",
        targetAt: "top left",
        itemOffset: {
            y: 0,
            x: 0,
            mirror: true
        },
        targetOffset: {
            y: 0,
            x: 0,
            mirror: true
        },
        flip: "none",
        stick: "none"
    };

    // export
    return PositionCalculator;
}));
;
/*!
 * @preserve
 * jquery.scrolldepth.js | v0.9.1
 * Copyright (c) 2016 Rob Flaherty (@robflaherty)
 * Licensed under the MIT and GPL licenses.
 */
!function(e){"function"==typeof define&&define.amd?define(["jquery"],e):"object"==typeof module&&module.exports?module.exports=e(require("jquery")):e(jQuery)}(function(e){"use strict";var n,t,o,r,i={minHeight:0,elements:[],percentage:!0,userTiming:!0,pixelDepth:!0,nonInteraction:!0,gaGlobal:!1,gtmOverride:!1},l=e(window),a=[],c=!1,u=0;e.scrollDepth=function(p){function s(e,i,l,a){r?(r({event:"ScrollDistance",eventCategory:"Scroll Depth",eventAction:e,eventLabel:i,eventValue:1,eventNonInteraction:p.nonInteraction}),p.pixelDepth&&arguments.length>2&&l>u&&(u=l,r({event:"ScrollDistance",eventCategory:"Scroll Depth",eventAction:"Pixel Depth",eventLabel:m(l),eventValue:1,eventNonInteraction:p.nonInteraction})),p.userTiming&&arguments.length>3&&r({event:"ScrollTiming",eventCategory:"Scroll Depth",eventAction:e,eventLabel:i,eventTiming:a})):(n&&(window[o]("send","event","Scroll Depth",e,i,1,{nonInteraction:p.nonInteraction}),p.pixelDepth&&arguments.length>2&&l>u&&(u=l,window[o]("send","event","Scroll Depth","Pixel Depth",m(l),1,{nonInteraction:p.nonInteraction})),p.userTiming&&arguments.length>3&&window[o]("send","timing","Scroll Depth",e,a,i)),t&&(_gaq.push(["_trackEvent","Scroll Depth",e,i,1,p.nonInteraction]),p.pixelDepth&&arguments.length>2&&l>u&&(u=l,_gaq.push(["_trackEvent","Scroll Depth","Pixel Depth",m(l),1,p.nonInteraction])),p.userTiming&&arguments.length>3&&_gaq.push(["_trackTiming","Scroll Depth",e,a,i,100])))}function h(e){return{"25%":parseInt(.25*e,10),"50%":parseInt(.5*e,10),"75%":parseInt(.75*e,10),"100%":e-5}}function g(n,t,o){e.each(n,function(n,r){-1===e.inArray(n,a)&&t>=r&&(s("Percentage",n,t,o),a.push(n))})}function f(n,t,o){e.each(n,function(n,r){-1===e.inArray(r,a)&&e(r).length&&t>=e(r).offset().top&&(s("Elements",r,t,o),a.push(r))})}function m(e){return(250*Math.floor(e/250)).toString()}function d(){D()}function v(e,n){var t,o,r,i=null,l=0,a=function(){l=new Date,i=null,r=e.apply(t,o)};return function(){var c=new Date;l||(l=c);var u=n-(c-l);return t=this,o=arguments,0>=u?(clearTimeout(i),i=null,l=c,r=e.apply(t,o)):i||(i=setTimeout(a,u)),r}}function D(){c=!0,l.on("scroll.scrollDepth",v(function(){var n=e(document).height(),t=window.innerHeight?window.innerHeight:l.height(),o=l.scrollTop()+t,r=h(n),i=+new Date-y;return a.length>=p.elements.length+(p.percentage?4:0)?(l.off("scroll.scrollDepth"),void(c=!1)):(p.elements&&f(p.elements,o,i),void(p.percentage&&g(r,o,i)))},500))}var y=+new Date;p=e.extend({},i,p),e(document).height()<p.minHeight||(p.gaGlobal?(n=!0,o=p.gaGlobal):"function"==typeof ga?(n=!0,o="ga"):"function"==typeof __gaTracker&&(n=!0,o="__gaTracker"),"undefined"!=typeof _gaq&&"function"==typeof _gaq.push&&(t=!0),"function"==typeof p.eventHandler?r=p.eventHandler:"undefined"==typeof dataLayer||"function"!=typeof dataLayer.push||p.gtmOverride||(r=function(e){dataLayer.push(e)}),e.scrollDepth.reset=function(){a=[],u=0,l.off("scroll.scrollDepth"),D()},e.scrollDepth.addElements=function(n){"undefined"!=typeof n&&e.isArray(n)&&(e.merge(p.elements,n),c||D())},e.scrollDepth.removeElements=function(n){"undefined"!=typeof n&&e.isArray(n)&&e.each(n,function(n,t){var o=e.inArray(t,p.elements),r=e.inArray(t,a);-1!=o&&p.elements.splice(o,1),-1!=r&&a.splice(r,1)})},d())}});;
/* German initialisation for the jQuery UI date picker plugin. */
/* Written by Milian Wolff (mail@milianw.de). */
(function($) {
	$.datepicker.regional['de'] = {
		renderer: $.datepicker.defaultRenderer,
		monthNames: ['Januar','Februar','März','April','Mai','Juni',
		'Juli','August','September','Oktober','November','Dezember'],
		monthNamesShort: ['Jan','Feb','Mär','Apr','Mai','Jun',
		'Jul','Aug','Sep','Okt','Nov','Dez'],
		dayNames: ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
		dayNamesShort: ['So','Mo','Di','Mi','Do','Fr','Sa'],
		dayNamesMin: ['So','Mo','Di','Mi','Do','Fr','Sa'],
		dateFormat: 'dd.mm.yy',
		firstDay: 1,
		prevText: '&#x3c;zurück', prevStatus: '',
		prevJumpText: '&#x3c;&#x3c;', prevJumpStatus: '',
		nextText: 'Vor&#x3e;', nextStatus: '',
		nextJumpText: '&#x3e;&#x3e;', nextJumpStatus: '',
		currentText: 'heute', currentStatus: '',
		todayText: 'heute', todayStatus: '',
		clearText: '-', clearStatus: '',
		closeText: 'schließen', closeStatus: '',
		yearStatus: '', monthStatus: '',
		weekText: 'Wo', weekStatus: '',
		dayStatus: 'DD d MM',
		defaultStatus: '',
		isRTL: false
	};
	$.extend($.datepicker.defaults, $.datepicker.regional['de']);
})(jQuery);
;
(function($){

    /**
     * Copyright 2012, Digital Fusion
     * Licensed under the MIT license.
     * http://teamdf.com/jquery-plugins/license/
     *
     * @author Sam Sehnert
     * @desc A small plugin that checks whether elements are within
     *       the user visible viewport of a web browser.
     *       only accounts for vertical position, not horizontal.
     */
    var $w = $(window);
    $.fn.visible = function(partial,hidden,direction){

        if (this.length < 1)
            return;

        var $t        = this.length > 1 ? this.eq(0) : this,
            t         = $t.get(0),
            vpWidth   = $w.width(),
            vpHeight  = $w.height(),
            direction = (direction) ? direction : 'both',
            clientSize = hidden === true ? t.offsetWidth * t.offsetHeight : true;

        if (typeof t.getBoundingClientRect === 'function'){

            // Use this native browser method, if available.
            var rec = t.getBoundingClientRect(),
                tViz = rec.top    >= 0 && rec.top    <  vpHeight,
                bViz = rec.bottom >  0 && rec.bottom <= vpHeight,
                lViz = rec.left   >= 0 && rec.left   <  vpWidth,
                rViz = rec.right  >  0 && rec.right  <= vpWidth,
                vVisible   = partial ? tViz || bViz : tViz && bViz,
                hVisible   = partial ? lViz || rViz : lViz && rViz;

            if(direction === 'both')
                return clientSize && vVisible && hVisible;
            else if(direction === 'vertical')
                return clientSize && vVisible;
            else if(direction === 'horizontal')
                return clientSize && hVisible;
        } else {

            var viewTop         = $w.scrollTop(),
                viewBottom      = viewTop + vpHeight,
                viewLeft        = $w.scrollLeft(),
                viewRight       = viewLeft + vpWidth,
                offset          = $t.offset(),
                _top            = offset.top,
                _bottom         = _top + $t.height(),
                _left           = offset.left,
                _right          = _left + $t.width(),
                compareTop      = partial === true ? _bottom : _top,
                compareBottom   = partial === true ? _top : _bottom,
                compareLeft     = partial === true ? _right : _left,
                compareRight    = partial === true ? _left : _right;

            if(direction === 'both')
                return !!clientSize && ((compareBottom <= viewBottom) && (compareTop >= viewTop)) && ((compareRight <= viewRight) && (compareLeft >= viewLeft));
            else if(direction === 'vertical')
                return !!clientSize && ((compareBottom <= viewBottom) && (compareTop >= viewTop));
            else if(direction === 'horizontal')
                return !!clientSize && ((compareRight <= viewRight) && (compareLeft >= viewLeft));
        }
    };

})(jQuery);
;
/*
Copyright 2012 Igor Vaynberg

Version: 3.4.1 Timestamp: Thu Jun 27 18:02:10 PDT 2013

This software is licensed under the Apache License, Version 2.0 (the "Apache License") or the GNU
General Public License version 2 (the "GPL License"). You may choose either license to govern your
use of this software only upon the condition that you accept all of the terms of either the Apache
License or the GPL License.

You may obtain a copy of the Apache License and the GPL License at:

    http://www.apache.org/licenses/LICENSE-2.0
    http://www.gnu.org/licenses/gpl-2.0.html

Unless required by applicable law or agreed to in writing, software distributed under the
Apache License or the GPL Licesnse is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the Apache License and the GPL License for
the specific language governing permissions and limitations under the Apache License and the GPL License.
*/
(function ($) {
    if(typeof $.fn.each2 == "undefined") {
        $.fn.extend({
            /*
            * 4-10 times faster .each replacement
            * use it carefully, as it overrides jQuery context of element on each iteration
            */
            each2 : function (c) {
                var j = $([0]), i = -1, l = this.length;
                while (
                    ++i < l
                    && (j.context = j[0] = this[i])
                    && c.call(j[0], i, j) !== false //"this"=DOM, i=index, j=jQuery object
                );
                return this;
            }
        });
    }
})(jQuery);

(function ($, undefined) {
    "use strict";
    /*global document, window, jQuery, console */

    if (window.Select2 !== undefined) {
        return;
    }

    var KEY, AbstractSelect2, SingleSelect2, MultiSelect2, nextUid, sizer,
        lastMousePosition={x:0,y:0}, $document, scrollBarDimensions,

    KEY = {
        TAB: 9,
        ENTER: 13,
        ESC: 27,
        SPACE: 32,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        HOME: 36,
        END: 35,
        BACKSPACE: 8,
        DELETE: 46,
        isArrow: function (k) {
            k = k.which ? k.which : k;
            switch (k) {
            case KEY.LEFT:
            case KEY.RIGHT:
            case KEY.UP:
            case KEY.DOWN:
                return true;
            }
            return false;
        },
        isControl: function (e) {
            var k = e.which;
            switch (k) {
            case KEY.SHIFT:
            case KEY.CTRL:
            case KEY.ALT:
                return true;
            }

            if (e.metaKey) return true;

            return false;
        },
        isFunctionKey: function (k) {
            k = k.which ? k.which : k;
            return k >= 112 && k <= 123;
        }
    },
    MEASURE_SCROLLBAR_TEMPLATE = "<div class='select2-measure-scrollbar'></div>";

    $document = $(document);

    nextUid=(function() { var counter=1; return function() { return counter++; }; }());

    function indexOf(value, array) {
        var i = 0, l = array.length;
        for (; i < l; i = i + 1) {
            if (equal(value, array[i])) return i;
        }
        return -1;
    }

    function measureScrollbar () {
        var $template = $( MEASURE_SCROLLBAR_TEMPLATE );
        $template.appendTo('body');

        var dim = {
            width: $template.width() - $template[0].clientWidth,
            height: $template.height() - $template[0].clientHeight
        };
        $template.remove();

        return dim;
    }

    /**
     * Compares equality of a and b
     * @param a
     * @param b
     */
    function equal(a, b) {
        if (a === b) return true;
        if (a === undefined || b === undefined) return false;
        if (a === null || b === null) return false;
        // Check whether 'a' or 'b' is a string (primitive or object).
        // The concatenation of an empty string (+'') converts its argument to a string's primitive.
        if (a.constructor === String) return a+'' === b+''; // a+'' - in case 'a' is a String object
        if (b.constructor === String) return b+'' === a+''; // b+'' - in case 'b' is a String object
        return false;
    }

    /**
     * Splits the string into an array of values, trimming each value. An empty array is returned for nulls or empty
     * strings
     * @param string
     * @param separator
     */
    function splitVal(string, separator) {
        var val, i, l;
        if (string === null || string.length < 1) return [];
        val = string.split(separator);
        for (i = 0, l = val.length; i < l; i = i + 1) val[i] = $.trim(val[i]);
        return val;
    }

    function getSideBorderPadding(element) {
        return element.outerWidth(false) - element.width();
    }

    function installKeyUpChangeEvent(element) {
        var key="keyup-change-value";
        element.on("keydown", function () {
            if ($.data(element, key) === undefined) {
                $.data(element, key, element.val());
            }
        });
        element.on("keyup", function () {
            var val= $.data(element, key);
            if (val !== undefined && element.val() !== val) {
                $.removeData(element, key);
                element.trigger("keyup-change");
            }
        });
    }

    $document.on("mousemove", function (e) {
        lastMousePosition.x = e.pageX;
        lastMousePosition.y = e.pageY;
    });

    /**
     * filters mouse events so an event is fired only if the mouse moved.
     *
     * filters out mouse events that occur when mouse is stationary but
     * the elements under the pointer are scrolled.
     */
    function installFilteredMouseMove(element) {
        element.on("mousemove", function (e) {
            var lastpos = lastMousePosition;
            if (lastpos === undefined || lastpos.x !== e.pageX || lastpos.y !== e.pageY) {
                $(e.target).trigger("mousemove-filtered", e);
            }
        });
    }

    /**
     * Debounces a function. Returns a function that calls the original fn function only if no invocations have been made
     * within the last quietMillis milliseconds.
     *
     * @param quietMillis number of milliseconds to wait before invoking fn
     * @param fn function to be debounced
     * @param ctx object to be used as this reference within fn
     * @return debounced version of fn
     */
    function debounce(quietMillis, fn, ctx) {
        ctx = ctx || undefined;
        var timeout;
        return function () {
            var args = arguments;
            window.clearTimeout(timeout);
            timeout = window.setTimeout(function() {
                fn.apply(ctx, args);
            }, quietMillis);
        };
    }

    /**
     * A simple implementation of a thunk
     * @param formula function used to lazily initialize the thunk
     * @return {Function}
     */
    function thunk(formula) {
        var evaluated = false,
            value;
        return function() {
            if (evaluated === false) { value = formula(); evaluated = true; }
            return value;
        };
    };

    function installDebouncedScroll(threshold, element) {
        var notify = debounce(threshold, function (e) { element.trigger("scroll-debounced", e);});
        element.on("scroll", function (e) {
            if (indexOf(e.target, element.get()) >= 0) notify(e);
        });
    }

    function focus($el) {
        if ($el[0] === document.activeElement) return;

        /* set the focus in a 0 timeout - that way the focus is set after the processing
            of the current event has finished - which seems like the only reliable way
            to set focus */
        window.setTimeout(function() {
            var el=$el[0], pos=$el.val().length, range;

            $el.focus();

            /* make sure el received focus so we do not error out when trying to manipulate the caret.
                sometimes modals or others listeners may steal it after its set */
            if ($el.is(":visible") && el === document.activeElement) {

                /* after the focus is set move the caret to the end, necessary when we val()
                    just before setting focus */
                if(el.setSelectionRange)
                {
                    el.setSelectionRange(pos, pos);
                }
                else if (el.createTextRange) {
                    range = el.createTextRange();
                    range.collapse(false);
                    range.select();
                }
            }
        }, 0);
    }

    function getCursorInfo(el) {
        el = $(el)[0];
        var offset = 0;
        var length = 0;
        if ('selectionStart' in el) {
            offset = el.selectionStart;
            length = el.selectionEnd - offset;
        } else if ('selection' in document) {
            el.focus();
            var sel = document.selection.createRange();
            length = document.selection.createRange().text.length;
            sel.moveStart('character', -el.value.length);
            offset = sel.text.length - length;
        }
        return { offset: offset, length: length };
    }

    function killEvent(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    function killEventImmediately(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function measureTextWidth(e) {
        if (!sizer){
            var style = e[0].currentStyle || window.getComputedStyle(e[0], null);
            sizer = $(document.createElement("div")).css({
                position: "absolute",
                left: "-10000px",
                top: "-10000px",
                display: "none",
                fontSize: style.fontSize,
                fontFamily: style.fontFamily,
                fontStyle: style.fontStyle,
                fontWeight: style.fontWeight,
                letterSpacing: style.letterSpacing,
                textTransform: style.textTransform,
                whiteSpace: "nowrap"
            });
            sizer.attr("class","select2-sizer");
            $("body").append(sizer);
        }
        sizer.text(e.val());
        return sizer.width();
    }

    function syncCssClasses(dest, src, adapter) {
        var classes, replacements = [], adapted;

        classes = dest.attr("class");
        if (classes) {
            classes = '' + classes; // for IE which returns object
            $(classes.split(" ")).each2(function() {
                if (this.indexOf("select2-") === 0) {
                    replacements.push(this);
                }
            });
        }
        classes = src.attr("class");
        if (classes) {
            classes = '' + classes; // for IE which returns object
            $(classes.split(" ")).each2(function() {
                if (this.indexOf("select2-") !== 0) {
                    adapted = adapter(this);
                    if (adapted) {
                        replacements.push(this);
                    }
                }
            });
        }
        dest.attr("class", replacements.join(" "));
    }


    function markMatch(text, term, markup, escapeMarkup) {
        var match=text.toUpperCase().indexOf(term.toUpperCase()),
            tl=term.length;

        if (match<0) {
            markup.push(escapeMarkup(text));
            return;
        }

        markup.push(escapeMarkup(text.substring(0, match)));
        markup.push("<span class='select2-match'>");
        markup.push(escapeMarkup(text.substring(match, match + tl)));
        markup.push("</span>");
        markup.push(escapeMarkup(text.substring(match + tl, text.length)));
    }

    function defaultEscapeMarkup(markup) {
        var replace_map = {
            '\\': '&#92;',
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            "/": '&#47;'
        };

        return String(markup).replace(/[&<>"'\/\\]/g, function (match) {
            return replace_map[match];
        });
    }

    /**
     * Produces an ajax-based query function
     *
     * @param options object containing configuration paramters
     * @param options.params parameter map for the transport ajax call, can contain such options as cache, jsonpCallback, etc. see $.ajax
     * @param options.transport function that will be used to execute the ajax request. must be compatible with parameters supported by $.ajax
     * @param options.url url for the data
     * @param options.data a function(searchTerm, pageNumber, context) that should return an object containing query string parameters for the above url.
     * @param options.dataType request data type: ajax, jsonp, other datatatypes supported by jQuery's $.ajax function or the transport function if specified
     * @param options.quietMillis (optional) milliseconds to wait before making the ajaxRequest, helps debounce the ajax function if invoked too often
     * @param options.results a function(remoteData, pageNumber) that converts data returned form the remote request to the format expected by Select2.
     *      The expected format is an object containing the following keys:
     *      results array of objects that will be used as choices
     *      more (optional) boolean indicating whether there are more results available
     *      Example: {results:[{id:1, text:'Red'},{id:2, text:'Blue'}], more:true}
     */
    function ajax(options) {
        var timeout, // current scheduled but not yet executed request
            requestSequence = 0, // sequence used to drop out-of-order responses
            handler = null,
            quietMillis = options.quietMillis || 100,
            ajaxUrl = options.url,
            self = this;

        return function (query) {
            window.clearTimeout(timeout);
            timeout = window.setTimeout(function () {
                requestSequence += 1; // increment the sequence
                var requestNumber = requestSequence, // this request's sequence number
                    data = options.data, // ajax data function
                    url = ajaxUrl, // ajax url string or function
                    transport = options.transport || $.fn.select2.ajaxDefaults.transport,
                    // deprecated - to be removed in 4.0  - use params instead
                    deprecated = {
                        type: options.type || 'GET', // set type of request (GET or POST)
                        cache: options.cache || false,
                        jsonpCallback: options.jsonpCallback||undefined,
                        dataType: options.dataType||"json"
                    },
                    params = $.extend({}, $.fn.select2.ajaxDefaults.params, deprecated);

                data = data ? data.call(self, query.term, query.page, query.context) : null;
                url = (typeof url === 'function') ? url.call(self, query.term, query.page, query.context) : url;

                if (handler) { handler.abort(); }

                if (options.params) {
                    if ($.isFunction(options.params)) {
                        $.extend(params, options.params.call(self));
                    } else {
                        $.extend(params, options.params);
                    }
                }

                $.extend(params, {
                    url: url,
                    dataType: options.dataType,
                    data: data,
                    success: function (data) {
                        if (requestNumber < requestSequence) {
                            return;
                        }
                        // TODO - replace query.page with query so users have access to term, page, etc.
                        var results = options.results(data, query.page);
                        query.callback(results);
                    }
                });
                handler = transport.call(self, params);
            }, quietMillis);
        };
    }

    /**
     * Produces a query function that works with a local array
     *
     * @param options object containing configuration parameters. The options parameter can either be an array or an
     * object.
     *
     * If the array form is used it is assumed that it contains objects with 'id' and 'text' keys.
     *
     * If the object form is used ti is assumed that it contains 'data' and 'text' keys. The 'data' key should contain
     * an array of objects that will be used as choices. These objects must contain at least an 'id' key. The 'text'
     * key can either be a String in which case it is expected that each element in the 'data' array has a key with the
     * value of 'text' which will be used to match choices. Alternatively, text can be a function(item) that can extract
     * the text.
     */
    function local(options) {
        var data = options, // data elements
            dataText,
            tmp,
            text = function (item) { return ""+item.text; }; // function used to retrieve the text portion of a data item that is matched against the search

         if ($.isArray(data)) {
            tmp = data;
            data = { results: tmp };
        }

         if ($.isFunction(data) === false) {
            tmp = data;
            data = function() { return tmp; };
        }

        var dataItem = data();
        if (dataItem.text) {
            text = dataItem.text;
            // if text is not a function we assume it to be a key name
            if (!$.isFunction(text)) {
                dataText = dataItem.text; // we need to store this in a separate variable because in the next step data gets reset and data.text is no longer available
                text = function (item) { return item[dataText]; };
            }
        }

        return function (query) {
            var t = query.term, filtered = { results: [] }, process;
            if (t === "") {
                query.callback(data());
                return;
            }

            process = function(datum, collection) {
                var group, attr;
                datum = datum[0];
                if (datum.children) {
                    group = {};
                    for (attr in datum) {
                        if (datum.hasOwnProperty(attr)) group[attr]=datum[attr];
                    }
                    group.children=[];
                    $(datum.children).each2(function(i, childDatum) { process(childDatum, group.children); });
                    if (group.children.length || query.matcher(t, text(group), datum)) {
                        collection.push(group);
                    }
                } else {
                    if (query.matcher(t, text(datum), datum)) {
                        collection.push(datum);
                    }
                }
            };

            $(data().results).each2(function(i, datum) { process(datum, filtered.results); });
            query.callback(filtered);
        };
    }

    // TODO javadoc
    function tags(data) {
        var isFunc = $.isFunction(data);
        return function (query) {
            var t = query.term, filtered = {results: []};
            $(isFunc ? data() : data).each(function () {
                var isObject = this.text !== undefined,
                    text = isObject ? this.text : this;
                if (t === "" || query.matcher(t, text)) {
                    filtered.results.push(isObject ? this : {id: this, text: this});
                }
            });
            query.callback(filtered);
        };
    }

    /**
     * Checks if the formatter function should be used.
     *
     * Throws an error if it is not a function. Returns true if it should be used,
     * false if no formatting should be performed.
     *
     * @param formatter
     */
    function checkFormatter(formatter, formatterName) {
        if ($.isFunction(formatter)) return true;
        if (!formatter) return false;
        throw new Error(formatterName +" must be a function or a falsy value");
    }

    function evaluate(val) {
        return $.isFunction(val) ? val() : val;
    }

    function countResults(results) {
        var count = 0;
        $.each(results, function(i, item) {
            if (item.children) {
                count += countResults(item.children);
            } else {
                count++;
            }
        });
        return count;
    }

    /**
     * Default tokenizer. This function uses breaks the input on substring match of any string from the
     * opts.tokenSeparators array and uses opts.createSearchChoice to create the choice object. Both of those
     * two options have to be defined in order for the tokenizer to work.
     *
     * @param input text user has typed so far or pasted into the search field
     * @param selection currently selected choices
     * @param selectCallback function(choice) callback tho add the choice to selection
     * @param opts select2's opts
     * @return undefined/null to leave the current input unchanged, or a string to change the input to the returned value
     */
    function defaultTokenizer(input, selection, selectCallback, opts) {
        var original = input, // store the original so we can compare and know if we need to tell the search to update its text
            dupe = false, // check for whether a token we extracted represents a duplicate selected choice
            token, // token
            index, // position at which the separator was found
            i, l, // looping variables
            separator; // the matched separator

        if (!opts.createSearchChoice || !opts.tokenSeparators || opts.tokenSeparators.length < 1) return undefined;

        while (true) {
            index = -1;

            for (i = 0, l = opts.tokenSeparators.length; i < l; i++) {
                separator = opts.tokenSeparators[i];
                index = input.indexOf(separator);
                if (index >= 0) break;
            }

            if (index < 0) break; // did not find any token separator in the input string, bail

            token = input.substring(0, index);
            input = input.substring(index + separator.length);

            if (token.length > 0) {
                token = opts.createSearchChoice.call(this, token, selection);
                if (token !== undefined && token !== null && opts.id(token) !== undefined && opts.id(token) !== null) {
                    dupe = false;
                    for (i = 0, l = selection.length; i < l; i++) {
                        if (equal(opts.id(token), opts.id(selection[i]))) {
                            dupe = true; break;
                        }
                    }

                    if (!dupe) selectCallback(token);
                }
            }
        }

        if (original!==input) return input;
    }

    /**
     * Creates a new class
     *
     * @param superClass
     * @param methods
     */
    function clazz(SuperClass, methods) {
        var constructor = function () {};
        constructor.prototype = new SuperClass;
        constructor.prototype.constructor = constructor;
        constructor.prototype.parent = SuperClass.prototype;
        constructor.prototype = $.extend(constructor.prototype, methods);
        return constructor;
    }

    AbstractSelect2 = clazz(Object, {

        // abstract
        bind: function (func) {
            var self = this;
            return function () {
                func.apply(self, arguments);
            };
        },

        // abstract
        init: function (opts) {
            var results, search, resultsSelector = ".select2-results", disabled, readonly;

            // prepare options
            this.opts = opts = this.prepareOpts(opts);

            this.id=opts.id;

            // destroy if called on an existing component
            if (opts.element.data("select2") !== undefined &&
                opts.element.data("select2") !== null) {
                opts.element.data("select2").destroy();
            }

            this.container = this.createContainer();

            this.containerId="s2id_"+(opts.element.attr("id") || "autogen"+nextUid());
            this.containerSelector="#"+this.containerId.replace(/([;&,\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g, '\\$1');
            this.container.attr("id", this.containerId);

            // cache the body so future lookups are cheap
            this.body = thunk(function() { return opts.element.closest("body"); });

            syncCssClasses(this.container, this.opts.element, this.opts.adaptContainerCssClass);

            this.container.css(evaluate(opts.containerCss));
            this.container.addClass(evaluate(opts.containerCssClass));

            this.elementTabIndex = this.opts.element.attr("tabindex");

            // swap container for the element
            this.opts.element
                .data("select2", this)
                .attr("tabindex", "-1")
                .before(this.container);
            this.container.data("select2", this);

            this.dropdown = this.container.find(".select2-drop");
            this.dropdown.addClass(evaluate(opts.dropdownCssClass));
            this.dropdown.data("select2", this);

            this.results = results = this.container.find(resultsSelector);
            this.search = search = this.container.find("input.select2-input");

            this.resultsPage = 0;
            this.context = null;

            // initialize the container
            this.initContainer();

            installFilteredMouseMove(this.results);
            this.dropdown.on("mousemove-filtered touchstart touchmove touchend", resultsSelector, this.bind(this.highlightUnderEvent));

            installDebouncedScroll(80, this.results);
            this.dropdown.on("scroll-debounced", resultsSelector, this.bind(this.loadMoreIfNeeded));

            // do not propagate change event from the search field out of the component
            $(this.container).on("change", ".select2-input", function(e) {e.stopPropagation();});
            $(this.dropdown).on("change", ".select2-input", function(e) {e.stopPropagation();});

            // if jquery.mousewheel plugin is installed we can prevent out-of-bounds scrolling of results via mousewheel
            if ($.fn.mousewheel) {
                results.mousewheel(function (e, delta, deltaX, deltaY) {
                    var top = results.scrollTop(), height;
                    if (deltaY > 0 && top - deltaY <= 0) {
                        results.scrollTop(0);
                        killEvent(e);
                    } else if (deltaY < 0 && results.get(0).scrollHeight - results.scrollTop() + deltaY <= results.height()) {
                        results.scrollTop(results.get(0).scrollHeight - results.height());
                        killEvent(e);
                    }
                });
            }

            installKeyUpChangeEvent(search);
            search.on("keyup-change input paste", this.bind(this.updateResults));
            search.on("focus", function () { search.addClass("select2-focused"); });
            search.on("blur", function () { search.removeClass("select2-focused");});

            this.dropdown.on("mouseup", resultsSelector, this.bind(function (e) {
                if ($(e.target).closest(".select2-result-selectable").length > 0) {
                    this.highlightUnderEvent(e);
                    this.selectHighlighted(e);
                }
            }));

            // trap all mouse events from leaving the dropdown. sometimes there may be a modal that is listening
            // for mouse events outside of itself so it can close itself. since the dropdown is now outside the select2's
            // dom it will trigger the popup close, which is not what we want
            this.dropdown.on("click mouseup mousedown", function (e) { e.stopPropagation(); });

            if ($.isFunction(this.opts.initSelection)) {
                // initialize selection based on the current value of the source element
                this.initSelection();

                // if the user has provided a function that can set selection based on the value of the source element
                // we monitor the change event on the element and trigger it, allowing for two way synchronization
                this.monitorSource();
            }

            if (opts.maximumInputLength !== null) {
                this.search.attr("maxlength", opts.maximumInputLength);
            }

            var disabled = opts.element.prop("disabled");
            if (disabled === undefined) disabled = false;
            this.enable(!disabled);

            var readonly = opts.element.prop("readonly");
            if (readonly === undefined) readonly = false;
            this.readonly(readonly);

            // Calculate size of scrollbar
            scrollBarDimensions = scrollBarDimensions || measureScrollbar();

            this.autofocus = opts.element.prop("autofocus")
            opts.element.prop("autofocus", false);
            if (this.autofocus) this.focus();
        },

        // abstract
        destroy: function () {
            var element=this.opts.element, select2 = element.data("select2");

            if (this.propertyObserver) { delete this.propertyObserver; this.propertyObserver = null; }

            if (select2 !== undefined) {
                select2.container.remove();
                select2.dropdown.remove();
                element
                    .removeClass("select2-offscreen")
                    .removeData("select2")
                    .off(".select2")
                    .prop("autofocus", this.autofocus || false);
                if (this.elementTabIndex) {
                    element.attr({tabindex: this.elementTabIndex});
                } else {
                    element.removeAttr("tabindex");
                }
                element.show();
            }
        },

        // abstract
        optionToData: function(element) {
            if (element.is("option")) {
                return {
                    id:element.prop("value"),
                    text:element.text(),
                    element: element.get(),
                    css: element.attr("class"),
                    disabled: element.prop("disabled"),
                    locked: equal(element.attr("locked"), "locked") || equal(element.data("locked"), true)
                };
            } else if (element.is("optgroup")) {
                return {
                    text:element.attr("label"),
                    children:[],
                    element: element.get(),
                    css: element.attr("class")
                };
            }
        },

        // abstract
        prepareOpts: function (opts) {
            var element, select, idKey, ajaxUrl, self = this;

            element = opts.element;

            if (element.get(0).tagName.toLowerCase() === "select") {
                this.select = select = opts.element;
            }

            if (select) {
                // these options are not allowed when attached to a select because they are picked up off the element itself
                $.each(["id", "multiple", "ajax", "query", "createSearchChoice", "initSelection", "data", "tags"], function () {
                    if (this in opts) {
                        throw new Error("Option '" + this + "' is not allowed for Select2 when attached to a <select> element.");
                    }
                });
            }

            opts = $.extend({}, {
                populateResults: function(container, results, query) {
                    var populate,  data, result, children, id=this.opts.id;

                    populate=function(results, container, depth) {

                        var i, l, result, selectable, disabled, compound, node, label, innerContainer, formatted;

                        results = opts.sortResults(results, container, query);

                        for (i = 0, l = results.length; i < l; i = i + 1) {

                            result=results[i];

                            disabled = (result.disabled === true);
                            selectable = (!disabled) && (id(result) !== undefined);

                            compound=result.children && result.children.length > 0;

                            node=$("<li></li>");
                            node.addClass("select2-results-dept-"+depth);
                            node.addClass("select2-result");
                            node.addClass(selectable ? "select2-result-selectable" : "select2-result-unselectable");
                            if (disabled) { node.addClass("select2-disabled"); }
                            if (compound) { node.addClass("select2-result-with-children"); }
                            node.addClass(self.opts.formatResultCssClass(result));

                            label=$(document.createElement("div"));
                            label.addClass("select2-result-label");

                            formatted=opts.formatResult(result, label, query, self.opts.escapeMarkup);
                            if (formatted!==undefined) {
                                label.html(formatted);
                            }

                            node.append(label);

                            if (compound) {

                                innerContainer=$("<ul></ul>");
                                innerContainer.addClass("select2-result-sub");
                                populate(result.children, innerContainer, depth+1);
                                node.append(innerContainer);
                            }

                            node.data("select2-data", result);
                            container.append(node);
                        }
                    };

                    populate(results, container, 0);
                }
            }, $.fn.select2.defaults, opts);

            if (typeof(opts.id) !== "function") {
                idKey = opts.id;
                opts.id = function (e) { return e[idKey]; };
            }

            if ($.isArray(opts.element.data("select2Tags"))) {
                if ("tags" in opts) {
                    throw "tags specified as both an attribute 'data-select2-tags' and in options of Select2 " + opts.element.attr("id");
                }
                opts.tags=opts.element.data("select2Tags");
            }

            if (select) {
                opts.query = this.bind(function (query) {
                    var data = { results: [], more: false },
                        term = query.term,
                        children, placeholderOption, process;

                    process=function(element, collection) {
                        var group;
                        if (element.is("option")) {
                            if (query.matcher(term, element.text(), element)) {
                                collection.push(self.optionToData(element));
                            }
                        } else if (element.is("optgroup")) {
                            group=self.optionToData(element);
                            element.children().each2(function(i, elm) { process(elm, group.children); });
                            if (group.children.length>0) {
                                collection.push(group);
                            }
                        }
                    };

                    children=element.children();

                    // ignore the placeholder option if there is one
                    if (this.getPlaceholder() !== undefined && children.length > 0) {
                        placeholderOption = this.getPlaceholderOption();
                        if (placeholderOption) {
                            children=children.not(placeholderOption);
                        }
                    }

                    children.each2(function(i, elm) { process(elm, data.results); });

                    query.callback(data);
                });
                // this is needed because inside val() we construct choices from options and there id is hardcoded
                opts.id=function(e) { return e.id; };
                opts.formatResultCssClass = function(data) { return data.css; };
            } else {
                if (!("query" in opts)) {

                    if ("ajax" in opts) {
                        ajaxUrl = opts.element.data("ajax-url");
                        if (ajaxUrl && ajaxUrl.length > 0) {
                            opts.ajax.url = ajaxUrl;
                        }
                        opts.query = ajax.call(opts.element, opts.ajax);
                    } else if ("data" in opts) {
                        opts.query = local(opts.data);
                    } else if ("tags" in opts) {
                        opts.query = tags(opts.tags);
                        if (opts.createSearchChoice === undefined) {
                            opts.createSearchChoice = function (term) { return {id: term, text: term}; };
                        }
                        if (opts.initSelection === undefined) {
                            opts.initSelection = function (element, callback) {
                                var data = [];
                                $(splitVal(element.val(), opts.separator)).each(function () {
                                    var id = this, text = this, tags=opts.tags;
                                    if ($.isFunction(tags)) tags=tags();
                                    $(tags).each(function() { if (equal(this.id, id)) { text = this.text; return false; } });
                                    data.push({id: id, text: text});
                                });

                                callback(data);
                            };
                        }
                    }
                }
            }
            if (typeof(opts.query) !== "function") {
                throw "query function not defined for Select2 " + opts.element.attr("id");
            }

            return opts;
        },

        /**
         * Monitor the original element for changes and update select2 accordingly
         */
        // abstract
        monitorSource: function () {
            var el = this.opts.element, sync;

            el.on("change.select2", this.bind(function (e) {
                if (this.opts.element.data("select2-change-triggered") !== true) {
                    this.initSelection();
                }
            }));

            sync = this.bind(function () {

                var enabled, readonly, self = this;

                // sync enabled state
                var disabled = el.prop("disabled");
                if (disabled === undefined) disabled = false;
                this.enable(!disabled);

                var readonly = el.prop("readonly");
                if (readonly === undefined) readonly = false;
                this.readonly(readonly);

                syncCssClasses(this.container, this.opts.element, this.opts.adaptContainerCssClass);
                this.container.addClass(evaluate(this.opts.containerCssClass));

                syncCssClasses(this.dropdown, this.opts.element, this.opts.adaptDropdownCssClass);
                this.dropdown.addClass(evaluate(this.opts.dropdownCssClass));

            });

            // mozilla and IE
            el.on("propertychange.select2 DOMAttrModified.select2", sync);


            // hold onto a reference of the callback to work around a chromium bug
            if (this.mutationCallback === undefined) {
                this.mutationCallback = function (mutations) {
                    mutations.forEach(sync);
                }
            }

            // safari and chrome
            if (typeof WebKitMutationObserver !== "undefined") {
                if (this.propertyObserver) { delete this.propertyObserver; this.propertyObserver = null; }
                this.propertyObserver = new WebKitMutationObserver(this.mutationCallback);
                this.propertyObserver.observe(el.get(0), { attributes:true, subtree:false });
            }
        },

        // abstract
        triggerSelect: function(data) {
            var evt = $.Event("select2-selecting", { val: this.id(data), object: data });
            this.opts.element.trigger(evt);
            return !evt.isDefaultPrevented();
        },

        /**
         * Triggers the change event on the source element
         */
        // abstract
        triggerChange: function (details) {

            details = details || {};
            details= $.extend({}, details, { type: "change", val: this.val() });
            // prevents recursive triggering
            this.opts.element.data("select2-change-triggered", true);
            this.opts.element.trigger(details);
            this.opts.element.data("select2-change-triggered", false);

            // some validation frameworks ignore the change event and listen instead to keyup, click for selects
            // so here we trigger the click event manually
            this.opts.element.click();

            // ValidationEngine ignorea the change event and listens instead to blur
            // so here we trigger the blur event manually if so desired
            if (this.opts.blurOnChange)
                this.opts.element.blur();
        },

        //abstract
        isInterfaceEnabled: function()
        {
            return this.enabledInterface === true;
        },

        // abstract
        enableInterface: function() {
            var enabled = this._enabled && !this._readonly,
                disabled = !enabled;

            if (enabled === this.enabledInterface) return false;

            this.container.toggleClass("select2-container-disabled", disabled);
            this.close();
            this.enabledInterface = enabled;

            return true;
        },

        // abstract
        enable: function(enabled) {
            if (enabled === undefined) enabled = true;
            if (this._enabled === enabled) return false;
            this._enabled = enabled;

            this.opts.element.prop("disabled", !enabled);
            this.enableInterface();
            return true;
        },

        // abstract
        readonly: function(enabled) {
            if (enabled === undefined) enabled = false;
            if (this._readonly === enabled) return false;
            this._readonly = enabled;

            this.opts.element.prop("readonly", enabled);
            this.enableInterface();
            return true;
        },

        // abstract
        opened: function () {
            return this.container.hasClass("select2-dropdown-open");
        },

        // abstract
        positionDropdown: function() {
            var $dropdown = this.dropdown,
                offset = this.container.offset(),
                height = this.container.outerHeight(false),
                width = this.container.outerWidth(false),
                dropHeight = $dropdown.outerHeight(false),
                viewPortRight = $(window).scrollLeft() + $(window).width(),
                viewportBottom = $(window).scrollTop() + $(window).height(),
                dropTop = offset.top + height,
                dropLeft = offset.left,
                enoughRoomBelow = dropTop + dropHeight <= viewportBottom,
                enoughRoomAbove = (offset.top - dropHeight) >= this.body().scrollTop(),
                dropWidth = $dropdown.outerWidth(false),
                enoughRoomOnRight = dropLeft + dropWidth <= viewPortRight,
                aboveNow = $dropdown.hasClass("select2-drop-above"),
                bodyOffset,
                above,
                css,
                resultsListNode;

            if (this.opts.dropdownAutoWidth) {
                resultsListNode = $('.select2-results', $dropdown)[0];
                $dropdown.addClass('select2-drop-auto-width');
                $dropdown.css('width', '');
                // Add scrollbar width to dropdown if vertical scrollbar is present
                dropWidth = $dropdown.outerWidth(false) + (resultsListNode.scrollHeight === resultsListNode.clientHeight ? 0 : scrollBarDimensions.width);
                dropWidth > width ? width = dropWidth : dropWidth = width;
                enoughRoomOnRight = dropLeft + dropWidth <= viewPortRight;
            }
            else {
                this.container.removeClass('select2-drop-auto-width');
            }

            //console.log("below/ droptop:", dropTop, "dropHeight", dropHeight, "sum", (dropTop+dropHeight)+" viewport bottom", viewportBottom, "enough?", enoughRoomBelow);
            //console.log("above/ offset.top", offset.top, "dropHeight", dropHeight, "top", (offset.top-dropHeight), "scrollTop", this.body().scrollTop(), "enough?", enoughRoomAbove);

            // fix positioning when body has an offset and is not position: static
            if (this.body().css('position') !== 'static') {
                bodyOffset = this.body().offset();
                dropTop -= bodyOffset.top;
                dropLeft -= bodyOffset.left;
            }

            // always prefer the current above/below alignment, unless there is not enough room
            if (aboveNow) {
                above = true;
                if (!enoughRoomAbove && enoughRoomBelow) above = false;
            } else {
                above = false;
                if (!enoughRoomBelow && enoughRoomAbove) above = true;
            }

            if (!enoughRoomOnRight) {
               dropLeft = offset.left + width - dropWidth;
            }

            if (above) {
                dropTop = offset.top - dropHeight;
                this.container.addClass("select2-drop-above");
                $dropdown.addClass("select2-drop-above");
            }
            else {
                this.container.removeClass("select2-drop-above");
                $dropdown.removeClass("select2-drop-above");
            }

            css = $.extend({
                top: dropTop,
                left: dropLeft,
                width: width
            }, evaluate(this.opts.dropdownCss));

            $dropdown.css(css);
        },

        // abstract
        shouldOpen: function() {
            var event;

            if (this.opened()) return false;

            if (this._enabled === false || this._readonly === true) return false;

            event = $.Event("select2-opening");
            this.opts.element.trigger(event);
            return !event.isDefaultPrevented();
        },

        // abstract
        clearDropdownAlignmentPreference: function() {
            // clear the classes used to figure out the preference of where the dropdown should be opened
            this.container.removeClass("select2-drop-above");
            this.dropdown.removeClass("select2-drop-above");
        },

        /**
         * Opens the dropdown
         *
         * @return {Boolean} whether or not dropdown was opened. This method will return false if, for example,
         * the dropdown is already open, or if the 'open' event listener on the element called preventDefault().
         */
        // abstract
        open: function () {

            if (!this.shouldOpen()) return false;

            this.opening();

            return true;
        },

        /**
         * Performs the opening of the dropdown
         */
        // abstract
        opening: function() {
            var cid = this.containerId,
                scroll = "scroll." + cid,
                resize = "resize."+cid,
                orient = "orientationchange."+cid,
                mask, maskCss;

            this.container.addClass("select2-dropdown-open").addClass("select2-container-active");

            this.clearDropdownAlignmentPreference();

            if(this.dropdown[0] !== this.body().children().last()[0]) {
                this.dropdown.detach().appendTo(this.body());
            }

            // create the dropdown mask if doesnt already exist
            mask = $("#select2-drop-mask");
            if (mask.length == 0) {
                mask = $(document.createElement("div"));
                mask.attr("id","select2-drop-mask").attr("class","select2-drop-mask");
                mask.hide();
                mask.appendTo(this.body());
                mask.on("mousedown touchstart click", function (e) {
                    var dropdown = $("#select2-drop"), self;
                    if (dropdown.length > 0) {
                        self=dropdown.data("select2");
                        if (self.opts.selectOnBlur) {
                            self.selectHighlighted({noFocus: true});
                        }
                        self.close();
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });
            }

            // ensure the mask is always right before the dropdown
            if (this.dropdown.prev()[0] !== mask[0]) {
                this.dropdown.before(mask);
            }

            // move the global id to the correct dropdown
            $("#select2-drop").removeAttr("id");
            this.dropdown.attr("id", "select2-drop");

            // show the elements
            maskCss=_makeMaskCss();

            mask.css(maskCss).show();

            this.dropdown.show();
            this.positionDropdown();

            this.dropdown.addClass("select2-drop-active");

            // attach listeners to events that can change the position of the container and thus require
            // the position of the dropdown to be updated as well so it does not come unglued from the container
            var that = this;
            this.container.parents().add(window).each(function () {
                $(this).on(resize+" "+scroll+" "+orient, function (e) {
                    var maskCss=_makeMaskCss();
                    $("#select2-drop-mask").css(maskCss);
                    that.positionDropdown();
                });
            });

            function _makeMaskCss() {
                return {
                    width  : Math.max(document.documentElement.scrollWidth,  $(window).width()),
                    height : Math.max(document.documentElement.scrollHeight, $(window).height())
                }
            }
        },

        // abstract
        close: function () {
            if (!this.opened()) return;

            var cid = this.containerId,
                scroll = "scroll." + cid,
                resize = "resize."+cid,
                orient = "orientationchange."+cid;

            // unbind event listeners
            this.container.parents().add(window).each(function () { $(this).off(scroll).off(resize).off(orient); });

            this.clearDropdownAlignmentPreference();

            $("#select2-drop-mask").hide();
            this.dropdown.removeAttr("id"); // only the active dropdown has the select2-drop id
            this.dropdown.hide();
            this.container.removeClass("select2-dropdown-open");
            this.results.empty();


            this.clearSearch();
            this.search.removeClass("select2-active");
            this.opts.element.trigger($.Event("select2-close"));
        },

        /**
         * Opens control, sets input value, and updates results.
         */
        // abstract
        externalSearch: function (term) {
            this.open();
            this.search.val(term);
            this.updateResults(false);
        },

        // abstract
        clearSearch: function () {

        },

        //abstract
        getMaximumSelectionSize: function() {
            return evaluate(this.opts.maximumSelectionSize);
        },

        // abstract
        ensureHighlightVisible: function () {
            var results = this.results, children, index, child, hb, rb, y, more;

            index = this.highlight();

            if (index < 0) return;

            if (index == 0) {

                // if the first element is highlighted scroll all the way to the top,
                // that way any unselectable headers above it will also be scrolled
                // into view

                results.scrollTop(0);
                return;
            }

            children = this.findHighlightableChoices().find('.select2-result-label');

            child = $(children[index]);

            hb = child.offset().top + child.outerHeight(true);

            // if this is the last child lets also make sure select2-more-results is visible
            if (index === children.length - 1) {
                more = results.find("li.select2-more-results");
                if (more.length > 0) {
                    hb = more.offset().top + more.outerHeight(true);
                }
            }

            rb = results.offset().top + results.outerHeight(true);
            if (hb > rb) {
                results.scrollTop(results.scrollTop() + (hb - rb));
            }
            y = child.offset().top - results.offset().top;

            // make sure the top of the element is visible
            if (y < 0 && child.css('display') != 'none' ) {
                results.scrollTop(results.scrollTop() + y); // y is negative
            }
        },

        // abstract
        findHighlightableChoices: function() {
            return this.results.find(".select2-result-selectable:not(.select2-selected):not(.select2-disabled)");
        },

        // abstract
        moveHighlight: function (delta) {
            var choices = this.findHighlightableChoices(),
                index = this.highlight();

            while (index > -1 && index < choices.length) {
                index += delta;
                var choice = $(choices[index]);
                if (choice.hasClass("select2-result-selectable") && !choice.hasClass("select2-disabled") && !choice.hasClass("select2-selected")) {
                    this.highlight(index);
                    break;
                }
            }
        },

        // abstract
        highlight: function (index) {
            var choices = this.findHighlightableChoices(),
                choice,
                data;

            if (arguments.length === 0) {
                return indexOf(choices.filter(".select2-highlighted")[0], choices.get());
            }

            if (index >= choices.length) index = choices.length - 1;
            if (index < 0) index = 0;

            this.results.find(".select2-highlighted").removeClass("select2-highlighted");

            choice = $(choices[index]);
            choice.addClass("select2-highlighted");

            this.ensureHighlightVisible();

            data = choice.data("select2-data");
            if (data) {
                this.opts.element.trigger({ type: "select2-highlight", val: this.id(data), choice: data });
            }
        },

        // abstract
        countSelectableResults: function() {
            return this.findHighlightableChoices().length;
        },

        // abstract
        highlightUnderEvent: function (event) {
            var el = $(event.target).closest(".select2-result-selectable");
            if (el.length > 0 && !el.is(".select2-highlighted")) {
                var choices = this.findHighlightableChoices();
                this.highlight(choices.index(el));
            } else if (el.length == 0) {
                // if we are over an unselectable item remove al highlights
                this.results.find(".select2-highlighted").removeClass("select2-highlighted");
            }
        },

        // abstract
        loadMoreIfNeeded: function () {
            var results = this.results,
                more = results.find("li.select2-more-results"),
                below, // pixels the element is below the scroll fold, below==0 is when the element is starting to be visible
                offset = -1, // index of first element without data
                page = this.resultsPage + 1,
                self=this,
                term=this.search.val(),
                context=this.context;

            if (more.length === 0) return;
            below = more.offset().top - results.offset().top - results.height();

            if (below <= this.opts.loadMorePadding) {
                more.addClass("select2-active");
                this.opts.query({
                        element: this.opts.element,
                        term: term,
                        page: page,
                        context: context,
                        matcher: this.opts.matcher,
                        callback: this.bind(function (data) {

                    // ignore a response if the select2 has been closed before it was received
                    if (!self.opened()) return;


                    self.opts.populateResults.call(this, results, data.results, {term: term, page: page, context:context});
                    self.postprocessResults(data, false, false);

                    if (data.more===true) {
                        more.detach().appendTo(results).text(self.opts.formatLoadMore(page+1));
                        window.setTimeout(function() { self.loadMoreIfNeeded(); }, 10);
                    } else {
                        more.remove();
                    }
                    self.positionDropdown();
                    self.resultsPage = page;
                    self.context = data.context;
                })});
            }
        },

        /**
         * Default tokenizer function which does nothing
         */
        tokenize: function() {

        },

        /**
         * @param initial whether or not this is the call to this method right after the dropdown has been opened
         */
        // abstract
        updateResults: function (initial) {
            var search = this.search,
                results = this.results,
                opts = this.opts,
                data,
                self = this,
                input,
                term = search.val(),
                lastTerm=$.data(this.container, "select2-last-term");

            // prevent duplicate queries against the same term
            if (initial !== true && lastTerm && equal(term, lastTerm)) return;

            $.data(this.container, "select2-last-term", term);

            // if the search is currently hidden we do not alter the results
            if (initial !== true && (this.showSearchInput === false || !this.opened())) {
                return;
            }

            function postRender() {
                search.removeClass("select2-active");
                self.positionDropdown();
            }

            function render(html) {
                results.html(html);
                postRender();
            }

            var maxSelSize = this.getMaximumSelectionSize();
            if (maxSelSize >=1) {
                data = this.data();
                if ($.isArray(data) && data.length >= maxSelSize && checkFormatter(opts.formatSelectionTooBig, "formatSelectionTooBig")) {
                    render("<li class='select2-selection-limit'>" + opts.formatSelectionTooBig(maxSelSize) + "</li>");
                    return;
                }
            }

            if (search.val().length < opts.minimumInputLength) {
                if (checkFormatter(opts.formatInputTooShort, "formatInputTooShort")) {
                    render("<li class='select2-no-results'>" + opts.formatInputTooShort(search.val(), opts.minimumInputLength) + "</li>");
                } else {
                    render("");
                }
                if (initial && this.showSearch) this.showSearch(true);
                return;
            }

            if (opts.maximumInputLength && search.val().length > opts.maximumInputLength) {
                if (checkFormatter(opts.formatInputTooLong, "formatInputTooLong")) {
                    render("<li class='select2-no-results'>" + opts.formatInputTooLong(search.val(), opts.maximumInputLength) + "</li>");
                } else {
                    render("");
                }
                return;
            }

            if (opts.formatSearching && this.findHighlightableChoices().length === 0) {
                render("<li class='select2-searching'>" + opts.formatSearching() + "</li>");
            }

            search.addClass("select2-active");

            // give the tokenizer a chance to pre-process the input
            input = this.tokenize();
            if (input != undefined && input != null) {
                search.val(input);
            }

            this.resultsPage = 1;

            opts.query({
                element: opts.element,
                    term: search.val(),
                    page: this.resultsPage,
                    context: null,
                    matcher: opts.matcher,
                    callback: this.bind(function (data) {
                var def; // default choice

                // ignore a response if the select2 has been closed before it was received
                if (!this.opened()) {
                    this.search.removeClass("select2-active");
                    return;
                }

                // save context, if any
                this.context = (data.context===undefined) ? null : data.context;
                // create a default choice and prepend it to the list
                if (this.opts.createSearchChoice && search.val() !== "") {
                    def = this.opts.createSearchChoice.call(self, search.val(), data.results);
                    if (def !== undefined && def !== null && self.id(def) !== undefined && self.id(def) !== null) {
                        if ($(data.results).filter(
                            function () {
                                return equal(self.id(this), self.id(def));
                            }).length === 0) {
                            data.results.unshift(def);
                        }
                    }
                }

                if (data.results.length === 0 && checkFormatter(opts.formatNoMatches, "formatNoMatches")) {
                    render("<li class='select2-no-results'>" + opts.formatNoMatches(search.val()) + "</li>");
                    return;
                }

                results.empty();
                self.opts.populateResults.call(this, results, data.results, {term: search.val(), page: this.resultsPage, context:null});

                if (data.more === true && checkFormatter(opts.formatLoadMore, "formatLoadMore")) {
                    results.append("<li class='select2-more-results'>" + self.opts.escapeMarkup(opts.formatLoadMore(this.resultsPage)) + "</li>");
                    window.setTimeout(function() { self.loadMoreIfNeeded(); }, 10);
                }

                this.postprocessResults(data, initial);

                postRender();

                this.opts.element.trigger({ type: "select2-loaded", items: data });
            })});
        },

        // abstract
        cancel: function () {
            this.close();
        },

        // abstract
        blur: function () {
            // if selectOnBlur == true, select the currently highlighted option
            if (this.opts.selectOnBlur)
                this.selectHighlighted({noFocus: true});

            this.close();
            this.container.removeClass("select2-container-active");
            // synonymous to .is(':focus'), which is available in jquery >= 1.6
            if (this.search[0] === document.activeElement) { this.search.blur(); }
            this.clearSearch();
            this.selection.find(".select2-search-choice-focus").removeClass("select2-search-choice-focus");
        },

        // abstract
        focusSearch: function () {
            focus(this.search);
        },

        // abstract
        selectHighlighted: function (options) {
            var index=this.highlight(),
                highlighted=this.results.find(".select2-highlighted"),
                data = highlighted.closest('.select2-result').data("select2-data");

            if (data) {
                this.highlight(index);
                this.onSelect(data, options);
            } else if (options && options.noFocus) {
                this.close();
            }
        },

        // abstract
        getPlaceholder: function () {
            var placeholderOption;
            return this.opts.element.attr("placeholder") ||
                this.opts.element.attr("data-placeholder") || // jquery 1.4 compat
                this.opts.element.data("placeholder") ||
                this.opts.placeholder ||
                ((placeholderOption = this.getPlaceholderOption()) !== undefined ? placeholderOption.text() : undefined);
        },

        // abstract
        getPlaceholderOption: function() {
            if (this.select) {
                var firstOption = this.select.children().first();
                if (this.opts.placeholderOption !== undefined ) {
                    //Determine the placeholder option based on the specified placeholderOption setting
                    return (this.opts.placeholderOption === "first" && firstOption) ||
                           (typeof this.opts.placeholderOption === "function" && this.opts.placeholderOption(this.select));
                } else if (firstOption.text() === "" && firstOption.val() === "") {
                    //No explicit placeholder option specified, use the first if it's blank
                    return firstOption;
                }
            }
        },

        /**
         * Get the desired width for the container element.  This is
         * derived first from option `width` passed to select2, then
         * the inline 'style' on the original element, and finally
         * falls back to the jQuery calculated element width.
         */
        // abstract
        initContainerWidth: function () {
            function resolveContainerWidth() {
                var style, attrs, matches, i, l;

                if (this.opts.width === "off") {
                    return null;
                } else if (this.opts.width === "element"){
                    return this.opts.element.outerWidth(false) === 0 ? 'auto' : this.opts.element.outerWidth(false) + 'px';
                } else if (this.opts.width === "copy" || this.opts.width === "resolve") {
                    // check if there is inline style on the element that contains width
                    style = this.opts.element.attr('style');
                    if (style !== undefined) {
                        attrs = style.split(';');
                        for (i = 0, l = attrs.length; i < l; i = i + 1) {
                            matches = attrs[i].replace(/\s/g, '')
                                .match(/width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i);
                            if (matches !== null && matches.length >= 1)
                                return matches[1];
                        }
                    }

                    if (this.opts.width === "resolve") {
                        // next check if css('width') can resolve a width that is percent based, this is sometimes possible
                        // when attached to input type=hidden or elements hidden via css
                        style = this.opts.element.css('width');
                        if (style.indexOf("%") > 0) return style;

                        // finally, fallback on the calculated width of the element
                        return (this.opts.element.outerWidth(false) === 0 ? 'auto' : this.opts.element.outerWidth(false) + 'px');
                    }

                    return null;
                } else if ($.isFunction(this.opts.width)) {
                    return this.opts.width();
                } else {
                    return this.opts.width;
               }
            };

            var width = resolveContainerWidth.call(this);
            if (width !== null) {
                this.container.css("width", width);
            }
        }
    });

    SingleSelect2 = clazz(AbstractSelect2, {

        // single

        createContainer: function () {
            var container = $(document.createElement("div")).attr({
                "class": "select2-container"
            }).html([
                "<a href='javascript:void(0)' onclick='return false;' class='select2-choice' tabindex='-1'>",
                "   <span class='select2-chosen'>&nbsp;</span><abbr class='select2-search-choice-close'></abbr>",
                "   <span class='select2-arrow'><b></b></span>",
                "</a>",
                "<input class='select2-focusser select2-offscreen' type='text'/>",
                "<div class='select2-drop select2-display-none'>",
                "   <div class='select2-search'>",
                "       <input type='text' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' class='select2-input'/>",
                "   </div>",
                "   <ul class='select2-results'>",
                "   </ul>",
                "</div>"].join(""));
            return container;
        },

        // single
        enableInterface: function() {
            if (this.parent.enableInterface.apply(this, arguments)) {
                this.focusser.prop("disabled", !this.isInterfaceEnabled());
            }
        },

        // single
        opening: function () {
            var el, range, len;

            if (this.opts.minimumResultsForSearch >= 0) {
                this.showSearch(true);
            }

            this.parent.opening.apply(this, arguments);

            if (this.showSearchInput !== false) {
                // IE appends focusser.val() at the end of field :/ so we manually insert it at the beginning using a range
                // all other browsers handle this just fine

                this.search.val(this.focusser.val());

                this.search.focus();
                // move the cursor to the end after focussing, otherwise it will be at the beginning and
                // new text will appear *before* focusser.val()
                el = this.search.get(0);
                if (el.createTextRange) {
                    range = el.createTextRange();
                    range.collapse(false);
                    range.select();
                } else if (el.setSelectionRange) {
                    len = this.search.val().length;
                    el.setSelectionRange(len, len);
                }
            }

            this.focusser.prop("disabled", true).val("");
            this.updateResults(true);
            this.opts.element.trigger($.Event("select2-open"));
        },

        // single
        close: function () {
            if (!this.opened()) return;
            this.parent.close.apply(this, arguments);
            this.focusser.removeAttr("disabled");
            this.focusser.focus();
        },

        // single
        focus: function () {
            if (this.opened()) {
                this.close();
            } else {
                this.focusser.removeAttr("disabled");
                this.focusser.focus();
            }
        },

        // single
        isFocused: function () {
            return this.container.hasClass("select2-container-active");
        },

        // single
        cancel: function () {
            this.parent.cancel.apply(this, arguments);
            this.focusser.removeAttr("disabled");
            this.focusser.focus();
        },

        // single
        initContainer: function () {

            var selection,
                container = this.container,
                dropdown = this.dropdown;

            if (this.opts.minimumResultsForSearch < 0) {
                this.showSearch(false);
            } else {
                this.showSearch(true);
            }

            this.selection = selection = container.find(".select2-choice");

            this.focusser = container.find(".select2-focusser");

            // rewrite labels from original element to focusser
            this.focusser.attr("id", "s2id_autogen"+nextUid());

            $("label[for='" + this.opts.element.attr("id") + "']")
                .attr('for', this.focusser.attr('id'));

            this.focusser.attr("tabindex", this.elementTabIndex);

            this.search.on("keydown", this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;

                if (e.which === KEY.PAGE_UP || e.which === KEY.PAGE_DOWN) {
                    // prevent the page from scrolling
                    killEvent(e);
                    return;
                }

                switch (e.which) {
                    case KEY.UP:
                    case KEY.DOWN:
                        this.moveHighlight((e.which === KEY.UP) ? -1 : 1);
                        killEvent(e);
                        return;
                    case KEY.ENTER:
                        this.selectHighlighted();
                        killEvent(e);
                        return;
                    case KEY.TAB:
                        this.selectHighlighted({noFocus: true});
                        return;
                    case KEY.ESC:
                        this.cancel(e);
                        killEvent(e);
                        return;
                }
            }));

            this.search.on("blur", this.bind(function(e) {
                // a workaround for chrome to keep the search field focussed when the scroll bar is used to scroll the dropdown.
                // without this the search field loses focus which is annoying
                if (document.activeElement === this.body().get(0)) {
                    window.setTimeout(this.bind(function() {
                        this.search.focus();
                    }), 0);
                }
            }));

            this.focusser.on("keydown", this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;

                if (e.which === KEY.TAB || KEY.isControl(e) || KEY.isFunctionKey(e) || e.which === KEY.ESC) {
                    return;
                }

                if (this.opts.openOnEnter === false && e.which === KEY.ENTER) {
                    killEvent(e);
                    return;
                }

                if (e.which == KEY.DOWN || e.which == KEY.UP
                    || (e.which == KEY.ENTER && this.opts.openOnEnter)) {

                    if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;

                    this.open();
                    killEvent(e);
                    return;
                }

                if (e.which == KEY.DELETE || e.which == KEY.BACKSPACE) {
                    if (this.opts.allowClear) {
                        this.clear();
                    }
                    killEvent(e);
                    return;
                }
            }));


            installKeyUpChangeEvent(this.focusser);
            this.focusser.on("keyup-change input", this.bind(function(e) {
                if (this.opts.minimumResultsForSearch >= 0) {
                    e.stopPropagation();
                    if (this.opened()) return;
                    this.open();
                }
            }));

            selection.on("mousedown", "abbr", this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;
                this.clear();
                killEventImmediately(e);
                this.close();
                this.selection.focus();
            }));

            selection.on("mousedown", this.bind(function (e) {

                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }

                if (this.opened()) {
                    this.close();
                } else if (this.isInterfaceEnabled()) {
                    this.open();
                }

                killEvent(e);
            }));

            dropdown.on("mousedown", this.bind(function() { this.search.focus(); }));

            selection.on("focus", this.bind(function(e) {
                killEvent(e);
            }));

            this.focusser.on("focus", this.bind(function(){
                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }
                this.container.addClass("select2-container-active");
            })).on("blur", this.bind(function() {
                if (!this.opened()) {
                    this.container.removeClass("select2-container-active");
                    this.opts.element.trigger($.Event("select2-blur"));
                }
            }));
            this.search.on("focus", this.bind(function(){
                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }
                this.container.addClass("select2-container-active");
            }));

            this.initContainerWidth();
            this.opts.element.addClass("select2-offscreen");
            this.setPlaceholder();

        },

        // single
        clear: function(triggerChange) {
            var data=this.selection.data("select2-data");
            if (data) { // guard against queued quick consecutive clicks
                var placeholderOption = this.getPlaceholderOption();
                this.opts.element.val(placeholderOption ? placeholderOption.val() : "");
                this.selection.find(".select2-chosen").empty();
                this.selection.removeData("select2-data");
                this.setPlaceholder();

                if (triggerChange !== false){
                    this.opts.element.trigger({ type: "select2-removed", val: this.id(data), choice: data });
                    this.triggerChange({removed:data});
                }
            }
        },

        /**
         * Sets selection based on source element's value
         */
        // single
        initSelection: function () {
            var selected;
            if (this.isPlaceholderOptionSelected()) {
                this.updateSelection([]);
                this.close();
                this.setPlaceholder();
            } else {
                var self = this;
                this.opts.initSelection.call(null, this.opts.element, function(selected){
                    if (selected !== undefined && selected !== null) {
                        self.updateSelection(selected);
                        self.close();
                        self.setPlaceholder();
                    }
                });
            }
        },

        isPlaceholderOptionSelected: function() {
            var placeholderOption;
            return ((placeholderOption = this.getPlaceholderOption()) !== undefined && placeholderOption.is(':selected')) ||
                   (this.opts.element.val() === "") ||
                   (this.opts.element.val() === undefined) ||
                   (this.opts.element.val() === null);
        },

        // single
        prepareOpts: function () {
            var opts = this.parent.prepareOpts.apply(this, arguments),
                self=this;

            if (opts.element.get(0).tagName.toLowerCase() === "select") {
                // install the selection initializer
                opts.initSelection = function (element, callback) {
                    var selected = element.find(":selected");
                    // a single select box always has a value, no need to null check 'selected'
                    callback(self.optionToData(selected));
                };
            } else if ("data" in opts) {
                // install default initSelection when applied to hidden input and data is local
                opts.initSelection = opts.initSelection || function (element, callback) {
                    var id = element.val();
                    //search in data by id, storing the actual matching item
                    var match = null;
                    opts.query({
                        matcher: function(term, text, el){
                            var is_match = equal(id, opts.id(el));
                            if (is_match) {
                                match = el;
                            }
                            return is_match;
                        },
                        callback: !$.isFunction(callback) ? $.noop : function() {
                            callback(match);
                        }
                    });
                };
            }

            return opts;
        },

        // single
        getPlaceholder: function() {
            // if a placeholder is specified on a single select without a valid placeholder option ignore it
            if (this.select) {
                if (this.getPlaceholderOption() === undefined) {
                    return undefined;
                }
            }

            return this.parent.getPlaceholder.apply(this, arguments);
        },

        // single
        setPlaceholder: function () {
            var placeholder = this.getPlaceholder();

            if (this.isPlaceholderOptionSelected() && placeholder !== undefined) {

                // check for a placeholder option if attached to a select
                if (this.select && this.getPlaceholderOption() === undefined) return;

                this.selection.find(".select2-chosen").html(this.opts.escapeMarkup(placeholder));

                this.selection.addClass("select2-default");

                this.container.removeClass("select2-allowclear");
            }
        },

        // single
        postprocessResults: function (data, initial, noHighlightUpdate) {
            var selected = 0, self = this, showSearchInput = true;

            // find the selected element in the result list

            this.findHighlightableChoices().each2(function (i, elm) {
                if (equal(self.id(elm.data("select2-data")), self.opts.element.val())) {
                    selected = i;
                    return false;
                }
            });

            // and highlight it
            if (noHighlightUpdate !== false) {
                if (initial === true && selected >= 0) {
                    this.highlight(selected);
                } else {
                    this.highlight(0);
                }
            }

            // hide the search box if this is the first we got the results and there are enough of them for search

            if (initial === true) {
                var min = this.opts.minimumResultsForSearch;
                if (min >= 0) {
                    this.showSearch(countResults(data.results) >= min);
                }
            }
        },

        // single
        showSearch: function(showSearchInput) {
            if (this.showSearchInput === showSearchInput) return;

            this.showSearchInput = showSearchInput;

            this.dropdown.find(".select2-search").toggleClass("select2-search-hidden", !showSearchInput);
            this.dropdown.find(".select2-search").toggleClass("select2-offscreen", !showSearchInput);
            //add "select2-with-searchbox" to the container if search box is shown
            $(this.dropdown, this.container).toggleClass("select2-with-searchbox", showSearchInput);
        },

        // single
        onSelect: function (data, options) {

            if (!this.triggerSelect(data)) { return; }

            var old = this.opts.element.val(),
                oldData = this.data();

            this.opts.element.val(this.id(data));
            this.updateSelection(data);

            this.opts.element.trigger({ type: "select2-selected", val: this.id(data), choice: data });

            this.close();

            if (!options || !options.noFocus)
                this.selection.focus();

            if (!equal(old, this.id(data))) { this.triggerChange({added:data,removed:oldData}); }
        },

        // single
        updateSelection: function (data) {

            var container=this.selection.find(".select2-chosen"), formatted, cssClass;

            this.selection.data("select2-data", data);

            container.empty();
            formatted=this.opts.formatSelection(data, container, this.opts.escapeMarkup);
            if (formatted !== undefined) {
                container.append(formatted);
            }
            cssClass=this.opts.formatSelectionCssClass(data, container);
            if (cssClass !== undefined) {
                container.addClass(cssClass);
            }

            this.selection.removeClass("select2-default");

            if (this.opts.allowClear && this.getPlaceholder() !== undefined) {
                this.container.addClass("select2-allowclear");
            }
        },

        // single
        val: function () {
            var val,
                triggerChange = false,
                data = null,
                self = this,
                oldData = this.data();

            if (arguments.length === 0) {
                return this.opts.element.val();
            }

            val = arguments[0];

            if (arguments.length > 1) {
                triggerChange = arguments[1];
            }

            if (this.select) {
                this.select
                    .val(val)
                    .find(":selected").each2(function (i, elm) {
                        data = self.optionToData(elm);
                        return false;
                    });
                this.updateSelection(data);
                this.setPlaceholder();
                if (triggerChange) {
                    this.triggerChange({added: data, removed:oldData});
                }
            } else {
                // val is an id. !val is true for [undefined,null,'',0] - 0 is legal
                if (!val && val !== 0) {
                    this.clear(triggerChange);
                    return;
                }
                if (this.opts.initSelection === undefined) {
                    throw new Error("cannot call val() if initSelection() is not defined");
                }
                this.opts.element.val(val);
                this.opts.initSelection(this.opts.element, function(data){
                    self.opts.element.val(!data ? "" : self.id(data));
                    self.updateSelection(data);
                    self.setPlaceholder();
                    if (triggerChange) {
                        self.triggerChange({added: data, removed:oldData});
                    }
                });
            }
        },

        // single
        clearSearch: function () {
            this.search.val("");
            this.focusser.val("");
        },

        // single
        data: function(value, triggerChange) {
            var data;

            if (arguments.length === 0) {
                data = this.selection.data("select2-data");
                if (data == undefined) data = null;
                return data;
            } else {
                if (!value || value === "") {
                    this.clear(triggerChange);
                } else {
                    data = this.data();
                    this.opts.element.val(!value ? "" : this.id(value));
                    this.updateSelection(value);
                    if (triggerChange) {
                        this.triggerChange({added: value, removed:data});
                    }
                }
            }
        }
    });

    MultiSelect2 = clazz(AbstractSelect2, {

        // multi
        createContainer: function () {
            var container = $(document.createElement("div")).attr({
                "class": "select2-container select2-container-multi"
            }).html([
                "<ul class='select2-choices'>",
                "  <li class='select2-search-field'>",
                "    <input type='text' autocomplete='off' autocorrect='off' autocapitilize='off' spellcheck='false' class='select2-input'>",
                "  </li>",
                "</ul>",
                "<div class='select2-drop select2-drop-multi select2-display-none'>",
                "   <ul class='select2-results'>",
                "   </ul>",
                "</div>"].join(""));
            return container;
        },

        // multi
        prepareOpts: function () {
            var opts = this.parent.prepareOpts.apply(this, arguments),
                self=this;

            // TODO validate placeholder is a string if specified

            if (opts.element.get(0).tagName.toLowerCase() === "select") {
                // install sthe selection initializer
                opts.initSelection = function (element, callback) {

                    var data = [];

                    element.find(":selected").each2(function (i, elm) {
                        data.push(self.optionToData(elm));
                    });
                    callback(data);
                };
            } else if ("data" in opts) {
                // install default initSelection when applied to hidden input and data is local
                opts.initSelection = opts.initSelection || function (element, callback) {
                    var ids = splitVal(element.val(), opts.separator);
                    //search in data by array of ids, storing matching items in a list
                    var matches = [];
                    opts.query({
                        matcher: function(term, text, el){
                            var is_match = $.grep(ids, function(id) {
                                return equal(id, opts.id(el));
                            }).length;
                            if (is_match) {
                                matches.push(el);
                            }
                            return is_match;
                        },
                        callback: !$.isFunction(callback) ? $.noop : function() {
                            // reorder matches based on the order they appear in the ids array because right now
                            // they are in the order in which they appear in data array
                            var ordered = [];
                            for (var i = 0; i < ids.length; i++) {
                                var id = ids[i];
                                for (var j = 0; j < matches.length; j++) {
                                    var match = matches[j];
                                    if (equal(id, opts.id(match))) {
                                        ordered.push(match);
                                        matches.splice(j, 1);
                                        break;
                                    }
                                }
                            }
                            callback(ordered);
                        }
                    });
                };
            }

            return opts;
        },

        selectChoice: function (choice) {

            var selected = this.container.find(".select2-search-choice-focus");
            if (selected.length && choice && choice[0] == selected[0]) {

            } else {
                if (selected.length) {
                    this.opts.element.trigger("choice-deselected", selected);
                }
                selected.removeClass("select2-search-choice-focus");
                if (choice && choice.length) {
                    this.close();
                    choice.addClass("select2-search-choice-focus");
                    this.opts.element.trigger("choice-selected", choice);
                }
            }
        },

        // multi
        initContainer: function () {

            var selector = ".select2-choices", selection;

            this.searchContainer = this.container.find(".select2-search-field");
            this.selection = selection = this.container.find(selector);

            var _this = this;
            this.selection.on("mousedown", ".select2-search-choice", function (e) {
                //killEvent(e);
                _this.search[0].focus();
                _this.selectChoice($(this));
            })

            // rewrite labels from original element to focusser
            this.search.attr("id", "s2id_autogen"+nextUid());
            $("label[for='" + this.opts.element.attr("id") + "']")
                .attr('for', this.search.attr('id'));

            this.search.on("input paste", this.bind(function() {
                if (!this.isInterfaceEnabled()) return;
                if (!this.opened()) {
                    this.open();
                }
            }));

            this.search.attr("tabindex", this.elementTabIndex);

            this.keydowns = 0;
            this.search.on("keydown", this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;

                ++this.keydowns;
                var selected = selection.find(".select2-search-choice-focus");
                var prev = selected.prev(".select2-search-choice:not(.select2-locked)");
                var next = selected.next(".select2-search-choice:not(.select2-locked)");
                var pos = getCursorInfo(this.search);

                if (selected.length &&
                    (e.which == KEY.LEFT || e.which == KEY.RIGHT || e.which == KEY.BACKSPACE || e.which == KEY.DELETE || e.which == KEY.ENTER)) {
                    var selectedChoice = selected;
                    if (e.which == KEY.LEFT && prev.length) {
                        selectedChoice = prev;
                    }
                    else if (e.which == KEY.RIGHT) {
                        selectedChoice = next.length ? next : null;
                    }
                    else if (e.which === KEY.BACKSPACE) {
                        this.unselect(selected.first());
                        this.search.width(10);
                        selectedChoice = prev.length ? prev : next;
                    } else if (e.which == KEY.DELETE) {
                        this.unselect(selected.first());
                        this.search.width(10);
                        selectedChoice = next.length ? next : null;
                    } else if (e.which == KEY.ENTER) {
                        selectedChoice = null;
                    }

                    this.selectChoice(selectedChoice);
                    killEvent(e);
                    if (!selectedChoice || !selectedChoice.length) {
                        this.open();
                    }
                    return;
                } else if (((e.which === KEY.BACKSPACE && this.keydowns == 1)
                    || e.which == KEY.LEFT) && (pos.offset == 0 && !pos.length)) {

                    this.selectChoice(selection.find(".select2-search-choice:not(.select2-locked)").last());
                    killEvent(e);
                    return;
                } else {
                    this.selectChoice(null);
                }

                if (this.opened()) {
                    switch (e.which) {
                    case KEY.UP:
                    case KEY.DOWN:
                        this.moveHighlight((e.which === KEY.UP) ? -1 : 1);
                        killEvent(e);
                        return;
                    case KEY.ENTER:
                        this.selectHighlighted();
                        killEvent(e);
                        return;
                    case KEY.TAB:
                        this.selectHighlighted({noFocus:true});
                        this.close();
                        return;
                    case KEY.ESC:
                        this.cancel(e);
                        killEvent(e);
                        return;
                    }
                }

                if (e.which === KEY.TAB || KEY.isControl(e) || KEY.isFunctionKey(e)
                 || e.which === KEY.BACKSPACE || e.which === KEY.ESC) {
                    return;
                }

                if (e.which === KEY.ENTER) {
                    if (this.opts.openOnEnter === false) {
                        return;
                    } else if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) {
                        return;
                    }
                }

                this.open();

                if (e.which === KEY.PAGE_UP || e.which === KEY.PAGE_DOWN) {
                    // prevent the page from scrolling
                    killEvent(e);
                }

                if (e.which === KEY.ENTER) {
                    // prevent form from being submitted
                    killEvent(e);
                }

            }));

            this.search.on("keyup", this.bind(function (e) {
                this.keydowns = 0;
                this.resizeSearch();
            })
            );

            this.search.on("blur", this.bind(function(e) {
                this.container.removeClass("select2-container-active");
                this.search.removeClass("select2-focused");
                this.selectChoice(null);
                if (!this.opened()) this.clearSearch();
                e.stopImmediatePropagation();
                this.opts.element.trigger($.Event("select2-blur"));
            }));

            this.container.on("click", selector, this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;
                if ($(e.target).closest(".select2-search-choice").length > 0) {
                    // clicked inside a select2 search choice, do not open
                    return;
                }
                this.selectChoice(null);
                this.clearPlaceholder();
                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }
                this.open();
                this.focusSearch();
                e.preventDefault();
            }));

            this.container.on("focus", selector, this.bind(function () {
                if (!this.isInterfaceEnabled()) return;
                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }
                this.container.addClass("select2-container-active");
                this.dropdown.addClass("select2-drop-active");
                this.clearPlaceholder();
            }));

            this.initContainerWidth();
            this.opts.element.addClass("select2-offscreen");

            // set the placeholder if necessary
            this.clearSearch();
        },

        // multi
        enableInterface: function() {
            if (this.parent.enableInterface.apply(this, arguments)) {
                this.search.prop("disabled", !this.isInterfaceEnabled());
            }
        },

        // multi
        initSelection: function () {
            var data;
            if (this.opts.element.val() === "" && this.opts.element.text() === "") {
                this.updateSelection([]);
                this.close();
                // set the placeholder if necessary
                this.clearSearch();
            }
            if (this.select || this.opts.element.val() !== "") {
                var self = this;
                this.opts.initSelection.call(null, this.opts.element, function(data){
                    if (data !== undefined && data !== null) {
                        self.updateSelection(data);
                        self.close();
                        // set the placeholder if necessary
                        self.clearSearch();
                    }
                });
            }
        },

        // multi
        clearSearch: function () {
            var placeholder = this.getPlaceholder(),
                maxWidth = this.getMaxSearchWidth();

            if (placeholder !== undefined  && this.getVal().length === 0 && this.search.hasClass("select2-focused") === false) {
                this.search.val(placeholder).addClass("select2-default");
                // stretch the search box to full width of the container so as much of the placeholder is visible as possible
                // we could call this.resizeSearch(), but we do not because that requires a sizer and we do not want to create one so early because of a firefox bug, see #944
                this.search.width(maxWidth > 0 ? maxWidth : this.container.css("width"));
            } else {
                this.search.val("").width(10);
            }
        },

        // multi
        clearPlaceholder: function () {
            if (this.search.hasClass("select2-default")) {
                this.search.val("").removeClass("select2-default");
            }
        },

        // multi
        opening: function () {
            this.clearPlaceholder(); // should be done before super so placeholder is not used to search
            this.resizeSearch();

            this.parent.opening.apply(this, arguments);

            this.focusSearch();

            this.updateResults(true);
            this.search.focus();
            this.opts.element.trigger($.Event("select2-open"));
        },

        // multi
        close: function () {
            if (!this.opened()) return;
            this.parent.close.apply(this, arguments);
        },

        // multi
        focus: function () {
            this.close();
            this.search.focus();
        },

        // multi
        isFocused: function () {
            return this.search.hasClass("select2-focused");
        },

        // multi
        updateSelection: function (data) {
            var ids = [], filtered = [], self = this;

            // filter out duplicates
            $(data).each(function () {
                if (indexOf(self.id(this), ids) < 0) {
                    ids.push(self.id(this));
                    filtered.push(this);
                }
            });
            data = filtered;

            this.selection.find(".select2-search-choice").remove();
            $(data).each(function () {
                self.addSelectedChoice(this);
            });
            self.postprocessResults();
        },

        // multi
        tokenize: function() {
            var input = this.search.val();
            input = this.opts.tokenizer.call(this, input, this.data(), this.bind(this.onSelect), this.opts);
            if (input != null && input != undefined) {
                this.search.val(input);
                if (input.length > 0) {
                    this.open();
                }
            }

        },

        // multi
        onSelect: function (data, options) {

            if (!this.triggerSelect(data)) { return; }

            this.addSelectedChoice(data);

            this.opts.element.trigger({ type: "selected", val: this.id(data), choice: data });

            if (this.select || !this.opts.closeOnSelect) this.postprocessResults();

            if (this.opts.closeOnSelect) {
                this.close();
                this.search.width(10);
            } else {
                if (this.countSelectableResults()>0) {
                    this.search.width(10);
                    this.resizeSearch();
                    if (this.getMaximumSelectionSize() > 0 && this.val().length >= this.getMaximumSelectionSize()) {
                        // if we reached max selection size repaint the results so choices
                        // are replaced with the max selection reached message
                        this.updateResults(true);
                    }
                    this.positionDropdown();
                } else {
                    // if nothing left to select close
                    this.close();
                    this.search.width(10);
                }
            }

            // since its not possible to select an element that has already been
            // added we do not need to check if this is a new element before firing change
            this.triggerChange({ added: data });

            if (!options || !options.noFocus)
                this.focusSearch();
        },

        // multi
        cancel: function () {
            this.close();
            this.focusSearch();
        },

        addSelectedChoice: function (data) {
            var enableChoice = !data.locked,
                enabledItem = $(
                    "<li class='select2-search-choice'>" +
                    "    <div></div>" +
                    "    <a href='#' onclick='return false;' class='select2-search-choice-close' tabindex='-1'></a>" +
                    "</li>"),
                disabledItem = $(
                    "<li class='select2-search-choice select2-locked'>" +
                    "<div></div>" +
                    "</li>");
            var choice = enableChoice ? enabledItem : disabledItem,
                id = this.id(data),
                val = this.getVal(),
                formatted,
                cssClass;

            formatted=this.opts.formatSelection(data, choice.find("div"), this.opts.escapeMarkup);
            if (formatted != undefined) {
                choice.find("div").replaceWith("<div>"+formatted+"</div>");
            }
            cssClass=this.opts.formatSelectionCssClass(data, choice.find("div"));
            if (cssClass != undefined) {
                choice.addClass(cssClass);
            }

            if(enableChoice){
              choice.find(".select2-search-choice-close")
                  .on("mousedown", killEvent)
                  .on("click dblclick", this.bind(function (e) {
                  if (!this.isInterfaceEnabled()) return;

                  $(e.target).closest(".select2-search-choice").fadeOut('fast', this.bind(function(){
                      this.unselect($(e.target));
                      this.selection.find(".select2-search-choice-focus").removeClass("select2-search-choice-focus");
                      this.close();
                      this.focusSearch();
                  })).dequeue();
                  killEvent(e);
              })).on("focus", this.bind(function () {
                  if (!this.isInterfaceEnabled()) return;
                  this.container.addClass("select2-container-active");
                  this.dropdown.addClass("select2-drop-active");
              }));
            }

            choice.data("select2-data", data);
            choice.insertBefore(this.searchContainer);

            val.push(id);
            this.setVal(val);
        },

        // multi
        unselect: function (selected) {
            var val = this.getVal(),
                data,
                index;

            selected = selected.closest(".select2-search-choice");

            if (selected.length === 0) {
                throw "Invalid argument: " + selected + ". Must be .select2-search-choice";
            }

            data = selected.data("select2-data");

            if (!data) {
                // prevent a race condition when the 'x' is clicked really fast repeatedly the event can be queued
                // and invoked on an element already removed
                return;
            }

            index = indexOf(this.id(data), val);

            if (index >= 0) {
                val.splice(index, 1);
                this.setVal(val);
                if (this.select) this.postprocessResults();
            }
            selected.remove();

            this.opts.element.trigger({ type: "removed", val: this.id(data), choice: data });
            this.triggerChange({ removed: data });
        },

        // multi
        postprocessResults: function (data, initial, noHighlightUpdate) {
            var val = this.getVal(),
                choices = this.results.find(".select2-result"),
                compound = this.results.find(".select2-result-with-children"),
                self = this;

            choices.each2(function (i, choice) {
                var id = self.id(choice.data("select2-data"));
                if (indexOf(id, val) >= 0) {
                    choice.addClass("select2-selected");
                    // mark all children of the selected parent as selected
                    choice.find(".select2-result-selectable").addClass("select2-selected");
                }
            });

            compound.each2(function(i, choice) {
                // hide an optgroup if it doesnt have any selectable children
                if (!choice.is('.select2-result-selectable')
                    && choice.find(".select2-result-selectable:not(.select2-selected)").length === 0) {
                    choice.addClass("select2-selected");
                }
            });

            if (this.highlight() == -1 && noHighlightUpdate !== false){
                self.highlight(0);
            }

            //If all results are chosen render formatNoMAtches
            if(!this.opts.createSearchChoice && !choices.filter('.select2-result:not(.select2-selected)').length > 0){
                if(!data || data && !data.more && this.results.find(".select2-no-results").length === 0) {
                    if (checkFormatter(self.opts.formatNoMatches, "formatNoMatches")) {
                        this.results.append("<li class='select2-no-results'>" + self.opts.formatNoMatches(self.search.val()) + "</li>");
                    }
                }
            }

        },

        // multi
        getMaxSearchWidth: function() {
            return this.selection.width() - getSideBorderPadding(this.search);
        },

        // multi
        resizeSearch: function () {
            var minimumWidth, left, maxWidth, containerLeft, searchWidth,
                sideBorderPadding = getSideBorderPadding(this.search);

            minimumWidth = measureTextWidth(this.search) + 10;

            left = this.search.offset().left;

            maxWidth = this.selection.width();
            containerLeft = this.selection.offset().left;

            searchWidth = maxWidth - (left - containerLeft) - sideBorderPadding;

            if (searchWidth < minimumWidth) {
                searchWidth = maxWidth - sideBorderPadding;
            }

            if (searchWidth < 40) {
                searchWidth = maxWidth - sideBorderPadding;
            }

            if (searchWidth <= 0) {
              searchWidth = minimumWidth;
            }

            this.search.width(searchWidth);
        },

        // multi
        getVal: function () {
            var val;
            if (this.select) {
                val = this.select.val();
                return val === null ? [] : val;
            } else {
                val = this.opts.element.val();
                return splitVal(val, this.opts.separator);
            }
        },

        // multi
        setVal: function (val) {
            var unique;
            if (this.select) {
                this.select.val(val);
            } else {
                unique = [];
                // filter out duplicates
                $(val).each(function () {
                    if (indexOf(this, unique) < 0) unique.push(this);
                });
                this.opts.element.val(unique.length === 0 ? "" : unique.join(this.opts.separator));
            }
        },

        // multi
        buildChangeDetails: function (old, current) {
            var current = current.slice(0),
                old = old.slice(0);

            // remove intersection from each array
            for (var i = 0; i < current.length; i++) {
                for (var j = 0; j < old.length; j++) {
                    if (equal(this.opts.id(current[i]), this.opts.id(old[j]))) {
                        current.splice(i, 1);
                        i--;
                        old.splice(j, 1);
                        j--;
                    }
                }
            }

            return {added: current, removed: old};
        },


        // multi
        val: function (val, triggerChange) {
            var oldData, self=this, changeDetails;

            if (arguments.length === 0) {
                return this.getVal();
            }

            oldData=this.data();
            if (!oldData.length) oldData=[];

            // val is an id. !val is true for [undefined,null,'',0] - 0 is legal
            if (!val && val !== 0) {
                this.opts.element.val("");
                this.updateSelection([]);
                this.clearSearch();
                if (triggerChange) {
                    this.triggerChange({added: this.data(), removed: oldData});
                }
                return;
            }

            // val is a list of ids
            this.setVal(val);

            if (this.select) {
                this.opts.initSelection(this.select, this.bind(this.updateSelection));
                if (triggerChange) {
                    this.triggerChange(this.buildChangeDetails(oldData, this.data()));
                }
            } else {
                if (this.opts.initSelection === undefined) {
                    throw new Error("val() cannot be called if initSelection() is not defined");
                }

                this.opts.initSelection(this.opts.element, function(data){
                    var ids=$.map(data, self.id);
                    self.setVal(ids);
                    self.updateSelection(data);
                    self.clearSearch();
                    if (triggerChange) {
                        self.triggerChange(this.buildChangeDetails(oldData, this.data()));
                    }
                });
            }
            this.clearSearch();
        },

        // multi
        onSortStart: function() {
            if (this.select) {
                throw new Error("Sorting of elements is not supported when attached to <select>. Attach to <input type='hidden'/> instead.");
            }

            // collapse search field into 0 width so its container can be collapsed as well
            this.search.width(0);
            // hide the container
            this.searchContainer.hide();
        },

        // multi
        onSortEnd:function() {

            var val=[], self=this;

            // show search and move it to the end of the list
            this.searchContainer.show();
            // make sure the search container is the last item in the list
            this.searchContainer.appendTo(this.searchContainer.parent());
            // since we collapsed the width in dragStarted, we resize it here
            this.resizeSearch();

            // update selection
            this.selection.find(".select2-search-choice").each(function() {
                val.push(self.opts.id($(this).data("select2-data")));
            });
            this.setVal(val);
            this.triggerChange();
        },

        // multi
        data: function(values, triggerChange) {
            var self=this, ids, old;
            if (arguments.length === 0) {
                 return this.selection
                     .find(".select2-search-choice")
                     .map(function() { return $(this).data("select2-data"); })
                     .get();
            } else {
                old = this.data();
                if (!values) { values = []; }
                ids = $.map(values, function(e) { return self.opts.id(e); });
                this.setVal(ids);
                this.updateSelection(values);
                this.clearSearch();
                if (triggerChange) {
                    this.triggerChange(this.buildChangeDetails(old, this.data()));
                }
            }
        }
    });

    $.fn.select2 = function () {

        var args = Array.prototype.slice.call(arguments, 0),
            opts,
            select2,
            method, value, multiple,
            allowedMethods = ["val", "destroy", "opened", "open", "close", "focus", "isFocused", "container", "dropdown", "onSortStart", "onSortEnd", "enable", "readonly", "positionDropdown", "data", "search"],
            valueMethods = ["val", "opened", "isFocused", "container", "data"],
            methodsMap = { search: "externalSearch" };

        this.each(function () {
            if (args.length === 0 || typeof(args[0]) === "object") {
                opts = args.length === 0 ? {} : $.extend({}, args[0]);
                opts.element = $(this);

                if (opts.element.get(0).tagName.toLowerCase() === "select") {
                    multiple = opts.element.prop("multiple");
                } else {
                    multiple = opts.multiple || false;
                    if ("tags" in opts) {opts.multiple = multiple = true;}
                }

                select2 = multiple ? new MultiSelect2() : new SingleSelect2();
                select2.init(opts);
            } else if (typeof(args[0]) === "string") {

                if (indexOf(args[0], allowedMethods) < 0) {
                    throw "Unknown method: " + args[0];
                }

                value = undefined;
                select2 = $(this).data("select2");
                if (select2 === undefined) return;

                method=args[0];

                if (method === "container") {
                    value = select2.container;
                } else if (method === "dropdown") {
                    value = select2.dropdown;
                } else {
                    if (methodsMap[method]) method = methodsMap[method];

                    value = select2[method].apply(select2, args.slice(1));
                }
                if (indexOf(args[0], valueMethods) >= 0) {
                    return false;
                }
            } else {
                throw "Invalid arguments to select2 plugin: " + args;
            }
        });
        return (value === undefined) ? this : value;
    };

    // plugin defaults, accessible to users
    $.fn.select2.defaults = {
        width: "copy",
        loadMorePadding: 0,
        closeOnSelect: true,
        openOnEnter: true,
        containerCss: {},
        dropdownCss: {},
        containerCssClass: "",
        dropdownCssClass: "",
        formatResult: function(result, container, query, escapeMarkup) {
            var markup=[];
            markMatch(result.text, query.term, markup, escapeMarkup);
            return markup.join("");
        },
        formatSelection: function (data, container, escapeMarkup) {
            return data ? escapeMarkup(data.text) : undefined;
        },
        sortResults: function (results, container, query) {
            return results;
        },
        formatResultCssClass: function(data) {return undefined;},
        formatSelectionCssClass: function(data, container) {return undefined;},
        formatNoMatches: function () { return "No matches found"; },
        formatInputTooShort: function (input, min) { var n = min - input.length; return "Please enter " + n + " more character" + (n == 1? "" : "s"); },
        formatInputTooLong: function (input, max) { var n = input.length - max; return "Please delete " + n + " character" + (n == 1? "" : "s"); },
        formatSelectionTooBig: function (limit) { return "You can only select " + limit + " item" + (limit == 1 ? "" : "s"); },
        formatLoadMore: function (pageNumber) { return "Loading more results..."; },
        formatSearching: function () { return "Searching..."; },
        minimumResultsForSearch: 0,
        minimumInputLength: 0,
        maximumInputLength: null,
        maximumSelectionSize: 0,
        id: function (e) { return e.id; },
        matcher: function(term, text) {
            return (''+text).toUpperCase().indexOf((''+term).toUpperCase()) >= 0;
        },
        separator: ",",
        tokenSeparators: [],
        tokenizer: defaultTokenizer,
        escapeMarkup: defaultEscapeMarkup,
        blurOnChange: false,
        selectOnBlur: false,
        adaptContainerCssClass: function(c) { return c; },
        adaptDropdownCssClass: function(c) { return null; }
    };

    $.fn.select2.ajaxDefaults = {
        transport: $.ajax,
        params: {
            type: "GET",
            cache: false,
            dataType: "json"
        }
    };

    // exports
    window.Select2 = {
        query: {
            ajax: ajax,
            local: local,
            tags: tags
        }, util: {
            debounce: debounce,
            markMatch: markMatch,
            escapeMarkup: defaultEscapeMarkup
        }, "class": {
            "abstract": AbstractSelect2,
            "single": SingleSelect2,
            "multi": MultiSelect2
        }
    };

}(jQuery));;
mrm.$( document ).ready( function( $ ) {

	var $page = $( 'body' );

	mrm.application = new Tc.Application( $page, {
		modules: mrm.mod,
		connectors: mrm.connector
	} );

	mrm.application.registerModules();
	mrm.application.registerModule( $page, 'Global' );
	mrm.application.start();
} );

// reinit / update function to call after the DOM has changed - the scope parameter accepts both a STRING / jQuery/sizzle selector, or a jQuery object e.g. to a specific module instance, which content has been updated and needs to get reinitilized - still in development - TODO: finalize
mrm.update = function( scope ) {

	var updateArgs = Array.prototype.slice.call( arguments, 1 );
	var $mods = $( scope );

	$mods.each( function( index, mod ) {

		var $mod = $( mod );
		if( $mod.is( '.mod' ) ) {
			var modId = $mod.data( 'id' );
			if( modId ) {
				try {
					// throws exception if no mod is found
					var obj = mrm.application.sandbox.getModuleById( modId );

					if( _.isFunction( obj.update ) ) {
						obj.update.apply( obj, updateArgs );
					}
				} catch( e ) {
					var mods = mrm.application.registerModules( $mod );
					mrm.application.start( mods );
				}
			} else {
				var mods = mrm.application.registerModules( $mod );
				mrm.application.start( mods );
			}
		}
	} );
};

//Informs modules that they are displayed
mrm.visible = function( scope ) {

	var updateArgs = Array.prototype.slice.call( arguments, 1 );
	var $mods = $( scope );

	$mods.each( function( index, mod ) {

		var $mod = $( mod );
		if( $mod.is( '.mod' ) ) {
			var modId = $mod.data( 'id' );
			if( modId ) {
				try {
					// throws exception if no mod is found
					var obj = mrm.application.sandbox.getModuleById( modId );

					if( _.isFunction( obj.visible ) ) {
						obj.visible.apply( obj, updateArgs );
					}
				} catch( e ) {

				}
			}

		}
	} );
};

// KDM JS snippet
mrm.CXTEvent = function( name, value ) {
	if (name && value && window.COBACSAclick) {
		window.COBACSAclick({
			tagName:"DIV",
			name:name,
			value:value,
			id:name + "=" + value
		});
	}
};

// @ap

/* ========================================================================
 * Bootstrap: transition.js v3.3.7
 * http://getbootstrap.com/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
  // ============================================================

  function transitionEnd() {
    var el = document.createElement('bootstrap')

    var transEndEventNames = {
      WebkitTransition : 'webkitTransitionEnd',
      MozTransition    : 'transitionend',
      OTransition      : 'oTransitionEnd otransitionend',
      transition       : 'transitionend'
    }

    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return { end: transEndEventNames[name] }
      }
    }

    return false // explicit for ie8 (  ._.)
  }

  // http://blog.alexmaccaw.com/css-transitions
  $.fn.emulateTransitionEnd = function (duration) {
    var called = false
    var $el = this
    $(this).one('bsTransitionEnd', function () { called = true })
    var callback = function () { if (!called) $($el).trigger($.support.transition.end) }
    setTimeout(callback, duration)
    return this
  }

  $(function () {
    $.support.transition = transitionEnd()

    if (!$.support.transition) return

    $.event.special.bsTransitionEnd = {
      bindType: $.support.transition.end,
      delegateType: $.support.transition.end,
      handle: function (e) {
        if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments)
      }
    }
  })

}(jQuery);


/* ========================================================================
 * Bootstrap: modal.js v3.3.7
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options             = options
    this.$body               = $(document.body)
    this.$element            = $(element)
    this.$dialog             = this.$element.find('.modal-dialog')
    this.$backdrop           = null
    this.isShown             = null
    this.originalBodyPad     = null
    this.scrollbarWidth      = 0
    this.ignoreBackdropClick = false

    if (this.options.remote) {
      this.$element
        .find('.modal-content')
        .load(this.options.remote, $.proxy(function () {
          this.$element.trigger('loaded.bs.modal')
        }, this))
    }
  }

  Modal.VERSION  = '3.3.7'

  Modal.TRANSITION_DURATION = 300
  Modal.BACKDROP_TRANSITION_DURATION = 150

  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  }

  Modal.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget)
  }

  Modal.prototype.show = function (_relatedTarget) {
    var that = this
    var e    = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.isShown = true

    this.checkScrollbar()
    this.setScrollbar()
    this.$body.addClass('modal-open')

    this.escape()
    this.resize()

    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

    this.$dialog.on('mousedown.dismiss.bs.modal', function () {
      that.$element.one('mouseup.dismiss.bs.modal', function (e) {
        if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
      })
    })

    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade')

      if (!that.$element.parent().length) {
        that.$element.appendTo(that.$body) // don't move modals dom position
      }

      that.$element
        .show()
        .scrollTop(0)

      that.adjustDialog()

      if (transition) {
        that.$element[0].offsetWidth // force reflow
      }

      that.$element.addClass('in')

      that.enforceFocus()

      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

      transition ?
        that.$dialog // wait for modal to slide in
          .one('bsTransitionEnd', function () {
            that.$element.trigger('focus').trigger(e)
          })
          .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
        that.$element.trigger('focus').trigger(e)
    })
  }

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.bs.modal')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return

    this.isShown = false

    this.escape()
    this.resize()

    $(document).off('focusin.bs.modal')

    this.$element
      .removeClass('in')
      .off('click.dismiss.bs.modal')
      .off('mouseup.dismiss.bs.modal')

    this.$dialog.off('mousedown.dismiss.bs.modal')

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideModal, this))
        .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
      this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', $.proxy(function (e) {
        if (document !== e.target &&
            this.$element[0] !== e.target &&
            !this.$element.has(e.target).length) {
          // @ap: removed code, otherwise selects do not work in modal
          // this.$element.trigger('focus')
        }
      }, this))
  }

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide()
      }, this))
    } else if (!this.isShown) {
      this.$element.off('keydown.dismiss.bs.modal')
    }
  }

  Modal.prototype.resize = function () {
    if (this.isShown) {
      $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
    } else {
      $(window).off('resize.bs.modal')
    }
  }

  Modal.prototype.hideModal = function () {
    var that = this
    this.$element.hide()
    this.backdrop(function () {
      that.$body.removeClass('modal-open')
      that.resetAdjustments()
      that.resetScrollbar()
      that.$element.trigger('hidden.bs.modal')
    })
  }

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove()
    this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
    var that = this
    var animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $(document.createElement('div'))
        .addClass('modal-backdrop ' + animate)
        .appendTo(this.$body)

      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (this.ignoreBackdropClick) {
          this.ignoreBackdropClick = false
          return
        }
        if (e.target !== e.currentTarget) return
        this.options.backdrop == 'static'
          ? this.$element[0].focus()
          : this.hide()
      }, this))

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      if (!callback) return

      doAnimate ?
        this.$backdrop
          .one('bsTransitionEnd', callback)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      var callbackRemove = function () {
        that.removeBackdrop()
        callback && callback()
      }
      $.support.transition && this.$element.hasClass('fade') ?
        this.$backdrop
          .one('bsTransitionEnd', callbackRemove)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callbackRemove()

    } else if (callback) {
      callback()
    }
  }

  // these following methods are used to handle overflowing modals

  Modal.prototype.handleUpdate = function () {
    this.adjustDialog()
  }

  Modal.prototype.adjustDialog = function () {
    var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

    this.$element.css({
      paddingLeft:  !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
      paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
    })
  }

  Modal.prototype.resetAdjustments = function () {
    this.$element.css({
      paddingLeft: '',
      paddingRight: ''
    })
  }

  Modal.prototype.checkScrollbar = function () {
    var fullWindowWidth = window.innerWidth
    if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
      var documentElementRect = document.documentElement.getBoundingClientRect()
      fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
    }
    this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
    this.scrollbarWidth = this.measureScrollbar()
  }

  Modal.prototype.setScrollbar = function () {
    var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
    this.originalBodyPad = document.body.style.paddingRight || ''
    if (this.bodyIsOverflowing) this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
  }

  Modal.prototype.resetScrollbar = function () {
    this.$body.css('padding-right', this.originalBodyPad)
  }

  Modal.prototype.measureScrollbar = function () { // thx walsh
    var scrollDiv = document.createElement('div')
    scrollDiv.className = 'modal-scrollbar-measure'
    this.$body.append(scrollDiv)
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
    this.$body[0].removeChild(scrollDiv)
    return scrollbarWidth
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.modal')
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.modal

  $.fn.modal             = Plugin
  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this   = $(this)
    var href    = $this.attr('href')
    var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
    var option  = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus')
      })
    })
    Plugin.call($target, option, this)
  })

}(jQuery);


/* ========================================================================
 * Bootstrap: tooltip.js v3.3.7
 * http://getbootstrap.com/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================

  var Tooltip = function (element, options) {
    this.type       = null
    this.options    = null
    this.enabled    = null
    this.timeout    = null
    this.hoverState = null
    this.$element   = null
    this.inState    = null

    this.init('tooltip', element, options)
  }

  Tooltip.VERSION  = '3.3.7'

  Tooltip.TRANSITION_DURATION = 150

  Tooltip.DEFAULTS = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false,
    viewport: {
      selector: 'body',
      padding: 0
    }
  }

  Tooltip.prototype.init = function (type, element, options) {
    this.enabled   = true
    this.type      = type
    this.$element  = $(element)
    this.options   = this.getOptions(options)
    this.$viewport = this.options.viewport && $($.isFunction(this.options.viewport) ? this.options.viewport.call(this, this.$element) : (this.options.viewport.selector || this.options.viewport))
    this.inState   = { click: false, hover: false, focus: false }

    if (this.$element[0] instanceof document.constructor && !this.options.selector) {
      throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!')
    }

    var triggers = this.options.trigger.split(' ')

    for (var i = triggers.length; i--;) {
      var trigger = triggers[i]

      if (trigger == 'click') {
        this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
      } else if (trigger != 'manual') {
        var eventIn  = trigger == 'hover' ? 'mouseenter' : 'focusin'
        var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'

        this.$element.on(eventIn  + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
        this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
      }
    }

    this.options.selector ?
      (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
      this.fixTitle()
  }

  Tooltip.prototype.getDefaults = function () {
    return Tooltip.DEFAULTS
  }

  Tooltip.prototype.getOptions = function (options) {
    options = $.extend({}, this.getDefaults(), this.$element.data(), options)

    if (options.delay && typeof options.delay == 'number') {
      options.delay = {
        show: options.delay,
        hide: options.delay
      }
    }

    return options
  }

  Tooltip.prototype.getDelegateOptions = function () {
    var options  = {}
    var defaults = this.getDefaults()

    this._options && $.each(this._options, function (key, value) {
      if (defaults[key] != value) options[key] = value
    })

    return options
  }

  Tooltip.prototype.enter = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget).data('bs.' + this.type)

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
      $(obj.currentTarget).data('bs.' + this.type, self)
    }

    if (obj instanceof $.Event) {
      self.inState[obj.type == 'focusin' ? 'focus' : 'hover'] = true
    }

    if (self.tip().hasClass('in') || self.hoverState == 'in') {
      self.hoverState = 'in'
      return
    }

    clearTimeout(self.timeout)

    self.hoverState = 'in'

    if (!self.options.delay || !self.options.delay.show) return self.show()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'in') self.show()
    }, self.options.delay.show)
  }

  Tooltip.prototype.isInStateTrue = function () {
    for (var key in this.inState) {
      if (this.inState[key]) return true
    }

    return false
  }

  Tooltip.prototype.leave = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget).data('bs.' + this.type)

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
      $(obj.currentTarget).data('bs.' + this.type, self)
    }

    if (obj instanceof $.Event) {
      self.inState[obj.type == 'focusout' ? 'focus' : 'hover'] = false
    }

    if (self.isInStateTrue()) return

    clearTimeout(self.timeout)

    self.hoverState = 'out'

    if (!self.options.delay || !self.options.delay.hide) return self.hide()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'out') self.hide()
    }, self.options.delay.hide)
  }

  Tooltip.prototype.show = function () {
    var e = $.Event('show.bs.' + this.type)

    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e)

      var inDom = $.contains(this.$element[0].ownerDocument.documentElement, this.$element[0])
      if (e.isDefaultPrevented() || !inDom) return
      var that = this

      var $tip = this.tip()

      var tipId = this.getUID(this.type)

      this.setContent()
      $tip.attr('id', tipId)
      this.$element.attr('aria-describedby', tipId)

      if (this.options.animation) $tip.addClass('fade')

      var placement = typeof this.options.placement == 'function' ?
        this.options.placement.call(this, $tip[0], this.$element[0]) :
        this.options.placement

      var autoToken = /\s?auto?\s?/i
      var autoPlace = autoToken.test(placement)
      if (autoPlace) placement = placement.replace(autoToken, '') || 'top'

      $tip
        .detach()
        .css({ top: 0, left: 0, display: 'block' })
        .addClass(placement)
        .data('bs.' + this.type, this)

      this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)
      this.$element.trigger('inserted.bs.' + this.type)

      var pos          = this.getPosition()
      var actualWidth  = $tip[0].offsetWidth
      var actualHeight = $tip[0].offsetHeight

      if (autoPlace) {
        var orgPlacement = placement
        var viewportDim = this.getPosition(this.$viewport)

        placement = placement == 'bottom' && pos.bottom + actualHeight > viewportDim.bottom ? 'top'    :
                    placement == 'top'    && pos.top    - actualHeight < viewportDim.top    ? 'bottom' :
                    placement == 'right'  && pos.right  + actualWidth  > viewportDim.width  ? 'left'   :
                    placement == 'left'   && pos.left   - actualWidth  < viewportDim.left   ? 'right'  :
                    placement

        $tip
          .removeClass(orgPlacement)
          .addClass(placement)
      }

      var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

      this.applyPlacement(calculatedOffset, placement)

      var complete = function () {
        var prevHoverState = that.hoverState
        that.$element.trigger('shown.bs.' + that.type)
        that.hoverState = null

        if (prevHoverState == 'out') that.leave(that)
      }

      $.support.transition && this.$tip.hasClass('fade') ?
        $tip
          .one('bsTransitionEnd', complete)
          .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
        complete()
    }
  }

  Tooltip.prototype.applyPlacement = function (offset, placement) {
    var $tip   = this.tip()
    var width  = $tip[0].offsetWidth
    var height = $tip[0].offsetHeight

    // manually read margins because getBoundingClientRect includes difference
    var marginTop = parseInt($tip.css('margin-top'), 10)
    var marginLeft = parseInt($tip.css('margin-left'), 10)

    // we must check for NaN for ie 8/9
    if (isNaN(marginTop))  marginTop  = 0
    if (isNaN(marginLeft)) marginLeft = 0

    offset.top  += marginTop
    offset.left += marginLeft

    // $.fn.offset doesn't round pixel values
    // so we use setOffset directly with our own function B-0
    $.offset.setOffset($tip[0], $.extend({
      using: function (props) {
        $tip.css({
          top: Math.round(props.top),
          left: Math.round(props.left)
        })
      }
    }, offset), 0)

    $tip.addClass('in')

    // check to see if placing tip in new offset caused the tip to resize itself
    var actualWidth  = $tip[0].offsetWidth
    var actualHeight = $tip[0].offsetHeight

    if (placement == 'top' && actualHeight != height) {
      offset.top = offset.top + height - actualHeight
    }

    var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight)

    if (delta.left) offset.left += delta.left
    else offset.top += delta.top

    var isVertical          = /top|bottom/.test(placement)
    var arrowDelta          = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight
    var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight'

    $tip.offset(offset)
    this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical)
  }

  Tooltip.prototype.replaceArrow = function (delta, dimension, isVertical) {
    this.arrow()
      .css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%')
      .css(isVertical ? 'top' : 'left', '')
  }

  Tooltip.prototype.setContent = function () {
    var $tip  = this.tip()
    var title = this.getTitle()

    $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
    $tip.removeClass('fade in top bottom left right')
  }

  Tooltip.prototype.hide = function (callback) {
    var that = this
    var $tip = $(this.$tip)
    var e    = $.Event('hide.bs.' + this.type)

    function complete() {
      if (that.hoverState != 'in') $tip.detach()
      if (that.$element) { // TODO: Check whether guarding this code with this `if` is really necessary.
        that.$element
          .removeAttr('aria-describedby')
          .trigger('hidden.bs.' + that.type)
      }
      callback && callback()
    }

    this.$element.trigger(e)

    if (e.isDefaultPrevented()) return

    $tip.removeClass('in')

    $.support.transition && $tip.hasClass('fade') ?
      $tip
        .one('bsTransitionEnd', complete)
        .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
      complete()

    this.hoverState = null

    return this
  }

  Tooltip.prototype.fixTitle = function () {
    var $e = this.$element
    if ($e.attr('title') || typeof $e.attr('data-original-title') != 'string') {
      $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
    }
  }

  Tooltip.prototype.hasContent = function () {
    return this.getTitle()
  }

  Tooltip.prototype.getPosition = function ($element) {
    $element   = $element || this.$element

    var el     = $element[0]
    var isBody = el.tagName == 'BODY'

    var elRect    = el.getBoundingClientRect()
    if (elRect.width == null) {
      // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
      elRect = $.extend({}, elRect, { width: elRect.right - elRect.left, height: elRect.bottom - elRect.top })
    }
    var isSvg = window.SVGElement && el instanceof window.SVGElement
    // Avoid using $.offset() on SVGs since it gives incorrect results in jQuery 3.
    // See https://github.com/twbs/bootstrap/issues/20280
    var elOffset  = isBody ? { top: 0, left: 0 } : (isSvg ? null : $element.offset())
    var scroll    = { scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop() }
    var outerDims = isBody ? { width: $(window).width(), height: $(window).height() } : null

    return $.extend({}, elRect, scroll, outerDims, elOffset)
  }

  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
    return placement == 'bottom' ? { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2 } :
           placement == 'top'    ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2 } :
           placement == 'left'   ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
        /* placement == 'right' */ { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width }

  }

  Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
    var delta = { top: 0, left: 0 }
    if (!this.$viewport) return delta

    var viewportPadding = this.options.viewport && this.options.viewport.padding || 0
    var viewportDimensions = this.getPosition(this.$viewport)

    if (/right|left/.test(placement)) {
      var topEdgeOffset    = pos.top - viewportPadding - viewportDimensions.scroll
      var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight
      if (topEdgeOffset < viewportDimensions.top) { // top overflow
        delta.top = viewportDimensions.top - topEdgeOffset
      } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
        delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
      }
    } else {
      var leftEdgeOffset  = pos.left - viewportPadding
      var rightEdgeOffset = pos.left + viewportPadding + actualWidth
      if (leftEdgeOffset < viewportDimensions.left) { // left overflow
        delta.left = viewportDimensions.left - leftEdgeOffset
      } else if (rightEdgeOffset > viewportDimensions.right) { // right overflow
        delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
      }
    }

    return delta
  }

  Tooltip.prototype.getTitle = function () {
    var title
    var $e = this.$element
    var o  = this.options

    title = $e.attr('data-original-title')
      || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

    return title
  }

  Tooltip.prototype.getUID = function (prefix) {
    do prefix += ~~(Math.random() * 1000000)
    while (document.getElementById(prefix))
    return prefix
  }

  Tooltip.prototype.tip = function () {
    if (!this.$tip) {
      this.$tip = $(this.options.template)
      if (this.$tip.length != 1) {
        throw new Error(this.type + ' `template` option must consist of exactly 1 top-level element!')
      }
    }
    return this.$tip
  }

  Tooltip.prototype.arrow = function () {
    return (this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow'))
  }

  Tooltip.prototype.enable = function () {
    this.enabled = true
  }

  Tooltip.prototype.disable = function () {
    this.enabled = false
  }

  Tooltip.prototype.toggleEnabled = function () {
    this.enabled = !this.enabled
  }

  Tooltip.prototype.toggle = function (e) {
    var self = this
    if (e) {
      self = $(e.currentTarget).data('bs.' + this.type)
      if (!self) {
        self = new this.constructor(e.currentTarget, this.getDelegateOptions())
        $(e.currentTarget).data('bs.' + this.type, self)
      }
    }

    if (e) {
      self.inState.click = !self.inState.click
      if (self.isInStateTrue()) self.enter(self)
      else self.leave(self)
    } else {
      self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
    }
  }

  Tooltip.prototype.destroy = function () {
    var that = this
    clearTimeout(this.timeout)
    this.hide(function () {
      that.$element.off('.' + that.type).removeData('bs.' + that.type)
      if (that.$tip) {
        that.$tip.detach()
      }
      that.$tip = null
      that.$arrow = null
      that.$viewport = null
      that.$element = null
    })
  }


  // TOOLTIP PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.tooltip')
      var options = typeof option == 'object' && option

      if (!data && /destroy|hide/.test(option)) return
      if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tooltip

  $.fn.tooltip             = Plugin
  $.fn.tooltip.Constructor = Tooltip


  // TOOLTIP NO CONFLICT
  // ===================

  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old
    return this
  }

}(jQuery);


/* ========================================================================
 * Bootstrap: popover.js v3.3.7
 * http://getbootstrap.com/javascript/#popovers
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // POPOVER PUBLIC CLASS DEFINITION
  // ===============================

  var Popover = function (element, options) {
    this.init('popover', element, options)
  }

  if (!$.fn.tooltip) throw new Error('Popover requires tooltip.js')

  Popover.VERSION  = '3.3.7'

  Popover.DEFAULTS = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  })


  // NOTE: POPOVER EXTENDS tooltip.js
  // ================================

  Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype)

  Popover.prototype.constructor = Popover

  Popover.prototype.getDefaults = function () {
    return Popover.DEFAULTS
  }

  Popover.prototype.setContent = function () {
    var $tip    = this.tip()
    var title   = this.getTitle()
    var content = this.getContent()

    $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)
    $tip.find('.popover-content').children().detach().end()[ // we use append for html objects to maintain js events
      this.options.html ? (typeof content == 'string' ? 'html' : 'append') : 'text'
    ](content)

    $tip.removeClass('fade top bottom left right in')

    // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
    // this manually by checking the contents.
    if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide()
  }

  Popover.prototype.hasContent = function () {
    return this.getTitle() || this.getContent()
  }

  Popover.prototype.getContent = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-content')
      || (typeof o.content == 'function' ?
            o.content.call($e[0]) :
            o.content)
  }

  Popover.prototype.arrow = function () {
    return (this.$arrow = this.$arrow || this.tip().find('.arrow'))
  }


  // POPOVER PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.popover')
      var options = typeof option == 'object' && option

      if (!data && /destroy|hide/.test(option)) return
      if (!data) $this.data('bs.popover', (data = new Popover(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.popover

  $.fn.popover             = Plugin
  $.fn.popover.Constructor = Popover


  // POPOVER NO CONFLICT
  // ===================

  $.fn.popover.noConflict = function () {
    $.fn.popover = old
    return this
  }

}(jQuery);

/* ========================================================================
 * Bootstrap: collapse.js v3.3.7
 * http://getbootstrap.com/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

/* jshint latedef: false */

+function ($) {
  'use strict';

  // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================

  var Collapse = function (element, options) {
    this.$element      = $(element)
    this.options       = $.extend({}, Collapse.DEFAULTS, options)
    this.$trigger      = $('[data-toggle="collapse"][href="#' + element.id + '"],' +
                           '[data-toggle="collapse"][data-target="#' + element.id + '"]')
    this.transitioning = null

    if (this.options.parent) {
      this.$parent = this.getParent()
    } else {
      this.addAriaAndCollapsedClass(this.$element, this.$trigger)
    }

    if (this.options.toggle) this.toggle()
  }

  Collapse.VERSION  = '3.3.7'

  Collapse.TRANSITION_DURATION = 350

  Collapse.DEFAULTS = {
    toggle: true
  }

  Collapse.prototype.dimension = function () {
    var hasWidth = this.$element.hasClass('width')
    return hasWidth ? 'width' : 'height'
  }

  Collapse.prototype.show = function () {
    if (this.transitioning || this.$element.hasClass('in')) return

    var activesData
    var actives = this.$parent && this.$parent.children('.panel').children('.in, .collapsing')

    if (actives && actives.length) {
      activesData = actives.data('bs.collapse')
      if (activesData && activesData.transitioning) return
    }

    var startEvent = $.Event('show.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    if (actives && actives.length) {
      Plugin.call(actives, 'hide')
      activesData || actives.data('bs.collapse', null)
    }

    var dimension = this.dimension()

    this.$element
      .removeClass('collapse')
      .addClass('collapsing')[dimension](0)
      .attr('aria-expanded', true)

    this.$trigger
      .removeClass('collapsed')
      .attr('aria-expanded', true)

    this.transitioning = 1

    var complete = function () {
      this.$element
        .removeClass('collapsing')
        .addClass('collapse in')[dimension]('')
      this.transitioning = 0
      this.$element
        .trigger('shown.bs.collapse')
    }

    if (!$.support.transition) return complete.call(this)

    var scrollSize = $.camelCase(['scroll', dimension].join('-'))

    this.$element
      .one('bsTransitionEnd', $.proxy(complete, this))
      .emulateTransitionEnd(Collapse.TRANSITION_DURATION)[dimension](this.$element[0][scrollSize])
  }

  Collapse.prototype.hide = function () {
    if (this.transitioning || !this.$element.hasClass('in')) return

    var startEvent = $.Event('hide.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    var dimension = this.dimension()

    this.$element[dimension](this.$element[dimension]())[0].offsetHeight

    this.$element
      .addClass('collapsing')
      .removeClass('collapse in')
      .attr('aria-expanded', false)

    this.$trigger
      .addClass('collapsed')
      .attr('aria-expanded', false)

    this.transitioning = 1

    var complete = function () {
      this.transitioning = 0
      this.$element
        .removeClass('collapsing')
        .addClass('collapse')
        .trigger('hidden.bs.collapse')
    }

    if (!$.support.transition) return complete.call(this)

    this.$element
      [dimension](0)
      .one('bsTransitionEnd', $.proxy(complete, this))
      .emulateTransitionEnd(Collapse.TRANSITION_DURATION)
  }

  Collapse.prototype.toggle = function () {
    this[this.$element.hasClass('in') ? 'hide' : 'show']()
  }

  Collapse.prototype.getParent = function () {
    return $(this.options.parent)
      .find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]')
      .each($.proxy(function (i, element) {
        var $element = $(element)
        this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element)
      }, this))
      .end()
  }

  Collapse.prototype.addAriaAndCollapsedClass = function ($element, $trigger) {
    var isOpen = $element.hasClass('in')

    $element.attr('aria-expanded', isOpen)
    $trigger
      .toggleClass('collapsed', !isOpen)
      .attr('aria-expanded', isOpen)
  }

  function getTargetFromTrigger($trigger) {
    var href
    var target = $trigger.attr('data-target')
      || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') // strip for ie7

    return $(target)
  }


  // COLLAPSE PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.collapse')
      var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
      if (!data) $this.data('bs.collapse', (data = new Collapse(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.collapse

  $.fn.collapse             = Plugin
  $.fn.collapse.Constructor = Collapse


  // COLLAPSE NO CONFLICT
  // ====================

  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old
    return this
  }


  // COLLAPSE DATA-API
  // =================

  $(document).on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
    var $this   = $(this)

    if (!$this.attr('data-target')) e.preventDefault()

    var $target = getTargetFromTrigger($this)
    var data    = $target.data('bs.collapse')
    var option  = data ? 'toggle' : $this.data()

    Plugin.call($target, option)
  })

}(jQuery);


/* ========================================================================
 * Bootstrap: dropdown.js v3.3.7
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // DROPDOWN CLASS DEFINITION
  // =========================

  var backdrop = '.dropdown-backdrop'
  var toggle   = '[data-toggle="dropdown"]'
  var Dropdown = function (element) {
    $(element).on('click.bs.dropdown', this.toggle)
  }

  Dropdown.VERSION = '3.3.7'

  function getParent($this) {
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    var $parent = selector && $(selector)

    return $parent && $parent.length ? $parent : $this.parent()
  }

  function clearMenus(e) {
    if (e && e.which === 3) return
    $(backdrop).remove()
    $(toggle).each(function () {
      var $this         = $(this)
      var $parent       = getParent($this)
      var relatedTarget = { relatedTarget: this }

      if (!$parent.hasClass('open')) return

      if (e && e.type == 'click' && /input|textarea/i.test(e.target.tagName) && $.contains($parent[0], e.target)) return

      $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget))

      if (e.isDefaultPrevented()) return

      $this.attr('aria-expanded', 'false')
      $parent.removeClass('open').trigger($.Event('hidden.bs.dropdown', relatedTarget))
    })
  }

  Dropdown.prototype.toggle = function (e) {
    var $this = $(this)

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    clearMenus()

    if (!isActive) {
      if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
        // if mobile we use a backdrop because click events don't delegate
        $(document.createElement('div'))
          .addClass('dropdown-backdrop')
          .insertAfter($(this))
          .on('click', clearMenus)
      }

      var relatedTarget = { relatedTarget: this }
      $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget))

      if (e.isDefaultPrevented()) return

      $this
        .trigger('focus')
        .attr('aria-expanded', 'true')

      $parent
        .toggleClass('open')
        .trigger($.Event('shown.bs.dropdown', relatedTarget))
    }

    return false
  }

  Dropdown.prototype.keydown = function (e) {
    if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return

    var $this = $(this)

    e.preventDefault()
    e.stopPropagation()

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    if (!isActive && e.which != 27 || isActive && e.which == 27) {
      if (e.which == 27) $parent.find(toggle).trigger('focus')
      return $this.trigger('click')
    }

    var desc = ' li:not(.disabled):visible a'
    var $items = $parent.find('.dropdown-menu' + desc)

    if (!$items.length) return

    var index = $items.index(e.target)

    if (e.which == 38 && index > 0)                 index--         // up
    if (e.which == 40 && index < $items.length - 1) index++         // down
    if (!~index)                                    index = 0

    $items.eq(index).trigger('focus')
  }


  // DROPDOWN PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.dropdown')

      if (!data) $this.data('bs.dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  var old = $.fn.dropdown

  $.fn.dropdown             = Plugin
  $.fn.dropdown.Constructor = Dropdown


  // DROPDOWN NO CONFLICT
  // ====================

  $.fn.dropdown.noConflict = function () {
    $.fn.dropdown = old
    return this
  }


  // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================

  $(document)
    .on('click.bs.dropdown.data-api', clearMenus)
    .on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
    .on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
    .on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown)
    .on('keydown.bs.dropdown.data-api', '.dropdown-menu', Dropdown.prototype.keydown)

}(jQuery);
;
( function( $ ) {
	mrm.mod.Abstract = Tc.Module.extend( {

		on: function( callback ) {

			this.delegateEvents();

			this.prepare( callback );
		},

		delegateEvents: function() {

			if( !this.events ) {
				return;
			}

			for( var key in this.events ) {
				var method = this.events[ key ];

				if( typeof method !== 'function' ) {
					method = this[ this.events[ key ] ];
				}

				if( !method ) {
					continue;
				}

				var match = key.match( /^(\S+)\s*(.*)$/ );
				var eventName = match[ 1 ] + '.delegateEvents' + this.id;
				var selector = match[ 2 ];

				if( selector === '' ) {
					this.$ctx.on( eventName, $.proxy( method, this ) );
				} else {
					this.$ctx.on( eventName, selector, $.proxy( method, this ) );
				}
			}
		},

		$: function( selector ) {

			return this.$ctx.find( selector ).filter( $.proxy( function( index, item ) {
				var $mod = $( item ).closest( '.mod' );
				return $mod.is( this.$ctx ) || !$mod.length;
			}, this ) );
		},

		prepare: function( callback ) {
			callback();
		},
		
		gtmPush: function( val ) {
			if (isGTMActive()) {
				dataLayer.push(val);
			}
		}
	} );
} )( jQuery );;
( function( $ ) {
	mrm.mod.AbstractMod = mrm.mod.Abstract.extend( {

		events: {

		},

		adaptiveImageOptions: {},

		init: function( $ctx, sandbox, modId ) {
			// call base constructor
			this._super( $ctx, sandbox, modId );

			this.sandbox.subscribe( 'broadcast', this );

			this.events = $.extend( {}, this.events, mrm.mod.AbstractMod.prototype.events );
		},

		on: function( callback ) {

			this.delegateEvents();

			this.initElements();

			this.prepare( callback );
		},

		initElements: function() {

			this.initAdaptiveImages();
			// this.triggerPopover();
			// this.initTooltip();
			this.initStyledSelect();
			// this.initDropdown();
		},

		initAdaptiveImages: function() {

			this.$adaptiveImages = this.$( '.adaptive-image' );
		},

		initStyledSelect: function() {

			var $selects = $( 'select.form-control' ).not('.select2-offscreen');
			if( $selects.length ) {
				$selects.select2( {
					minimumResultsForSearch: -1
				} ).on('select2-open', function() {

					// android-fix: remove focus from focused element
					//
					// click on flyout button, showed keyboard
					// and scrolled page to focused element
					if ($('html').hasClass('touch')) {
						document.activeElement.blur();
					}

				}).on('select2-close', function() {
					//Reinit select 2, otherwise the scrollpane does not work anymore
					$(this).select2( {
						minimumResultsForSearch: -1
					} );
				});

			}
		},

		onBroadcastBodyClick: function() {
		},

		onBroadcastWindowResize: function() {

			if( this.$adaptiveImages ) {
				this.$adaptiveImages.each(function(index, item){
					mrm.util.adaptiveImage.selectImage( $(item).attr('id') );
				});
			}

			this.setEqualHeightPerRow();
		},

		setEqualHeightPerRow: function() {
			mrm.util.ui.setEqualHeightPerRow( this.$( '.row' ) );
		},

		onGlobalMenuOpen: function( $trigger ) {
		},

		onBroadcastOrientationChange: function() {
		},

		onHashChange: function( event ) {
		}

	} );
} )( jQuery );
;
( function( $ ) {
	mrm.mod.AbstractWidget = mrm.mod.AbstractMod.extend( {

		events: {
			'click .btn-toggle': 'widgetToggle',
			'mouseenter h3': 'widgetHeaderMouseEnter',
			'mouseleave h3': 'widgetHeaderMouseOut',
			'mouseenter .btn-close': 'widgetHeaderMouseEnter',
			'mouseleave .btn-close': 'widgetHeaderMouseOut',
			'selectstart h3': 'widgetHeaderSelect'
		},

		init: function( $ctx, sandbox, modId ) {
			// call base constructor
			this._super( $ctx, sandbox, modId );

			this.sandbox.subscribe( 'broadcast', this );

			this.events = $.extend( {}, this.events, mrm.mod.AbstractWidget.prototype.events );
		},

		prepare: function( callback ) {
			this.widgetSlider();
		},

		widgetSlider: function() {
			this.$( '.slider' ).flexslider( {
				animation: 'slide',
				animationLoop: false,
				touch: true,
				controlNav: false,
				slideshow: false,
				prevText: '',
				nextText: ''
			} );
		},

		widgetToggle: function( event ) {
			event.preventDefault();
			event.stopPropagation();

			if( this.$ctx.hasClass( 'open' ) ) {
				this.$ctx.removeClass( 'open' );
				this.$ctx.addClass( 'closed' );
			} else {
				this.$ctx.removeClass( 'closed' );
				this.$ctx.addClass( 'open' );
			}
		},

		widgetHeaderMouseEnter: function( event ) {
			var $mod = $( event.currentTarget ).parent();
			$mod.addClass( 'over' );
		},
		widgetHeaderMouseOut: function( event ) {
			var $mod = $( event.currentTarget ).parent();
			$mod.removeClass( 'over' );
		},
		widgetHeaderSelect: function( event ) {
			return false; // cancel text-selection (for drag and drop-support)
		},
		
		// on updating content or regarding the "lazy loading" implementation for the content of the widgets
		update: function() {
			this.initInfoBoxes();
			this.initTooltip();
			this.initStyledSelect();
		}

	} );
} )( jQuery );;
( function( $ ) {
	mrm.mod.Global = mrm.mod.Abstract.extend( {

		events: {
			'click': 'onBodyClick',
			'touchend': 'onBodyClick',
			'click a>div.mod-Teaser01, a>div.mod-Teaser02, a>div.mod-Teaser03, div.mod-Teaser01>a, div.mod-Teaser02>a, div.mod-Teaser03>a': 'trackTeaserClick',
			'click .btn-dialogAlt': 'triggerDialogAlternative',
			'click a[href^="#"]': 'internalScroll',
			'click input.hasDatepicker': 'adjustTopPosition',
			'click #smartbanner .sb-close': 'fixHeader',
			'click a.btn, span.btn, button.btn': 'blurButtonOnClick',
			'touchend a.btn, span.btn, button.btn': 'blurButtonOnClick'
		},

		_popup 			: false,
		shareURI 		: encodeURIComponent(location.href),
		hasViewport		: "",
		windowWidthMq	: '',
		isTouchDevice 	: 'ontouchstart' in document.documentElement,

		init: function( $ctx, sandbox, modId ) {
			// call base constructor
			this._super( $ctx, sandbox, modId );

			this.sandbox.subscribe( 'globalMenu', this );
			this.sandbox.subscribe( 'broadcast', this );
			this.sandbox.subscribe( 'anchorHash', this );
			this.sandbox.subscribe( 'teaserStatus', this );

			// set datepicker region
			$.datepicker.setDefaults( $.datepicker.regional.de );

			// init default calendar
			this.calendarDefault();

			// init calendar with month/year dropdown
			this.calendarYear();

			// init popover (infoboxes)
			this.triggerPopover();

			// init tooltip
			this.initTooltip();

			// init dropdown
			this.initDropdown();
		},

		prepare: function( callback ) {

			// get viewport
			this.viewportCheck();

			// touch device fix: remove focus from autofocused elements
			if ($('html').hasClass('touch')) {
				document.activeElement.blur();
			}

			var throttledWindowResize = _.throttle( $.proxy( this.onWindowResize, this ), 50 );

			$( window )
				.on( 'resize', throttledWindowResize )
				.on( 'scroll', $.proxy(this.onWindowScroll, this ))
				.on( 'orientationchange', $.proxy(this.onOrientationChange, this ));

			// pToken and ajaxContainer
			$.ajaxPrefilter(function (options, originalOptions, jqXHR) {

				// check if pToken is defined
				if (typeof window.ccb_cif !== 'undefined' && options && typeof options.type === 'string' && options.type.toUpperCase() === "POST") {
					jqXHR.setRequestHeader('pToken', window.ccb_cif.pToken);
				}
			});

			if ($('body .ajaxContainer').length) {
				this.ajaxContainer();
			}

			// json update
			if ($('[data-jsonupdate-url]').length) {
				this.jsonUpdate();
			}

			// fixed header
			if ($('[data-fixed-header]').length) {
				this.fixedNavMeta();
			}

			// @vh: the functions resizeTextarea & highlightDisabled are just needed in Forms. ToDo: check if they should be moved to a specific file
			this.resizeTextarea();
			this.highlightDisabled();

			this.gtmPush({'page_title' : $('html head').find('title').text()});

			callback();
		},

		after: function() {
			$( window ).trigger( 'resize' );
		},

		// @ap - new infobox
		triggerPopover: function() {

			$('[data-toggle="popover"]').popover();
		},

		initTooltip: function() {

			$('[data-toggle="tooltip"]').tooltip();
		},

		initDropdown: function() {

			$(document.body).on('click', '[data-toggle=dropdown]', function(){
				var dropmenu = $(this).next('.dropdown-menu');

				dropmenu.css({
					visibility: "hidden",
					display: "block"
				});

				// Necessary to remove class each time so we don't unwantedly use dropup's offset top
				dropmenu.parent().removeClass("dropup");

				// Determine whether bottom of menu will be below window at current scroll position
				if (dropmenu.offset().top + dropmenu.outerHeight() > $(window).innerHeight() + $(window).scrollTop()){
					dropmenu.parent().addClass("dropup");
				}

				// Return dropdown menu to fully hidden state
				dropmenu.removeAttr("style");
			});
		},

		// juqery ui datepicker
		calendarDefault: function() {

			// only use on desktop devices (bad support for native date field)
			if (!this.isTouchDevice) {

				var element = $('.input-datepicker');

				element.datepicker( {
					showOn: "both",
					buttonText : '<i class="icon i-calendar i-xl"></i>',
					dateFormat: 'dd.mm.yy',
					showButtonPanel: true,
					closeText: '',
					showOtherMonths: true,
					beforeShow: function( input ) {

						// show prev/next
						$('#ui-datepicker-div').removeClass('monthYearSelect');

						// default position
						$.datepicker._pos = $.datepicker._findPos( input );

						// adjust horizontal positioning (286 is width of .ui-datepicker)
						$.datepicker._pos[0] += input.offsetWidth - 286;

						// adjust vertical positioning
						$.datepicker._pos[1] += input.offsetHeight;
					},
					onClose: function(dateText, inst) {
						// Manuell ein onChange-Event auslösen, damit ObserveField mitkriegt, dass sich der Inhalt geändert hat
						// this.focus(); // Feld aktiv machen

						// Event auslösen
						if ("createEvent" in document) {
						    var evt = document.createEvent("HTMLEvents");
						    evt.initEvent("change", false, true);
						    this.dispatchEvent(evt);
						} else {
							this.fireEvent("onchange");
						}
					}
				} );

			} else {

				var $element = $('.sal-dateSelect');
				var isoDate = $element.data('isodate');

				// trigger native date picker
				$element.attr('type', 'date');

				// set iso date format
				$element.val(isoDate);
			}
		},

		// juqery ui datepicker
		calendarYear: function() {

			// only use on desktop devices (bad support for native date field)
			if (!this.isTouchDevice) {

				var element = $('.input-datepicker-year');

				element.datepicker( {
					showOn: "both",
					buttonText : '<i class="icon i-calendar i-xl"></i>',
					dateFormat: 'dd.mm.yy',
					showButtonPanel: true,
					closeText: '',
					showOtherMonths: true,
					changeMonth: true,
					changeYear: true,
					yearRange: "1900:2020",
					beforeShow: function( input ) {

						// OnBlur auf Input-Feld überschreiben, damit durch den Verlust des Fokus durch den Datepicker
						// nicht ein Ajax-Request ausgelöst wird
						// Man könnte die alte Funktion irgendwie zwischenspeichern und beim onClose-Event unten
						// wieder einsetzen nach der Änderung durch die Datepicker-Komponente.
						// Funktioniert aber soweit alles, also lieber keine Experimente machen... :)
						this.onblur = function(){
							var desc = $('#'+this.id+'Desc');
							if(desc) {
								desc.hide(); // Eigentlich überfüssig - in Java ist festgelegt, dass bei Datepicker keine Description angezeigt wird
							}
						};

						// hide prev/next
						$('#ui-datepicker-div').addClass('monthYearSelect');

						// default position
						$.datepicker._pos = $.datepicker._findPos( input );

						// adjust horizontal positioning (286 is width of .ui-datepicker)
						$.datepicker._pos[0] += input.offsetWidth - 286;

						// adjust vertical positioning
						$.datepicker._pos[1] += input.offsetHeight;
					},
					onClose: function(dateText, inst) {
						// Manuell ein onChange-Event auslösen, damit ObserveField mitkriegt, dass sich der Inhalt geändert hat
						// this.focus(); // Feld aktiv machen

						// Event auslösen
						if ("createEvent" in document) {
						    var evt = document.createEvent("HTMLEvents");
						    evt.initEvent("change", false, true);
						    this.dispatchEvent(evt);
						} else {
							this.fireEvent("onchange");
						}
					}
				} );

			} else {

				var $element = $('.sal-dateSelect');
				var isoDate = $element.data('isodate');

				// trigger native date picker
				$element.attr('type', 'date');

				// set iso date format
				$element.val(isoDate);
			}
		},

		// get viewport width
		viewportCheck: function() {

			// check viewport with matchMedia Function
			if (window.matchMedia !== undefined && window.matchMedia('all and (min-width: 1px)').matches) {

				// check extra large viewport with matchMedia Function
				if (window.matchMedia("(min-width: 1000px)").matches) {

					this.hasViewport = "extraLargeViewport";
				}

				// check large viewport with matchMedia Function
				if (window.matchMedia("(min-width: 800px) and (max-width: 999px)").matches) {

					this.hasViewport = "largeViewport";
				}

				// check medium viewport with matchMedia Function
				if (window.matchMedia("(min-width: 600px) and (max-width: 799px)").matches) {

					this.hasViewport = "mediumViewport";
				}

				// check small viewport with matchMedia Function
				if (window.matchMedia("(max-width: 599px)").matches) {

					this.hasViewport = "smallViewport";
				}

			} else {

				// window.innerWidth value is equivalent to css mediaQuery
				if (window.innerWidth) {

					// needed for ie9
					this.windowWidthMq = window.innerWidth;

				} else {

					// needed for ie8
					this.windowWidthMq = $(window).width();
				}

				// define large viewport
				if (this.windowWidthMq > 999 ) {

					this.hasViewport = "extraLargeViewport";
				}

				// define large viewport
				if (this.windowWidthMq > 799 && this.windowWidthMq < 999 ) {

					this.hasViewport = "largeViewport";
				}

				// define medium viewport
				if (this.windowWidthMq > 599 && this.windowWidthMq < 799) {

					this.hasViewport = "mediumViewport";
				}

				// define small viewport
				if (this.windowWidthMq < 600 ) {

					this.hasViewport = "smallViewport";
				}

			}

			// set viewport info
			$('body').attr('data-viewport', this.hasViewport);
		},

		blurButtonOnClick: function(e) {

			// remove focus from clicked button
			document.activeElement.blur();
		},

		// adjust datepicker top position
		adjustTopPosition: function(e) {

			var $input 				= $(e.currentTarget);
			var $datepicker 		= $('#ui-datepicker-div');
			var _inputTopPos 		= $input.offset().top
			var _datepickerTopPos 	= $datepicker.offset().top

			// remove classes
			$datepicker.removeClass('above below');

			if (_inputTopPos > _datepickerTopPos) {
				$datepicker.addClass('above');
			} else {
				$datepicker.addClass('below');
			}
		},

		// fix header when closing smartbanner
		fixHeader: function() {

			// enable fixed header
			if ($('[data-fixed-header]').length) {

				// dcrm format10 rule
				if ($('.mod-DcrmFormat10').length) {

					if ($('.mod-DcrmFormat10').css('display') !== 'none') {

						$('body').attr('data-fixed-header', false);

					} else {

						$('body').attr('data-fixed-header', true);
					}

				} else {

					$('body').attr('data-fixed-header', true);
				}
			}

			// status changed
			this.fire('fixedNavPos', {teaserState: 'smartBannerClosed'}, ['teaserStatus']);
		},

		// fixed NavMeta
		fixedNavMeta: function() {

			var _headerHeight 	= $('body > header, .body-inner > header').outerHeight();
			var $sparten 		= $('.wrapper-sparten');
			var _spartenHeight 	= $sparten.outerHeight();

			if( $( document ).scrollTop() > _headerHeight ) {

				// hide .wrapper-sparten
				$sparten.hide();

				// add classes on navHaupt and dashboard elements (css shadow)
				if ($('.mod-NavHaupt').length) {

					$('.mod-NavHaupt').addClass('fixedHeader');
				}

				if ($('.mod-DashboardHeader').length) {

					$('.mod-DashboardHeader').addClass('fixedHeader');
				}

			} else {

				// show .wrapper-sparten
				$sparten.show();

				// remove classes on navHaupt and dashboard elements (css shadow)
				if ($('.mod-NavHaupt').length) {

					$('.mod-NavHaupt').removeClass('fixedHeader');
				}

				if ($('.mod-DashboardHeader').length) {

					$('.mod-DashboardHeader').removeClass('fixedHeader');
				}
			}
		},

		onAnchorClick: function(e) {
			e.preventDefault();

			var $element 	= $(e.currentTarget);
			var $href 		= $element.attr('href');
			var _hash		= $href.substring(1);

			// scroll to site container with id from ankernavigation
			if ($('#' + _hash).length) {

				// check if not located in dialog
				if (!$element.closest('.ui-dialog').length && $element.hasClass('anchor')) {

					this.fire( 'hashChange', {hash: _hash}, ['anchorHash'] );
				}
			}

			return false;
		},

		onWindowResize: function() {
			this.fire( 'broadcastBeforeWindowResize', [ 'broadcast' ] );
			this.fire( 'broadcastWindowResize', [ 'broadcast' ] );
			this.setEqualHeightPerRow();
			this.fire( 'broadcastAfterWindowResize', [ 'broadcast' ] );

			this.viewportCheck();
		},

		setEqualHeightPerRow: function() {
			mrm.util.ui.setEqualHeightPerRow( this.$( '.row' ) );
		},

		onBodyClick: function() {
			this.fire( 'broadcastBodyClick', [ 'broadcast' ] );
		},

		onWindowScroll: function() {
			this.fire( 'broadcastWindowScroll', [ 'broadcast' ] );

			if ($('[data-fixed-header]').length) {
				this.fixedNavMeta();
			}
		},

		onOrientationChange: function() {
			this.fire( 'broadcastOrientationChange', [ 'broadcast' ] );
		},

		onGlobalMenuFlyoutOpen: function( data ) {
			$( '.main' ).animate( {
				'left': data.flyoutWidth + 'px'
			}, 300 );
		},

		onGlobalMenuFlyoutClose: function() {
			$( '.main' ).animate( {
				'left': 0
			}, 300 );
		},

		// @ap: still needed?
		onGlobalMenuMarketplaceOpen: function() {
			var $elements = $( '.main, .body-inner > header, .body-inner > footer, .body-inner > .mod-Login' );
			$elements.css( {
				'left': 'auto',
				'right': '100%'
			} );

			$( '.main' ).one( 'oTransitionEnd transitionEnd webkitTransitionEnd', function() {
				$elements.addClass( 'invisible' );
			} );

			// older browser fallback
			if( $( 'html' ).hasClass( 'no-cssanimations' ) ) {
				$elements.addClass( 'invisible' );
			}
		},

		// @ap: still needed?
		onGlobalMenuMarketplaceClose: function() {
			var $elements = $( '.main, .body-inner > header, .body-inner > footer, .body-inner > .mod-Login' );
			$elements
				.removeClass( 'invisible' )
				.css( {
					'left': 'auto',
					'right': '0%'
				} );
		},

        // @ap: still needed?
        internalScroll: function(e) {

        	var $element 		= $(e.currentTarget);
        	var _href 			= $element.attr('href');
        	var _navMetaHeight 	= 0;

        	if (_href.length > 1 && _href.indexOf('/') === -1) {

        		var _hash           = _href.substring(1);
	            var $destination    = $('.row[id=' + _hash + ']');

	            if ($('[data-fixed-header]').length) {
	            	_navMetaHeight = 44;
	            }

	            if ($destination.length) {
	            	var $destinationPos = $destination.offset().top - 50 - _navMetaHeight;

	                // scroll to container
	                $('html, body').animate({
	                    scrollTop: $destinationPos
	                }, 1000);
	            } else {
	            	this.onAnchorClick(e);
	            }
        	}
        },

        // @ap: still needed?
		triggerPopup: function( event ) {
			var $trigger = $( event.currentTarget ),
				popupUrl = $trigger.attr( 'href' ),
				popupName = 'popUp', //$trigger.attr("name")
				popupDimensionsArray = [
					'width=750,height=600,',
					'width=500,height=600,',
					'width=825,height=430,'
				],
				popupSize = $trigger.data( 'popup-size' ) || 0,
				popupDimensions = popupDimensionsArray[ popupSize ],
				popupParams = popupDimensions + 'toolbar=no,menubar=no,location=no,scrollbars=yes,';

			event.preventDefault();

			if( !this._popup || this._popup.closed ) {
				this._popup = window.open( popupUrl, popupName, popupParams );
			} else {
				this._popup.close();
				this._popup = null;
				this._popup = window.open( popupUrl, popupName, popupParams );
			}
			this._popup.focus();
		},

		ajaxContainer: function() {
			var self 		= this;
			var $element 	= $('body .ajaxContainer');
			var modules 	= [];
			var restObject 	= {};

            $element.each(function () {
                var element = $(this);

                restObject[element.attr("id")] = element.data("dcrm-parameter");
            });

            $.ajax({
                url: "/banking/rest/dcrm/teasercontents",
                dataType: "xml",
                contentType: "application/json",
                data: JSON.stringify(restObject),
                type: "POST",
                error: function (xhr, textStatus, errorThrown) {
                },
                success: function (data) {
                	var $data = $(data);

                    if (data) {
                        $(data).find("content").each(function () {
                            var element = $(this);
                            $("#" + element.attr("id")).html(element.text());
                        });

						$element.each(function (i, obj) {
			                mrm.update($(obj).children('.mod'));
			            });
                    }
                }
            });
		},

		jsonUpdate: function() {

			// each element with following attribute gets updated via json
			$('[data-jsonupdate-url]').each(function (i, obj) {
				var $element 	= $(this);
				var $parent 	= $element.parent();
				var _size 		= $element.attr('data-jsonupdate-size');
				var _id 		= $element.attr('data-jsonupdate-id');
				var _count 		= $element.attr('data-jsonupdate-count');

				$.ajax({
					url 		: $element.attr('data-jsonupdate-url'),
					dataType 	: 'json',
					type 		: 'GET',
					cache 		: true,
					timeout 	: 30000,
					error 		: function(xhr, textStatus, errorThrown) {},
					success 	: function(data) {

						// linklist
						if ($parent.hasClass('ll')) {

							if (_count === "") {
                                _count = data[_id].editions.length;
                            }

							// append list items
							for ( var i = 0, l = _count; i < l; i++ ) {
								$element.before('<li><a class="l-p-' + _size + '" title="' + data[_id].editions[i].title + '" href="' + data[_id].editions[i].url + '">' + data[_id].editions[i].linktext + '</a>');
							}

							// remove list item initiating jsonupdate
							$element.remove();
						}

						// buttonlink
						if ($element.hasClass('btn')) {

							var _href 		= data[_id].editions[0].url;
							var _linktext 	= data[_id].editions[0].linktext;
							var _title 		= data[_id].editions[0].title;

							// check if element is <a>
							// otherwise search for closest parent <a>
							if ($element.prop('tagName') !== 'a') {
								$element = $element.closest('a');
							}

							// set linktext
							$('[data-jsonupdate-id="' + _id + '"]').html(_linktext);

							// set destination link
							$element.attr('href', _href);

							// set title
							$element.attr('title', _title);
						}
					}
				});
			});
		},

		// @ap: still needed?
		trackTeaserClick: function(e) {

			var $elem = $(e.currentTarget);

			var $imageDiv = $elem.find( 'div.adaptive-image' );
			if ($imageDiv.length > 0) {
				var id = $imageDiv.attr( 'id' );
				var elemClass = $imageDiv.attr( 'class' );
				var title = $imageDiv.find( 'img' ).attr( 'title' );
				var pushVar = elemClass+'|'+id+'|'+title;

				this.gtmPush({'internal_promotion_clicked':pushVar,
								'event':'teaserClick'});
			}
		},

		resizeTextarea: function() {

			$.each(jQuery('textarea[data-autoresize]'), function() {

			    var offset = this.offsetHeight - this.clientHeight;

			    $(this).height('19px');

			    var resizeTextarea = function(el) {
			        $(el).height('19px').css('height', el.scrollHeight + offset );
			    };
			    $(this).on('keyup input', function() { resizeTextarea(this); }).removeAttr('data-autoresize');
			});

		},

		highlightDisabled: function() {

			// each element with following attribute gets updated via json
			$('input:disabled').each(function () {
				var $element = $(this);

				$element.closest(".form-row").find("label").addClass("disabledLabel");
			});
		}

	} );
} )( mrm.$ );
;
/*
 * Helper Method for sending tracking information
 */
function inlinePageTrack(suffix) {
	//Leave method here to avoid js errors, if applications try to track with webtrekk
}

function inlineLinkTrack(suffix) {
	//Leave method here to avoid js errors, if applications try to track with webtrekk
}

/*
 * GTM Start
 * **********************************************************************************
 */
function isGTMActive() {
	if (typeof dataLayer !== "undefined" && typeof dataLayer.push === "function") {
		 return true;
	}
	return false;
}

function collectGTMData() {
	var lang = mrm.$('html').attr('lang');
	var visitorStatus = 'Logged off';
	if (mrm.$( '#loginStatus' ).length > 0) {
		visitorStatus = 'Logged in';
	}
	
	dataLayer.push({'language' : lang, 'visitor_status' : visitorStatus});
}

mrm.$( document ).ready( function( $ ) {
		if (isGTMActive()) {
		  jQuery.scrollDepth();
		  
		  collectGTMData();
		}
	});

/*
 * GTM End
 * **********************************************************************************
 */;
( function( $ ) {
	mrm.util.ui = {

		counter: 0,

		setEqualHeightPerRow: function( $rows ) {
			$rows.each( function( index, row ) {
				var groups = {};

				$( row ).children( 'div' ).each( function( index, cell ) {

					var $cell = $( cell );
					var $mod = $cell.find( '.mod:first' ); // ignore nested mods

					// ignore cell that include more than one mod
					if( $mod.length && $mod.siblings( '.mod' ).length === 0 ) {
						if( $mod.data( 'equalHeight' ) ) {

							// use top offset as key to disable the feature if columns are not side by side
							var key = $cell.offset().top;
							
							//if ExternalMod is found, resize children mod
							if ($mod.is('.mod-ExternalMod') && $mod.find('.mod:first').length > 0) {
								$mod = $mod.find('.mod:first');
							}

							groups[ key ] = groups[ key ] ? groups[ key ].add( $mod ) : $mod;

							$mod.css( 'height', '' ); // clear old height
							$mod.css( 'minHeight', '' ); // clear old min-height
						}
					}
				} );

				$.each( groups, function( index, $collection ) {

					if( $collection && $collection.length > 1 ) {

						var maxHeight = 0;

						$collection.each( function( i, item ) {
							var height = $( item ).outerHeight();

							if( height > maxHeight ) {
								maxHeight = height;
							}
						} );

						// set minHeight so modules with flexible heights can still expand
						$collection.css( 'minHeight', maxHeight );

						var windowWidth = $(window).width(); // viewport

						if (windowWidth > 768) {
							// set margin-bottom
							$collection.css( 'marginBottom', '32px' );
						} else {
							$collection.css( 'marginBottom', '0px' );
						}
					}
				} );
				
				//Testing fixing problem with responsive row break				
				var $row = $(row);
				
				//Only following two ac have a switch of 50/50 containers
				if ($row.hasClass('ac-3_3_3_3') || $row.hasClass('ac-2_2_4')) {
					var colList = $row.children( '.col' );
					if (colList.size() >= 2) {
						var $firstCol = $(colList.get(0));
						var $secondCol = $(colList.get(1));
						
						if (Math.floor($row.width()/$firstCol.width()) === 2) {
							
							height = $firstCol.children( '.mod:first-child' ).outerHeight(true) + 1;
							if (height < $secondCol.children( '.mod:first-child' ).outerHeight(true)) {
								height = $secondCol.children( '.mod:first-child' ).outerHeight(true) + 1;
							}
							$firstCol.css('min-height', height);
							$secondCol.css('min-height', height);
						
						} else {
							$firstCol.css('min-height', '');
							$secondCol.css('min-height', '');
						}
					}
				}
			} );

			// temporary solution
			setTimeout(function() {
				if (mrm.util.ui.counter === 0) {
					mrm.util.ui.counter = 1;

					$( window ).trigger( 'resize' );
				}
			}, 1000);
		}
	};
} )( jQuery );;
( function( $ ) {

	mrm.mod.Accordion = mrm.mod.AbstractMod.extend( {

		events: {
			'click': 'toggleOpenClass'
		},

		prepare: function( callback ) {

			this.sayHello();
			this.addOpenClass();

			callback();
		},
		sayHello: function() {
			console.log("Cheerio, Mr. Accordion!");
		},
		addOpenClass: function() {
			var $element = this.$ctx;
			$element.find(".panel-collapse.in").closest(".panel").addClass("panel-open");
		},
		toggleOpenClass: function() {
			console.log("This shit is not working, Mr. Accordion!");
		},
	} );
} )( jQuery );;
( function( $ ) {

	mrm.mod.BackToTop = mrm.mod.AbstractMod.extend( {

		isAlternative: false,
		_leftPos: $('section.content').offset().left,

		events: {
			'click': 'scrollToTop'
		},

		prepare: function( callback ) {

			this.sandbox.subscribe( 'globalMenu', this );

			// check which version to show
			if (this.$ctx.hasClass('alternative')) {
				this.isAlternative = true;
			}

			// addClass if browser does not support rgba
			if (!Modernizr.rgba) {
				this.$ctx.addClass('hidden');
			}

			callback();
		},

		scrollToTop: function() {

			$('html, body').animate({
				scrollTop: $('body').offset().top
			}, 500);			
		},

		onBroadcastWindowScroll: function() {

			var $element 		= this.$ctx;
			var $posHelper		= $('.mod-NavHaupt .menubar-wrapper');
			var $content 		= $('section.content');
			var _dataScroll 	= $element.data('scroll');
			var _widthContent 	= $content.innerWidth();
			var _widthElement 	= $element.innerWidth();
			var _rightPos 		= _widthContent + this._leftPos;
			var _footerHeight 	= $('.mod-NavFooter').innerHeight();
			var _footerPos 		= _footerHeight + 50;
			var _alternative 	= this.isAlternative;

			// set minimum scroll distance to show element
			if (!$element.data('scroll')) {
				_dataScroll = 500;
			}

/*
			// position element
			if (this.isAlternative === false) {

				if ($element.hasClass('positionRight')) {
					// number is additional margin
					$element.css('left', _rightPos + 13 + 'px');
				} else {
					// number is additional margin
					$element.css('left', this._leftPos - _widthElement - 13 + 'px');
				}
			}
*/

			// show element
			if ($(window).scrollTop() > _dataScroll) {

				$element.fadeIn();
				$element.addClass('active');
			} else {
				$element.stop(true,false).fadeOut(400);
				$element.removeClass('active');
			}

			// position bottom
			/*if (_alternative === false) {

				$element.css('bottom', + _footerPos + 'px');
			}*/
		},

		onGlobalMenuOpen: function() {

			var $element = this.$ctx;

			// hide element
			$element.hide();
		},

		onBroadcastWindowResize: function() {

			this._leftPos = $('section.content').offset().left;

			// reposition element
			this.onBroadcastWindowScroll();
		}
	} );
} )( jQuery );;
( function( $ ) {

	mrm.mod.Buttonleiste = mrm.mod.AbstractMod.extend( {

		prepare: function( callback ) {

			this.checkWidth();

			callback();
		},

		onBroadcastWindowResize: function() {
			this.checkWidth();
		},

		checkWidth: function() {
			var buttonPos 	= 0;
			var buttons 	= this.$ctx.find( '.btn-container > a, .btn-container > .b-f' );

			buttons.each( function() {
				var elementPos = $( this ).position().top;

				buttonPos = buttonPos + elementPos;
			} );

			if( buttonPos > 10 ) {
				var rightContainer = this.$( '.btn-container.btn-right' );

				rightContainer.removeClass( 'btn-right' ).addClass( 'btn-left' );
			}


		}

	} );
} )( jQuery );;
( function( $ ) {
	mrm.mod.Login = mrm.mod.AbstractMod.extend( {

		prepare: function( callback ) {

			this.$( '.error-msg' ).hide();

            // Placeholder polyfill
            this.$( 'input' ).placeholder();

            this.$('.loginFormCss').h5Validate( {
                focusout: false,
                focusin: false,
                errorClass: 'invalid',
                validClass: 'valid'
            } );         

			callback();
		}
	} );
} )( jQuery );
;
( function( $ ) {

	mrm.mod.NavHaupt = mrm.mod.AbstractMod.extend( {

		events: {
			'click': function( event ) {
				event.stopPropagation();
			},
			'touchend': function( event ) {
				event.stopPropagation();
			},
			'click .hn-02 > a': 'toggle',
			'click .hn-01 > a': 'toggle',
			'click .btn-nav-prev.active': 'slidePrev',
			'click .btn-nav-next.active': 'slideNext',
			'click .inner .menubar a': 'showMobileNavLevel'
		},

		windowWidthMq 		: '',
		noMobileNav 		: true,
		isMobile 			: false,
		clonedNavMeta 		: false,
		clonedSearch 		: false,
		navTop 				: null,
		isPopup 			: false,
		isOpen 				: false,
		$menu 				: null,
		$btnPrev 			: null,
		$btnNext 			: null,
		_timeoutID 			: 0,
		$mobileHeader 		: '',

		init: function( $ctx, sandbox, modId ) {

			// call base constructor
			this._super( $ctx, sandbox, modId );

			// get viewport width
			this.getWindowWidth();

			// toggle burger nav icon
			$("#mobileHeader button, #mobileHeader i").on("click", this.toggleBurgerNavIcon);

			// toggle mobile navigation
			$("#mobileHeader button, #mobileHeader i").on("click", $.proxy(this.toggleMobileNav, this));

			// mobile navSparten event listener
			if ($('.mod-NavSparten').length || $('.mod-NavMeta').length) {
				$("body").on("click", ".triggerNavSparten", this.toggleMobileNavSparten);
			} else {
				$('.triggerNavSparten i').hide();
			}

			// back button mobile navigation
			$(".mobileNavBack").on("click", $.proxy(this.goBackMobile, this));

			// add class on all <li> with child <ul>
			this.$ctx.find('.menubar ul').each( function(i, obj) {
				$(obj).closest('li').addClass('containsList');
			});
		},

		prepare: function( callback ) {

			this.sandbox.subscribe( 'globalMenu', this );
			this.sandbox.subscribe( 'broadcast', this );
			this.sandbox.subscribe( 'teaserStatus', this );

			this.$ctx
				.append( '<div class="inner"><div class="menubar-wrapper"></div></div>' )
				.append( '<a class="btn-nav-prev"></a><a class="btn-nav-next active"></a>' );

			this.isPopup 	= $( 'body' ).hasClass( 'popup' );
			this.$menu 		= this.$ctx.find( '.menubar-wrapper' );
			this.$menu.append( this.$ctx.find( '.menubar' ) );
			this.$btnPrev 	= this.$ctx.find( '.btn-nav-prev' );
			this.$btnNext 	= this.$ctx.find( '.btn-nav-next' );

			// sticky mobile nav
			this.mobileHeaderSticky();

			// set mobile/desktop nav
			this.setNavigation();

			callback();
		},

		smartBannerCloseClicked: function() {

			// remove marginTop
			$('body').removeClass('smartBannerIsVisible');

			// remove body-click event listener
			$('body').off('click.smartBannerClose');
		},

		// get viewport width
		getWindowWidth: function() {

			// check viewport with matchMedia Function
			if (window.matchMedia !== undefined && window.matchMedia('all and (min-width: 1px)').matches) {

				//check viewport with matchMedia Function
				if (window.matchMedia("(min-width: 800px)").matches) {

					this.noMobileNav = true;

				} else {

					this.noMobileNav = false;

					this.isMobile = true;
				}

			} else {

				// window.innerWidth value is equivalent to css mediaQuery
				if (window.innerWidth) {

					// needed for ie9
					this.windowWidthMq = window.innerWidth;

				} else {

					// needed for ie8
					this.windowWidthMq = $(window).width();
				}

				// define viewport value for displaying mobile navigation
				if (this.windowWidthMq > 799 ) {

					this.noMobileNav = true;

				} else {

					this.noMobileNav = false;

					this.isMobile = true;
				}
			}

			if ($('body').attr('data-fixed-width') === 'true' ) {

				this.noMobileNav = true;

			}
		},

		setNavigation: function() {

			// var 'this.mobileNav' set in 'getWindowWidth' function
			if (this.noMobileNav === true) {

				// set scrollTop value to fix navigation
				this.initStickyNavigation();

				if (!this.isPopup) {
					// set megadropdown width
					this.setMegadropdownWidth();
				}

				// set megadropdown height
				this.initScroller();

				// remove mobile navigation
				this.deactivateMobileNav();

			} else {

				// prepare mobile nav
				this.initMobileNav();
			}
		},

		mobileHeaderSticky: function() {

			var $element		= $('#mobileHeader');
			var $wrapper 		= '<div class="wrapperMobileHeader"></div>';
			var $popupHeadline 	= $('.popup .wrapper-sparten > h3');
			var $buehne 		= $('.buehneViewportContainer');

			$element.show();

			$element.wrap($wrapper);

			this.$mobileHeader = $('.wrapperMobileHeader');

			if ($('.buehneViewportContainer').length) {
				this.$mobileHeader.insertBefore($buehne);
			}

			//set headline for popup mobile header
			$popupHeadline.clone().appendTo($element);

		},

		initMobileNav: function() {

			var $header 			= $( "body > header, .body-inner > header" );
			var $navButton 			= $("#mobileHeader button");
			var $mobileNavContainer = $( ".mobileNavHeader, .mobileNavFooter" );
			var $navMetaList 		= $( ".mod-NavMeta > ul" );
			var $siteSearch 		= $( ".wrapper-meta .mod-Suche" );
			var $activePage 		= this.$ctx.find('.activePage');
			var $nextToActivePage	= $activePage.prev('li, h2');
			var $toggleArea 		= this.$ctx.find('.toggleArea');
			var $menubar 			= this.$ctx.find('.menubar');

			if (this.noMobileNav === false) {

				// if smartappbanner is visible:
				// add body-click event listener on smartappbanner close button
				$('body').on('click.smartBannerClose', '#smartbanner .sb-close', this.smartBannerCloseClicked);

	            // reset timeout
	            clearTimeout(this._timeoutID);

	            this._timeoutID = setTimeout(function() {

	            	// check if smartbanner for android is visible
	                if ($('#smartbanner').is(':visible')) {
						$('body').addClass('smartBannerIsVisible');
					}
	            }, 1);

				// add mobile class to header
				$header.addClass("mobileNav hidden");

				// remove inline styles from <header>
				$header.attr('style', '');

				// remove fixed header
				if ($('[data-fixed-header]').length) {

					$('body').attr('data-fixed-header', false);
				}

				// set burger nav icon 'inActive'
				$navButton.removeClass("isActive");

				// reinsert #mobileHeader
				if ($('.buehneViewportContainer').length) {
					this.$mobileHeader.insertBefore('body > .buehneViewportContainer, .body-inner > .buehneViewportContainer');
				} else {
					this.$mobileHeader.insertBefore('body > div.main, .body-inner > div.main');
				}
				$('#mobileHeader').show();

				// add mobile header markup
				$mobileNavContainer.show();

				// clone navMeta
				if (this.clonedNavMeta === false ) {
					$navMetaList.clone().appendTo( ".wrapper-sparten" ).addClass('navMetaList');

					this.clonedNavMeta = true;
				}

				// show mobile NavMeta
				$('.navMetaList').show();

				// clone search
				if (this.clonedSearch === false ) {
					$siteSearch.clone().appendTo( ".wrapper-sparten" ).addClass('siteSearchMobile');

					this.clonedSearch = true;
				}

				// show mobile NavMeta
				$('.siteSearchMobile').show();

				// asign class 'isMobile' to '.mod-NavHaupt'
				this.$ctx.addClass('isMobile');

				// change border color of next element
				if ($nextToActivePage.length < 1) {
					$nextToActivePage = $activePage.parent().prev('li, h2');

					// only get the first <a> of all children
					$nextToActivePage.find('> li:last a, > h2:last a').addClass('afterActivePage');
				} else {
					$nextToActivePage.children('a').addClass('afterActivePage');
				}

				// remove inline styles
				this.$ctx.find('.menubar-wrapper').css({
					'height': '',
					'width': '',
					'left': ''
				});

				// make toggleArea-link first nav list entry
				$toggleArea.prependTo($menubar);

				// rearrange list with no <a> or <h2>.
				// these are lists separated for styling reasons to
				// show the links in next coloumn
				this.$ctx.find('.menubar ul').each(function() {

					// look for all <li> with <ul> as first child
					if ($(this).is(':first-child')) {

						// mark parent
						$(this).parent().addClass('hasLostLinks');

						// mark children
						$(this).children().addClass('lostLink');

						// mark destination list
						$(this).parent().prevAll().find('.containsList').first().addClass('lostLinksDestination');

						// clone items
						$(this).children().clone().appendTo($(this).parent().prevAll('.containsList').first().find('ul:last-child'));

						// remove parent class
						// todo: ccbf should not set hasSubNav on these <li>
						$(this).parent().removeClass('containsList');
					}
				});

				this.$ctx.removeClass( 'scrollmode' );

			};
		},

		deactivateMobileNav: function() {

			var $toggleArea = this.$ctx.find('.toggleArea');
			var $menubar 	= this.$ctx.find('.menubar');
			var $siteSearch = $( ".wrapper-meta .mod-Suche" );

			// remove mobile class from header
			$( "body > header, .body-inner > header" ).removeClass("mobileNav hidden");

			// remove sticky mobile container
			$('#mobileHeader button').removeClass('isActive');
			$('#mobileHeader').hide();
			this.$mobileHeader.detach();

			// reset mobileHeader
			// border changes applied when opening NavSparten
			$('.mobileNavHeader').removeClass('sparteIsOpen');

			// hide mobile header
			$( ".mobileNavHeader, .mobileNavFooter" ).hide();

			// remove class 'isMobile' from '.mod-NavHaupt'
			this.$ctx.removeClass('isMobile');

			// reinit sticky nav
			this.initStickyNavigation();

			// hide mobile NavMeta
			$('.navMetaList').hide();

			// mobile nav is inactive
			this.isMobileNavActive = false;

			// remove overlay element
			$('.siteOverlayMobileNav').remove();

			// reset overflow definition of body
			$('body').css('position', '');

			// remove visible class on all child <ul>
			this.$ctx.find('ul').removeClass('mobileVisible');

			// remove navBastardItems
			$('.lostLinksDestination .lostLink').remove();

			// enable fixed header
			if ($('[data-fixed-header]').length) {

				$('body').attr('data-fixed-header', true);

				// dcrm format10 and smartbanner rule
				if ($('.mod-DcrmFormat10').length) {

					if ($('.mod-DcrmFormat10').css('display') !== 'none') {

						$('body').attr('data-fixed-header', false);
					}
				}

				// dcrm format10 and smartbanner rule
				if ($('#smartbanner').length) {

					if ($('#smartbanner').css('display') !== 'none') {

						$('body').attr('data-fixed-header', false);
					}
				}
			}

			// hide cloned search
			$siteSearch.removeClass('siteSearchMobile');
			$('.siteSearchMobile').hide();

			// place toggleArea-link as last nav list entry
			$toggleArea.appendTo($menubar);

			// close dropdown
			// otherwise reinitialization of some components necessary
			this.close();
		},

		toggleMobileNav: function(event) {
			event.preventDefault();

			var $activePage 	= this.$ctx.find('.activePage');
			var $activeList 	= $activePage.closest('ul');
			var $parentLists 	= $activePage.parents('ul');
			var $standardList 	= this.$ctx.find('.menubar');
			var $allMenus		= this.$ctx.find('.menubar-wrapper');
			var $body 			= $('body');
			var $siteOverlay 	= $('<div class="siteOverlayMobileNav"></div>');

			// show/hide mobile navigation
			$( 'header.mobileNav' ).toggleClass( 'hidden' );

			// hide nav sparten
			$( ".wrapper-sparten" ).removeClass( "visible" );
			$( ".triggerNavSparten i").removeClass( "open" );

			// reset all nav levels from 2nd level
			this.$ctx.find('ul ul').css({
			   'right' : '-100%',
			   'width' : '100%'
			});

			// reset mobileHeader
			// border changes applied when opening NavSparten
			$('.mobileNavHeader').removeClass('sparteIsOpen');

			// remove visible class on all nav levels
			this.$ctx.find('ul').removeClass('mobileVisible');

			// create site overlay and prevent page scrolling
			if (!$('.siteOverlayMobileNav').length) {

				// create overlay element
				$body.append($siteOverlay);

				// prevent scrolling page below navigation
				$body.css('position', 'fixed');

			} else {

				// remove overlay element
				$('.siteOverlayMobileNav').remove();

				// reset overflow definition of body
				$body.css('position', '');
			}

			// check nav level
			if ($activePage.length) {

				// show navigation (parent <ul>) of active page
				$activeList.addClass('mobileVisible');

				if (!$('header.mobileNav').hasClass('hidden')) {
					// show grandparent of active page
					$parentLists.css('right', '0');
					$parentLists.show();
				}

				// modify mobileNavHeader
				this.modifyMobileNavHeader($activePage.closest('ul').parent('li').children().first());

			} else {

				$standardList.addClass('mobileVisible');

				// modify mobileNavHeader
				this.modifyMobileNavHeader();
			}

			// set mobile nav height
			this.setMobileNavHeight();
		},

		setMobileNavHeight: function(event) {

			var $element 			= $('.mobileVisible');
			var _footer 			= $('.mobileNavFooter');
			var _footerHeight 		= 0;
			var _height 			= 0;
			var _iconTilesHeight 	= 0;

			if (_footer.length) {
				_footerHeight 		= parseInt(_footer.height()) - 52;
			}

			$element.children(':not(ul)').each( function(i, obj) {
				_height = _height + $(obj).height();
			});

			// remove inline style for height on all ul
			this.$ctx.find('ul').css('height', '');

			// todo: refactor icontiles code (value not reliable)
			// one <li> can contain more than one tile
			if (this.$ctx.find('ul').parent().hasClass('iconTiles')) {
				_iconTilesHeight = 50;
			}

			// set height of visible navigation list.
			// additional pixel needed for list gradient
			this.$menu.height(_height + _footerHeight + _iconTilesHeight + 'px');

			// also set visible list to same height
			$element.height(_height + _footerHeight + _iconTilesHeight + 'px');
		},

		showMobileNavLevel: function(event) {

			// check if mobile navigation is applied
			if (this.noMobileNav === false) {

				var $element 		= $(event.currentTarget);
				var $childList 		= $element.closest('li').children('ul');
				var $toggleSparten 	= $('a.triggerNavSparten');
				var $backButton 	= $('a.mobileNavBack');

				// check if clicked element is <h2>
				// and parent <li> contains more than one <ul>
				if ($element.closest('h2').length && $element.closest('li').children('ul').length) {
					$childList = $element.closest('h2').next('ul');
				}

				// only preventDefault if menu has submenus
				// otherwise follow href destination
				if ($childList.length) {

					event.preventDefault();

					// remove visible class on all child <ul>
					this.$ctx.find('ul').removeClass('mobileVisible');

					// slide in child <ul>
					$childList.addClass('mobileVisible');
					$childList.animate({right: "0%"}, 500);
					$childList.show();

					// scroll to top of navigation list
					this.$ctx.animate({
						scrollTop: this.$ctx.offset().top - 99999
					});

					// modify mobileNavHeader
					this.modifyMobileNavHeader($element);

				}

				// set mobile nav height
				this.setMobileNavHeight();
			}
		},

		goBackMobile: function(event) {
			event.preventDefault();

			var $element 		= $(event.currentTarget);
			var $activeList 	= this.$ctx.find('.mobileVisible');
			var $parentList 	= $activeList.closest('li').closest('ul');
			var $parentLink 	= $parentList.closest('li').children().first();
			var $toggleSparten 	= $('a.triggerNavSparten');
			var $backButton 	= $('a.mobileNavBack');

			// hide active slide
			$activeList.animate({right: "-100%"}, 500);
			$activeList.removeClass('mobileVisible');

			$parentList.addClass('mobileVisible');

			// modify mobileNavHeader
			this.modifyMobileNavHeader($parentLink);

			// set mobile nav height
			this.setMobileNavHeight();
		},

		modifyMobileNavHeader: function(event) {

			var $element 		= $(event);
			var _href 			= $element.attr('href');
			var $activeList 	= this.$ctx.find('.mobileVisible');
			var $descriptor 	= $('.levelDescriptor');
			var $toggleSparten 	= $('a.triggerNavSparten');
			var $backButton 	= $('a.mobileNavBack');
			var $activeSparte 	= $( ".mod-NavSparten" ).find( "li.active a" );
			var _popupHeadline 	= $('.popup .wrapper-sparten > h3').text();

			// check nav level
			if ($activeList.closest('ul').hasClass('menubar') || $activeList.hasClass('menubar')) {

				// hide back button
				$backButton.hide();

				// show sparten toggle
				$toggleSparten.show();

				// mark descriptor link
				$descriptor.addClass('removeMe');

				// clone sparte
				if (!$activeSparte.length) {
					$('<span class="levelDescriptor">' + _popupHeadline + '</span>').insertAfter('.levelDescriptor');
				} else {
					$activeSparte.clone(true).insertAfter('.levelDescriptor').addClass('levelDescriptor');
				}

				// remove placeholder (marked descriptor link)
				$('.mobileNavHeader .removeMe').remove();

			} else {

				// hide sparten toggle
				$toggleSparten.hide();

				// show back button
				// show() added display:inline on element
				$backButton.css('display', 'inline-block');

				// mark descriptor link
				$descriptor.addClass('removeMe');

				// clone clicked link and show in mobileNavHeader
				$element.clone(true).insertAfter('.levelDescriptor').addClass('levelDescriptor');

				// add destination link for level 1 nav items
				if ($element.attr('data-nav-href')) {
					$('.levelDescriptor').attr('href', $element.attr('data-nav-href'));
				}

				// check for noSecureIcon class
				if ($element.closest('h2, li').hasClass('noSecureIcon')) {
					$('.levelDescriptor').find('i').hide();
				}

				// remove placeholder (marked descriptor link)
				$('.mobileNavHeader .removeMe').remove();
			}
		},

		toggleBurgerNavIcon: function(event) {
			event.preventDefault();

			var $element = $('#mobileHeader button');

			if ($element.hasClass("isActive")) {
				$element.removeClass("isActive");
			} else {
				$element.addClass("isActive");
			};
		},

		toggleMobileNavSparten: function(e) {

			var _timeoutID = '';

			e.preventDefault();

			$( ".wrapper-sparten" ).toggleClass( "visible" );
			$( ".triggerNavSparten i").toggleClass( "open" );

			clearTimeout(_timeoutID);

			_timeoutID = setTimeout(function(){
				$('.mobileNavHeader').toggleClass('sparteIsOpen');
			}, 200);
		},

		toggle: function( event ) {

			if (this.noMobileNav === true) {
				// only preventDefault if menu has submenus
				if ($(event.currentTarget).next('ul').length) {
					event.preventDefault();
				}

				var self = this;
				var $target = $( event.currentTarget );
				var $li = $target.closest( 'li' );
				var $row = $target.next( 'ul.row' );

				// check if clicked element is tiles naviagtion
				$isTilesNavi =  false;

				if ($(event.currentTarget).closest('li').hasClass('iconTiles')) {
					$isTilesNavi = true;
				}

				this.checkPosition( $li );

				this.$menu.filter( ':animated' ).promise().done( function() { // wait for any menu sliding animation to be done before showing megadropdown
					// clone active ul
					self.$( '.inner > .row' ).remove();

					if ( $isTilesNavi === true) {
						$row.clone().addClass('iconTiles').appendTo( self.$ctx.find( '.inner' ) ); // kontaktreiter
					} else {
						$row.clone().appendTo( self.$ctx.find( '.inner' ) );
					}

					if( $li.hasClass( 'open' ) ) {
						self.close( $li );
					} else {
						self.open( $li, $row ); // kontaktreiter
					}

					// height of dropdown content
					self.setMegadropdownHeight();
				} );
			}
		},


		setMegadropdownHeight: function() {

			if( !this.isPopup ) {
				var $element = $( '.inner > .row' );
				var $dropdownHeight = $element.height();
				var $viewportHeight = $( window ).height() - 200;

				if( $viewportHeight <= $dropdownHeight ) {
					$element.css( {
						'height': $viewportHeight + 'px'
					} );
				}
			}
		},

		initScrollbar: function() {
			var $element 	= this.$( '.inner > .row' );
			var $newHeight 	= $element.height() + 51;

			// update css
			$element.css({
				'height': $newHeight + 'px',
				'padding-top': '9px',
				'padding-left': '16px'
			});
		},

		update: function() {
			//this.scrollbar.data( 'jsp' ).reinitialise();
		},

		open: function( $li, $row ) {
			this.closeAll();

			$li.addClass( 'open' );

			this.fire( 'globalMenuOpen', [ 'globalMenu' ] );

			// show cloned megadropdown only
			$li.find( '.menu' ).hide();

			this.$( '.inner > .row' ).show();

			if( this.isPopup || $isTilesNavi) {
				if( $isTilesNavi ) {
					// initialize tiles naviagtion
					this.initTilesNavigation();
				}

				if (this.noMobileNav === true) {
					// set megadropdown pos
					this.setMegadropdownPos( $li );
				}
			}

			this.isOpen = true;
		},

		close: function() {
			this.isOpen = false;
			this.closeAll();

			if (this.noMobileNav === true) {
				this.$menu.css( 'height', 'auto' );
			}

			// remove cloned element
			this.$( '.inner > .row' ).remove();
		},

		closeAll: function() {
			this.$( '.open' ).removeClass( 'open' );
		},

		onBroadcastBodyClick: function( event ) {
			this.close();
		},

		onGlobalMenuOpen: function() {
			this.close();
		},

		onBroadcastWindowResize: function() {

			// check viewport size
			this.getWindowWidth();

			if (this.noMobileNav === true) {

				this.initScroller();

				var openDropdown = this.$ctx.find( 'li.open' );

				if( !this.isPopup ) {
					// set megadropdown width
					this.setMegadropdownWidth();
				}

				if( this.isOpen && this.isPopup ) {
					// set megadropdown pos
					this.setMegadropdownPos( openDropdown );
				}

				if ($( openDropdown ).hasClass('iconTiles')) {
					this.setMegadropdownPos(openDropdown)
				};

				// remove mobile navigation
				this.deactivateMobileNav();

			} else {

				// prepare mobile nav
				if (!$('header').hasClass('mobileNav')) {
					this.initMobileNav();
				}
			}
		},

		onBroadcastOrientationChange: function() {

			// check viewport size
			this.getWindowWidth();

			if (this.noMobileNav === true) {

				this.close();

				// remove mobile navigation
				this.deactivateMobileNav();

			} else {

				// prepare mobile nav
				if (!$('header').hasClass('mobileNav')) {
					this.initMobileNav();
				}
			}
		},

		// communicates with other elements to determine
		// at which scroll position to fixate navigation
		//
		// modes:
		// - standard
		// - dcrmFormat10
		// - smartAppBanner
		initStickyNavigation: function(x) {

			var self 				= this;
			var $element 			= this.$ctx;
			var $header 			= this.$ctx.closest( 'header' );
			var $meta 				= $header.find('.wrapper-meta');
			var $sparten 			= $header.find('.wrapper-sparten');
			var _height 			= 0;
			var _format10Height		= 0;
			var _smartbannerHeight 	= 0;

			// set initial height for dcrm10
			if ($('.mod-DcrmFormat10').length) {

				_format10Height = $('.mod-DcrmFormat10').outerHeight();

				if ($('.mod-DcrmFormat10').css('display') === 'none') {
					_format10Height = 0;
				}
			}

			// set initial height for smartbanner
			if ($('#smartbanner').length) {

				_smartbannerHeight = parseInt($('#smartbanner').outerHeight()) - 6;

				if ($('#smartbanner').css('display') === 'none') {
					_smartbannerHeight = 0;
				}
			}

			// set dcrm10/smartbanner height to zero if closed
			if (x) {

				if (isNaN(x)) {

					if (x === 'smartBannerClosed' || $('#smartbanner').css('display') === 'none') {
						_smartbannerHeight = 0;
					}

					if (x === 'closed' || $('.mod-DcrmFormat10').css('display') === 'none') {
						_format10Height = 0;
					}

				} else {

					// if x is number
					_format10Height = x;

					if ($('#smartbanner').css('display') === 'none') {
						_smartbannerHeight = 0;
					}
				}
			}

			if (!$('[data-fixed-header]').length) {

				// calculate header height
				_height = $element.height() + $meta.height() + $sparten.height();

				// set height
				if (!$('#smartbanner').length) {
					$header.height( _height );
				}
			}

			// set sticky position
			this.navTop = $meta.height() + $sparten.height() + _smartbannerHeight + _format10Height;
		},

		// event listener for:
		// - dcrmFormat10
		// - smartbanner
		onFixedNavPos: function(x) {

			this.initStickyNavigation(x.teaserState);
		},

		onBroadcastWindowScroll: function() {

			if ( (this.noMobileNav === true && $('body').attr('data-fixed-header') !== 'true') || ($('body').attr('data-fixed-header') === 'true' && this.isMobile === true)) {
				if( $( document ).scrollTop() > this.navTop ) {
					this.$ctx.addClass( 'sticky' );

					// dashboard changes
					if ($('.mod-DashboardHeader').length) {
						$('.mod-DashboardHeader').addClass( 'sticky' );
					}
				} else {
					this.$ctx.removeClass( 'sticky' );

					// dashboard changes
					if ($('.mod-DashboardHeader').length) {
						$('.mod-DashboardHeader').removeClass( 'sticky' );
					}
				}
			}
		},

		initScroller: function() {
			var scrollWidth 	= 0;
			var _dWidth 		= parseInt(this.$('.inner').width()) - parseInt($('.mod-DashboardHeader').innerWidth()) - 140;
			var openDropdown 	= this.$ctx.find( 'li.open' );

			this.resetScroller();

			// dashboard changes
			if ($('.mod-DashboardHeader').length) {
				this.$menu.css('width', _dWidth + 'px');
			}

			// hide tile navigation if scroller is initialized
			if( $( openDropdown ).hasClass('iconTiles' ) ) {
				$( '.inner > .iconTiles' ).hide();
			}

			// calculate real navigation width
			this.$menu.find( '.menubar > li' ).each( function() {
				scrollWidth = scrollWidth + $( this ).outerWidth( true );
			} );

			// check if scroller is needed
			if( this.$menu.width() < scrollWidth ) {
				var $inner 			= this.$('.inner');
				var $innerMargin 	= parseInt($inner.offset().left);

				// dashboard changes
				if ($('.mod-DashboardHeader').length) {
					var $innerWidth = _dWidth;
				} else {
					var $innerWidth = $inner.width();
				}

				// var $innerWidth 	= $inner.width();
				var $innerPadding 	= parseInt($inner.css('paddingLeft'));
				var $innerRight 	= $innerWidth + $innerMargin + $innerPadding;
				var $innerLeft 		= $innerMargin + $innerPadding;
				var $prevWidth 		= parseInt(this.$btnPrev.css('width'));
				var $pos 			= $innerMargin + $innerPadding - $prevWidth;
				var $windowWidth	= parseInt($(window).width());

				this.$ctx.addClass( 'scrollmode' );

				// set horizontal of position "previous" & "next" buttons
				this.$menu.css('left', parseInt(this.$btnPrev.css('width')) + 'px');
				this.$menu.css('width', $innerWidth - parseInt(this.$btnPrev.css('width')) + 'px');
				this.$btnPrev.css( 'left', $innerLeft);
				this.$btnNext.css( 'left',$innerRight - $prevWidth );
				if ($('.mod-DashboardHeader').length) {
					this.$menu.css('width', _dWidth);
					this.$btnNext.css( 'left',$innerRight);
				}

				// old code
				// if( !this.isPopup ) {

				// 	if ($(window).width() >= 1080) {
				// 		this.$btnPrev.css( 'left', $innerLeft - $prevWidth + 1 );
				// 		this.$btnNext.css( 'left', $innerRight -1 );
				// 		this.$menu.css('left', 'auto'); // reset position on resize
				// 		this.$menu.css('width','auto'); // reset width on resize
				// 		if ($('.mod-DashboardHeader').length) {
				// 			this.$menu.css('width', _dWidth);
				// 		}
				// 	} else {
				// 		this.$menu.css('left', parseInt(this.$btnPrev.css('width')) + 'px');
				// 		this.$menu.css('width', $innerWidth - parseInt(this.$btnPrev.css('width')) + 'px');
				// 		this.$btnPrev.css( 'left', $innerLeft);
				// 		this.$btnNext.css( 'left',$innerRight - $prevWidth );
				// 		if ($('.mod-DashboardHeader').length) {
				// 			this.$menu.css('width', _dWidth);
				// 			this.$btnNext.css( 'left',$innerRight);
				// 		}
				// 	}
				// }

			} else {
				this.$ctx.removeClass( 'scrollmode' );
			}
		},

		resetScroller: function() {
			this.$menu.scrollLeft( 0 );
			this.$btnPrev.removeClass( 'active' );
			this.$btnNext.addClass( 'active' );

			// reset menu position
			this.$menu.css('left', 'auto');
			this.$menu.css('width','auto');
		},

		setMegadropdownWidth: function() {
			var $megadropdown 	= $( '.inner .menu' );
			var contentWidth 	= $( 'section.content' ).outerWidth();

			$( $megadropdown ).each( function(){
				if ( ! $( this ).closest('li').hasClass('iconTiles') && ! $( this ).hasClass('iconTiles') ) {
					$( this ).css( 'width', contentWidth );
				}
			});
		},

		setMegadropdownPos: function( $navItem ) {

			var $megadropdown = this.$( '.inner > .row' );

			// check type of dropdown an reposition according to it
			if ( $($megadropdown).hasClass('iconTiles') ) {

				$megadropdown.position( {
					my: 'right top',
					at: 'right bottom',
					of: $( '.menubar > li.iconTiles' ),
					collision: 'none'
				} );
			} else {

				$megadropdown.position( {
					my: 'left top',
					at: 'left bottom',
					of: $navItem,
					collision: 'flip'
				} );
			};


		},

		slidePrev: function( event ) {

			if( event !== undefined ) {
				event.preventDefault();
			}

			var self = this;
			var $navItem = this.getNavItem( 'left' );

			// hide megadropdown
			this.$( '.inner > .row' ).hide();

			self.closeAll();

			this.$menu.animate( {
					scrollLeft: $navItem.position().left
				},
				300,
				function() {
					if( self.$menu.scrollLeft() === 0 ) {
						self.$btnPrev.removeClass( 'active' );
					}
					self.$btnNext.addClass( 'active' );
				}
			);
		},

		slideNext: function( event ) {

			if( event !== undefined ) {
				event.preventDefault();
			}

			var self 		= this;
			var $navItem 	= this.getNavItem( 'right' );
			var _marginAuto = (parseInt(this.$ctx.width()) - parseInt(this.$ctx.find('.inner').width())) / 2 - 24;

			if (_marginAuto < 0 ) {
				_marginAuto = 0;
			}

			// hide megadropdown
			this.$( '.inner > .row' ).hide();

			self.closeAll();

			this.$btnPrev.addClass( 'active' );

			// check if $navItem is undefined
			if ( !$navItem ) {
				$navItem = self.$menu.find( '.menubar > li' ).last();
			}

			if( $navItem.is( ':last-child' ) ) {
				this.$btnNext.removeClass( 'active' );
			}

			this.$menu.animate( {
				scrollLeft: Math.abs($navItem.position().left + _marginAuto + $navItem.outerWidth( true ) - this.$btnNext.position().left + self.$menu.position().left)
			}, 300 );
		},

		getNavItem: function( direction ) {
			var self 		= this;
			var found 		= false;
			var _marginAuto = (parseInt(this.$ctx.width()) - parseInt(this.$ctx.find('.inner').width())) / 2 - 65;
			var $navItem;

			if( direction === 'right' ) {

				self.$menu.find( '.menubar > li' ).each( function() {
					if( (self.$btnNext.position().left < $( this ).position().left + _marginAuto + $( this ).outerWidth( true ) - self.$menu.scrollLeft() + self.$menu.position().left - 1) && !found) { // - 1 voodoo firefox
						$navItem = $( this );
						found = true;
						return false; // break
					}
				} );
			} else {
				self.$menu.find( '.menubar > li' ).each( function() {
					if( self.$menu.scrollLeft() <= $( this ).position().left ) {
						return false; // break
					}
					$navItem = $( this );
				} );
			}

			return $navItem;
		},

		checkPosition: function( $navItem ) {

			var leftBoundary = this.$menu.scrollLeft();
			var rightBoundary = this.$menu.width() + this.$menu.scrollLeft();

			if( $navItem.position().left < leftBoundary ) {
				this.slidePrev();
			} else if( $navItem.position().left + $navItem.outerWidth( true ) > rightBoundary ) {
				this.slideNext();
			}
		},

		initTilesNavigation: function () {

			var tilesDropdown = $( '.inner > .menu.iconTiles' );
			var tiles = $( '.inner > .menu.iconTiles > li > h2' );

			// change markup structure
			tiles.unwrap()
			tilesDropdown.replaceWith($( '<div class="menu row iconTiles" style="display:block;">' + tilesDropdown.html() + '</div>' ));
			$( '.inner > .menu.iconTiles > h2.tl-02' ).appendTo( '.inner > .menu.iconTiles' );

			// check for coulms with empty tile spaces
			var countTiles =  $( '.inner > .menu.iconTiles > h2.tl-01' ).length;
			var countMobileTiles =  $( '.inner > .menu.iconTiles > h2.tl-01' ).not( '.no-mobile' ).length;

			if ( $( '.inner > .menu.iconTiles' ).width() > 210 ) {
				if ( (countTiles % 3) == 1 ) {
					$( '.menu.iconTiles h2.tl-01' ).last().css( 'width', '272px' );
				} else if ( (countTiles % 3) == 2 ) {
					$( '.menu.iconTiles h2.tl-01' ).last().css( 'width', '178px' );
				};
			} else {
				if ( (countMobileTiles % 2) == 1 ) {
					$( '.menu.iconTiles h2.tl-01' ).last().css( 'width', '178px' );
				}
			};

		}

	} );
} )( jQuery );
;
( function( $ ) {

    mrm.mod.NavMeta = mrm.mod.AbstractMod.extend( {

        prepare: function( callback ) {

            // init url changes
            this.changeUrl();

            // set marginRight
            this.setMargin();

            // set width for elements in .wrapper-meta
            this.setWidth();

            // get width of search field
            this.getSearchWidth();

            callback();
        },

        _timeoutID: 0,
        _searchWidthInitial: 0,

        getSearchWidth: function() {

            // if search exists
            if ($('.mod-Suche').length) {
                this._searchWidthInitial = $('.mod-Suche').outerWidth(true);
            }
        },

        setWidth: function() {

            var _navMetaWidth   = 0;
            var _sectionWidth   = $('section.content').innerWidth();
            var _searchWidth    = 0;
            var _navUserWidth   = 0;
            var _loginWidth     = 0;
            var _logoutWidth    = 0;
            var _widthLinks     = 0;
            var _maxWidth       = 0;
            var _submitWidth    = 0;
            var _navMetaSpace   = 0;
            var _largeInput     = false;
            var $navmeta        = this.$ctx;

            // if search exists
            if ($('.mod-Suche').length) {

                // get width of searchfield incl. margins
                _searchWidth = $('.mod-Suche').outerWidth(true);

                if (_searchWidth >= this._searchWidthInitial) {
                    _searchWidth = this._searchWidthInitial;
                }
            }

            // if search exists
            if ($('.mod-NavUser').length) {

                // get width of navUser element
                _navUserWidth = $('.mod-NavUser').outerWidth(true);
            }

            _widthLinks = 0;
            _maxWidth = 0;

            // get width of navMeta elements
            $navmeta.find('li').each( function(i, obj) {
                _navMetaSpace = _navMetaSpace + parseInt($(obj).outerWidth());
            });

            // reset classes
            $('.mod-HeaderLogin').removeClass('smallInputs');
            $('.mod-HeaderLogin').removeClass('hiddenInputs');

            // display for width calculation
            // $('.headerlogin-input-wrapper').show();

            // if login exists (inputs/button)
            if ($('.mod-HeaderLogin').length) {

                // get width of navUser element
                _loginWidth = $('.mod-HeaderLogin').outerWidth(true) + parseInt($('.mod-HeaderLogin').css('marginRight'));

                _submitWidth = $('#headerLoginSubmit').outerWidth(true);

                if ($('#teilnehmer').outerWidth() > 150) {
                    _largeInput = true;
                } else {
                    _largeInput = false;
                }
            }

            // hide after width calculation
            // $('.headerlogin-input-wrapper').hide();

            // if logout button exists
            if ($('.wrapper-meta > a.btn').length) {

                // get width of logout button
                _logoutWidth = $('.wrapper-meta > a.btn').outerWidth(true);
            }

            // if search exists
            if ($('.mod-Suche').length) {

                // get width of searchfield incl. margins
                _searchWidth = $('.mod-Suche').outerWidth(true) + parseInt($('.mod-Suche').css('marginRight'));
            }

            // if navUser exists
            if ($('.mod-NavUser').length) {

                // get width of navUser element
                _navUserWidth = $('.mod-NavUser').outerWidth(true) + parseInt($('.mod-NavUser').css('marginRight'));
            }

            // if navMeta exists
            if ($('.mod-NavMeta').length) {

                // get width of searchfield incl. margins
                _navMetaWidth = $('.mod-NavMeta').outerWidth(true);
            }

            // calculate max. possible width for teilnehmer/pin
            _maxWidth = _sectionWidth - _searchWidth - _navUserWidth - _navMetaWidth - _loginWidth - _logoutWidth;

            // calculate max. possible width for navmeta
            _widthLinks = _sectionWidth - _searchWidth - _navUserWidth - _logoutWidth - 120;

            if (_maxWidth > 58) {
                $navmeta.removeClass('multiRow');
                $navmeta.css({
                    'width': 'auto'
                });
            }

            // variant 2
            if (_maxWidth < 0 && !$('.mod-HeaderLogin').length) {

                // calculate max. possible width for teilnehmer/pin
                _maxWidth = _sectionWidth - _searchWidth -_navUserWidth - _navMetaWidth - _loginWidth - _logoutWidth;

                // calculate max. possible width for navmeta
                _widthLinks = _sectionWidth - _searchWidth - _navUserWidth - _submitWidth - _logoutWidth - 100;

                if (_navMetaSpace > _widthLinks) {

                    $navmeta.addClass('multiRow');

                    $navmeta.css({
                        'width': _widthLinks + 'px'
                    });
                }
            }

            // variant 1
            if (_maxWidth > -185 && _maxWidth < 0 && _largeInput === true && $('.mod-HeaderLogin').length) {

                if ($('.mod-HeaderLogin').length) {

                    // reset classes
                    $('.mod-HeaderLogin').removeClass('smallInputs');
                    $('.mod-HeaderLogin').removeClass('hiddenInputs');

                    // add class
                    $('.mod-HeaderLogin').addClass('smallInputs');

                    // get new width of login element
                    _loginWidth = $('.mod-HeaderLogin').outerWidth(true) + parseInt($('.mod-HeaderLogin').css('marginRight'));
                }
            }

            // variant 2
            if ((_maxWidth < 0 && _largeInput === false && $('.mod-HeaderLogin').length) || (_maxWidth < -185 && _largeInput === true && $('.mod-HeaderLogin').length)) {

                if ($('.mod-HeaderLogin').length) {

                    // reset classes
                    $('.mod-HeaderLogin').removeClass('smallInputs');
                    $('.mod-HeaderLogin').removeClass('hiddenInputs');

                    // add class
                    $('.mod-HeaderLogin').addClass('hiddenInputs');

                    // get new width of login element
                    _loginWidth = $('.mod-HeaderLogin').outerWidth(true) + parseInt($('.mod-HeaderLogin').css('marginRight'));
                }

                // calculate max. possible width for teilnehmer/pin
                _maxWidth = _sectionWidth - _searchWidth -_navUserWidth - _navMetaWidth - _loginWidth - _logoutWidth;

                // calculate max. possible width for navmeta
                _widthLinks = _sectionWidth - _searchWidth - _navUserWidth - _submitWidth - _logoutWidth - 100;

                if (_navMetaSpace > _widthLinks) {

                    $navmeta.addClass('multiRow');

                    $navmeta.css({
                        'width': _widthLinks + 'px'
                    });
                }
            }
        },

        changeUrl: function() {

            if ($('script#navMetaLanguages').length) {
                var $elements   = this.$ctx.find('a[data-language]');
                var _data       = JSON.parse(document.getElementById('navMetaLanguages').innerHTML);

                $elements.each( function(i, obj) {
                    var _language   = $(this).attr('data-language');
                    var _url        = _data['language-switch'][_language]['href'];

                    $(this).attr('href', _url);
                });
            }
        },

        setMargin: function() {

            var $element        = this.$ctx;
            var _containerWidth = parseInt($('section.content').css('width'));
            var _value          = parseInt(_containerWidth / 100) * 6;

            $element.css('marginRight', + _value + 'px');
        },

        onBroadcastWindowResize: function() {

            var self = this;

            // set marginRight
            this.setMargin();

            // set width for elements in .wrapper-meta
            // reset timeout
            clearTimeout(this._timeoutID);

            // calc max width
            this._timeoutID = setTimeout(function() {

                // calculate max. possible width
                self.setWidth();
            }, 400);
        }
    } );
} )( jQuery );;
( function( $ ) {

    mrm.mod.NavSparten = mrm.mod.AbstractMod.extend( {

        events: {
        },

        prepare: function( callback ) {

            callback();
        }
    } );
} )( jQuery );;
( function( $ ) {

	mrm.mod.Plate = mrm.mod.AbstractMod.extend( {

	} );
} )( jQuery );;
( function( $ ) {
	mrm.mod.Suche = mrm.mod.AbstractMod.extend( {

		events: {
			'click i': 'onButtonClick'
		},

		prepare: function( callback ) {

			// create searchToggle
			if (this.$ctx.parent().hasClass('wrapper-meta')) {
				this.createSearchToggleElement();
			}

			// remove required attribute
			this.$ctx.find('form input').removeAttr('required');
			
			this.setOnFormSubmit();

			callback();
		},

		createSearchToggleElement: function( event ) {

			var $suche = this.$ctx;

			$('<i class="icon i-211"></i>').prependTo($suche);
		},

		onButtonClick: function( event ) {

			if (this.$ctx.parent().hasClass('wrapper-meta')) {

				var $suche 			= this.$ctx;
				var $form 			= this.$ctx.find('form');
				var _placeholder 	= $form.find('input').attr('placeholder');

				event.preventDefault();

				if ($suche.hasClass('open')) {

					var val = $form.find('input').val();
					// check if search term is typed in
					if (val !== '' && val !== _placeholder) {

						this.gtmPush({'event' : 'search', 'search_term' : val});
						// submit form (use cif script for search)
						popup_suche();

						// reinsert placeholder value
						$form.find('input').val('');

					} else {

						// hide search field
						$suche.removeClass('open');
					}

				} else {

					// show search field
					$suche.addClass('open');
				}
			}
		},
		
		setOnFormSubmit: function() {
			var $form 			= this.$ctx.find('form');
			var that			= this;
			$form.submit(function(e) {
				var val 			= $form.find('input').val();
				var _placeholder 	= $form.find('input').attr('placeholder');
				if (val !== '' && val !== _placeholder) {
					that.gtmPush({'event' : 'search', 'search_term' : val});
					//popup_suche();
					e.preventDefault();
					// reinsert placeholder value
					$form.find('input').val('');
				}
			});
		},

		onBroadcastWindowResize: function() {

			// hide search field
			if (this.$ctx.parent().hasClass('wrapper-meta')) {
				this.$ctx.removeClass('open');
			}
		}
	} );
} )( jQuery );
;
( function( $ ) {

	mrm.mod.Weltkarte = mrm.mod.AbstractMod.extend( {

		events: {
			'mouseenter li[data-continent]': 'getData',
			'mouseleave .listing': 'resetMap',
			'click ul.languages li a': 'trackLanguage'
		},

		_maxWidth: 0,

		prepare: function( callback ) {

			// build cols
			this.setCols();

			callback();
		},

		setCols: function() {

			// calculate cols
			// 120: max Headline (88px) + margins (32px)
			// 3: max cols
			var $parent 	= this.$ctx;
			var _totalWidth = $parent.innerWidth();
			var _width 		= _totalWidth - 120 * 3;
			var _ulHeight 	= $parent.find('.countries li[data-continent]').length;

			// delete col classes
			$parent.removeClass('twoCols');
			$parent.removeClass('threeCols');

			// 2 cols if <li> width below 170px
			if (_width / 3 <= 170) {
				$parent.addClass('twoCols');

				_ulHeight = _ulHeight * 38 / 2;
			} else {
				$parent.addClass('threeCols');

				_ulHeight = _ulHeight * 38 / 3;
			}

			// set height
			// $parent.find('.countries').css('height', _ulHeight + 'px');

			// read list and move items into cols
			this.initList();
		},

		getData: function(e) {
			e.preventDefault();

			var $parent 		= this.$ctx;
			var $element 		= $(e.currentTarget);
			var _data 			= $element.attr('data-continent');
			var $parents 		= $parent.find('li[data-continent=' + _data +']').closest('ul');
			var $all 			= $parent.find('li[data-continent]').closest('ul');
			var $mapImages 		= $parent.find('.mapContainer img.mapContinent');
			var $activeMap 		= $parent.find('.activeMap');
			var _activeMapId 	= $activeMap.attr('id');
			var $map 			= '';

			// remove classes
			$all.removeClass('highlight');
			$mapImages.removeClass('activeMap');

			// add highlighting
			$parents.addClass('highlight');

			// init changes
			$map = $('#' + _data);
			$map.addClass('activeMap');

			if (_activeMapId !== _data) {

				// fadeOut previous active continent on worldmap
				if( $.browser.msie && parseInt( $.browser.version, 10 ) < 9 ) {
					$activeMap.hide();
					$activeMap.css('zIndex', '-1');
				} else {
					$activeMap.stop(true, true).animate({
						'opacity': 0
					}, 500);

					$activeMap.css('zIndex', '-1');
				}

				// fadeIn continent on worldmap
				if( $.browser.msie && parseInt( $.browser.version, 10 ) < 9 ) {
					$map.css('zIndex', '9');
					$map.show();
				} else {
					$map.css('zIndex', '9').animate({
						'opacity': 1
					}, 500);
				}
			}
		},

		resetMap: function() {

			var $parent 	= this.$ctx;
			var $mapImages 	= $parent.find('.mapContainer img.mapContinent');
			var $activeMap 	= $parent.find('.activeMap');
			var $all 		= $parent.find('li[data-continent]').closest('ul');

			// remove classes
			$all.removeClass('highlight');
			$mapImages.removeClass('activeMap');

			// fadeOut previous active continent on worldmap
			if( $.browser.msie && parseInt( $.browser.version, 10 ) < 9 ) {
				$activeMap.hide();
				$activeMap.css('zIndex', '-1');
			} else {
				$activeMap.stop(true, true).animate({
					'opacity': 0
				}, 500);

				$activeMap.css('zIndex', '-1');
			}
		},

		initHeadlineWidth: function() {

			var self 		= this;
			var $element 	= this.$ctx.find('li > h1');

			$element.each(function(){
				if ($(this).outerWidth() > self._maxWidth){
					self._maxWidth = $(this).outerWidth();
				}
			});

			$element.css('width', self._maxWidth + 'px');
		},

		initList: function() {

			var $module 		= this.$ctx;
			var $element 		= this.$ctx.find('.listing');
			var $children 		= $element.children('div');
			var _elementWidth 	= $element.outerWidth();
			var $countries 		= $module.find('.countries');
			var _countCountries = $countries.find('> li[data-continent]').length;
			var _divider 		= '';
			var _listLength 	= '';
			var $splitList 		= '';
			var $siblings 		= '';
			var _listWidth 		= '';
			var $continent 		= '';
			var _continentData 	= '';

			// calculate items per col
			_listLength = Math.ceil(_countCountries / 2);

			if ($module.hasClass('threeCols')) {
				_listLength = Math.ceil(_countCountries / 3);
			}

			// remove existing child nodes
			$element.empty();

			// create cols
			$element.append('<div class="col1"><ul></ul></div>');
			$element.append('<div class="col2"><ul></ul></div>');

			if ($module.hasClass('threeCols')) {
				$element.append('<div class="col3"><ul></ul></div>');
			}

			// mark items with col number
			for (var i = 0; i < _listLength; i++ ) {
				$countries.children('li').eq(i).attr('data-col', '1');

				$countries.children('li').eq(0).attr('data-first', 'true');
				$countries.children('li').eq(_listLength - 1).attr('data-last', 'true');
			}

			for (var i = _listLength; i < _listLength * 2; i++ ) {
				$countries.children('li').eq(i).attr('data-col', '2');
			}

			if ($module.hasClass('threeCols')) {
				for (var i = _listLength * 2; i < _listLength * 3; i++ ) {
					$countries.children('li').eq(i).attr('data-col', '3');
				}
			}

			// append items into appropriate cols
			$module.find('li[data-col=1]').clone().appendTo($element.find('.col1 ul'));
			$module.find('li[data-col=2]').clone().appendTo($element.find('.col2 ul'));

			if ($module.hasClass('threeCols')) {
				$module.find('li[data-col=3]').clone().appendTo($element.find('.col3 ul'));
			}

			// create continent <ul> for col1
			$continent = $element.find('.col1 ul li[data-continent]');
			_continentData = {};

			$continent.each(function() {
				_continentData[$(this).data('continent')] = '';
			});

			for (name in _continentData) {
				$continent.filter('[data-continent='+ name +']').wrapAll('<li><ul>');
			}

			// create continent <ul> for col2
			$continent = $element.find('.col2 ul li[data-continent]');
			_continentData = {};

			$continent.each(function() {
				_continentData[$(this).data('continent')] = '';
			});

			for (name in _continentData) {
				$continent.filter('[data-continent='+ name +']').wrapAll('<li><ul>');
			}

			if ($module.hasClass('threeCols')) {
				// create continent <ul> for col3
				$continent = $element.find('.col3 ul li[data-continent]');
				_continentData = {};

				$continent.each(function() {
					_continentData[$(this).data('continent')] = '';
				});

				for (name in _continentData) {
					$continent.filter('[data-continent='+ name +']').wrapAll('<li><ul>');
				}
			}

			// insert headlines
			$element.find('li[data-headline]').each(function() {
				var _headline = $(this).attr('data-headline');

				$(this).closest('ul').prepend('<li class="hdlContinent"><h1>' + _headline + '</h1></li>');
			});

			this.initHeadlineWidth();

			_listWidth = this._maxWidth + 200 + 32;

			if ($('body').attr('data-viewport') === "mediumViewport") {
				_listWidth = '100%';
			}

			// set width of <div>
			$element.children('div').css({
				'width': _listWidth,
				'float': 'left'
			});

			$element.css({
				'width': _listWidth * 2
			});

			// indent countries
			$('li[data-continent]').css({
				'width': _listWidth - this._maxWidth - 32,
				'marginLeft': this._maxWidth + 16
			});

			if ($module.hasClass('threeCols')) {
				$element.css({
					'width': _listWidth * 3
					// , 'margin': '0 auto'
				});
			}
		},

		onBroadcastWindowResize: function() {
			this.setCols();
		},
		
		trackLanguage: function(e) {
			var $elem = $(e.currentTarget);			
			var href = $elem.attr( 'href' );
			var language='';
			if (href.length > 0) {
				var parts=href.split( '/' );
				if (parts.length > 0) {
					for (i=0; i < parts.length; i++) {
						if ('portal' == parts[i] && (i+1)<=parts.length) {
							language = parts[i+1];
						}
					}
				}				
			}
			
			this.gtmPush({'language':language,							
							'event':'languageSwitch'});
		}
	} );
} )( jQuery );