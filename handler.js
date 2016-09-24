'use strict';
const AWS = require('aws-sdk');
const bluebirdP = require('bluebird');

const region = 'eu-west-1';
AWS.config.update({region: region || 'eu-west-1'});

const lambda = new AWS.Lambda();
const CONSUMER_LAMBDA = "wefarm-entity-service-dev-process";

const error = (context) => (err) => {
  //debugger;
  const contextString = JSON.stringify(context);
  console.log(`Error::${contextString}\nmsg:err`);
};

function promiseTimeout(ms, no, toAccept) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
          if(toAccept) {
            resolve();
          }else {
            reject(no + ': Promise timed out after ' + ms + ' ms');
          }
        }, ms);
    });
}

const delegate = (ConsumerLambda) => () => {
  //debugger;
  const lambdaName = ConsumerLambda;
  const params = {
    FunctionName: ConsumerLambda,
    Payload: ""
  }
  let lambdaResponse = lambda.invoke(params).promise().catch( error({
                   info: 'error invoking lambda',
                   payload: "Nothing"
                 }));
  //debugger;
  return  lambdaResponse;
};

// Your first function handler
module.exports.dispatch = (event, context, cb) => {
  let timeout = promiseTimeout(290000, 1);

  let calls = new Array(1000000);
  let dispatching = bluebirdP.map( calls, delegate(CONSUMER_LAMBDA) , {concurrency: 500} );

  Promise.race([timeout, dispatching]).then(() => {
    delegate('wefarm-job-dispatcher-dev-dispatch')();
    cb(null,
        { message: 'Dispatched all the calls, recurring', event })
  }).catch((e) => {
    delegate('wefarm-job-dispatcher-dev-dispatch')();
    cb(e + "\n" + "Timeout, recurring");
  });
}
