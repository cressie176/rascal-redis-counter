var chalk = require('chalk');

module.exports = function(broker) {
  return function(user, cb) {

    // Pretend we'd really asynchronousely saved something
    setImmediate(function() {
      console.log(chalk.magenta('Saving user:'), user.username);

      // Simulate poisoned message
      if (user.crash) throw new Error('Crashing on user: ' + user.username);

      cb();
    });
  };
};
