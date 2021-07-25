import { String } from "aws-sdk/clients/batch";

export type event = {
  Records: [
    {
      s3: {
        s3SchemaVersion?: string;
        configurationId?: string;
        bucket: {
          name: string;
          arn: string;
        };
        object: {
          key: string;
        };
      };
    }
  ];
};

export const dummyEvent = {
  Records: [
    {
      s3: {
        bucket: {
          name: "test-ingest-s3-bucket",
          arn: "arn:aws:s3:::test-ingest-s3-bucket",
        },
        object: {
          key: "file_example_WAV_10MG.wav",
        },
      },
    },
  ],
};
