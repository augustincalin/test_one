/*!*
 * project: digitalstrategie / one
 * release: trunk
 * build-date: 22.06.2017 / 15:47
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
( function( $ ) {
	$.widget( 'mrm.infoBox', {

		options: {
			my: 'left top',
			at: 'left bottom',
			collision: 'flip'
		},

		_isOpen: false,

		_create: function() {
			var that = this;
			this.$trigger = this.options.trigger ? this.element.find( this.options.trigger ) : this.element;
			this.$target = this.options.target ? this.element.find( this.options.target ) : $( this.element.attr( 'href' ) );

			// touchend event handler allows closing of flyout
			// when tapping on button while flyout is opened
			this.$trigger.on( 'click touchend', $.proxy( this._toggleMenu, this ) );

			// this.$target.append('<span class="close">x</close>');
			this.$target.find( '.close' ).on( 'click', function() {
				that.close();
			} );
		},

		_toggleMenu: function( event ) {
			if( event ) {
				event.stopPropagation();
				event.preventDefault();
			}

			if( this._isOpen ) {
				this.close();
			} else {
				this.open();
			}
		},

		open: function() {

			// close all open info boxes (#542)
			$('body > .info-box-msg').addClass('oldBox');
			$('.oldBox .close').trigger('click');

			this.$targetClone = this.$target.clone().removeAttr( 'id' ).appendTo( 'body' );

			// do not close flyout, when clicking on flyout itself
			this.$targetClone.find( '> div' ).on( 'click touchend', function( event ) {
				event.stopPropagation();
			} );

			this._setPosition();

			this.$targetClone.fadeIn( function() {

				/* IMPORTANT: class "open" (or at least any class) must be added to trigger reflow in IE */
				$( this ).focus().addClass( 'open' );
			} );
			this.$trigger.addClass( 'ui-state-opened' );

			this._isOpen = true;
			this._trigger( 'open' );
		},

		close: function() {

			if( this._isOpen ) {
				this.$trigger.removeClass( 'ui-state-opened' );
				this.$targetClone.fadeOut( 'fast', function() {
					$( this ).remove();
				} );

				this._isOpen = false;
				this._trigger( 'close' );
			}
		},

		update: function() {
			if( !this._isOpen ) {
				return;
			}

			this._setPosition();
		},

		_setPosition: function() {

			this.$targetClone.position( {
				my: this.options.my,
				at: this.options.at,
				of: this.$trigger,
				collision: this.options.collision,
				using: function( coords, feedback ) {
					$( this )
						.css( {
							left: coords.left + 'px',
							top: coords.top + 'px'
						} )
						.removeClass( function( index, css ) {
							return( css.match( /\btt-p-\w+/g ) || [] ).join( ' ' );
						} )
						.addClass( 'tt-p-' + feedback.vertical )
						.addClass( 'tt-p-' + feedback.horizontal );
				}
			} );
		}
	} );
} )( jQuery );;
/*! http://mths.be/placeholder v2.0.7 by @mathias */
;(function(window, document, $) {

	var isInputSupported = 'placeholder' in document.createElement('input');
	var isTextareaSupported = 'placeholder' in document.createElement('textarea');
	var prototype = $.fn;
	var valHooks = $.valHooks;
	var propHooks = $.propHooks;
	var hooks;
	var placeholder;

	if (isInputSupported && isTextareaSupported) {

		placeholder = prototype.placeholder = function() {
			return this;
		};

		placeholder.input = placeholder.textarea = true;

	} else {

		placeholder = prototype.placeholder = function() {
			var $this = this;
			$this
				.filter((isInputSupported ? 'textarea' : ':input') + '[placeholder]')
				.not('.placeholder')
				.bind({
					'focus.placeholder': clearPlaceholder,
					'blur.placeholder': setPlaceholder
				})
				.data('placeholder-enabled', true)
				.trigger('blur.placeholder');
			return $this;
		};

		placeholder.input = isInputSupported;
		placeholder.textarea = isTextareaSupported;

		hooks = {
			'get': function(element) {
				var $element = $(element);

				var $passwordInput = $element.data('placeholder-password');
				if ($passwordInput) {
					return $passwordInput[0].value;
				}

				return $element.data('placeholder-enabled') && $element.hasClass('placeholder') ? '' : element.value;
			},
			'set': function(element, value) {
				var $element = $(element);

				var $passwordInput = $element.data('placeholder-password');
				if ($passwordInput) {
					return $passwordInput[0].value = value;
				}

				if (!$element.data('placeholder-enabled')) {
					return element.value = value;
				}
				if (value == '') {
					element.value = value;
					// Issue #56: Setting the placeholder causes problems if the element continues to have focus.
					if (element != document.activeElement) {
						// We can't use `triggerHandler` here because of dummy text/password inputs :(
						setPlaceholder.call(element);
					}
				} else if ($element.hasClass('placeholder')) {
					clearPlaceholder.call(element, true, value) || (element.value = value);
				} else {
					element.value = value;
				}
				// `set` can not return `undefined`; see http://jsapi.info/jquery/1.7.1/val#L2363
				return $element;
			}
		};

		if (!isInputSupported) {
			valHooks.input = hooks;
			propHooks.value = hooks;
		}
		if (!isTextareaSupported) {
			valHooks.textarea = hooks;
			propHooks.value = hooks;
		}

		$(function() {
			// Look for forms
			$(document).delegate('form', 'submit.placeholder', function() {
				// Clear the placeholder values so they don't get submitted
				var $inputs = $('.placeholder', this).each(clearPlaceholder);
				setTimeout(function() {
					$inputs.each(setPlaceholder);
				}, 10);
			});
		});

		// Clear placeholder values upon page reload
		$(window).bind('beforeunload.placeholder', function() {
			$('.placeholder').each(function() {
				this.value = '';
			});
		});

	}

	function args(elem) {
		// Return an object of element attributes
		var newAttrs = {};
		var rinlinejQuery = /^jQuery\d+$/;
		$.each(elem.attributes, function(i, attr) {
			if (attr.specified && !rinlinejQuery.test(attr.name)) {
				newAttrs[attr.name] = attr.value;
			}
		});
		return newAttrs;
	}

	function clearPlaceholder(event, value) {
		var input = this;
		var $input = $(input);
		if (input.value == $input.attr('placeholder') && $input.hasClass('placeholder')) {
			if ($input.data('placeholder-password')) {
				$input = $input.hide().next().show().attr('id', $input.removeAttr('id').data('placeholder-id'));
				// If `clearPlaceholder` was called from `$.valHooks.input.set`
				if (event === true) {
					return $input[0].value = value;
				}
				$input.focus();
			} else {
				input.value = '';
				$input.removeClass('placeholder');
				input == document.activeElement && input.select();
			}
		}
	}

	function setPlaceholder() {
		var $replacement;
		var input = this;
		var $input = $(input);
		var id = this.id;
		if (input.value == '') {
			if (input.type == 'password') {
				if (!$input.data('placeholder-textinput')) {
					try {
						$replacement = $input.clone().attr({ 'type': 'text' });
					} catch(e) {
						$replacement = $('<input>').attr($.extend(args(this), { 'type': 'text' }));
					}
					$replacement
						.removeAttr('name')
						.data({
							'placeholder-password': $input,
							'placeholder-id': id
						})
						.bind('focus.placeholder', clearPlaceholder);
					$input
						.data({
							'placeholder-textinput': $replacement,
							'placeholder-id': id
						})
						.before($replacement);
				}
				$input = $input.removeAttr('id').hide().prev().attr('id', id).show();
				// Note: `$input[0] != input` now!
			}
			$input.addClass('placeholder');
			$input[0].value = $input.attr('placeholder');
		} else {
			$input.removeClass('placeholder');
		}
	}

}(this, document, jQuery));
;
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
          this.$element.trigger('focus')
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



/* ========================================================================
 * Bootstrap-select v1.12.2 (http://silviomoreto.github.io/bootstrap-select)
 *
 * Copyright 2013-2017 bootstrap-select
 * Licensed under MIT (https://github.com/silviomoreto/bootstrap-select/blob/master/LICENSE)
 * ======================================================================== */

