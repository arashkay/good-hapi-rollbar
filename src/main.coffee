rollbar  = require 'rollbar'
Hoek     = require 'hoek'
Squeeze  = require('good-squeeze').Squeeze
SafeJson = require('good-squeeze').SafeJson
_        = require 'lodash'

defaults = {
  accessToken: null
  exitOnUncaughtException: true
  rollbar: {
    environment: process.env.NODE_ENV || 'development'
    endpoint: "https://api.rollbar.com/api/1/"
  }
}

class GoodRollbar

  constructor: (events, config={}) ->
    @_settings = Hoek.applyToDefaults defaults, config
    @_streams=
      squeeze: Squeeze events
      stringify: SafeJson(null, { separator: '\n' })

  init: (stream, emitter, callback) ->
    console.log '######## INIT GOOD ROLLBAR'
    rollbar.handleUncaughtExceptions @_settings.accessToken, { exitOnUncaughtException: @_settings.exitOnUncaughtException }

    rollbar.init @_settings.accessToken, @_settings.rollbar

    @_streams.squeeze.on 'data', (data) =>
      error = null
      _.each data.log, (log) ->
        error = log if _.includes log.tags, 'error'
      if error?
        request = null
        _.each data.log, (log) ->
          request = log if _.includes log.tags, 'received'
        url = data.instance.split('://')
        request =
          headers:
            host: url[1]
          url: request.data.url
          method: data.method
          protocol: url[0]
          route:
            path: data.path
        rollbar.handleError(error.data, request)

    stream.pipe(@_streams.squeeze)

    callback()

module.exports.attributes =
  pkg: require('../package.json')

module.exports = (events, config={}) ->
  console.log '######## NEW GOOD ROLLBAR'
  new GoodRollbar events, config
