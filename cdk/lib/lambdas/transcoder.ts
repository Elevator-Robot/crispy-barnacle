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
  return await promise
    .then(() => {
      return {
        statusCode: 201,
        body: JSON.stringify({
          message: `Successfully transcoded media`,
          payload: event,
        }),
      };
    })
    .catch((err: Error) => {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: err,
          message: `Could not transcode media: ${key} in bucket: ${inputBucket}`,
          payload: event,
        }),
      };
    });
};

// Uncomment to fire locally with a simulated event.
//handler(dummyEvent);