(function ($) {
  'use strict';

  //<editor-fold desc="Shims">
  if (!String.prototype.includes) {
    (function () {
      'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
      var toString = {}.toString;
      var defineProperty = (function () {
        // IE 8 only supports `Object.defineProperty` on DOM elements
        try {
          var object = {};
          var $defineProperty = Object.defineProperty;
          var result = $defineProperty(object, object, object) && $defineProperty;
        } catch (error) {
        }
        return result;
      }());
      var indexOf = ''.indexOf;
      var includes = function (search) {
        if (this == null) {
          throw new TypeError();
        }
        var string = String(this);
        if (search && toString.call(search) == '[object RegExp]') {
          throw new TypeError();
        }
        var stringLength = string.length;
        var searchString = String(search);
        var searchLength = searchString.length;
        var position = arguments.length > 1 ? arguments[1] : undefined;
        // `ToInteger`
        var pos = position ? Number(position) : 0;
        if (pos != pos) { // better `isNaN`
          pos = 0;
        }
        var start = Math.min(Math.max(pos, 0), stringLength);
        // Avoid the `indexOf` call if no match is possible
        if (searchLength + start > stringLength) {
          return false;
        }
        return indexOf.call(string, searchString, pos) != -1;
      };
      if (defineProperty) {
        defineProperty(String.prototype, 'includes', {
          'value': includes,
          'configurable': true,
          'writable': true
        });
      } else {
        String.prototype.includes = includes;
      }
    }());
  }

  if (!String.prototype.startsWith) {
    (function () {
      'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
      var defineProperty = (function () {
        // IE 8 only supports `Object.defineProperty` on DOM elements
        try {
          var object = {};
          var $defineProperty = Object.defineProperty;
          var result = $defineProperty(object, object, object) && $defineProperty;
        } catch (error) {
        }
        return result;
      }());
      var toString = {}.toString;
      var startsWith = function (search) {
        if (this == null) {
          throw new TypeError();
        }
        var string = String(this);
        if (search && toString.call(search) == '[object RegExp]') {
          throw new TypeError();
        }
        var stringLength = string.length;
        var searchString = String(search);
        var searchLength = searchString.length;
        var position = arguments.length > 1 ? arguments[1] : undefined;
        // `ToInteger`
        var pos = position ? Number(position) : 0;
        if (pos != pos) { // better `isNaN`
          pos = 0;
        }
        var start = Math.min(Math.max(pos, 0), stringLength);
        // Avoid the `indexOf` call if no match is possible
        if (searchLength + start > stringLength) {
          return false;
        }
        var index = -1;
        while (++index < searchLength) {
          if (string.charCodeAt(start + index) != searchString.charCodeAt(index)) {
            return false;
          }
        }
        return true;
      };
      if (defineProperty) {
        defineProperty(String.prototype, 'startsWith', {
          'value': startsWith,
          'configurable': true,
          'writable': true
        });
      } else {
        String.prototype.startsWith = startsWith;
      }
    }());
  }

  if (!Object.keys) {
    Object.keys = function (
      o, // object
      k, // key
      r  // result array
      ){
      // initialize object and result
      r=[];
      // iterate over object keys
      for (k in o)
          // fill result array with non-prototypical keys
        r.hasOwnProperty.call(o, k) && r.push(k);
      // return result
      return r;
    };
  }

  // set data-selected on select element if the value has been programmatically selected
  // prior to initialization of bootstrap-select
  // * consider removing or replacing an alternative method *
  var valHooks = {
    useDefault: false,
    _set: $.valHooks.select.set
  };

  $.valHooks.select.set = function(elem, value) {
    if (value && !valHooks.useDefault) $(elem).data('selected', true);

    return valHooks._set.apply(this, arguments);
  };

  var changed_arguments = null;
  $.fn.triggerNative = function (eventName) {
    var el = this[0],
        event;

    if (el.dispatchEvent) { // for modern browsers & IE9+
      if (typeof Event === 'function') {
        // For modern browsers
        event = new Event(eventName, {
          bubbles: true
        });
      } else {
        // For IE since it doesn't support Event constructor
        event = document.createEvent('Event');
        event.initEvent(eventName, true, false);
      }

      el.dispatchEvent(event);
    } else if (el.fireEvent) { // for IE8
      event = document.createEventObject();
      event.eventType = eventName;
      el.fireEvent('on' + eventName, event);
    } else {
      // fall back to jQuery.trigger
      this.trigger(eventName);
    }
  };
  //</editor-fold>

  // Case insensitive contains search
  $.expr.pseudos.icontains = function (obj, index, meta) {
    var $obj = $(obj);
    var haystack = ($obj.data('tokens') || $obj.text()).toString().toUpperCase();
    return haystack.includes(meta[3].toUpperCase());
  };

  // Case insensitive begins search
  $.expr.pseudos.ibegins = function (obj, index, meta) {
    var $obj = $(obj);
    var haystack = ($obj.data('tokens') || $obj.text()).toString().toUpperCase();
    return haystack.startsWith(meta[3].toUpperCase());
  };

  // Case and accent insensitive contains search
  $.expr.pseudos.aicontains = function (obj, index, meta) {
    var $obj = $(obj);
    var haystack = ($obj.data('tokens') || $obj.data('normalizedText') || $obj.text()).toString().toUpperCase();
    return haystack.includes(meta[3].toUpperCase());
  };

  // Case and accent insensitive begins search
  $.expr.pseudos.aibegins = function (obj, index, meta) {
    var $obj = $(obj);
    var haystack = ($obj.data('tokens') || $obj.data('normalizedText') || $obj.text()).toString().toUpperCase();
    return haystack.startsWith(meta[3].toUpperCase());
  };

  /**
   * Remove all diatrics from the given text.
   * @access private
   * @param {String} text
   * @returns {String}
   */
  function normalizeToBase(text) {
    var rExps = [
      {re: /[\xC0-\xC6]/g, ch: "A"},
      {re: /[\xE0-\xE6]/g, ch: "a"},
      {re: /[\xC8-\xCB]/g, ch: "E"},
      {re: /[\xE8-\xEB]/g, ch: "e"},
      {re: /[\xCC-\xCF]/g, ch: "I"},
      {re: /[\xEC-\xEF]/g, ch: "i"},
      {re: /[\xD2-\xD6]/g, ch: "O"},
      {re: /[\xF2-\xF6]/g, ch: "o"},
      {re: /[\xD9-\xDC]/g, ch: "U"},
      {re: /[\xF9-\xFC]/g, ch: "u"},
      {re: /[\xC7-\xE7]/g, ch: "c"},
      {re: /[\xD1]/g, ch: "N"},
      {re: /[\xF1]/g, ch: "n"}
    ];
    $.each(rExps, function () {
      text = text ? text.replace(this.re, this.ch) : '';
    });
    return text;
  }


  // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  
  var unescapeMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x60;': '`'
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped.
    var source = '(?:' + Object.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };

  var htmlEscape = createEscaper(escapeMap);
  var htmlUnescape = createEscaper(unescapeMap);

  var Selectpicker = function (element, options) {
    // bootstrap-select has been initialized - revert valHooks.select.set back to its original function
    if (!valHooks.useDefault) {
      $.valHooks.select.set = valHooks._set;
      valHooks.useDefault = true;
    }

    this.$element = $(element);
    this.$newElement = null;
    this.$button = null;
    this.$menu = null;
    this.$lis = null;
    this.options = options;

    // If we have no title yet, try to pull it from the html title attribute (jQuery doesnt' pick it up as it's not a
    // data-attribute)
    if (this.options.title === null) {
      this.options.title = this.$element.attr('title');
    }

    // Format window padding
    var winPad = this.options.windowPadding;
    if (typeof winPad === 'number') {
      this.options.windowPadding = [winPad, winPad, winPad, winPad];
    }

    //Expose public methods
    this.val = Selectpicker.prototype.val;
    this.render = Selectpicker.prototype.render;
    this.refresh = Selectpicker.prototype.refresh;
    this.setStyle = Selectpicker.prototype.setStyle;
    this.selectAll = Selectpicker.prototype.selectAll;
    this.deselectAll = Selectpicker.prototype.deselectAll;
    this.destroy = Selectpicker.prototype.destroy;
    this.remove = Selectpicker.prototype.remove;
    this.show = Selectpicker.prototype.show;
    this.hide = Selectpicker.prototype.hide;

    this.init();
  };

  Selectpicker.VERSION = '1.12.2';

  // part of this is duplicated in i18n/defaults-en_US.js. Make sure to update both.
  Selectpicker.DEFAULTS = {
    noneSelectedText: 'Nothing selected',
    noneResultsText: 'No results matched {0}',
    countSelectedText: function (numSelected, numTotal) {
      return (numSelected == 1) ? "{0} item selected" : "{0} items selected";
    },
    maxOptionsText: function (numAll, numGroup) {
      return [
        (numAll == 1) ? 'Limit reached ({n} item max)' : 'Limit reached ({n} items max)',
        (numGroup == 1) ? 'Group limit reached ({n} item max)' : 'Group limit reached ({n} items max)'
      ];
    },
    selectAllText: 'Select All',
    deselectAllText: 'Deselect All',
    doneButton: false,
    doneButtonText: 'Close',
    multipleSeparator: ', ',
    styleBase: 'btn',
    style: 'btn-default',
    size: 'auto',
    title: null,
    selectedTextFormat: 'values',
    width: false,
    container: false,
    hideDisabled: false,
    showSubtext: false,
    showIcon: true,
    showContent: true,
    dropupAuto: true,
    header: false,
    liveSearch: false,
    liveSearchPlaceholder: null,
    liveSearchNormalize: false,
    liveSearchStyle: 'contains',
    actionsBox: false,
    iconBase: 'glyphicon',
    tickIcon: 'glyphicon-ok',
    showTick: false,
    template: {
      caret: '<span class="caret"></span>'
    },
    maxOptions: false,
    mobile: false,
    selectOnTab: false,
    dropdownAlignRight: false,
    windowPadding: 0
  };

  Selectpicker.prototype = {

    constructor: Selectpicker,

    init: function () {
      var that = this,
          id = this.$element.attr('id');

      this.$element.addClass('bs-select-hidden');

      // store originalIndex (key) and newIndex (value) in this.liObj for fast accessibility
      // allows us to do this.$lis.eq(that.liObj[index]) instead of this.$lis.filter('[data-original-index="' + index + '"]')
      this.liObj = {};
      this.multiple = this.$element.prop('multiple');
      this.autofocus = this.$element.prop('autofocus');
      this.$newElement = this.createView();
      this.$element
        .after(this.$newElement)
        .appendTo(this.$newElement);
      this.$button = this.$newElement.children('button');
      this.$menu = this.$newElement.children('.dropdown-menu');
      this.$menuInner = this.$menu.children('.inner');
      this.$searchbox = this.$menu.find('input');

      this.$element.removeClass('bs-select-hidden');

      if (this.options.dropdownAlignRight === true) this.$menu.addClass('dropdown-menu-right');

      if (typeof id !== 'undefined') {
        this.$button.attr('data-id', id);
        $('label[for="' + id + '"]').click(function (e) {
          e.preventDefault();
          that.$button.focus();
        });
      }

      this.checkDisabled();
      this.clickListener();
      if (this.options.liveSearch) this.liveSearchListener();
      this.render();
      this.setStyle();
      this.setWidth();
      if (this.options.container) this.selectPosition();
      this.$menu.data('this', this);
      this.$newElement.data('this', this);
      if (this.options.mobile) this.mobile();

      this.$newElement.on({
        'hide.bs.dropdown': function (e) {
          that.$menuInner.attr('aria-expanded', false);
          that.$element.trigger('hide.bs.select', e);
        },
        'hidden.bs.dropdown': function (e) {
          that.$element.trigger('hidden.bs.select', e);
        },
        'show.bs.dropdown': function (e) {
          that.$menuInner.attr('aria-expanded', true);
          that.$element.trigger('show.bs.select', e);
        },
        'shown.bs.dropdown': function (e) {
          that.$element.trigger('shown.bs.select', e);
        }
      });

      if (that.$element[0].hasAttribute('required')) {
        this.$element.on('invalid', function () {
          that.$button
            .addClass('bs-invalid')
            .focus();

          that.$element.on({
            'focus.bs.select': function () {
              that.$button.focus();
              that.$element.off('focus.bs.select');
            },
            'shown.bs.select': function () {
              that.$element
                .val(that.$element.val()) // set the value to hide the validation message in Chrome when menu is opened
                .off('shown.bs.select');
            },
            'rendered.bs.select': function () {
              // if select is no longer invalid, remove the bs-invalid class
              if (this.validity.valid) that.$button.removeClass('bs-invalid');
              that.$element.off('rendered.bs.select');
            }
          });
        });
      }

      setTimeout(function () {
        that.$element.trigger('loaded.bs.select');
      });
    },

    createDropdown: function () {
      // Options
      // If we are multiple or showTick option is set, then add the show-tick class
      var showTick = (this.multiple || this.options.showTick) ? ' show-tick' : '',
          inputGroup = this.$element.parent().hasClass('input-group') ? ' input-group-btn' : '',
          autofocus = this.autofocus ? ' autofocus' : '';
      // Elements
      var header = this.options.header ? '<div class="popover-title"><button type="button" class="close" aria-hidden="true">&times;</button>' + this.options.header + '</div>' : '';
      var searchbox = this.options.liveSearch ?
      '<div class="bs-searchbox">' +
      '<input type="text" class="form-control" autocomplete="off"' +
      (null === this.options.liveSearchPlaceholder ? '' : ' placeholder="' + htmlEscape(this.options.liveSearchPlaceholder) + '"') + ' role="textbox" aria-label="Search">' +
      '</div>'
          : '';
      var actionsbox = this.multiple && this.options.actionsBox ?
      '<div class="bs-actionsbox">' +
      '<div class="btn-group btn-group-sm btn-block">' +
      '<button type="button" class="actions-btn bs-select-all btn btn-default">' +
      this.options.selectAllText +
      '</button>' +
      '<button type="button" class="actions-btn bs-deselect-all btn btn-default">' +
      this.options.deselectAllText +
      '</button>' +
      '</div>' +
      '</div>'
          : '';
      var donebutton = this.multiple && this.options.doneButton ?
      '<div class="bs-donebutton">' +
      '<div class="btn-group btn-block">' +
      '<button type="button" class="btn btn-sm btn-default">' +
      this.options.doneButtonText +
      '</button>' +
      '</div>' +
      '</div>'
          : '';
      var drop =
          '<div class="btn-group bootstrap-select' + showTick + inputGroup + '">' +
          '<button type="button" class="' + this.options.styleBase + ' dropdown-toggle" data-toggle="dropdown"' + autofocus + ' role="button">' +
          '<span class="filter-option pull-left"></span>&nbsp;' +
          '<span class="bs-caret">' +
          this.options.template.caret +
          '</span>' +
          '</button>' +
          '<div class="dropdown-menu open" role="combobox">' +
          header +
          searchbox +
          actionsbox +
          '<ul class="dropdown-menu inner" role="listbox" aria-expanded="false">' +
          '</ul>' +
          donebutton +
          '</div>' +
          '</div>';

      return $(drop);
    },

    createView: function () {
      var $drop = this.createDropdown(),
          li = this.createLi();

      $drop.find('ul')[0].innerHTML = li;
      return $drop;
    },

    reloadLi: function () {
      // rebuild
      var li = this.createLi();
      this.$menuInner[0].innerHTML = li;
    },

    createLi: function () {
      var that = this,
          _li = [],
          optID = 0,
          titleOption = document.createElement('option'),
          liIndex = -1; // increment liIndex whenever a new <li> element is created to ensure liObj is correct

      // Helper functions
      /**
       * @param content
       * @param [index]
       * @param [classes]
       * @param [optgroup]
       * @returns {string}
       */
      var generateLI = function (content, index, classes, optgroup) {
        return '<li' +
            ((typeof classes !== 'undefined' & '' !== classes) ? ' class="' + classes + '"' : '') +
            ((typeof index !== 'undefined' & null !== index) ? ' data-original-index="' + index + '"' : '') +
            ((typeof optgroup !== 'undefined' & null !== optgroup) ? 'data-optgroup="' + optgroup + '"' : '') +
            '>' + content + '</li>';
      };

      /**
       * @param text
       * @param [classes]
       * @param [inline]
       * @param [tokens]
       * @returns {string}
       */
      var generateA = function (text, classes, inline, tokens) {
        return '<a tabindex="0"' +
            (typeof classes !== 'undefined' ? ' class="' + classes + '"' : '') +
            (inline ? ' style="' + inline + '"' : '') +
            (that.options.liveSearchNormalize ? ' data-normalized-text="' + normalizeToBase(htmlEscape($(text).html())) + '"' : '') +
            (typeof tokens !== 'undefined' || tokens !== null ? ' data-tokens="' + tokens + '"' : '') +
            ' role="option">' + text +
            '<span class="' + that.options.iconBase + ' ' + that.options.tickIcon + ' check-mark"></span>' +
            '</a>';
      };

      if (this.options.title && !this.multiple) {
        // this option doesn't create a new <li> element, but does add a new option, so liIndex is decreased
        // since liObj is recalculated on every refresh, liIndex needs to be decreased even if the titleOption is already appended
        liIndex--;

        if (!this.$element.find('.bs-title-option').length) {
          // Use native JS to prepend option (faster)
          var element = this.$element[0];
          titleOption.className = 'bs-title-option';
          titleOption.innerHTML = this.options.title;
          titleOption.value = '';
          element.insertBefore(titleOption, element.firstChild);
          // Check if selected or data-selected attribute is already set on an option. If not, select the titleOption option.
          // the selected item may have been changed by user or programmatically before the bootstrap select plugin runs,
          // if so, the select will have the data-selected attribute
          var $opt = $(element.options[element.selectedIndex]);
          if ($opt.attr('selected') === undefined && this.$element.data('selected') === undefined) {
            titleOption.selected = true;
          }
        }
      }

      this.$element.find('option').each(function (index) {
        var $this = $(this);

        liIndex++;

        if ($this.hasClass('bs-title-option')) return;

        // Get the class and text for the option
        var optionClass = this.className || '',
            inline = this.style.cssText,
            text = $this.data('content') ? $this.data('content') : $this.html(),
            tokens = $this.data('tokens') ? $this.data('tokens') : null,
            subtext = typeof $this.data('subtext') !== 'undefined' ? '<small class="text-muted">' + $this.data('subtext') + '</small>' : '',
            icon = typeof $this.data('icon') !== 'undefined' ? '<span class="' + that.options.iconBase + ' ' + $this.data('icon') + '"></span> ' : '',
            $parent = $this.parent(),
            isOptgroup = $parent[0].tagName === 'OPTGROUP',
            isOptgroupDisabled = isOptgroup && $parent[0].disabled,
            isDisabled = this.disabled || isOptgroupDisabled;

        if (icon !== '' && isDisabled) {
          icon = '<span>' + icon + '</span>';
        }

        if (that.options.hideDisabled && (isDisabled && !isOptgroup || isOptgroupDisabled)) {
          liIndex--;
          return;
        }

        if (!$this.data('content')) {
          // Prepend any icon and append any subtext to the main text.
          text = icon + '<span class="text">' + text + subtext + '</span>';
        }

        if (isOptgroup && $this.data('divider') !== true) {
          if (that.options.hideDisabled && isDisabled) {
            if ($parent.data('allOptionsDisabled') === undefined) {
              var $options = $parent.children();
              $parent.data('allOptionsDisabled', $options.filter(':disabled').length === $options.length);
            }

            if ($parent.data('allOptionsDisabled')) {
              liIndex--;
              return;
            }
          }

          var optGroupClass = ' ' + $parent[0].className || '';

          if ($this.index() === 0) { // Is it the first option of the optgroup?
            optID += 1;

            // Get the opt group label
            var label = $parent[0].label,
                labelSubtext = typeof $parent.data('subtext') !== 'undefined' ? '<small class="text-muted">' + $parent.data('subtext') + '</small>' : '',
                labelIcon = $parent.data('icon') ? '<span class="' + that.options.iconBase + ' ' + $parent.data('icon') + '"></span> ' : '';

            label = labelIcon + '<span class="text">' + htmlEscape(label) + labelSubtext + '</span>';

            if (index !== 0 && _li.length > 0) { // Is it NOT the first option of the select && are there elements in the dropdown?
              liIndex++;
              _li.push(generateLI('', null, 'divider', optID + 'div'));
            }
            liIndex++;
            _li.push(generateLI(label, null, 'dropdown-header' + optGroupClass, optID));
          }

          if (that.options.hideDisabled && isDisabled) {
            liIndex--;
            return;
          }

          _li.push(generateLI(generateA(text, 'opt ' + optionClass + optGroupClass, inline, tokens), index, '', optID));
        } else if ($this.data('divider') === true) {
          _li.push(generateLI('', index, 'divider'));
        } else if ($this.data('hidden') === true) {
          _li.push(generateLI(generateA(text, optionClass, inline, tokens), index, 'hidden is-hidden'));
        } else {
          var showDivider = this.previousElementSibling && this.previousElementSibling.tagName === 'OPTGROUP';

          // if previous element is not an optgroup and hideDisabled is true
          if (!showDivider && that.options.hideDisabled) {
            // get previous elements
            var $prev = $(this).prevAll();

            for (var i = 0; i < $prev.length; i++) {
              // find the first element in the previous elements that is an optgroup
              if ($prev[i].tagName === 'OPTGROUP') {
                var optGroupDistance = 0;

                // loop through the options in between the current option and the optgroup
                // and check if they are hidden or disabled
                for (var d = 0; d < i; d++) {
                  var prevOption = $prev[d];
                  if (prevOption.disabled || $(prevOption).data('hidden') === true) optGroupDistance++;
                }

                // if all of the options between the current option and the optgroup are hidden or disabled, show the divider
                if (optGroupDistance === i) showDivider = true;

                break;
              }
            }
          }

          if (showDivider) {
            liIndex++;
            _li.push(generateLI('', null, 'divider', optID + 'div'));
          }
          _li.push(generateLI(generateA(text, optionClass, inline, tokens), index));
        }

        that.liObj[index] = liIndex;
      });

      //If we are not multiple, we don't have a selected item, and we don't have a title, select the first element so something is set in the button
      if (!this.multiple && this.$element.find('option:selected').length === 0 && !this.options.title) {
        this.$element.find('option').eq(0).prop('selected', true).attr('selected', 'selected');
      }

      return _li.join('');
    },

    findLis: function () {
      if (this.$lis == null) this.$lis = this.$menu.find('li');
      return this.$lis;
    },

    /**
     * @param [updateLi] defaults to true
     */
    render: function (updateLi) {
      var that = this,
          notDisabled;

      //Update the LI to match the SELECT
      if (updateLi !== false) {
        this.$element.find('option').each(function (index) {
          var $lis = that.findLis().eq(that.liObj[index]);

          that.setDisabled(index, this.disabled || this.parentNode.tagName === 'OPTGROUP' && this.parentNode.disabled, $lis);
          that.setSelected(index, this.selected, $lis);
        });
      }

      this.togglePlaceholder();

      this.tabIndex();

      var selectedItems = this.$element.find('option').map(function () {
        if (this.selected) {
          if (that.options.hideDisabled && (this.disabled || this.parentNode.tagName === 'OPTGROUP' && this.parentNode.disabled)) return;

          var $this = $(this),
              icon = $this.data('icon') && that.options.showIcon ? '<i class="' + that.options.iconBase + ' ' + $this.data('icon') + '"></i> ' : '',
              subtext;

          if (that.options.showSubtext && $this.data('subtext') && !that.multiple) {
            subtext = ' <small class="text-muted">' + $this.data('subtext') + '</small>';
          } else {
            subtext = '';
          }
          if (typeof $this.attr('title') !== 'undefined') {
            return $this.attr('title');
          } else if ($this.data('content') && that.options.showContent) {
            return $this.data('content').toString();
          } else {
            return icon + $this.html() + subtext;
          }
        }
      }).toArray();

      //Fixes issue in IE10 occurring when no default option is selected and at least one option is disabled
      //Convert all the values into a comma delimited string
      var title = !this.multiple ? selectedItems[0] : selectedItems.join(this.options.multipleSeparator);

      //If this is multi select, and the selectText type is count, the show 1 of 2 selected etc..
      if (this.multiple && this.options.selectedTextFormat.indexOf('count') > -1) {
        var max = this.options.selectedTextFormat.split('>');
        if ((max.length > 1 && selectedItems.length > max[1]) || (max.length == 1 && selectedItems.length >= 2)) {
          notDisabled = this.options.hideDisabled ? ', [disabled]' : '';
          var totalCount = this.$element.find('option').not('[data-divider="true"], [data-hidden="true"]' + notDisabled).length,
              tr8nText = (typeof this.options.countSelectedText === 'function') ? this.options.countSelectedText(selectedItems.length, totalCount) : this.options.countSelectedText;
          title = tr8nText.replace('{0}', selectedItems.length.toString()).replace('{1}', totalCount.toString());
        }
      }

      if (this.options.title == undefined) {
        this.options.title = this.$element.attr('title');
      }

      if (this.options.selectedTextFormat == 'static') {
        title = this.options.title;
      }

      //If we dont have a title, then use the default, or if nothing is set at all, use the not selected text
      if (!title) {
        title = typeof this.options.title !== 'undefined' ? this.options.title : this.options.noneSelectedText;
      }

      //strip all HTML tags and trim the result, then unescape any escaped tags
      this.$button.attr('title', htmlUnescape($.trim(title.replace(/<[^>]*>?/g, ''))));
      this.$button.children('.filter-option').html(title);

      this.$element.trigger('rendered.bs.select');
    },

    /**
     * @param [style]
     * @param [status]
     */
    setStyle: function (style, status) {
      if (this.$element.attr('class')) {
        this.$newElement.addClass(this.$element.attr('class').replace(/selectpicker|mobile-device|bs-select-hidden|validate\[.*\]/gi, ''));
      }

      var buttonClass = style ? style : this.options.style;

      if (status == 'add') {
        this.$button.addClass(buttonClass);
      } else if (status == 'remove') {
        this.$button.removeClass(buttonClass);
      } else {
        this.$button.removeClass(this.options.style);
        this.$button.addClass(buttonClass);
      }
    },

    liHeight: function (refresh) {
      if (!refresh && (this.options.size === false || this.sizeInfo)) return;

      var newElement = document.createElement('div'),
          menu = document.createElement('div'),
          menuInner = document.createElement('ul'),
          divider = document.createElement('li'),
          li = document.createElement('li'),
          a = document.createElement('a'),
          text = document.createElement('span'),
          header = this.options.header && this.$menu.find('.popover-title').length > 0 ? this.$menu.find('.popover-title')[0].cloneNode(true) : null,
          search = this.options.liveSearch ? document.createElement('div') : null,
          actions = this.options.actionsBox && this.multiple && this.$menu.find('.bs-actionsbox').length > 0 ? this.$menu.find('.bs-actionsbox')[0].cloneNode(true) : null,
          doneButton = this.options.doneButton && this.multiple && this.$menu.find('.bs-donebutton').length > 0 ? this.$menu.find('.bs-donebutton')[0].cloneNode(true) : null;

      text.className = 'text';
      newElement.className = this.$menu[0].parentNode.className + ' open';
      menu.className = 'dropdown-menu open';
      menuInner.className = 'dropdown-menu inner';
      divider.className = 'divider';

      text.appendChild(document.createTextNode('Inner text'));
      a.appendChild(text);
      li.appendChild(a);
      menuInner.appendChild(li);
      menuInner.appendChild(divider);
      if (header) menu.appendChild(header);
      if (search) {
        var input = document.createElement('input');
        search.className = 'bs-searchbox';
        input.className = 'form-control';
        search.appendChild(input);
        menu.appendChild(search);
      }
      if (actions) menu.appendChild(actions);
      menu.appendChild(menuInner);
      if (doneButton) menu.appendChild(doneButton);
      newElement.appendChild(menu);

      document.body.appendChild(newElement);

      var liHeight = a.offsetHeight,
          headerHeight = header ? header.offsetHeight : 0,
          searchHeight = search ? search.offsetHeight : 0,
          actionsHeight = actions ? actions.offsetHeight : 0,
          doneButtonHeight = doneButton ? doneButton.offsetHeight : 0,
          dividerHeight = $(divider).outerHeight(true),
          // fall back to jQuery if getComputedStyle is not supported
          menuStyle = typeof getComputedStyle === 'function' ? getComputedStyle(menu) : false,
          $menu = menuStyle ? null : $(menu),
          menuPadding = {
            vert: parseInt(menuStyle ? menuStyle.paddingTop : $menu.css('paddingTop')) +
                  parseInt(menuStyle ? menuStyle.paddingBottom : $menu.css('paddingBottom')) +
                  parseInt(menuStyle ? menuStyle.borderTopWidth : $menu.css('borderTopWidth')) +
                  parseInt(menuStyle ? menuStyle.borderBottomWidth : $menu.css('borderBottomWidth')),
            horiz: parseInt(menuStyle ? menuStyle.paddingLeft : $menu.css('paddingLeft')) +
                  parseInt(menuStyle ? menuStyle.paddingRight : $menu.css('paddingRight')) +
                  parseInt(menuStyle ? menuStyle.borderLeftWidth : $menu.css('borderLeftWidth')) +
                  parseInt(menuStyle ? menuStyle.borderRightWidth : $menu.css('borderRightWidth'))
          },
          menuExtras =  {
            vert: menuPadding.vert +
                  parseInt(menuStyle ? menuStyle.marginTop : $menu.css('marginTop')) +
                  parseInt(menuStyle ? menuStyle.marginBottom : $menu.css('marginBottom')) + 2,
            horiz: menuPadding.horiz +
                  parseInt(menuStyle ? menuStyle.marginLeft : $menu.css('marginLeft')) +
                  parseInt(menuStyle ? menuStyle.marginRight : $menu.css('marginRight')) + 2
          }

      document.body.removeChild(newElement);

      this.sizeInfo = {
        liHeight: liHeight,
        headerHeight: headerHeight,
        searchHeight: searchHeight,
        actionsHeight: actionsHeight,
        doneButtonHeight: doneButtonHeight,
        dividerHeight: dividerHeight,
        menuPadding: menuPadding,
        menuExtras: menuExtras
      };
    },

    setSize: function () {
      this.findLis();
      this.liHeight();

      if (this.options.header) this.$menu.css('padding-top', 0);
      if (this.options.size === false) return;

      var that = this,
          $menu = this.$menu,
          $menuInner = this.$menuInner,
          $window = $(window),
          selectHeight = this.$newElement[0].offsetHeight,
          selectWidth = this.$newElement[0].offsetWidth,
          liHeight = this.sizeInfo['liHeight'],
          headerHeight = this.sizeInfo['headerHeight'],
          searchHeight = this.sizeInfo['searchHeight'],
          actionsHeight = this.sizeInfo['actionsHeight'],
          doneButtonHeight = this.sizeInfo['doneButtonHeight'],
          divHeight = this.sizeInfo['dividerHeight'],
          menuPadding = this.sizeInfo['menuPadding'],
          menuExtras = this.sizeInfo['menuExtras'],
          notDisabled = this.options.hideDisabled ? '.disabled' : '',
          menuHeight,
          menuWidth,
          getHeight,
          getWidth,
          selectOffsetTop,
          selectOffsetBot,
          selectOffsetLeft,
          selectOffsetRight,
          getPos = function() {
            var pos = that.$newElement.offset(),
                $container = $(that.options.container),
                containerPos;

            if (that.options.container && !$container.is('body')) {
              containerPos = $container.offset();
              containerPos.top += parseInt($container.css('borderTopWidth'));
              containerPos.left += parseInt($container.css('borderLeftWidth'));
            } else {
              containerPos = { top: 0, left: 0 };
            }

            var winPad = that.options.windowPadding;
            selectOffsetTop = pos.top - containerPos.top - $window.scrollTop();
            selectOffsetBot = $window.height() - selectOffsetTop - selectHeight - containerPos.top - winPad[2];
            selectOffsetLeft = pos.left - containerPos.left - $window.scrollLeft();
            selectOffsetRight = $window.width() - selectOffsetLeft - selectWidth - containerPos.left - winPad[1];
            selectOffsetTop -= winPad[0];
            selectOffsetLeft -= winPad[3];
          };

      getPos();

      if (this.options.size === 'auto') {
        var getSize = function () {
          var minHeight,
              hasClass = function (className, include) {
                return function (element) {
                    if (include) {
                        return (element.classList ? element.classList.contains(className) : $(element).hasClass(className));
                    } else {
                        return !(element.classList ? element.classList.contains(className) : $(element).hasClass(className));
                    }
                };
              },
              lis = that.$menuInner[0].getElementsByTagName('li'),
              lisVisible = Array.prototype.filter ? Array.prototype.filter.call(lis, hasClass('hidden', false)) : that.$lis.not('.hidden'),
              optGroup = Array.prototype.filter ? Array.prototype.filter.call(lisVisible, hasClass('dropdown-header', true)) : lisVisible.filter('.dropdown-header');

          getPos();
          menuHeight = selectOffsetBot - menuExtras.vert;
          menuWidth = selectOffsetRight - menuExtras.horiz;

          if (that.options.container) {
            if (!$menu.data('height')) $menu.data('height', $menu.height());
            getHeight = $menu.data('height');

            if (!$menu.data('width')) $menu.data('width', $menu.width());
            getWidth = $menu.data('width');
          } else {
            getHeight = $menu.height();
            getWidth = $menu.width();
          }

          if (that.options.dropupAuto) {
            that.$newElement.toggleClass('dropup', selectOffsetTop > selectOffsetBot && (menuHeight - menuExtras.vert) < getHeight);
          }

          if (that.$newElement.hasClass('dropup')) {
            menuHeight = selectOffsetTop - menuExtras.vert;
          }

          if (that.options.dropdownAlignRight === 'auto') {
            $menu.toggleClass('dropdown-menu-right', selectOffsetLeft > selectOffsetRight && (menuWidth - menuExtras.horiz) < (getWidth - selectWidth));
          }

          if ((lisVisible.length + optGroup.length) > 3) {
            minHeight = liHeight * 3 + menuExtras.vert - 2;
          } else {
            minHeight = 0;
          }

          $menu.css({
            'max-height': menuHeight + 'px',
            'overflow': 'hidden',
            'min-height': minHeight + headerHeight + searchHeight + actionsHeight + doneButtonHeight + 'px'
          });
          $menuInner.css({
            'max-height': menuHeight - headerHeight - searchHeight - actionsHeight - doneButtonHeight - menuPadding.vert + 'px',
            'overflow-y': 'auto',
            'min-height': Math.max(minHeight - menuPadding.vert, 0) + 'px'
          });
        };
        getSize();
        this.$searchbox.off('input.getSize propertychange.getSize').on('input.getSize propertychange.getSize', getSize);
        $window.off('resize.getSize scroll.getSize').on('resize.getSize scroll.getSize', getSize);
      } else if (this.options.size && this.options.size != 'auto' && this.$lis.not(notDisabled).length > this.options.size) {
        var optIndex = this.$lis.not('.divider').not(notDisabled).children().slice(0, this.options.size).last().parent().index(),
            divLength = this.$lis.slice(0, optIndex + 1).filter('.divider').length;
        menuHeight = liHeight * this.options.size + divLength * divHeight + menuPadding.vert;

        if (that.options.container) {
          if (!$menu.data('height')) $menu.data('height', $menu.height());
          getHeight = $menu.data('height');
        } else {
          getHeight = $menu.height();
        }

        if (that.options.dropupAuto) {
          //noinspection JSUnusedAssignment
          this.$newElement.toggleClass('dropup', selectOffsetTop > selectOffsetBot && (menuHeight - menuExtras.vert) < getHeight);
        }
        $menu.css({
          'max-height': menuHeight + headerHeight + searchHeight + actionsHeight + doneButtonHeight + 'px',
          'overflow': 'hidden',
          'min-height': ''
        });
        $menuInner.css({
          'max-height': menuHeight - menuPadding.vert + 'px',
          'overflow-y': 'auto',
          'min-height': ''
        });
      }
    },

    setWidth: function () {
      if (this.options.width === 'auto') {
        this.$menu.css('min-width', '0');

        // Get correct width if element is hidden
        var $selectClone = this.$menu.parent().clone().appendTo('body'),
            $selectClone2 = this.options.container ? this.$newElement.clone().appendTo('body') : $selectClone,
            ulWidth = $selectClone.children('.dropdown-menu').outerWidth(),
            btnWidth = $selectClone2.css('width', 'auto').children('button').outerWidth();

        $selectClone.remove();
        $selectClone2.remove();

        // Set width to whatever's larger, button title or longest option
        this.$newElement.css('width', Math.max(ulWidth, btnWidth) + 'px');
      } else if (this.options.width === 'fit') {
        // Remove inline min-width so width can be changed from 'auto'
        this.$menu.css('min-width', '');
        this.$newElement.css('width', '').addClass('fit-width');
      } else if (this.options.width) {
        // Remove inline min-width so width can be changed from 'auto'
        this.$menu.css('min-width', '');
        this.$newElement.css('width', this.options.width);
      } else {
        // Remove inline min-width/width so width can be changed
        this.$menu.css('min-width', '');
        this.$newElement.css('width', '');
      }
      // Remove fit-width class if width is changed programmatically
      if (this.$newElement.hasClass('fit-width') && this.options.width !== 'fit') {
        this.$newElement.removeClass('fit-width');
      }
    },

    selectPosition: function () {
      this.$bsContainer = $('<div class="bs-container" />');

      var that = this,
          $container = $(this.options.container),
          pos,
          containerPos,
          actualHeight,
          getPlacement = function ($element) {
            that.$bsContainer.addClass($element.attr('class').replace(/form-control|fit-width/gi, '')).toggleClass('dropup', $element.hasClass('dropup'));
            pos = $element.offset();

            if (!$container.is('body')) {
              containerPos = $container.offset();
              containerPos.top += parseInt($container.css('borderTopWidth')) - $container.scrollTop();
              containerPos.left += parseInt($container.css('borderLeftWidth')) - $container.scrollLeft();
            } else {
              containerPos = { top: 0, left: 0 };
            }

            actualHeight = $element.hasClass('dropup') ? 0 : $element[0].offsetHeight;

            that.$bsContainer.css({
              'top': pos.top - containerPos.top + actualHeight,
              'left': pos.left - containerPos.left,
              'width': $element[0].offsetWidth
            });
          };

      this.$button.on('click', function () {
        var $this = $(this);

        if (that.isDisabled()) {
          return;
        }

        getPlacement(that.$newElement);

        that.$bsContainer
          .appendTo(that.options.container)
          .toggleClass('open', !$this.hasClass('open'))
          .append(that.$menu);
      });

      $(window).on('resize scroll', function () {
        getPlacement(that.$newElement);
      });

      this.$element.on('hide.bs.select', function () {
        that.$menu.data('height', that.$menu.height());
        that.$bsContainer.detach();
      });
    },

    /**
     * @param {number} index - the index of the option that is being changed
     * @param {boolean} selected - true if the option is being selected, false if being deselected
     * @param {JQuery} $lis - the 'li' element that is being modified
     */
    setSelected: function (index, selected, $lis) {
      if (!$lis) {
        this.togglePlaceholder(); // check if setSelected is being called by changing the value of the select
        $lis = this.findLis().eq(this.liObj[index]);
      }

      $lis.toggleClass('selected', selected).find('a').attr('aria-selected', selected);
    },

    /**
     * @param {number} index - the index of the option that is being disabled
     * @param {boolean} disabled - true if the option is being disabled, false if being enabled
     * @param {JQuery} $lis - the 'li' element that is being modified
     */
    setDisabled: function (index, disabled, $lis) {
      if (!$lis) {
        $lis = this.findLis().eq(this.liObj[index]);
      }

      if (disabled) {
        $lis.addClass('disabled').children('a').attr('href', '#').attr('tabindex', -1).attr('aria-disabled', true);
      } else {
        $lis.removeClass('disabled').children('a').removeAttr('href').attr('tabindex', 0).attr('aria-disabled', false);
      }
    },

    isDisabled: function () {
      return this.$element[0].disabled;
    },

    checkDisabled: function () {
      var that = this;

      if (this.isDisabled()) {
        this.$newElement.addClass('disabled');
        this.$button.addClass('disabled').attr('tabindex', -1).attr('aria-disabled', true);
      } else {
        if (this.$button.hasClass('disabled')) {
          this.$newElement.removeClass('disabled');
          this.$button.removeClass('disabled').attr('aria-disabled', false);
        }

        if (this.$button.attr('tabindex') == -1 && !this.$element.data('tabindex')) {
          this.$button.removeAttr('tabindex');
        }
      }

      this.$button.click(function () {
        return !that.isDisabled();
      });
    },

    togglePlaceholder: function () {
      var value = this.$element.val();
      this.$button.toggleClass('bs-placeholder', value === null || value === '' || (value.constructor === Array && value.length === 0));
    },

    tabIndex: function () {
      if (this.$element.data('tabindex') !== this.$element.attr('tabindex') && 
        (this.$element.attr('tabindex') !== -98 && this.$element.attr('tabindex') !== '-98')) {
        this.$element.data('tabindex', this.$element.attr('tabindex'));
        this.$button.attr('tabindex', this.$element.data('tabindex'));
      }

      this.$element.attr('tabindex', -98);
    },

    clickListener: function () {
      var that = this,
          $document = $(document);

      $document.data('spaceSelect', false);

      this.$button.on('keyup', function (e) {
        if (/(32)/.test(e.keyCode.toString(10)) && $document.data('spaceSelect')) {
            e.preventDefault();
            $document.data('spaceSelect', false);
        }
      });

      this.$button.on('click', function () {
        that.setSize();
      });

      this.$element.on('shown.bs.select', function () {
        if (!that.options.liveSearch && !that.multiple) {
          that.$menuInner.find('.selected a').focus();
        } else if (!that.multiple) {
          var selectedIndex = that.liObj[that.$element[0].selectedIndex];

          if (typeof selectedIndex !== 'number' || that.options.size === false) return;

          // scroll to selected option
          var offset = that.$lis.eq(selectedIndex)[0].offsetTop - that.$menuInner[0].offsetTop;
          offset = offset - that.$menuInner[0].offsetHeight/2 + that.sizeInfo.liHeight/2;
          that.$menuInner[0].scrollTop = offset;
        }
      });

      this.$menuInner.on('click', 'li a', function (e) {
        var $this = $(this),
            clickedIndex = $this.parent().data('originalIndex'),
            prevValue = that.$element.val(),
            prevIndex = that.$element.prop('selectedIndex'),
            triggerChange = true;

        // Don't close on multi choice menu
        if (that.multiple && that.options.maxOptions !== 1) {
          e.stopPropagation();
        }

        e.preventDefault();

        //Don't run if we have been disabled
        if (!that.isDisabled() && !$this.parent().hasClass('disabled')) {
          var $options = that.$element.find('option'),
              $option = $options.eq(clickedIndex),
              state = $option.prop('selected'),
              $optgroup = $option.parent('optgroup'),
              maxOptions = that.options.maxOptions,
              maxOptionsGrp = $optgroup.data('maxOptions') || false;

          if (!that.multiple) { // Deselect all others if not multi select box
            $options.prop('selected', false);
            $option.prop('selected', true);
            that.$menuInner.find('.selected').removeClass('selected').find('a').attr('aria-selected', false);
            that.setSelected(clickedIndex, true);
          } else { // Toggle the one we have chosen if we are multi select.
            $option.prop('selected', !state);
            that.setSelected(clickedIndex, !state);
            $this.blur();

            if (maxOptions !== false || maxOptionsGrp !== false) {
              var maxReached = maxOptions < $options.filter(':selected').length,
                  maxReachedGrp = maxOptionsGrp < $optgroup.find('option:selected').length;

              if ((maxOptions && maxReached) || (maxOptionsGrp && maxReachedGrp)) {
                if (maxOptions && maxOptions == 1) {
                  $options.prop('selected', false);
                  $option.prop('selected', true);
                  that.$menuInner.find('.selected').removeClass('selected');
                  that.setSelected(clickedIndex, true);
                } else if (maxOptionsGrp && maxOptionsGrp == 1) {
                  $optgroup.find('option:selected').prop('selected', false);
                  $option.prop('selected', true);
                  var optgroupID = $this.parent().data('optgroup');
                  that.$menuInner.find('[data-optgroup="' + optgroupID + '"]').removeClass('selected');
                  that.setSelected(clickedIndex, true);
                } else {
                  var maxOptionsText = typeof that.options.maxOptionsText === 'string' ? [that.options.maxOptionsText, that.options.maxOptionsText] : that.options.maxOptionsText,
                      maxOptionsArr = typeof maxOptionsText === 'function' ? maxOptionsText(maxOptions, maxOptionsGrp) : maxOptionsText,
                      maxTxt = maxOptionsArr[0].replace('{n}', maxOptions),
                      maxTxtGrp = maxOptionsArr[1].replace('{n}', maxOptionsGrp),
                      $notify = $('<div class="notify"></div>');
                  // If {var} is set in array, replace it
                  /** @deprecated */
                  if (maxOptionsArr[2]) {
                    maxTxt = maxTxt.replace('{var}', maxOptionsArr[2][maxOptions > 1 ? 0 : 1]);
                    maxTxtGrp = maxTxtGrp.replace('{var}', maxOptionsArr[2][maxOptionsGrp > 1 ? 0 : 1]);
                  }

                  $option.prop('selected', false);

                  that.$menu.append($notify);

                  if (maxOptions && maxReached) {
                    $notify.append($('<div>' + maxTxt + '</div>'));
                    triggerChange = false;
                    that.$element.trigger('maxReached.bs.select');
                  }

                  if (maxOptionsGrp && maxReachedGrp) {
                    $notify.append($('<div>' + maxTxtGrp + '</div>'));
                    triggerChange = false;
                    that.$element.trigger('maxReachedGrp.bs.select');
                  }

                  setTimeout(function () {
                    that.setSelected(clickedIndex, false);
                  }, 10);

                  $notify.delay(750).fadeOut(300, function () {
                    $(this).remove();
                  });
                }
              }
            }
          }

          if (!that.multiple || (that.multiple && that.options.maxOptions === 1)) {
            that.$button.focus();
          } else if (that.options.liveSearch) {
            that.$searchbox.focus();
          }

          // Trigger select 'change'
          if (triggerChange) {
            if ((prevValue != that.$element.val() && that.multiple) || (prevIndex != that.$element.prop('selectedIndex') && !that.multiple)) {
              // $option.prop('selected') is current option state (selected/unselected). state is previous option state.
              changed_arguments = [clickedIndex, $option.prop('selected'), state];
              that.$element
                .triggerNative('change');
            }
          }
        }
      });

      this.$menu.on('click', 'li.disabled a, .popover-title, .popover-title :not(.close)', function (e) {
        if (e.currentTarget == this) {
          e.preventDefault();
          e.stopPropagation();
          if (that.options.liveSearch && !$(e.target).hasClass('close')) {
            that.$searchbox.focus();
          } else {
            that.$button.focus();
          }
        }
      });

      this.$menuInner.on('click', '.divider, .dropdown-header', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (that.options.liveSearch) {
          that.$searchbox.focus();
        } else {
          that.$button.focus();
        }
      });

      this.$menu.on('click', '.popover-title .close', function () {
        that.$button.click();
      });

      this.$searchbox.on('click', function (e) {
        e.stopPropagation();
      });

      this.$menu.on('click', '.actions-btn', function (e) {
        if (that.options.liveSearch) {
          that.$searchbox.focus();
        } else {
          that.$button.focus();
        }

        e.preventDefault();
        e.stopPropagation();

        if ($(this).hasClass('bs-select-all')) {
          that.selectAll();
        } else {
          that.deselectAll();
        }
      });

      this.$element.change(function () {
        that.render(false);
        that.$element.trigger('changed.bs.select', changed_arguments);
        changed_arguments = null;
      });
    },

    liveSearchListener: function () {
      var that = this,
          $no_results = $('<li class="no-results"></li>');

      this.$button.on('click.dropdown.data-api', function () {
        that.$menuInner.find('.active').removeClass('active');
        if (!!that.$searchbox.val()) {
          that.$searchbox.val('');
          that.$lis.not('.is-hidden').removeClass('hidden');
          if (!!$no_results.parent().length) $no_results.remove();
        }
        if (!that.multiple) that.$menuInner.find('.selected').addClass('active');
        setTimeout(function () {
          that.$searchbox.focus();
        }, 10);
      });

      this.$searchbox.on('click.dropdown.data-api focus.dropdown.data-api touchend.dropdown.data-api', function (e) {
        e.stopPropagation();
      });

      this.$searchbox.on('input propertychange', function () {
        that.$lis.not('.is-hidden').removeClass('hidden');
        that.$lis.filter('.active').removeClass('active');
        $no_results.remove();

        if (that.$searchbox.val()) {
          var $searchBase = that.$lis.not('.is-hidden, .divider, .dropdown-header'),
              $hideItems;
          if (that.options.liveSearchNormalize) {
            $hideItems = $searchBase.find('a').not(':a' + that._searchStyle() + '("' + normalizeToBase(that.$searchbox.val()) + '")');
          } else {
            $hideItems = $searchBase.find('a').not(':' + that._searchStyle() + '("' + that.$searchbox.val() + '")');
          }

          if ($hideItems.length === $searchBase.length) {
            $no_results.html(that.options.noneResultsText.replace('{0}', '"' + htmlEscape(that.$searchbox.val()) + '"'));
            that.$menuInner.append($no_results);
            that.$lis.addClass('hidden');
          } else {
            $hideItems.parent().addClass('hidden');

            var $lisVisible = that.$lis.not('.hidden'),
                $foundDiv;

            // hide divider if first or last visible, or if followed by another divider
            $lisVisible.each(function (index) {
              var $this = $(this);

              if ($this.hasClass('divider')) {
                if ($foundDiv === undefined) {
                  $this.addClass('hidden');
                } else {
                  if ($foundDiv) $foundDiv.addClass('hidden');
                  $foundDiv = $this;
                }
              } else if ($this.hasClass('dropdown-header') && $lisVisible.eq(index + 1).data('optgroup') !== $this.data('optgroup')) {
                $this.addClass('hidden');
              } else {
                $foundDiv = null;
              }
            });
            if ($foundDiv) $foundDiv.addClass('hidden');

            $searchBase.not('.hidden').first().addClass('active');
          }
        }
      });
    },

    _searchStyle: function () {
      var styles = {
        begins: 'ibegins',
        startsWith: 'ibegins'
      };

      return styles[this.options.liveSearchStyle] || 'icontains';
    },

    val: function (value) {
      if (typeof value !== 'undefined') {
        this.$element.val(value);
        this.render();

        return this.$element;
      } else {
        return this.$element.val();
      }
    },

    changeAll: function (status) {
      if (!this.multiple) return;
      if (typeof status === 'undefined') status = true;

      this.findLis();

      var $options = this.$element.find('option'),
          $lisVisible = this.$lis.not('.divider, .dropdown-header, .disabled, .hidden'),
          lisVisLen = $lisVisible.length,
          selectedOptions = [];
          
      if (status) {
        if ($lisVisible.filter('.selected').length === $lisVisible.length) return;
      } else {
        if ($lisVisible.filter('.selected').length === 0) return;
      }
          
      $lisVisible.toggleClass('selected', status);

      for (var i = 0; i < lisVisLen; i++) {
        var origIndex = $lisVisible[i].getAttribute('data-original-index');
        selectedOptions[selectedOptions.length] = $options.eq(origIndex)[0];
      }

      $(selectedOptions).prop('selected', status);

      this.render(false);

      this.togglePlaceholder();

      this.$element
        .triggerNative('change');
    },

    selectAll: function () {
      return this.changeAll(true);
    },

    deselectAll: function () {
      return this.changeAll(false);
    },

    toggle: function (e) {
      e = e || window.event;

      if (e) e.stopPropagation();

      this.$button.trigger('click');
    },

    keydown: function (e) {
      var $this = $(this),
          $parent = $this.is('input') ? $this.parent().parent() : $this.parent(),
          $items,
          that = $parent.data('this'),
          index,
          next,
          first,
          last,
          prev,
          nextPrev,
          prevIndex,
          isActive,
          selector = ':not(.disabled, .hidden, .dropdown-header, .divider)',
          keyCodeMap = {
            32: ' ',
            48: '0',
            49: '1',
            50: '2',
            51: '3',
            52: '4',
            53: '5',
            54: '6',
            55: '7',
            56: '8',
            57: '9',
            59: ';',
            65: 'a',
            66: 'b',
            67: 'c',
            68: 'd',
            69: 'e',
            70: 'f',
            71: 'g',
            72: 'h',
            73: 'i',
            74: 'j',
            75: 'k',
            76: 'l',
            77: 'm',
            78: 'n',
            79: 'o',
            80: 'p',
            81: 'q',
            82: 'r',
            83: 's',
            84: 't',
            85: 'u',
            86: 'v',
            87: 'w',
            88: 'x',
            89: 'y',
            90: 'z',
            96: '0',
            97: '1',
            98: '2',
            99: '3',
            100: '4',
            101: '5',
            102: '6',
            103: '7',
            104: '8',
            105: '9'
          };

      if (that.options.liveSearch) $parent = $this.parent().parent();

      if (that.options.container) $parent = that.$menu;

      $items = $('[role="listbox"] li', $parent);

      isActive = that.$newElement.hasClass('open');

      if (!isActive && (e.keyCode >= 48 && e.keyCode <= 57 || e.keyCode >= 96 && e.keyCode <= 105 || e.keyCode >= 65 && e.keyCode <= 90)) {
        if (!that.options.container) {
          that.setSize();
          that.$menu.parent().addClass('open');
          isActive = true;
        } else {
          that.$button.trigger('click');
        }
        that.$searchbox.focus();
        return;
      }

      if (that.options.liveSearch) {
        if (/(^9$|27)/.test(e.keyCode.toString(10)) && isActive) {
          e.preventDefault();
          e.stopPropagation();
          that.$menuInner.click();
          that.$button.focus();
        }
        // $items contains li elements when liveSearch is enabled
        $items = $('[role="listbox"] li' + selector, $parent);
        if (!$this.val() && !/(38|40)/.test(e.keyCode.toString(10))) {
          if ($items.filter('.active').length === 0) {
            $items = that.$menuInner.find('li');
            if (that.options.liveSearchNormalize) {
              $items = $items.filter(':a' + that._searchStyle() + '(' + normalizeToBase(keyCodeMap[e.keyCode]) + ')');
            } else {
              $items = $items.filter(':' + that._searchStyle() + '(' + keyCodeMap[e.keyCode] + ')');
            }
          }
        }
      }

      if (!$items.length) return;

      if (/(38|40)/.test(e.keyCode.toString(10))) {
        index = $items.index($items.find('a').filter(':focus').parent());
        first = $items.filter(selector).first().index();
        last = $items.filter(selector).last().index();
        next = $items.eq(index).nextAll(selector).eq(0).index();
        prev = $items.eq(index).prevAll(selector).eq(0).index();
        nextPrev = $items.eq(next).prevAll(selector).eq(0).index();

        if (that.options.liveSearch) {
          $items.each(function (i) {
            if (!$(this).hasClass('disabled')) {
              $(this).data('index', i);
            }
          });
          index = $items.index($items.filter('.active'));
          first = $items.first().data('index');
          last = $items.last().data('index');
          next = $items.eq(index).nextAll().eq(0).data('index');
          prev = $items.eq(index).prevAll().eq(0).data('index');
          nextPrev = $items.eq(next).prevAll().eq(0).data('index');
        }

        prevIndex = $this.data('prevIndex');

        if (e.keyCode == 38) {
          if (that.options.liveSearch) index--;
          if (index != nextPrev && index > prev) index = prev;
          if (index < first) index = first;
          if (index == prevIndex) index = last;
        } else if (e.keyCode == 40) {
          if (that.options.liveSearch) index++;
          if (index == -1) index = 0;
          if (index != nextPrev && index < next) index = next;
          if (index > last) index = last;
          if (index == prevIndex) index = first;
        }

        $this.data('prevIndex', index);

        if (!that.options.liveSearch) {
          $items.eq(index).children('a').focus();
        } else {
          e.preventDefault();
          if (!$this.hasClass('dropdown-toggle')) {
            $items.removeClass('active').eq(index).addClass('active').children('a').focus();
            $this.focus();
          }
        }

      } else if (!$this.is('input')) {
        var keyIndex = [],
            count,
            prevKey;

        $items.each(function () {
          if (!$(this).hasClass('disabled')) {
            if ($.trim($(this).children('a').text().toLowerCase()).substring(0, 1) == keyCodeMap[e.keyCode]) {
              keyIndex.push($(this).index());
            }
          }
        });

        count = $(document).data('keycount');
        count++;
        $(document).data('keycount', count);

        prevKey = $.trim($(':focus').text().toLowerCase()).substring(0, 1);

        if (prevKey != keyCodeMap[e.keyCode]) {
          count = 1;
          $(document).data('keycount', count);
        } else if (count >= keyIndex.length) {
          $(document).data('keycount', 0);
          if (count > keyIndex.length) count = 1;
        }

        $items.eq(keyIndex[count - 1]).children('a').focus();
      }

      // Select focused option if "Enter", "Spacebar" or "Tab" (when selectOnTab is true) are pressed inside the menu.
      if ((/(13|32)/.test(e.keyCode.toString(10)) || (/(^9$)/.test(e.keyCode.toString(10)) && that.options.selectOnTab)) && isActive) {
        if (!/(32)/.test(e.keyCode.toString(10))) e.preventDefault();
        if (!that.options.liveSearch) {
          var elem = $(':focus');
          elem.click();
          // Bring back focus for multiselects
          elem.focus();
          // Prevent screen from scrolling if the user hit the spacebar
          e.preventDefault();
          // Fixes spacebar selection of dropdown items in FF & IE
          $(document).data('spaceSelect', true);
        } else if (!/(32)/.test(e.keyCode.toString(10))) {
          that.$menuInner.find('.active a').click();
          $this.focus();
        }
        $(document).data('keycount', 0);
      }

      if ((/(^9$|27)/.test(e.keyCode.toString(10)) && isActive && (that.multiple || that.options.liveSearch)) || (/(27)/.test(e.keyCode.toString(10)) && !isActive)) {
        that.$menu.parent().removeClass('open');
        if (that.options.container) that.$newElement.removeClass('open');
        that.$button.focus();
      }
    },

    mobile: function () {
      this.$element.addClass('mobile-device');
    },

    refresh: function () {
      this.$lis = null;
      this.liObj = {};
      this.reloadLi();
      this.render();
      this.checkDisabled();
      this.liHeight(true);
      this.setStyle();
      this.setWidth();
      if (this.$lis) this.$searchbox.trigger('propertychange');

      this.$element.trigger('refreshed.bs.select');
    },

    hide: function () {
      this.$newElement.hide();
    },

    show: function () {
      this.$newElement.show();
    },

    remove: function () {
      this.$newElement.remove();
      this.$element.remove();
    },

    destroy: function () {
      this.$newElement.before(this.$element).remove();

      if (this.$bsContainer) {
        this.$bsContainer.remove();
      } else {
        this.$menu.remove();
      }

      this.$element
        .off('.bs.select')
        .removeData('selectpicker')
        .removeClass('bs-select-hidden selectpicker');
    }
  };

  // SELECTPICKER PLUGIN DEFINITION
  // ==============================
  function Plugin(option) {
    // get the args of the outer function..
    var args = arguments;
    // The arguments of the function are explicitly re-defined from the argument list, because the shift causes them
    // to get lost/corrupted in android 2.3 and IE9 #715 #775
    var _option = option;

    [].shift.apply(args);

    var value;
    var chain = this.each(function () {
      var $this = $(this);
      if ($this.is('select')) {
        var data = $this.data('selectpicker'),
            options = typeof _option == 'object' && _option;

        if (!data) {
          var config = $.extend({}, Selectpicker.DEFAULTS, $.fn.selectpicker.defaults || {}, $this.data(), options);
          config.template = $.extend({}, Selectpicker.DEFAULTS.template, ($.fn.selectpicker.defaults ? $.fn.selectpicker.defaults.template : {}), $this.data().template, options.template);
          $this.data('selectpicker', (data = new Selectpicker(this, config)));
        } else if (options) {
          for (var i in options) {
            if (options.hasOwnProperty(i)) {
              data.options[i] = options[i];
            }
          }
        }

        if (typeof _option == 'string') {
          if (data[_option] instanceof Function) {
            value = data[_option].apply(data, args);
          } else {
            value = data.options[_option];
          }
        }
      }
    });

    if (typeof value !== 'undefined') {
      //noinspection JSUnusedAssignment
      return value;
    } else {
      return chain;
    }
  }

  var old = $.fn.selectpicker;
  $.fn.selectpicker = Plugin;
  $.fn.selectpicker.Constructor = Selectpicker;

  // SELECTPICKER NO CONFLICT
  // ========================
  $.fn.selectpicker.noConflict = function () {
    $.fn.selectpicker = old;
    return this;
  };

  $(document)
      .data('keycount', 0)
      .on('keydown.bs.select', '.bootstrap-select [data-toggle=dropdown], .bootstrap-select [role="listbox"], .bs-searchbox input', Selectpicker.prototype.keydown)
      .on('focusin.modal', '.bootstrap-select [data-toggle=dropdown], .bootstrap-select [role="listbox"], .bs-searchbox input', function (e) {
        e.stopPropagation();
      });

  // SELECTPICKER DATA-API
  // =====================
  $(window).on('load.bs.select.data-api', function () {
    $('.selectpicker').each(function () {
      var $selectpicker = $(this);
      Plugin.call($selectpicker, $selectpicker.data());
    })
  });
})(jQuery);
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
			// this.initStyledSelect();
			// this.initDropdown();
			// @vh: remove when migrated to bootstrap solution
			this.initInfoBoxes();
		},

		initAdaptiveImages: function() {

			this.$adaptiveImages = this.$( '.adaptive-image' );
		},
		// @vh: remove when migrated to bootstrap solution
		initInfoBoxes: function() {

			var $infoBoxes = this.$( '.info-box-link' );
			if( $infoBoxes.length ) {
				this.sandbox.subscribe( 'globalMenu', this );

				if ( $('body').width() > 599 ) {
					this.$infoBoxes = $infoBoxes.infoBox( {
						my: 'left+35 top-7',
						at: 'left top',
						collision: 'flip none',
						open: $.proxy( function( event, ui ) {
							this.fire( 'globalMenuOpen', [ 'globalMenu' ] );
							this.onGlobalMenuOpen( $( event.target ) );
						}, this )
					} );
				} else {
					this.$infoBoxes = $infoBoxes.infoBox( {
						my: 'left top+15',
						at: 'left bottom',
						collision: 'flip none',
						open: $.proxy( function( event, ui ) {
							this.fire( 'globalMenuOpen', [ 'globalMenu' ] );
							this.onGlobalMenuOpen( $( event.target ) );
						}, this )
					} );
				}


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
			'click .ajax-modal': 'ajaxModal',
			'click a>div.mod-Teaser01, a>div.mod-Teaser02, a>div.mod-Teaser03, div.mod-Teaser01>a, div.mod-Teaser02>a, div.mod-Teaser03>a': 'trackTeaserClick',
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

			// init custom select
			this.initSelect();

			// modal: enforceFocus
			this.modalFix();

			// worldmap modal
			this.worldmapModal();
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

		// infobox
		triggerPopover: function() {

			$('[data-toggle="popover"]').popover();
		},

		// tooltip
		initTooltip: function() {

			$('[data-toggle="tooltip"]').tooltip();
		},

		// tooltip
		worldmapModal: function() {

			if (!$('#worldmap').length) {

				$("section.content").append('<section class="modal" id="worldmap" tabindex="-1" role="dialog" aria-labelledby="modalLabel"><div class="modal-dialog modal-lg" role="document"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"></button></div><div class="modal-body no-padding"></div></div></div></section>');
			}
		},

		// modal with ajax content
		ajaxModal: function( event ) {
			event.preventDefault();

			var self 				= this;
			var $button 			= $(event.currentTarget);
			var $dialog 			= $($button.attr('data-target'));

			$dialog.on('shown.bs.modal', function (e) {

				if ($button.attr('data-content-url')) {
						var modules = [];

						$.ajax({
							url 		: $button.attr('data-content-url'),
							dataType 	: 'html',
							type 		: 'GET',
							cache 		: true,
							timeout 	: 30000,
							error 		: function(xhr, textStatus, errorThrown) { },
							complete	: function() {
							},
							success 	: function(data){

								if (data) {
									var $data 		= $(data);
									var $content 	= '';
									var $header 	= $dialog.find('.modal-header');

									// if data has section.content a complete page gets loaded.
									// just get the content-part of the page.
									if ($data.find('section.content').length) {

										$content = $data.find('section.content');

										// move first headline in modal header section
										if ($data.find('section.content > .mod-Headline').length) {

											var $headerContent = $data.find('section.content > .mod-Headline').html();

											// clear copied content in modal-header but keep close button
											$header.find('*').not('.close').remove();

											// insert headline
											$($headerContent).prependTo($header);

											// delete header node
											$data.find('section.content > .mod-Headline').remove();
										}

										// print content
										$dialog.find('.modal-body').html($content);

									} else {
										var $section = $('<section class="content"></section>');
										var $content = $(data);

										// create section
										$dialog.append($section);

										// print content
										$dialog.find('.modal-body').html($content);
									}

									// register and start the modules in $data
									// otherwise no '.mod-' of ajax content gets initialized
									modules = self.sandbox.addModules($content);
								}
							}
						});
					}
			});
		},

		// modal: enforceFocus
		//
		// (bootstrap modal) enforceFocus method intention:
		// non-mouse users should not be able to tab outside of
		// modal and start interacting with other parts of page
		modalFix: function() {

			// no-op instruction for bootstrap modal method enforceFocus
			$.fn.modal.Constructor.prototype.enforceFocus = function() {};
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

		initSelect: function() {

			$('.custom-select').selectpicker({
				'dropdownAlignRight': 'auto',
				'iconBase': 'icon',
				'showIcon': false,
				'tickIcon': 'i-check',
				'width': 'fit',
				'style': 'btn-select'
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
			//console.log("Cheerio, Mr. Accordion!");
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
		$bar 				: null,
		$btnPrev 			: null,
		$btnNext 			: null,
		_timeoutID 			: 0,
		$mobileHeader 		: '',
		navValues			: {"sparten": -1, "haupt": -1, "meta": -1, "contact": -1},

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
			if ($('.mod-NavSparten').length || $('.mod-NavMeta').length || $('.mod-NavContact').length) {
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
			this.$bar 		= this.$ctx.find( '.menubar' );
			this.$btnPrev 	= this.$ctx.find( '.btn-nav-prev' );
			this.$btnNext 	= this.$ctx.find( '.btn-nav-next' );

			// sticky mobile nav
			this.mobileHeaderSticky();

			// set mobile/desktop nav
			this.setNavigation();

			callback();
		},
		
		after: function( callback ) {
			
			//var cc = this.$menu.children().first().children().length;
			// GET ALL CHILDS WITHOUT TOGGLE-AREA (Online-Banking)
			var cc = this.$menu.find("ul:first > li:not(.toggleArea)").length;
			
			this.onAfterNavValues({"from": "haupt", "childCount": cc});
			
			if (cc > 0) {
				this.$menu.children().first().removeClass('isEmpty');			
			} else {
				this.$menu.children().first().addClass('isEmpty');
			}
			
			// fire nav values
			this.fire( 'afterNavValues', {from: "haupt", childCount: cc}, [ 'globalMenu' ] );

		},
		
		onAfterNavValues: function( event ) {
			this.navValues[event.from] = event.childCount;
			this.parseNavValues();
		},
		
		parseNavValues: function () {
			//console.log ("NavHaupt parseNavValues: meta/sparten/haupt: " + this.navValues.meta + " " + this.navValues.sparten + " " + this.navValues.haupt );
			
			var $mhb = this.$mobileHeader.find("button:first");
			if ($mhb.length >= 1 ) {
				if (this.navValues.haupt <= 0 && this.navValues.sparten <= 0 && this.navValues.meta <= 0 && this.navValues.contact <= 0) {
					// HIDE BURGER-ICON IF NOTHING IS INSIDE THE MENU
					$mhb.hide();
					$("#mobileHeader button, #mobileHeader i").off("click");
				} else {
					$mhb.show();
					$("#mobileHeader button, #mobileHeader i").on("click", $.proxy(this.toggleBurgerNavIcon, this));
				}	
			}
			
			
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
			var $activeSparte 	= $( ".mod-NavSparten, .mod-NavContact" ).find( "li.active a" );
			var _popupHeadline 	= $('.popup .wrapper-sparten > h3').text();

			// check nav level
			if ($activeList.closest('ul').hasClass('menubar') || $activeList.hasClass('menubar')) {

				// hide back button
				$backButton.hide();

				// show sparten toggle
				if (this.navValues.meta <= 0 && this.navValues.sparten <= 0) {
					// gk
					$toggleSparten.hide();
				} else {
					$toggleSparten.show();
				}

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
				if ( $element.length === 0 ) {
					$element = $( '.mod-NavContact > h3' );
					$('.wrapper-sparten').addClass('wrapper-contact');
				} else {
					$backButton.css('display', 'inline-block');
				}

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

        	this.$menu 		= this.$ctx.find( 'ul' );
        	
            // init url changes
            this.changeUrl();

            // set marginRight
            this.setMargin();

            // set width for elements in .wrapper-meta
            this.setWidth();

            // get width of search field
            this.getSearchWidth();
            
            // subscribe for 'globalMenu' ()
            this.sandbox.subscribe( 'globalMenu', this );

            callback();
        },

        _timeoutID: 0,
        _searchWidthInitial: 0,
        $menu 				: null,
        navValues			: {"sparten": -1, "haupt": -1, "meta": -1, "contact": -1},

        getSearchWidth: function() {

            // if search exists
            if ($('.mod-Suche').length) {
                this._searchWidthInitial = $('.mod-Suche').outerWidth(true);
            }
        },
        
        after: function( callback ) {
			
        	var cc = this.$menu.children().length;
        	var searchSet = $("header .mod-Suche").length;
        	var loginSet = $(".mod-HeaderLogin").length;
        	
        	if (searchSet > 0) {
        		// SEARCH IN META IS SET
        		cc ++;
        	}
        	
        	if (loginSet > 0) {
        		// LOGIN / LOGOUT IS SET
        		cc ++;
        	}
        	
        	this.onAfterNavValues({"from": "meta", "childCount": cc});
        	
			if (cc > 0) {
				this.$ctx.removeClass('isEmpty');			
			} else {
				this.$ctx.addClass('isEmpty');
			}
			
			// fire nav values
			this.fire( 'afterNavValues', {from: "meta", childCount: cc}, [ 'globalMenu' ] );

		},
		
		onAfterNavValues: function( event ) {
			this.navValues[event.from] = event.childCount;
			this.parseNavValues();
		},
		
		parseNavValues: function () {
			//console.log ("NavMeta parseNavValues: meta/sparten/haupt: " + this.navValues.meta + " " + this.navValues.sparten + " " + this.navValues.haupt );
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

    mrm.mod.NavContact = mrm.mod.AbstractMod.extend( {

       $nav: null,
       navValues: {"sparten": -1, "haupt": -1, "meta": -1, "contact": -1},
       $phone: jQuery( '.meta_contact_phone' ).attr( 'content' ),
       $href: jQuery( '.meta_contact_phone_href' ).attr( 'content' ),
       events: null,
       
       prepare: function( callback ) {
    	   this.$nav = this.$ctx.children('ul');
    	   
    	   this.replaceNumber();
    	   
    	   // subscribe for 'globalMenu' ()
           this.sandbox.subscribe( 'globalMenu', this );
    	   
    	   callback();
       },
       
       after: function( callback ) {
    	    var cc = this.$nav.children().length;
    	    
			// fire nav values
			this.fire( 'afterNavValues', {from: "contact", childCount: cc}, [ 'globalMenu' ] );
		},
		
		onAfterNavValues: function( event ) {
			this.navValues[event.from] = event.childCount;
			this.parseNavValues();
		},
		
		parseNavValues: function () {
			
		},
       
       replaceNumber: function() {
    	   if( $phoneElm = jQuery('.contact_phone') ) {
	    	   if( typeof this.$phone !== undefined && typeof this.$href !== undefined ) {
	    		   $phoneElm.attr( 'href', this.$href ).find('.contact_phone_text').html( this.$phone );
	    	   }
	    	   $phoneElm.parent().removeClass('isEmpty');
    	   }
       }
		
    } );
} )( jQuery );;
( function( $ ) {

    mrm.mod.NavSparten = mrm.mod.AbstractMod.extend( {

    	$nav 				: null,
        navValues			: {"sparten": -1, "haupt": -1, "meta": -1, "contact": -1},
        
        events: {
        },

        prepare: function( callback ) {
        	this.$nav 		= this.$ctx.children().first();
        	
        	// subscribe for 'globalMenu' ()
            this.sandbox.subscribe( 'globalMenu', this );
            
            callback();
        },
        
        after: function( callback ) {

			var cc = this.$nav.children().length;
			this.onAfterNavValues({"from": "sparten", "childCount": cc});
			//console.log ("NavSparten after: " + cc);
			
			if (cc > 0) {
				this.$ctx.removeClass('isEmpty');			
			} else {
				this.$ctx.addClass('isEmpty');
			}
			
			// fire nav values
			this.fire( 'afterNavValues', {from: "sparten", childCount: cc}, [ 'globalMenu' ] );
			
		},
		
		onAfterNavValues: function( event ) {
			this.navValues[event.from] = event.childCount;
			this.parseNavValues();
		},
		
		parseNavValues: function () {
			//console.log ("NavSparten parseNavValues: meta/sparten/haupt: " + this.navValues.meta + " " + this.navValues.sparten + " " + this.navValues.haupt );
		}
		
    } );
} )( jQuery );;
( function( $ ) {

    mrm.mod.NavUser = mrm.mod.AbstractMod.extend( {

    	events: {
			'click .info-box-below-mobile': 'mobileShowStatus'
		},

		init: function( $ctx, sandbox, modId ) {

			// call base constructor
			this._super( $ctx, sandbox, modId );

			if ($('.wrapper-meta').length) {

				// mobile infobox
				this.mobileShowInfobox();
			}
		},

        prepare: function( callback ) {

        	if ($('.wrapper-meta').length) {

				// desktop infobox
				this.showStatus();
        	}

            callback();
        },

        mobileShowInfobox: function() {

        	var $element = $('.mobileNavFooter .info-box-below');

        	// add mobile infobox class
        	$element.addClass('info-box-below-mobile');

        	// remove infobox class
        	$element.removeClass('info-box-below');
        },

		mobileShowStatus: function() {

			var $element = $('#loginStatus');

			$element.clone().prependTo('header.mobileNav').show();

			// hide mobile navigation
			$("header.mobileNav #loginStatus .close").on("click.loginStatus", $.proxy(this.mobileHideStatus, this));
		},

		mobileHideStatus: function() {

			var $element = $('header.mobileNav #loginStatus');

			// hide element
			$element.hide();

			// unbind click event listener
			$("header.mobileNav #loginStatus .close").off("click.loginStatus");
		},

        showStatus: function() {
        	var $infoBoxesBelow = this.$ctx.find( '.info-box-below' );

			if( $infoBoxesBelow.length) {
				this.sandbox.subscribe( 'globalMenu', this );

				this.$infoBoxesBelow = $infoBoxesBelow.infoBox( {
					my: 'left-194 top+42',
					at: 'left top',
					collision: 'flip none',
					open: $.proxy( function( event, ui ) {
						this.fire( 'globalMenuOpen', [ 'globalMenu' ] );
						this.onGlobalMenuOpen( $( event.target ) );
					}, this )
				} );
			}
        },

        onBroadcastBodyClick: function() {

        	var $infoBoxBelow = $( '.info-box-below' );
        	if( $infoBoxBelow.length && this.$infoBoxesBelow != undefined) {			
				$( '.info-box-below' ).infoBox( 'close' );
			}
		},

        onBroadcastWindowResize: function() {

        	// close infobox
        	var $infoBoxBelow = $( '.info-box-below' );
        	if( $infoBoxBelow.length && this.$infoBoxesBelow != undefined) {
        		$( '.info-box-below' ).infoBox( 'close' );
        	}
        	$('#loginStatus').hide();

        	// hide mobile infobox
			this.mobileHideStatus()
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
				$activeMap.stop(true, true).animate({
					'opacity': 0
				}, 500);

				$activeMap.css('zIndex', '-1');

				// fadeIn continent on worldmap
				$map.css('zIndex', '9').animate({
					'opacity': 1
				}, 500);
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
			$activeMap.stop(true, true).animate({
				'opacity': 0
			}, 500);

			$activeMap.css('zIndex', '-1');
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