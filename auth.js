'use strict';
const config = require('./config.json');
const bcrypt = require('bcryptjs');

function validate(username, password, callback) {
    const passwordHash = config.auth_backends.predefined.users[username];
    if (!passwordHash) {
       return callback(null, false);
    }
    return bcrypt.compare(password, passwordHash);
};


function generatePolicy(principalId, effect, resource) {
    const authResponse = {
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
};

module.exports.auth = function (event, context, callback) {
    const token = event.authorizationToken.split(/\s+/).pop() || '';
    const auth = new Buffer(token, 'base64').toString();
    const parts = auth.split(/:/);
    const username = parts[0] || '';
    const password = parts[1] || '';
    
    if (token) {
        validate(username, password).then((isValid) => {
            callback(null, generatePolicy('user', isValid ? 'Allow' : 'Deny', event.methodArn));
        });
    } else {
        callback('Unauthorized');
    }
};