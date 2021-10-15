const AWS = require('aws-sdk')
const signalFxLambda = require('signalfx-lambda');
const tracing = require("signalfx-lambda/tracing");
const FORMATS = require("signalfx-tracing/ext/formats.js");

// Create client outside of handler to reuse
const lambda = new AWS.Lambda()

// Handler
exports.handler = signalFxLambda.asyncWrapper(async (event, context) => {

  const headers = event.Records[0].messageAttributes.headers.stringValue;
  console.log("headers: ", headers);
 // event.headers = headers

  const tracer = tracing.tracer();
  
  let rootSpan ={};
  rootSpan = tracer.extract(FORMATS.HTTP_HEADERS,JSON.parse(headers));
  
  if (rootSpan) {
         console.log("We have a Parent span");
        }
        else console.log("No Parent Span");
     
    
  //const span = tracer.scope().active()
  const span = tracer.startSpan("ConsumerSQSRead", { childOf: rootSpan }); // get the active span (only if you wish to use custom tags)
  span.setTag("span.kind", "server");
  span.setTag("component", "node-lambda-wrapper");
  Object.entries(getExecutionMetadata(context)).forEach((pair) => {
      if (pair[1]) {
        span.setTag(pair[0], pair[1]);
      }
    });

  event.Records.forEach(record => {
    console.log(record.body)
  })
  
 // Add Logs to the Span
  span.log('## EVENT: ' + serialize(event))
  span.finish();
  
  return null;
});

// Use SDK client
var getAccountSettings = function(){
  return lambda.getAccountSettings().promise()
}

var serialize = function(object) {
  return JSON.stringify(object, null, 2)
}

var  getExecutionMetadata = function (context) {
    const meta = {};
    if (!context) {
      return meta;
    }

    const splitted = context.invokedFunctionArn.split(":");
    if (splitted[2] === "lambda") {
      meta.aws_function_name = context.functionName;
      meta.aws_function_version = context.functionVersion;

      meta.aws_region = splitted[3];
      meta.aws_account_id = splitted[4];

      if (splitted[5] === "function") {
        meta.aws_function_qualifier = splitted[7];
        const updatedArn = splitted.slice();
        updatedArn[7] = context.functionVersion;
        meta.lambda_arn = updatedArn.join(":");
      } else if (splitted[5] === "event-source-mappings") {
        meta.event_source_mappings = splitted[6];
        meta.lambda_arn = context.invokedFunctionArn;
      }
    }

    if (process.env.AWS_EXECUTION_ENV) {
      meta.aws_execution_env = process.env.AWS_EXECUTION_ENV;
    }

    return meta;
  }

