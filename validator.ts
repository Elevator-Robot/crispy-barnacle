/**
 * validator.ts
 * @author John Weland <john.weland@gmail.com>
 * @packageDocumentation
 */

import { event, dummyEvent } from "./types";
import { S3, SharedIniFileCredentials } from "aws-sdk";

// const AWS_CREDENTIALS = new SharedIniFileCredentials({ profile: "default" });

/**
 * @description Checks to see if the intended object exists
 * @param { string } bucket AWS Destination S3 Bucket Name
 * @param { string } key    AWS Destination S3 Object Key
 * @param { object } deps Dependancy Object
 *
 * @returns { string } signed URL
 */
export const validate = (bucket: string, key: string, deps: { s3: S3 }) => {
  let params = {
    Bucket: bucket,
    Key: key,
  };

  return deps.s3.headObject(params).promise();
};

/**
 * @description Core transcoder handler function
 * @param { event } event Incoming S3 event
 *
 * @returns { { json } } json {statuscode:200}
 */
export const handler = async (event: any) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  const _deps = {
    s3: new S3({
      httpOptions: {
        timeout: 30000,
      },
      maxRetries: 3,
      credentials: {
        accessKeyId: "",
        secretAccessKey: "",
      },
    }),
  };
  return await validate(bucket, key, _deps)
    .then(() => {
      return {
        statusCode: 200,
        body: JSON.stringify({
          payload: event,
        }),
      };
    })
    .catch((err: Error) => {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: err,
          message: `Could not find ${key} in bucket: ${bucket}`,
          payload: event,
        }),
      };
    });
};
