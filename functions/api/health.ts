import { handleOptions, createJsonResponse } from '../../src/runtime';

export const onRequestGet = async () => {
  return createJsonResponse({ status: "ok", mode: "REST" });
};

export const onRequestOptions = async () => {
  return handleOptions();
};
