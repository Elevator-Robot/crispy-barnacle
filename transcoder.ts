/**
 * Transcoder.ts
 * @author John Weland <john.weland@gmail.com>
 * @packageDocumentation
 */

import { event, dummyEvent } from "./types";
import ffmpeg_path from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { S3, SharedIniFileCredentials } from "aws-sdk";
import { Stream } from "stream";
import { STATUS_CODES } from "http";

const AWS_CREDENTIALS = new SharedIniFileCredentials({ profile: "default" });

ffmpeg.setFfmpegPath(ffmpeg_path);

/**
 * @description Upload to AWS S3 in memory
 * @param { string } bucket AWS Destination S3 Bucket Name
 * @param { string } key    AWS Destination S3 Object Key
 * @param { string } tags   AWS Object Tags
 * @param { object } deps   Dependancy Object
 *
 * @returns { { Stream.PassThrough, Promise } } object with passthrough && promise
 */
export const uploadFromStream = (
  bucket: string,
  key: string,
  tags: string,
  deps: { s3: S3 }
) => {
  let pass = new Stream.PassThrough();
  return {
    writestream: pass,
    promise: deps.s3
      .upload({
        Bucket: bucket,
        Key: key,
        Body: pass,
        ContentType: "audio/ogg",
        Tagging: tags,
      })
      .promise(),
  };
};

/**
 * @description Checks to see if the intended object exists
 * @param { string } bucket AWS Destination S3 Bucket Name
 * @param { string } key    AWS Destination S3 Object Key
 * @param { object } deps Dependancy Object
 *
 * @returns { string } signed URL
 */
export const validate = async (
  bucket: string,
  key: string,
  deps: { s3: S3 }
) => {
  let params = {
    Bucket: bucket,
    Key: key,
  };

  return await deps.s3
    .headObject(params)
    .promise()
    .then(() => {
      return true;
    })
    .catch((err: Error) => {
      console.error(`Could not find ${params.Key} in bucket: ${params.Bucket}`);
      return false;
    });
};

/**
 * @description Cleans up the target object from the ingest bucket
 * @param { string } bucket AWS Destination S3 Bucket Name
 * @param { string } key    AWS Destination S3 Object Key
 * @param { object } deps Dependancy Object
 */
export const cleanup = async (
  bucket: string,
  key: string,
  deps: { s3: S3 }
) => {
  let params = {
    Bucket: bucket,
    Key: key,
  };
  await deps.s3
    .deleteObject(params)
    .promise()
    .catch((err: Error) => {
      console.error(
        `Failed to remove ${params.Key} from bucket: ${params.Bucket}`
      );
    });
};
/**
 * @description Core transcoder handler function
 * @param { event } event Incoming S3 event
 *
 * @returns { { json } } json {statuscode:200}
 */
export const handler = async (event: any) => {
  const inputBucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  const _bucket = "testing-output-s3-bucket";
  const _key = key.replace(".wav", ".ogg");
  const _tags = "string"; // @TODO: build tagstring from input object tags
  const _deps = {
    s3: new S3({
      httpOptions: {
        timeout: 30000,
      },
      maxRetries: 3,
      credentials: AWS_CREDENTIALS,
    }),
  };
  let result = { statusCode: 201 };
  const isValid = await validate(inputBucket, key, _deps);
  if (!isValid) result = { statusCode: 404 };
  if (isValid) {
    const inputUrl = await _deps.s3.getSignedUrl("getObject", {
      Bucket: inputBucket,
      Key: key,
    });

    const { writestream, promise } = uploadFromStream(
      _bucket,
      _key,
      _tags,
      _deps
    );

    ffmpeg(inputUrl)
      .noVideo()
      .audioBitrate(128)
      .audioCodec("libvorbis")
      .format("ogg")
      .on("error", (err: Error) => {
        console.error(err.message);
      })
      .on("end", () => {
        console.log("Finished processing");
      })
      .pipe(writestream, {
        end: true,
      });
    await promise.catch((err: Error) => {
      result = { statusCode: 500 };
      console.error(err.message);
    });
    await cleanup(inputBucket, key, _deps);
  }
  console.log(result);
  return result;
};

// Uncomment to fire locally with a simulated event.
handler(dummyEvent);
