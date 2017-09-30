const config = require('./config.json');

module.exports.request = require('request');
module.exports.status = config.GC_STATUS;

// subscribe is the main function called by GCF.
module.exports.subscribe = (event, callback) => {
  const build = module.exports.eventToBuild(event.data.data);

  // Skip if the current status is not in the status list.
  const status = module.exports.status || ['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT'];
  if (status.indexOf(build.status) === -1) {
    return callback();
  }

  // Send http request to webhook.
  module.exports.request.post({
    url: config.WEBHOOK,
    form: build,
  }, callback);
};

// eventToBuild transforms pubsub event message to a build object.
module.exports.eventToBuild = (data) => {
  return JSON.parse(new Buffer(data, 'base64').toString());
}
