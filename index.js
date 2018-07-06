var redis = require('redis');
var defaults = require('lodash.defaultsdeep');

module.exports = function init(options) {

  options = options || {};
  var maxConnectionRetry = options.maxConnectionRetry || 30000;
  var minConnectionRetry = options.minConnectionRetry || 1000;
  var connectionRetryFluctuation = options.connectionRetryFluctuation || 1000;

  var config = defaults({}, options, {
    client: {
      prefix: 'rascal:',
      no_ready_check: true,
      enable_offline_queue: false,
      retry_strategy: function(retryOptions) {
        var fluctuation = Math.floor(Math.random() * connectionRetryFluctuation);
        var exponentialRetry = retryOptions.attempt * minConnectionRetry;
        var variableRetry = exponentialRetry + fluctuation;
        var actualRetry = Math.min(variableRetry, maxConnectionRetry);
        return actualRetry;
      }
    },
    expire: 60000,
  });
  var seconds = Math.max(config.expire / 1000, 1);
  var client = redis.createClient(config.client);
  client.on('error', function(err) {
    console.error('Redis client error', err);
  });

  return {
    incrementAndGet: function(key, next) {
      client
        .multi()
        .incr(key)
        .expire(key, seconds)
        .exec(function(err, replies) {
          if (err) return next(err);
          next(null, parseInt(replies[0], 10));
        });
    }
  };
};
