'use strict';

const lti = require('ims-lti');
const session = require('express-session');
const NodeCache = require('node-cache');
const nodeCacheNonceStore = require('../node-cache-nonce');
const myCache = new NodeCache();
const nonceStore = new nodeCacheNonceStore(myCache);

/* LTI Consumer Keys and Secrets go into Azure Configuration Key "ltiConsumerKeys", */
/* with format "consumer:secret[,consumer2:secret2]".                               */

const consumerKeys = process.env.LTI_KEYS;
const debugLogging = process.env.debugLogging == "true" ? true : false;
var secrets = [];

const getSecret = (consumerKey, callback) => {
    if (consumerKeys && secrets.length == 0) {
        for (const key of consumerKeys.split(',')) {
            secrets.push({
                "consumerKey": key.split(':')[0],
                "secret": key.split(':')[1]
            });

            console.log("Added consumer key for '" + key.split(':')[0] + "'.");
        }
    }

    for (const secret of secrets) {
        if (secret.consumerKey == consumerKey) {
            return callback(null, secret.secret);
        }
    }

    let err = new Error("Unknown consumer '" + consumerKey + "'.");
    err.status = 403;

    return callback(err);
};

exports.handleLaunch = (page) => function(req, res) {
    console.log("[HandleLaunch] Target page: " + page);

    if (!req.body) {
        console.error("No request body.");
        return res.status(400).json('No request body.')
    }

    console.log("Request body: " + JSON.stringify(req.body));

    const consumerKey = req.body.oauth_consumer_key;

    if (!consumerKey) {
        return res.status(422).json('No consumer key.')
    }

    getSecret(consumerKey, (err, consumerSecret) => {
        if (err) {
            console.error(err);
        }

        console.log("Calling lti.Provider...");
        const provider = new lti.Provider(consumerKey, consumerSecret);

        console.log(provider);

        console.log("Checking valid_request...");

        provider.valid_request(req, async(err, isValid) => {
            console.log("Inside valid_request...");
            console.log(provider);

            if (err) {
                console.error(err);
            }
            if (isValid) {
                console.log("Request is valid, LTI Data:" + JSON.stringify(provider.body));

                if (req.session) {
                    console.log("Setting session lti part.");
                    req.session.lti = provider.body;                    
                }
                else {

                }

                return res.redirect("/");
            }
            else {
                console.error("The request is NOT valid.");
                req.session.error = true;
                return res.status(500).json('LTI request is not valid.')
            }
        });
        
        console.log("This is the end of getSecret.");
    });

    console.log("This is the end of handleLaunch.");
}

