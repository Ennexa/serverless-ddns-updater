'use strict';

const DdnsUpdater = require('./ddns-updater.js');
const config = require('./config.json');

exports.index = function (event, context, callback) {
    callback(null, {
        statusCode: 200,
        body: event.requestContext.identity.sourceIp
    });
};

exports.update = function (event, context, callback) {
    const input = event.queryStringParameters || {};

    let hostname = input.hostname;
    let sourceIp = event.requestContext.identity.sourceIp;
    let ip = input.myip || sourceIp;
    
    if (hostname && (hostname in config.hosts)) {
        const hostConfig = config.hosts[hostname];
        let updater = new DdnsUpdater(hostname, hostConfig);
        updater.updateRecord(ip)
            .then((result) => {
                console.log(result);
                callback(null, {statusCode: 200, body: result, headers: {'Content-Type': 'text/plain'}})
            });
    } else {
        callback(null, {
            statusCode: 400,
            body: 'nohost'
        });
    }
};

