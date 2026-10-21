import type { DefaultBodyType, HttpResponseInit, JsonBodyType } from "msw";
import { HttpResponse as MSWHttpResponse } from "msw";

// Keep literal values while making inferred JSON arrays and tuples mutable.
// JSON serialization does not preserve the input's readonly modifiers.
type MutableJsonBody<Body> = Body extends (...args: never[]) => unknown
  ? Body
  : Body extends object
    ? { -readonly [Key in keyof Body]: JsonResponseBody<Body[Key]> }
    : Body;

// Do not erase nominal/private fields when an explicit MSW body type has them.
type JsonResponseBody<Body> = Body extends unknown
  ? MutableJsonBody<Body> extends Body
    ? MutableJsonBody<Body>
    : Body
  : never;

type JsonResponse<Body extends JsonBodyType> = [Body] extends [never]
  ? MSWHttpResponse<Body>
  : Body extends JsonBodyType
    ? MSWHttpResponse<JsonResponseBody<Body>>
    : never;

interface InferredResponseMethods {
  json(body?: undefined, init?: HttpResponseInit): MSWHttpResponse<undefined>;
  json<const Body extends JsonBodyType>(body?: Body, init?: HttpResponseInit): JsonResponse<Body>;
  text<Body extends string>(body?: Body | null, init?: HttpResponseInit): MSWHttpResponse<Body>;
}

/** An MSW response with the given body type. */
// oxlint-disable-next-line no-redeclare -- Pair the type with the runtime constructor export.
export type HttpResponse<Body extends DefaultBodyType> = MSWHttpResponse<Body>;

/**
 * The original MSW constructor, with body inference for json() and text().
 * Other static methods and constructor signatures stay unchanged.
 */
export const HttpResponse = MSWHttpResponse as InferredResponseMethods & typeof MSWHttpResponse;
