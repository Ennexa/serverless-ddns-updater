'use strict';

import bcrypt from 'bcryptjs';
import { IConfig, Loader as ConfigLoader } from './config';
import { Callback, Context, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

async function validate(username: string, password: string) {
    const config: IConfig = await ConfigLoader.load();

    const passwordHash = config.auth_backends.predefined.users[username];
    if (!passwordHash) {
        return false;
    }

    return bcrypt.compare(password, passwordHash);
}


function generatePolicy(principalId: string, effect: string, resource: string) {
    const authResponse: any = {
        principalId: principalId
    };

    if (effect && resource) {
        authResponse.policyDocument = {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource
                }
            ]
        };
    }
    return authResponse;
}

async function checkCredentials(event: APIGatewayTokenAuthorizerEvent) {
    const token = event.authorizationToken.split(/\s+/).pop() || '';
    const auth = new Buffer(token, 'base64').toString();
    const parts = auth.split(/:/);
    const username = parts[0] || '';
    const password = parts[1] || '';

    if (!token) {
        return false;
    }

    return await validate(username, password);
}

export async function auth (
    event: APIGatewayTokenAuthorizerEvent,
    context: Context,
    callback: Callback
) {
    const isAuthorized = await checkCredentials(event);

    if (!isAuthorized) {
        callback('Unauthorized');

        return;
    }

    return generatePolicy('user', 'Allow', event.methodArn);
}
