# rascal-redis-counter
A redis backed redelivery counter for [rascal](https://www.npmjs.com/package/rascal)

## TL;DR

#### Configure Rascal to use the redis counter
```json
{
  "vhosts": {
      "exchanges": [
        "application_ex",
        "dead_letter_ex"
      ],            
      "queues": {        
        "work_q": {
          "options": {
            "arguments": {              
              "x-dead-letter-exchange": "dead_letter_ex"
            }
          }
        },        
        "dead_letter_q": {}
      },            
      "bindings": {        
        "application_ex -> work_q": {},        
        "dead_letter_ex -> dead_letter_q": {}
      },      
      "subscriptions": {
        "work_sub": {
          "queue": "work_q",
          "redeliveries": {
            "limit": 5,
            "counter": "shared"
          }
        }
      }
    }
  },  
  "redeliveries": {
    "counters": {
      "shared": {
        "type": "redisCounter",
        "client": {
          "host": "example.com",
          "db": 7
        }
      }
    }
  }
};
```

#### Instantiate the Rascal with the redis counter
```js
var Rascal = require('rascal');
var config = require('./config');

var redisCounter = require('rascal-redis-counter');
var counters = { redisCounter: redisCounter };

Rascal.Broker.create(Rascal.withDefaultConfig(config.rascal), { counters: counters }, function(err, broker) {
  if (err) throw new err;

  broker.on('error', function(err) {
    console.error(err.message);
  });

  broker.subscribe(subscriptionName, function(err, subscription) {
    if (err) throw new err;
    subscription
      .on('message', messageHander)
      .on('invalid_content', function(err, message, ackOrNack) {
        console.error('Invalid content', err.message);
        ackOrNack(err, { strategy: 'nack' });
      }).on('redeliveries_error', function(err, message, ackOrNack) {
        console.error('Redeliveries Error', err);
        ackOrNack(err, { strategy: 'nack' });
      }).on('error', function(err) {
        console.error(err.message);
      });
  });
});
```
