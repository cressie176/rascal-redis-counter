var redis = require('redis');
var assert = require('assert');
var async = require('async');
var cache = require('..');

describe('Redis Counter', function() {

  var client;
  var counter;

  beforeEach(function(done) {
    counter = cache();
    client = redis.createClient();
    client.flushdb(done);
  });

  it('should return increment and get entries', function(done) {
    var results = {};
    async.eachSeries(['one', 'two', 'one'], function(key, cb) {
      counter.incrementAndGet(key, function(err, value) {
        if (err) return cb(err);
        results[key] = value;
        cb();
      });
    }, function(err) {
      assert.ifError(err);
      assert.equal(results.one, 2);
      assert.equal(results.two, 1);
      done();
    });
  });

  it('should expire counters', function(done) {
    counter.incrementAndGet('one', function(err, value) {
      assert.ifError(err);
      assert.equal(value, 1);

      setTimeout(function() {
        client.get('one', function(err, value) {
          assert.ifError(err);
          assert.equal(value, undefined);
          done();
        });
      }, 1100);
    });
  });
});
