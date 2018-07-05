var cluster = require('cluster');

if (cluster.isMaster) {
  cluster.fork();
  cluster.on('exit', function() {
    cluster.fork();
  });
} else {
  require('./index');
}
