/**
 * Transcoder.ts
 * @author John Weland <john.weland@gmail.com>
 * @packageDocumentation
 */

import { event, dummyEvent } from "./types";
import ffmpeg_path from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { S3 } from "aws-sdk";
import { Stream } from "stream";

ffmpeg.setFfmpegPath(ffmpeg_path);

/**
 *
 * @param { string } bucket AWS Destination S3 Bucket Name
 * @param { string } key    AWS Destination S3 Object Key
 * @param { string } tags   AWS Object Tags
 * @param { string } deps   Dependancy Object
 * @returns { Stream.PassThrough } passthrough
 */
export const uploadFromStream = (
  bucket: string,
  key: string,
  tags: string,
  deps: { s3: S3 }
) => {
  let pass = new Stream.PassThrough();
  let params = { Bucket: bucket, Key: key, Tagging: tags, Body: pass };
  deps.s3.upload(params, (err: Error, data: any) => {
    if (err) console.error(err);
  });
  return pass;
};

/**
 * Core transcoder handler function
 * @param { event } event Incoming S3 event
 */
export const handler = (event: event) => {
  const input_bucket = "string"; // @TODO: pull input_bucket from event
  const _bucket = "bucket_name"; // @TODO:;
  const key = "keyname"; // @TODO: pull key from event
  const _key = key; // @TODO: replace input extension with output extension
  const _tags = "string"; // @TODO: build tagstring from input object tags
  const _deps = {
    s3: new S3(),
  };
  const input_url = `https://${input_bucket}.s3.amazonaws.com/${key}`;
  const writestream = uploadFromStream(_bucket, _key, _tags, _deps);

  ffmpeg(input_url) // @TODO: replace with S3 URL built from ex https://input_bucket/stuff.region.aws.com/key
    .noVideo()
    .audioBitrate(128)
    .audioCodec("libvorbis")
    .on("error", (err) => {
      console.log("An error occurred: " + err.message);
    })
    .on("end", () => {
      console.log("Finished processing");
    })
    .pipe(writestream);
};

// Uncomment to fire locally with a simulated event.
// handler(dummyEvent);
