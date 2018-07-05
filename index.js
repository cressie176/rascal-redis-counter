var redis = require('redis');
var defaults = require('lodash.defaultsDeep');

module.exports = function init(options) {

  var config = defaults({}, options, {
    client: {
      prefix: 'rascal:',
      no_ready_check: true,
      enable_offline_queue: false,
      retry_strategy: function(retryOptions) {
        return Math.min(retryOptions.attempt * 100, 3000);
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