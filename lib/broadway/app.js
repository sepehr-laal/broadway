/*
 * app.js: Core Application object for managing plugins and features in broadway
 *
 * (C) 2011, Nodejitsu Inc.
 * MIT LICENSE
 *
 */
 
var util = require('util'),
    async = require('async'),
    events = require('eventemitter2'),
    common = require('./common'),
    constants = require('./constants'),
    features = require('./features');

var App = exports.App = function (options) {
  events.EventEmitter.call(this, { delimiter: constants.DELIMITER, wildcard: true });
  
  var self = this
  options  = options || {};
  
  this.ROOT           = options.root;
  this.plugins        = options.plugins || {};
  this.plugins.config = this.plugins.config || require('./plugins/config');
  this.plugins.log    = this.plugins.log    || require('./plugins/log');
  this.initialized    = {};
  this._options       = options;
};

//
// Inherit from `EventEmitter2`.
//
util.inherits(App, events.EventEmitter2);

//
// ### function init (options, callback)
// #### @options {Object} **Optional** Options to initialize this instance with
// #### @callback {function} Continuation to respond to when complete.
// Initializes this instance by the following procedure:
//
// 1. Initializes all plugins (starting with `config` and `log`).
// 2. Creates all directories in `this.config.directories` (if any).
// 3. Ensures the files in the core directory structure conform to the 
//    features required by this application.
//
App.prototype.init = function (options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  var self = this,
      core = ['config', 'log'];
  
  function onComplete() {
    self._options = null;
    callback();
  }
  
  function ensureFeatures (err) {
    return err 
      ? onError(err)
      : features.ensure(this, onComplete);
  }
  
  function createDirs(err) {
    return err 
      ? onError(err)
      : common.directories.create(self.config.get('directories'), ensureFeatures);
  }
  
  function initOptions(plugin, next) {
    _attach.call(self, plugin, options[plugin] || self._options[plugin], next);
  }
  
  //
  // Emit and respond with any errors that may short
  // circuit the process. 
  //
  function onError(err) {
    self.emit('error:init', err);
    callback(err);
  }
  
  //
  // Initialize plugins, then create directories and 
  // ensure features for this instance.
  //
  async.forEachSeries(core, initOptions, function (err) {
    if (err) {
      return onError(err);
    }
    
    async.forEach(Object.keys(self.plugins).filter(function (p) { 
      return core.indexOf(key) === -1 
    }), initOptions, createDirs)
  });
};

//
// ### function inspect ()
// Inspects the modules and features used by the current 
// application directory structure
//
App.prototype.inspect = function () {
  
};

//
// ### @private function _attach(name, options, next)
// Helper function for attaching plugins to `App` instances.
//
function _attach(name, options, next) {
  var self = this;
  
  this.plugins[key].init(this, options, function (err) {
    if (err) {
      return callback(err);
    }
    
    self.initialized[key] = true;
    next();
  });
}