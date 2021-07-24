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
 * Core handler
 * @param { event } event Incoming S3 event
 */
export const handler = (event: event) => {
  const input_bucket = "string"; // @TODO: pull input_bucket from event
  let _bucket = "bucket_name"; // @TODO:;
  let key,
    _key = "keyname"; // @TODO: pull key from event, replace input extension with output extension
  let _tags = "string"; // @TODO: build tagstring from input object tags
  let _deps = {
    s3: new S3(),
  };
  const input_url = `https://${input_bucket}.s3.amazonaws.com/${key}`;
  const writestream = uploadFromStream(_bucket, _key, _tags, _deps);

  ffmpeg("test_input.wav") // @TODO: replace with S3 URL built from https://input_bucket/stuff.region.aws.com/key
    .noVideo()
    .audioBitrate(128)
    .audioCodec("libvorbis")
    .output("test_ouput.ogg")
    .on("error", (err) => {
      console.log("An error occurred: " + err.message);
    })
    .on("end", () => {
      console.log("Finished processing");
    })
    .pipe(writestream);
};
handler(dummyEvent);
