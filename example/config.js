module.exports = {
  "rascal": {
    "vhosts": {

      // Define the name of the vhost
      "/": {

        // Define the vhost connection parameters. Specify multiple entries for cluster
        "connections": [
          {
            "user": "guest",
            "password": "guest",
            "port": 5672,
            "options": {
              "heartbeat": 1
            },
            socketOptions: {
              timeout: 1000
            }
          }
        ],

        // Define exchanges within the registration vhost
        "exchanges": [
          "service",      // Shared exchange for all services within this vhost
          "dead_letters"  // When retring fails messages end up here
        ],

        // Define queues within the registration vhost
        // A good naming convension for queues is consumer:entity:action
        "queues": {

          // Create a queue for saving users
          "registration_service:user:save": {
            "options": {
              "arguments": {
                // Route nacked messages to a service specific dead letter queue
                "x-dead-letter-exchange": "dead_letters",
                "x-dead-letter-routing-key": "registration_service.dead_letter"
              }
            }
          },

          // Queue for holding dead letters until they can be resolved
          "dead_letters:registration_service": {}
        },

        // Bind the queues to the exchanges.
        // A good naming convention for routing keys is producer.entity.event
        "bindings": {

          // Route create/update user messages to the save queue
          "service[registration_webapp.user.created.#] -> registration_service:user:save": {},

          // Route dead letters the service specific dead letter queue
          "dead_letters[registration_service.dead_letter] -> dead_letters:registration_service": {}

        },

        // Setup subscriptions
        "subscriptions": {
          "save_user": {
            "queue": "registration_service:user:save",
            "handler": "saveUser.js",
            "redeliveries": {
              "limit": 5,
              "counter": "shared"
            }
          }
        },

        // Setup publications
        "publications": {

          // Always publish a notification of success (it's useful for testing if nothing else)
          "save_user_succeeded": {
            "exchange": "service"
          },

          // Publication for generating user create, update and delete messages
          // This would probably be the job of another application (e.g. a web application)
          "user_event": {
            "exchange": "service"
          }
        }
      }
    },
    // Define recovery strategies for different error scenarios
    "recovery": {
      // Republishing with immediate nack returns the message to the original queue but decorates
      // it with error headers. The next time Rascal encounters the message it immedately nacks it
      // causing it to be routed to the services dead letter queue
      "dead_letter": [
        {
          "strategy": "republish",
          "immediateNack": true
        }
      ]
    },
    // Define counter(s) for counting redeliveries
    "redeliveries": {
      "counters": {
        "shared": {
          "type": "redisCounter"
        }
      }
    }
  }
};
