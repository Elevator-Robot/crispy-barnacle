import { event, IStep } from "./types";

export const handler = async (event: IStep): Promise<IStep> => {
  // Escalate the support case
  const _event = event.event;
  const _status = event.status;
  const _message = event.message + "escalating.";
  return { message: _message, status: _status, event: _event };
};
