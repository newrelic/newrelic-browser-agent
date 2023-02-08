/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const sauceConnectLauncher = require('sauce-connect-launcher');
const os = require('os');
const childProcess = require('child_process');

let externalServices = new Set();

function getSauceLabsCreds() {
  let sauceLabsUsername = process.env.JIL_SAUCE_LABS_USERNAME;
  let sauceLabsAccessKey = process.env.JIL_SAUCE_LABS_ACCESS_KEY;

  if (!sauceLabsUsername || !sauceLabsAccessKey) {
    throw new Error(
      'Did not find Sauce Labs credentials in JIL_SAUCE_LABS_USERNAME and JIL_SAUCE_LABS_ACCESS_KEY environment variables. Please set them.'
    );
  }

  return {
    username: sauceLabsUsername,
    accessKey: sauceLabsAccessKey,
  };
}

function startExternalServices(browsers, config, cb) {
  let needSauce = !!config.sauce;

  if (!needSauce) return cb();

  let remaining = [needSauce].filter(Boolean).length;

  if (needSauce) startSauce(config, checkDone);

  function checkDone() {
    if (--remaining) return;
    cb();
  }
}

function stopExternalServices() {
  for (let service of externalServices) {
    service.kill();
  }
}

function startSauce(config, cb) {
  var tunnelIdentifier = process.env.USER + '@' + os.hostname();
  var sauceCreds = getSauceLabsCreds();

  var opts = {
    username: sauceCreds.username,
    accessKey: sauceCreds.accessKey,
    tunnelName: tunnelIdentifier,
    noSslBumpDomains: 'all',
    logger: console.log,
    tunnelDomains: config.host || 'bam-test-1.nr-local.net',
  };

  if (config.verbose) {
    opts.verbose = true;
    opts.verboseDebugging = true;
    console.log('starting sauce-connect with tunnel ID = ' + tunnelIdentifier);
  }

  sauceConnectLauncher(opts, function (err, sauceConnect) {
    if (err) {
      return cb(new Error('Failed to start sauce-connect: ' + err.message));
    }

    externalServices.add(sauceConnect);
    sauceConnect.on('exit', () => externalServices.delete(sauceConnect));

    cb();
  });
}

function isSauceConnected() {
  for (let item of externalServices.values()) {
    if (item.spawnfile.indexOf('sauce-connect-launcher') > -1) {
      return true;
    }
  }
  return false;
}

module.exports = {
  getSauceLabsCreds,
  startExternalServices,
  stopExternalServices,
  startSauce,
  isSauceConnected,
};
