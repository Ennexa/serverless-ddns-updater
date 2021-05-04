'use strict';

import DdnsUpdater from './ddns-updater.js';
import { IConfig, IHostConfig, Loader as ConfigLoader } from './config.js';
import { APIGatewayEvent, Callback, Context } from 'aws-lambda';

function createResponse(statusCode: number, body: string) {
    return {
        statusCode: statusCode,
        body: body,
        headers: {'Content-Type': 'text/plain'}
    };
}

function index(event: APIGatewayEvent, context: Context, callback: Callback) {
    callback(null, createResponse(200, event.requestContext.identity.sourceIp));
}

async function update(event: APIGatewayEvent) {
    const input = event.queryStringParameters || {};

    const config: IConfig = await ConfigLoader.load();
    const sourceIp: string = event.requestContext.identity.sourceIp;
    const ip: string = input.myip || sourceIp;

    if (!input.hostname) {
        return createResponse(400, 'nohost');
    }

    const hostname: string = input.hostname;
    if (!(hostname in config.hosts)) {
        return createResponse(400, 'nohost');
    }

    const hostConfig: IHostConfig = config.hosts[hostname];
    const providerConfig = config.providers[hostConfig.provider];
    const updater = new DdnsUpdater(hostname, hostConfig, providerConfig);

    const currentIp: string|null = await updater.get(hostname);

    if (currentIp === ip) {
        return createResponse(200, `nochg ${ip}`);
    }

    await updater.update(hostname, ip);

    return createResponse(200, `good ${ip}`);
}

export {index, update};

