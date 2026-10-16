import { inject } from "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    mswVersion: string;
    mswMajor: number;
    mswEntry: string;
  }
}

export const mswMajor = inject("mswMajor");
export const unhandledRequestOption = mswMajor === 2 ? "onUnhandledRequest" : "onUnhandledFrame";
export const listenOptions = { [unhandledRequestOption]: "error" } as const;
const unhandledRequestError = {
  name: "InternalError",
  message: `[MSW] Cannot bypass a request when using the "error" strategy for the "${unhandledRequestOption}" option.`,
};

// Native fetch wraps the MSW error in its cause under v3's socket interception.
export const unhandledFetchError =
  mswMajor === 2
    ? unhandledRequestError
    : { name: "TypeError", message: "fetch failed", cause: unhandledRequestError };
