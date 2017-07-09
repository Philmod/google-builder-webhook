const Mailgun = require('mailgun-js');
const humanizeDuration = require('humanize-duration');
const config = require('./config.json');

module.exports.mailgun = new Mailgun({
  apiKey: config.MAILGUN_API_KEY,
  domain: config.MAILGUN_DOMAIN,
});
module.exports.status = config.GC_STATUS;

// subscribe is the main function called by GCF.
module.exports.subscribe = (event, callback) => {
  const build = module.exports.eventToBuild(event.data.data);

  // Skip if the current status is not in the status list.
  const status = module.exports.status || ['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT'];
  if (status.indexOf(build.status) === -1) {
    return callback();
  }

  // Send email.
  const message = module.exports.createEmail(build);
  module.exports.mailgun.messages().send(message, (err, res) => {
    if (err) console.log('Error:', err);
    callback(err);
  });
};

// eventToBuild transforms pubsub event message to a build object.
module.exports.eventToBuild = (data) => {
  return JSON.parse(new Buffer(data, 'base64').toString());
}

// createEmail create an email message from a build object.
module.exports.createEmail = (build) => {
  let duration = humanizeDuration(new Date(build.finishTime) - new Date(build.startTime));
  let content = `<p>Build ${build.id} finished with status ${build.status}, in ${duration}.</p>`
    + `<p><a href="${build.logUrl}">Build logs</a></p>`;
  if (build.images) {
    let images = build.images.join(',');
    content += `<p>Images: ${images}</p>`;
  }
  let message = {
    from: config.MAILGUN_FROM,
    to: config.MAILGUN_TO,
    subject: `Build ${build.id} finished`,
    text: content
  };
  return message
}
