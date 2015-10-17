(function() {
  var GoodRollbar, Hoek, SafeJson, Squeeze, _, defaults, rollbar;

  rollbar = require('rollbar');

  Hoek = require('hoek');

  Squeeze = require('good-squeeze').Squeeze;

  SafeJson = require('good-squeeze').SafeJson;

  _ = require('lodash');

  defaults = {
    accessToken: null,
    exitOnUncaughtException: true,
    rollbar: {
      environment: process.env.NODE_ENV || 'development',
      endpoint: "https://api.rollbar.com/api/1/"
    }
  };

  GoodRollbar = (function() {
    function GoodRollbar(events, config) {
      if (config == null) {
        config = {};
      }
      this._settings = Hoek.applyToDefaults(defaults, config);
      this._streams = {
        squeeze: Squeeze(events),
        stringify: SafeJson(null, {
          separator: '\n'
        })
      };
    }

    GoodRollbar.prototype.init = function(stream, emitter, callback) {
      rollbar.handleUncaughtExceptions(this._settings.accessToken, {
        exitOnUncaughtException: this._settings.exitOnUncaughtException
      });
      rollbar.init(this._settings.accessToken, this._settings.rollbar);
      this._streams.squeeze.on('data', (function(_this) {
        return function(data) {
          var error, request, url;
          error = null;
          _.each(data.log, function(log) {
            if (_.includes(log.tags, 'error')) {
              return error = log;
            }
          });
          if (error != null) {
            request = null;
            _.each(data.log, function(log) {
              if (_.includes(log.tags, 'received')) {
                return request = log;
              }
            });
            url = data.instance.split('://');
            request = {
              headers: {
                host: url[1]
              },
              url: request.data.url,
              method: data.method,
              protocol: url[0],
              route: {
                path: data.path
              }
            };
            return rollbar.handleError(error.data, request);
          }
        };
      })(this));
      stream.pipe(this._streams.squeeze);
      return callback();
    };

    return GoodRollbar;

  })();

  module.exports.attributes = {
    pkg: require('../package.json')
  };

  module.exports = function(events, config) {
    if (config == null) {
      config = {};
    }
    return new GoodRollbar(events, config);
  };

}).call(this);
