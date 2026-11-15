export type BuildInfo = {
  /** Full git commit the running image was built from, or null when the build did not record it. */
  commit: string | null;
  /** Release name given at build time, e.g. a tag, or null. */
  version: string | null;
};

const COMMIT = /^[0-9a-f]{7,40}$/;
const VERSION = /^[\w.+-]{1,64}$/;

/**
 * The commit and version baked into the image as build arguments
 * (Dockerfile.kaneo: SOURCE_COMMIT and TICKTACK_VERSION). Anything that does
 * not look like one is reported as unknown rather than echoed back.
 */
export function readBuildInfo(env: NodeJS.ProcessEnv = process.env): BuildInfo {
  const commit = env.KANEO_BUILD_COMMIT?.trim().toLowerCase() ?? "";
  const version = env.KANEO_BUILD_VERSION?.trim() ?? "";
  return {
    commit: COMMIT.test(commit) ? commit : null,
    version: VERSION.test(version) ? version : null,
  };
}
