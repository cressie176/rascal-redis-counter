var Rascal = require('rascal');
var config = require('./config');
var _ = require('lodash');
var Chance = require('chance');
var chance = new Chance();
var format = require('util').format;

var redisCounter = require('..');
var counters = { redisCounter: redisCounter };

Rascal.Broker.create(Rascal.withDefaultConfig(config.rascal), { counters: counters }, function(err, broker) {
  if (err) bail(err);

  broker.on('error', function(err) {
    console.error(err.message);
  });

  _.each(broker.config.subscriptions, function(subscriptionConfig, subscriptionName) {

    if (!subscriptionConfig.handler) return;

    var handler = require('./handlers/' + subscriptionConfig.handler)(broker);

    broker.subscribe(subscriptionName, function(err, subscription) {

      if (err) bail(err);
      subscription
        .on('message', function(message, content, ackOrNack) {
          handler(content, function(err) {
            if (!err) return ackOrNack();
            ackOrNack(err, err.recoverable ? broker.config.recovery.deferred_retry : broker.config.recovery.dead_letter);
          });
        }).on('invalid_content', function(err, message, ackOrNack) {
          console.error('Invalid content', err.message);
          ackOrNack(err, broker.config.recovery.dead_letter);
        }).on('redeliveries_error', function(err, message, ackOrNack) {
          console.error('Redeliveries Error', err);
          ackOrNack(err, broker.config.recovery.dead_letter);
        }).on('error', function(err) {
          console.error(err.message);
        });
    });
  });

  // Simulate a web app handling user registrations
  setInterval(function() {
    var user = { username: chance.first() + '_' + chance.last(), crash: randomInt(10) === 10 };
    var routingKey = format('registration_webapp.user.created.%s', user.username);

    broker.publish('user_event', user, routingKey, function(err, publication) {
      if (err) return console.log(err.message);
      publication
        .on('success', function() {
          // confirmed
        }).on('error', function(err) {
          console.error(err.message);
        });
    });
  }, 1000);

  process.on('SIGINT', function() {
    broker.shutdown(function() {
      process.exit();
    });
  });
});

function randomInt(max) {
  return Math.floor(Math.random() * max) + 1;
}


function bail(err) {
  console.error(err);
  process.exit(1);
}
