# AWS Media Transcoder

## Objective

Build a process in which an upload happening to an S3 bucket (A) triggers a Lambda function to then transcode the uploaded file in memory and stream it to an S3 bucket (B) while retainign key data such as file name (except previous extention) and the S3 objects tags (updating where appropriate).
