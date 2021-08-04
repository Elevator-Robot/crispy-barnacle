import * as path from "path";
import { Runtime } from "@aws-cdk/aws-lambda";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import {
  Chain,
  Choice,
  Condition,
  Fail,
  StateMachine,
} from "@aws-cdk/aws-stepfunctions";
import { LambdaInvoke } from "@aws-cdk/aws-stepfunctions-tasks";
import { Construct, Stack, StackProps, CfnOutput } from "@aws-cdk/core";

const lambdapath = path.resolve(__dirname, "lambdas");

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const lambdaProps = {
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node12.19.0",
      },
      handler: "handler",
      runtime: Runtime.NODEJS_12_X,
    };

    const escalateCaseLambda = new NodejsFunction(
      this,
      "escalateCaseFunction",
      {
        ...lambdaProps,
        entry: `${lambdapath}/error.ts`,
      }
    );

    const validate = new NodejsFunction(this, "validationFunction", {
      ...lambdaProps,
      entry: `${lambdapath}/validator.ts`,
    });

    const transcode = new NodejsFunction(this, "transcoderFunction", {
      ...lambdaProps,
      entry: `${lambdapath}/transcoder.ts`,
    });

    const cleanup = new NodejsFunction(this, "cleanupFunction", {
      ...lambdaProps,
      entry: `${lambdapath}/cleanup.ts`,
    });

    const validateFile = new LambdaInvoke(this, "Validate File", {
      lambdaFunction: validate,
    });

    const transcodeFile = new LambdaInvoke(this, "Transcode File", {
      lambdaFunction: transcode,
    });

    const cleanupFile = new LambdaInvoke(this, "Cleanup File", {
      lambdaFunction: cleanup,
    });

    const escalateCase = new LambdaInvoke(this, "Escalate Case", {
      lambdaFunction: escalateCaseLambda,
    });

    const jobFailed = new Fail(this, "Fail", {
      cause: "Engage Tier 2 Support",
    });

    const isComplete = new Choice(this, "Is Case Resolved");

    const chain = Chain.start(validateFile)
      .next(transcodeFile)
      .next(
        isComplete
          .when(Condition.numberEquals("$.Status", 1), cleanupFile)
          .when(
            Condition.numberEquals("$.Status", 0),
            escalateCase.next(jobFailed)
          )
      );

    new StateMachine(this, "StateMachine", {
      definition: chain,
    });
  }
}
