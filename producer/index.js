const AWS = require('aws-sdk')
const signalFxLambda = require('signalfx-lambda');
const tracing = require("signalfx-lambda/tracing");


// Create client outside of handler to reuse
const lambda = new AWS.Lambda()
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

// Handler
exports.handler = signalFxLambda.asyncWrapper(async (event, context) => {

  const contextCarrier = {}; // any writeable object
  tracing.inject(contextCarrier);

  var params = {
    // Remove DelaySeconds parameter and value for FIFO queues
   DelaySeconds: 10,
   MessageAttributes: {
    "headers":{
       DataType: "String",
       StringValue: JSON.stringify( contextCarrier )
     },
     "Title": {
       DataType: "String",
       StringValue: "The Whistler"
      },
     "Author": {
       DataType: "String",
       StringValue: "John Grisham"
      },
     "WeeksOn": {
       DataType: "Number",
       StringValue: "6"
      }
    },
    MessageBody: "Information about current NY Times fiction bestseller for week of 12/11/2016.",
   // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
   // MessageGroupId: "Group1",  // Required for FIFO queues
    QueueUrl: "https://sqs.ap-southeast-2.amazonaws.com/972204093366/DemoQ"
  };

  // To add any other data into Spans as Tags
  const tracer = tracing.tracer();
  tracer.scope().active().setTag("custom_tag.sqs.message", serialize(params));
  // send custom metrics
  signalFxLambda.helper.sendGauge('books.weeksOn', 6);


  sqs.sendMessage(params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data.MessageId);
    }
  });
 
  return getAccountSettings()
});

// Use SDK client
var getAccountSettings = function(){
  return lambda.getAccountSettings().promise()
}

var serialize = function(object) {
  return JSON.stringify(object, null, 2)
}
