import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type WatchSummary = InferResponseType<
  (typeof client)["watch"]["summary"]["$get"],
  200
>;

export type WatchSummaryTask = WatchSummary["tasks"][number];

/**
 * The compact cross-workspace view built for the watch apps: the caller's
 * open assigned tasks, the projects they sit in and the running timer. The
 * assistant route uses it to act on a spoken task name without knowing the
 * workspace first.
 */
async function getWatchSummary(): Promise<WatchSummary> {
  const response = await client.watch.summary.$get();

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getWatchSummary;
