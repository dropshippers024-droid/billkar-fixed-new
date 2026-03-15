var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-EuXgRD/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// workers/node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// workers/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// workers/node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// workers/node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// workers/node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// workers/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// workers/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// workers/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// workers/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// workers/node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// workers/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// workers/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// workers/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// workers/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// workers/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// workers/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// workers/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// workers/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// workers/node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// workers/index.ts
var app = new Hono2();
var encoder = new TextEncoder();
var PASSWORD_HASH_PREFIX = "pbkdf2";
var PASSWORD_HASH_ALGO = "sha-256";
var PASSWORD_HASH_ITERATIONS = 1e5;
var PASSWORD_HASH_LENGTH = 256;
var RESET_TOKEN_BYTES = 32;
var DEFAULT_RESET_TOKEN_TTL_MINUTES = 60;
var MIN_PASSWORD_LENGTH = 8;
var ASSIGNABLE_TEAM_ROLES = /* @__PURE__ */ new Set(["admin", "staff", "viewer"]);
var coreSchemaReady = null;
app.use("*", cors({ origin: "*" }));
function encodeBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
__name(encodeBase64Url, "encodeBase64Url");
function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
__name(decodeBase64Url, "decodeBase64Url");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
function getResetTokenTtlMinutes(env) {
  const parsed = Number(env.RESET_TOKEN_TTL_MINUTES || DEFAULT_RESET_TOKEN_TTL_MINUTES);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RESET_TOKEN_TTL_MINUTES;
}
__name(getResetTokenTtlMinutes, "getResetTokenTtlMinutes");
function randomToken() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(RESET_TOKEN_BYTES)));
}
__name(randomToken, "randomToken");
function asRecord(value) {
  return value && typeof value === "object" ? value : {};
}
__name(asRecord, "asRecord");
function getTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(getTrimmedString, "getTrimmedString");
function getOptionalString(value) {
  const trimmed = getTrimmedString(value);
  return trimmed ? trimmed : null;
}
__name(getOptionalString, "getOptionalString");
function toFiniteNumber(value, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
__name(toFiniteNumber, "toFiniteNumber");
function toBooleanInt(value) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes"].includes(normalized) ? 1 : 0;
  }
  return value ? 1 : 0;
}
__name(toBooleanInt, "toBooleanInt");
function getAssignableTeamRole(value) {
  const role = getTrimmedString(value).toLowerCase();
  return ASSIGNABLE_TEAM_ROLES.has(role) ? role : null;
}
__name(getAssignableTeamRole, "getAssignableTeamRole");
async function createJWT(userId, secret) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payload = btoa(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1e3) + 30 * 24 * 60 * 60
    // 30 days
  })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${payload}.${signature}`;
}
__name(createJWT, "createJWT");
async function verifyJWT(token, secret) {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const data = new TextEncoder().encode(`${header}.${payload}`);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!valid) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1e3)) return null;
    return decoded.sub;
  } catch {
    return null;
  }
}
__name(verifyJWT, "verifyJWT");
async function sha256Hex(value) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: PASSWORD_HASH_ALGO.toUpperCase(),
      salt,
      iterations: PASSWORD_HASH_ITERATIONS
    },
    key,
    PASSWORD_HASH_LENGTH
  );
  const digest = new Uint8Array(derivedBits);
  return [
    PASSWORD_HASH_PREFIX,
    PASSWORD_HASH_ALGO,
    String(PASSWORD_HASH_ITERATIONS),
    encodeBase64Url(salt),
    encodeBase64Url(digest)
  ].join("$");
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, storedHash) {
  if (!storedHash) return { valid: false, needsUpgrade: false };
  if (storedHash.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const [, hashAlgo, iterationValue, saltValue, digestValue] = storedHash.split("$");
    const iterations = Number(iterationValue);
    if (!hashAlgo || !saltValue || !digestValue || !Number.isFinite(iterations) || iterations <= 0) {
      return { valid: false, needsUpgrade: false };
    }
    const salt = decodeBase64Url(saltValue);
    const expectedDigest = decodeBase64Url(digestValue);
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: hashAlgo.toUpperCase(),
        salt,
        iterations
      },
      key,
      expectedDigest.length * 8
    );
    return { valid: timingSafeEqual(new Uint8Array(derivedBits), expectedDigest), needsUpgrade: false };
  }
  const legacyHash = await sha256Hex(password);
  const valid = storedHash === legacyHash;
  return { valid, needsUpgrade: valid };
}
__name(verifyPassword, "verifyPassword");
async function ensurePasswordResetTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash)").run();
}
__name(ensurePasswordResetTable, "ensurePasswordResetTable");
async function hasColumn(db, tableName, columnName) {
  const pragma = await db.prepare(`PRAGMA table_info(${tableName})`).all();
  return (pragma.results || []).some((column) => String(column.name || "") === columnName);
}
__name(hasColumn, "hasColumn");
async function ensureColumn(db, tableName, columnName, definition) {
  if (await hasColumn(db, tableName, columnName)) return;
  const alterDefinition = definition.replace(/\s+DEFAULT\s+\((?:date|datetime)\('now'\)\)/i, "").trim();
  try {
    await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${alterDefinition}`).run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes("duplicate column")) throw err;
  }
}
__name(ensureColumn, "ensureColumn");
async function ensureCoreSchema(db) {
  if (!coreSchemaReady) {
    coreSchemaReady = (async () => {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL DEFAULT '',
          full_name TEXT NOT NULL DEFAULT '',
          phone TEXT DEFAULT '',
          avatar_url TEXT DEFAULT '',
          plan TEXT DEFAULT 'free',
          plan_expires_at TEXT DEFAULT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      await ensureColumn(db, "users", "phone", "TEXT DEFAULT ''");
      await ensureColumn(db, "users", "avatar_url", "TEXT DEFAULT ''");
      await ensureColumn(db, "users", "plan", "TEXT DEFAULT 'free'");
      await ensureColumn(db, "users", "plan_expires_at", "TEXT DEFAULT NULL");
      await ensureColumn(db, "users", "created_at", "TEXT DEFAULT (datetime('now'))");
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS businesses (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          gstin TEXT DEFAULT '',
          pan TEXT DEFAULT '',
          email TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          address TEXT DEFAULT '',
          city TEXT DEFAULT '',
          state TEXT DEFAULT 'Telangana',
          pincode TEXT DEFAULT '',
          logo_url TEXT DEFAULT '',
          signature_url TEXT DEFAULT '',
          bank_name TEXT DEFAULT '',
          account_number TEXT DEFAULT '',
          ifsc TEXT DEFAULT '',
          upi_id TEXT DEFAULT '',
          invoice_prefix TEXT DEFAULT 'INV',
          next_invoice_number INTEGER DEFAULT 1001,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      await ensureColumn(db, "businesses", "gstin", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "pan", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "email", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "phone", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "address", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "city", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "state", "TEXT DEFAULT 'Telangana'");
      await ensureColumn(db, "businesses", "pincode", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "logo_url", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "signature_url", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "bank_name", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "account_number", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "ifsc", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "upi_id", "TEXT DEFAULT ''");
      await ensureColumn(db, "businesses", "invoice_prefix", "TEXT DEFAULT 'INV'");
      await ensureColumn(db, "businesses", "next_invoice_number", "INTEGER DEFAULT 1001");
      await ensureColumn(db, "businesses", "created_at", "TEXT DEFAULT (datetime('now'))");
      await ensureColumn(db, "businesses", "updated_at", "TEXT DEFAULT (datetime('now'))");
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          name TEXT NOT NULL,
          gstin TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          email TEXT DEFAULT '',
          billing_address TEXT DEFAULT '',
          shipping_address TEXT DEFAULT '',
          state TEXT DEFAULT '',
          balance_due REAL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      await ensureColumn(db, "customers", "gstin", "TEXT DEFAULT ''");
      await ensureColumn(db, "customers", "phone", "TEXT DEFAULT ''");
      await ensureColumn(db, "customers", "email", "TEXT DEFAULT ''");
      await ensureColumn(db, "customers", "billing_address", "TEXT DEFAULT ''");
      await ensureColumn(db, "customers", "shipping_address", "TEXT DEFAULT ''");
      await ensureColumn(db, "customers", "state", "TEXT DEFAULT ''");
      await ensureColumn(db, "customers", "balance_due", "REAL DEFAULT 0");
      await ensureColumn(db, "customers", "created_at", "TEXT DEFAULT (datetime('now'))");
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          name TEXT NOT NULL,
          hsn_sac_code TEXT DEFAULT '',
          type TEXT DEFAULT 'goods',
          unit TEXT DEFAULT 'pcs',
          selling_price REAL DEFAULT 0,
          purchase_price REAL DEFAULT 0,
          gst_rate REAL DEFAULT 18,
          stock_quantity REAL DEFAULT 0,
          low_stock_threshold REAL DEFAULT 10,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      await ensureColumn(db, "products", "hsn_sac_code", "TEXT DEFAULT ''");
      await ensureColumn(db, "products", "type", "TEXT DEFAULT 'goods'");
      await ensureColumn(db, "products", "unit", "TEXT DEFAULT 'pcs'");
      await ensureColumn(db, "products", "selling_price", "REAL DEFAULT 0");
      await ensureColumn(db, "products", "purchase_price", "REAL DEFAULT 0");
      await ensureColumn(db, "products", "gst_rate", "REAL DEFAULT 18");
      await ensureColumn(db, "products", "stock_quantity", "REAL DEFAULT 0");
      await ensureColumn(db, "products", "low_stock_threshold", "REAL DEFAULT 10");
      await ensureColumn(db, "products", "created_at", "TEXT DEFAULT (datetime('now'))");
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          customer_id TEXT DEFAULT NULL,
          customer_name TEXT DEFAULT '',
          invoice_number TEXT NOT NULL,
          invoice_date TEXT DEFAULT (date('now')),
          due_date TEXT DEFAULT NULL,
          type TEXT DEFAULT 'Tax Invoice',
          status TEXT DEFAULT 'draft',
          subtotal REAL DEFAULT 0,
          discount_amount REAL DEFAULT 0,
          taxable_amount REAL DEFAULT 0,
          cgst REAL DEFAULT 0,
          sgst REAL DEFAULT 0,
          igst REAL DEFAULT 0,
          total_amount REAL DEFAULT 0,
          amount_paid REAL DEFAULT 0,
          balance_due REAL DEFAULT 0,
          notes TEXT DEFAULT '',
          terms TEXT DEFAULT '',
          template_id TEXT DEFAULT 'modern',
          is_inter_state INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      await ensureColumn(db, "invoices", "customer_id", "TEXT DEFAULT NULL");
      await ensureColumn(db, "invoices", "customer_name", "TEXT DEFAULT ''");
      await ensureColumn(db, "invoices", "invoice_date", "TEXT DEFAULT (date('now'))");
      await ensureColumn(db, "invoices", "due_date", "TEXT DEFAULT NULL");
      await ensureColumn(db, "invoices", "type", "TEXT DEFAULT 'Tax Invoice'");
      await ensureColumn(db, "invoices", "status", "TEXT DEFAULT 'draft'");
      await ensureColumn(db, "invoices", "subtotal", "REAL DEFAULT 0");
      await ensureColumn(db, "invoices", "discount_amount", "REAL DEFAULT 0");
      await ensureColumn(db, "invoices", "taxable_amount", "REAL DEFAULT 0");
      await ensureColumn(db, "invoices", "cgst", "REAL DEFAULT 0");
      await ensureColumn(db, "invoices", "sgst", "REAL DEFAULT 0");
      await ensureColumn(db, "invoices", "igst", "REAL DEFAULT 0");
      await ensureColumn(db, "invoices", "total_amount", "REAL DEFAULT 0");
      await ensureColumn(db, "invoices", "amount_paid", "REAL DEFAULT 0");
      await ensureColumn(db, "invoices", "balance_due", "REAL DEFAULT 0");
      await ensureColumn(db, "invoices", "notes", "TEXT DEFAULT ''");
      await ensureColumn(db, "invoices", "terms", "TEXT DEFAULT ''");
      await ensureColumn(db, "invoices", "template_id", "TEXT DEFAULT 'modern'");
      await ensureColumn(db, "invoices", "is_inter_state", "INTEGER DEFAULT 0");
      await ensureColumn(db, "invoices", "created_at", "TEXT DEFAULT (datetime('now'))");
      await ensureColumn(db, "invoices", "updated_at", "TEXT DEFAULT (datetime('now'))");
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id TEXT PRIMARY KEY,
          invoice_id TEXT NOT NULL,
          product_id TEXT DEFAULT NULL,
          description TEXT DEFAULT '',
          hsn TEXT DEFAULT '',
          quantity REAL DEFAULT 1,
          unit TEXT DEFAULT 'pcs',
          rate REAL DEFAULT 0,
          discount_value REAL DEFAULT 0,
          discount_type TEXT DEFAULT 'percent',
          taxable_amount REAL DEFAULT 0,
          gst_rate REAL DEFAULT 18,
          cgst REAL DEFAULT 0,
          sgst REAL DEFAULT 0,
          igst REAL DEFAULT 0,
          total REAL DEFAULT 0,
          sort_order INTEGER DEFAULT 0
        )
      `).run();
      await ensureColumn(db, "invoice_items", "product_id", "TEXT DEFAULT NULL");
      await ensureColumn(db, "invoice_items", "description", "TEXT DEFAULT ''");
      await ensureColumn(db, "invoice_items", "hsn", "TEXT DEFAULT ''");
      await ensureColumn(db, "invoice_items", "quantity", "REAL DEFAULT 1");
      await ensureColumn(db, "invoice_items", "unit", "TEXT DEFAULT 'pcs'");
      await ensureColumn(db, "invoice_items", "rate", "REAL DEFAULT 0");
      await ensureColumn(db, "invoice_items", "discount_value", "REAL DEFAULT 0");
      await ensureColumn(db, "invoice_items", "discount_type", "TEXT DEFAULT 'percent'");
      await ensureColumn(db, "invoice_items", "taxable_amount", "REAL DEFAULT 0");
      await ensureColumn(db, "invoice_items", "gst_rate", "REAL DEFAULT 18");
      await ensureColumn(db, "invoice_items", "cgst", "REAL DEFAULT 0");
      await ensureColumn(db, "invoice_items", "sgst", "REAL DEFAULT 0");
      await ensureColumn(db, "invoice_items", "igst", "REAL DEFAULT 0");
      await ensureColumn(db, "invoice_items", "total", "REAL DEFAULT 0");
      await ensureColumn(db, "invoice_items", "sort_order", "INTEGER DEFAULT 0");
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          category TEXT DEFAULT '',
          description TEXT DEFAULT '',
          amount REAL DEFAULT 0,
          gst_amount REAL DEFAULT 0,
          date TEXT DEFAULT NULL,
          vendor_name TEXT DEFAULT '',
          receipt_url TEXT DEFAULT '',
          payment_method TEXT DEFAULT 'cash',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      await ensureColumn(db, "expenses", "category", "TEXT DEFAULT ''");
      await ensureColumn(db, "expenses", "description", "TEXT DEFAULT ''");
      await ensureColumn(db, "expenses", "amount", "REAL DEFAULT 0");
      await ensureColumn(db, "expenses", "gst_amount", "REAL DEFAULT 0");
      await ensureColumn(db, "expenses", "date", "TEXT DEFAULT NULL");
      await ensureColumn(db, "expenses", "vendor_name", "TEXT DEFAULT ''");
      await ensureColumn(db, "expenses", "receipt_url", "TEXT DEFAULT ''");
      await ensureColumn(db, "expenses", "payment_method", "TEXT DEFAULT 'cash'");
      await ensureColumn(db, "expenses", "created_at", "TEXT DEFAULT (datetime('now'))");
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          invoice_id TEXT NOT NULL,
          amount REAL DEFAULT 0,
          payment_date TEXT DEFAULT NULL,
          payment_method TEXT DEFAULT 'cash',
          reference_number TEXT DEFAULT '',
          notes TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      await ensureColumn(db, "payments", "amount", "REAL DEFAULT 0");
      await ensureColumn(db, "payments", "payment_date", "TEXT DEFAULT NULL");
      await ensureColumn(db, "payments", "payment_method", "TEXT DEFAULT 'cash'");
      await ensureColumn(db, "payments", "reference_number", "TEXT DEFAULT ''");
      await ensureColumn(db, "payments", "notes", "TEXT DEFAULT ''");
      await ensureColumn(db, "payments", "created_at", "TEXT DEFAULT (datetime('now'))");
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS team_members (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          invited_by TEXT DEFAULT NULL,
          email TEXT NOT NULL,
          role TEXT DEFAULT 'staff',
          status TEXT DEFAULT 'pending',
          user_id TEXT DEFAULT NULL,
          invited_at TEXT DEFAULT (datetime('now')),
          joined_at TEXT DEFAULT NULL
        )
      `).run();
      await ensureColumn(db, "team_members", "invited_by", "TEXT DEFAULT NULL");
      await ensureColumn(db, "team_members", "email", "TEXT NOT NULL DEFAULT ''");
      await ensureColumn(db, "team_members", "role", "TEXT DEFAULT 'staff'");
      await ensureColumn(db, "team_members", "status", "TEXT DEFAULT 'pending'");
      await ensureColumn(db, "team_members", "user_id", "TEXT DEFAULT NULL");
      await ensureColumn(db, "team_members", "invited_at", "TEXT DEFAULT (datetime('now'))");
      await ensureColumn(db, "team_members", "joined_at", "TEXT DEFAULT NULL");
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON expenses(business_id)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_team_members_business_id ON team_members(business_id)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email)").run();
      await ensurePasswordResetTable(db);
      await ensureRecurringInvoicesTable(db);
    })().catch((err) => {
      coreSchemaReady = null;
      throw err;
    });
  }
  await coreSchemaReady;
}
__name(ensureCoreSchema, "ensureCoreSchema");
async function createPasswordResetToken(db, userId, ttlMinutes) {
  await ensurePasswordResetTable(db);
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1e3).toISOString();
  await db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").bind(userId).run();
  await db.prepare(
    "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), userId, tokenHash, expiresAt).run();
  return token;
}
__name(createPasswordResetToken, "createPasswordResetToken");
async function sendPasswordResetEmail(c, email, resetLink) {
  const fromEmail = c.env.MAIL_FROM_EMAIL || "no-reply@billkar.co.in";
  const fromName = c.env.MAIL_FROM_NAME || "BillKar";
  const supportEmail = c.env.SUPPORT_EMAIL || "support@billkar.co.in";
  const textBody = [
    "You requested a password reset for your BillKar account.",
    "",
    `Reset your password: ${resetLink}`,
    "",
    `This link will expire in ${getResetTokenTtlMinutes(c.env)} minutes.`,
    "If you did not request this, you can ignore this email.",
    "",
    `Need help? Reply to ${supportEmail}.`
  ].join("\n");
  const htmlBody = [
    "<p>You requested a password reset for your BillKar account.</p>",
    `<p><a href="${resetLink}">Reset your password</a></p>`,
    `<p>This link will expire in ${getResetTokenTtlMinutes(c.env)} minutes.</p>`,
    "<p>If you did not request this, you can safely ignore this email.</p>",
    `<p>Need help? Reply to <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>`
  ].join("");
  const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: fromEmail, name: fromName },
      reply_to: { email: supportEmail, name: "BillKar Support" },
      subject: "Reset your BillKar password",
      content: [
        { type: "text/plain", value: textBody },
        { type: "text/html", value: htmlBody }
      ]
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Password reset email failed (${response.status}): ${errorText}`);
  }
}
__name(sendPasswordResetEmail, "sendPasswordResetEmail");
async function upsertCustomerFromInvoiceInput(db, businessId, invoiceInput) {
  const requestedCustomerId = getOptionalString(invoiceInput.customer_id);
  const requestedCustomerName = getTrimmedString(invoiceInput.customer_name);
  const customerEmail = getOptionalString(invoiceInput.customer_email);
  const customerPhone = getOptionalString(invoiceInput.customer_phone);
  const customerGstin = getOptionalString(invoiceInput.customer_gstin);
  const customerState = getOptionalString(invoiceInput.customer_state);
  const customerAddress = getOptionalString(invoiceInput.customer_address);
  let customer = requestedCustomerId ? await db.prepare(
    "SELECT id, name, email, phone, gstin, state, billing_address FROM customers WHERE id = ? AND business_id = ?"
  ).bind(requestedCustomerId, businessId).first() : null;
  if (!customer && requestedCustomerName) {
    customer = await db.prepare(
      "SELECT id, name, email, phone, gstin, state, billing_address FROM customers WHERE business_id = ? AND LOWER(name) = LOWER(?)"
    ).bind(businessId, requestedCustomerName).first();
  }
  if (!customer && requestedCustomerName) {
    const id = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO customers (id, business_id, name, gstin, phone, email, billing_address, shipping_address, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      businessId,
      requestedCustomerName,
      customerGstin ?? "",
      customerPhone ?? "",
      customerEmail ?? "",
      customerAddress ?? "",
      "",
      customerState ?? ""
    ).run();
    return { customerId: id, customerName: requestedCustomerName };
  }
  if (customer?.id) {
    await db.prepare(`
      UPDATE customers SET
        email = COALESCE(NULLIF(?, ''), email),
        phone = COALESCE(NULLIF(?, ''), phone),
        gstin = COALESCE(NULLIF(?, ''), gstin),
        state = COALESCE(NULLIF(?, ''), state),
        billing_address = COALESCE(NULLIF(?, ''), billing_address)
      WHERE id = ? AND business_id = ?
    `).bind(
      customerEmail ?? "",
      customerPhone ?? "",
      customerGstin ?? "",
      customerState ?? "",
      customerAddress ?? "",
      customer.id,
      businessId
    ).run();
    return { customerId: customer.id, customerName: requestedCustomerName || customer.name || "" };
  }
  return { customerId: customer?.id || null, customerName: requestedCustomerName || customer?.name || "" };
}
__name(upsertCustomerFromInvoiceInput, "upsertCustomerFromInvoiceInput");
async function replaceInvoiceItems(db, invoiceId, rawItems) {
  await db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").bind(invoiceId).run();
  if (!Array.isArray(rawItems)) return;
  for (let index = 0; index < rawItems.length; index++) {
    const item = asRecord(rawItems[index]);
    if (!Object.keys(item).length) continue;
    await db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, description, hsn, quantity, unit, rate,
        discount_value, discount_type, taxable_amount, gst_rate, cgst, sgst, igst, total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      invoiceId,
      getTrimmedString(item.description) || getTrimmedString(item.name),
      getTrimmedString(item.hsn),
      toFiniteNumber(item.quantity ?? item.qty, 1),
      getTrimmedString(item.unit) || "pcs",
      toFiniteNumber(item.rate, 0),
      toFiniteNumber(item.discount_value ?? item.discountValue, 0),
      getTrimmedString(item.discount_type) || "percent",
      toFiniteNumber(item.taxable_amount, 0),
      toFiniteNumber(item.gst_rate ?? item.gst_percent ?? item.gstPercent, 18),
      toFiniteNumber(item.cgst, 0),
      toFiniteNumber(item.sgst, 0),
      toFiniteNumber(item.igst, 0),
      toFiniteNumber(item.total, 0),
      toFiniteNumber(item.sort_order, index)
    ).run();
  }
}
__name(replaceInvoiceItems, "replaceInvoiceItems");
async function fetchScopedInvoice(db, invoiceId, businessId) {
  return db.prepare(`
    SELECT i.*, c.email as customer_email, c.phone as customer_phone, c.gstin as customer_gstin, c.state as customer_state
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    WHERE i.id = ? AND i.business_id = ?
  `).bind(invoiceId, businessId).first();
}
__name(fetchScopedInvoice, "fetchScopedInvoice");
async function recalculateInvoicePaymentSummary(db, invoiceId, businessId) {
  const invoice = await db.prepare(
    "SELECT id, business_id, due_date, status, total_amount FROM invoices WHERE id = ? AND business_id = ?"
  ).bind(invoiceId, businessId).first();
  if (!invoice) return null;
  const paymentTotals = await db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE invoice_id = ?"
  ).bind(invoiceId).first();
  const totalAmount = toFiniteNumber(invoice.total_amount, 0);
  const totalPaid = toFiniteNumber(paymentTotals?.total_paid, 0);
  const balanceDue = Math.max(totalAmount - totalPaid, 0);
  let nextStatus = invoice.status || "draft";
  if (nextStatus !== "cancelled") {
    if (totalAmount > 0 && balanceDue <= 0) {
      nextStatus = "paid";
    } else if (totalPaid > 0) {
      nextStatus = "partial";
    } else if (nextStatus !== "draft") {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      nextStatus = invoice.due_date && invoice.due_date < today ? "overdue" : "sent";
    }
  }
  await db.prepare(
    "UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ? WHERE id = ? AND business_id = ?"
  ).bind(totalPaid, balanceDue, nextStatus, invoiceId, businessId).run();
  return fetchScopedInvoice(db, invoiceId, businessId);
}
__name(recalculateInvoicePaymentSummary, "recalculateInvoicePaymentSummary");
function normalizeRecurringFrequency(value) {
  const frequency = getTrimmedString(value).toLowerCase();
  if (frequency === "weekly" || frequency === "monthly" || frequency === "quarterly" || frequency === "yearly") {
    return frequency;
  }
  return null;
}
__name(normalizeRecurringFrequency, "normalizeRecurringFrequency");
function normalizeISODate(value) {
  const date = getTrimmedString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}
__name(normalizeISODate, "normalizeISODate");
function addDays(date, days) {
  const next = /* @__PURE__ */ new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
__name(addDays, "addDays");
function differenceInDays(startDate, endDate) {
  if (!startDate || !endDate) return 30;
  const start = /* @__PURE__ */ new Date(`${startDate}T00:00:00Z`);
  const end = /* @__PURE__ */ new Date(`${endDate}T00:00:00Z`);
  const diff = Math.round((end.getTime() - start.getTime()) / 864e5);
  return diff > 0 ? diff : 30;
}
__name(differenceInDays, "differenceInDays");
function getNextRecurringDate(date, frequency) {
  const next = /* @__PURE__ */ new Date(`${date}T00:00:00Z`);
  if (frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  if (frequency === "quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  if (frequency === "yearly") next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString().slice(0, 10);
}
__name(getNextRecurringDate, "getNextRecurringDate");
function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
__name(safeJsonParse, "safeJsonParse");
async function ensureRecurringInvoicesTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS recurring_invoices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      source_invoice_id TEXT,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      next_date TEXT NOT NULL,
      end_date TEXT DEFAULT NULL,
      auto_send INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      invoice_data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_recurring_invoices_business_id ON recurring_invoices(business_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date ON recurring_invoices(next_date)").run();
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_invoices_source_invoice_id ON recurring_invoices(source_invoice_id)").run();
}
__name(ensureRecurringInvoicesTable, "ensureRecurringInvoicesTable");
async function generateManagedInvoiceNumber(db, businessId) {
  const business = await db.prepare(
    "SELECT invoice_prefix, next_invoice_number FROM businesses WHERE id = ?"
  ).bind(businessId).first();
  const prefix = getTrimmedString(business?.invoice_prefix) || "INV";
  const nextNumber = Math.max(1, toFiniteNumber(business?.next_invoice_number, 1001));
  await db.prepare(
    "UPDATE businesses SET next_invoice_number = ? WHERE id = ?"
  ).bind(nextNumber + 1, businessId).run();
  return `${prefix}-${nextNumber}`;
}
__name(generateManagedInvoiceNumber, "generateManagedInvoiceNumber");
function buildRecurringInvoiceSnapshot(invoiceInput, customerId, customerName) {
  return {
    customer_id: customerId,
    customer_name: customerName,
    customer_email: getTrimmedString(invoiceInput.customer_email),
    customer_phone: getTrimmedString(invoiceInput.customer_phone),
    customer_gstin: getTrimmedString(invoiceInput.customer_gstin),
    customer_state: getTrimmedString(invoiceInput.customer_state),
    customer_address: getTrimmedString(invoiceInput.customer_address),
    subtotal: toFiniteNumber(invoiceInput.subtotal, 0),
    taxable_amount: toFiniteNumber(invoiceInput.taxable_amount, 0),
    cgst: toFiniteNumber(invoiceInput.cgst, 0),
    sgst: toFiniteNumber(invoiceInput.sgst, 0),
    igst: toFiniteNumber(invoiceInput.igst, 0),
    total_amount: toFiniteNumber(invoiceInput.total_amount, 0),
    notes: getTrimmedString(invoiceInput.notes),
    terms: getTrimmedString(invoiceInput.terms),
    template_id: getTrimmedString(invoiceInput.template_id) || "modern",
    is_inter_state: toBooleanInt(invoiceInput.is_inter_state),
    items: Array.isArray(invoiceInput.items) ? invoiceInput.items : [],
    due_days: differenceInDays(normalizeISODate(invoiceInput.invoice_date), normalizeISODate(invoiceInput.due_date))
  };
}
__name(buildRecurringInvoiceSnapshot, "buildRecurringInvoiceSnapshot");
async function upsertRecurringInvoice(db, businessId, sourceInvoiceId, customerId, customerName, invoiceInput) {
  await ensureRecurringInvoicesTable(db);
  const recurring = asRecord(invoiceInput.recurring);
  const enabled = recurring.enabled === void 0 ? true : Boolean(recurring.enabled);
  if (!enabled) {
    await db.prepare(
      "DELETE FROM recurring_invoices WHERE source_invoice_id = ? AND business_id = ?"
    ).bind(sourceInvoiceId, businessId).run();
    return;
  }
  const frequency = normalizeRecurringFrequency(recurring.frequency);
  const startDate = normalizeISODate(recurring.start_date);
  const endDate = normalizeISODate(recurring.end_date);
  if (!frequency || !startDate) return;
  const invoiceData = JSON.stringify(buildRecurringInvoiceSnapshot(invoiceInput, customerId, customerName));
  const autoSend = toBooleanInt(recurring.auto_send);
  const existing = await db.prepare(
    "SELECT id FROM recurring_invoices WHERE source_invoice_id = ? AND business_id = ?"
  ).bind(sourceInvoiceId, businessId).first();
  if (existing?.id) {
    await db.prepare(`
      UPDATE recurring_invoices SET
        customer_id = ?,
        customer_name = ?,
        frequency = ?,
        start_date = ?,
        next_date = CASE WHEN next_date < ? THEN ? ELSE next_date END,
        end_date = ?,
        auto_send = ?,
        active = 1,
        invoice_data = ?,
        updated_at = datetime('now')
      WHERE id = ? AND business_id = ?
    `).bind(
      customerId,
      customerName,
      frequency,
      startDate,
      startDate,
      startDate,
      endDate,
      autoSend,
      invoiceData,
      existing.id,
      businessId
    ).run();
    return;
  }
  await db.prepare(`
    INSERT INTO recurring_invoices (
      id, business_id, source_invoice_id, customer_id, customer_name,
      frequency, start_date, next_date, end_date, auto_send, active, invoice_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    crypto.randomUUID(),
    businessId,
    sourceInvoiceId,
    customerId,
    customerName,
    frequency,
    startDate,
    startDate,
    endDate,
    autoSend,
    invoiceData
  ).run();
}
__name(upsertRecurringInvoice, "upsertRecurringInvoice");
async function generateDueRecurringInvoices(db, businessId) {
  await ensureRecurringInvoicesTable(db);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const { results } = await db.prepare(`
    SELECT *
    FROM recurring_invoices
    WHERE business_id = ?
      AND active = 1
      AND next_date <= ?
      AND (end_date IS NULL OR next_date <= end_date)
    ORDER BY next_date ASC, created_at ASC
  `).bind(businessId, today).all();
  let generatedCount = 0;
  for (const recurring of results || []) {
    const frequency = normalizeRecurringFrequency(recurring.frequency);
    if (!frequency) continue;
    const snapshot = safeJsonParse(recurring.invoice_data, {});
    if (!Object.keys(snapshot).length) continue;
    const invoiceDate = recurring.next_date;
    const dueDays = Math.max(1, toFiniteNumber(snapshot.due_days, 30));
    const dueDate = addDays(invoiceDate, dueDays);
    const invoiceId = crypto.randomUUID();
    const invoiceNumber = await generateManagedInvoiceNumber(db, businessId);
    const totalAmount = toFiniteNumber(snapshot.total_amount, 0);
    await db.prepare(`
      INSERT INTO invoices (id, business_id, customer_id, customer_name, invoice_number,
        invoice_date, due_date, type, status, subtotal, taxable_amount,
        cgst, sgst, igst, total_amount, amount_paid, balance_due, notes, terms, template_id, is_inter_state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceId,
      businessId,
      getOptionalString(snapshot.customer_id),
      getTrimmedString(snapshot.customer_name),
      invoiceNumber,
      invoiceDate,
      dueDate,
      "Tax Invoice",
      recurring.auto_send ? "sent" : "draft",
      toFiniteNumber(snapshot.subtotal, 0),
      toFiniteNumber(snapshot.taxable_amount, 0),
      toFiniteNumber(snapshot.cgst, 0),
      toFiniteNumber(snapshot.sgst, 0),
      toFiniteNumber(snapshot.igst, 0),
      totalAmount,
      0,
      totalAmount,
      getTrimmedString(snapshot.notes),
      getTrimmedString(snapshot.terms),
      getTrimmedString(snapshot.template_id) || "modern",
      toBooleanInt(snapshot.is_inter_state)
    ).run();
    await replaceInvoiceItems(db, invoiceId, snapshot.items);
    const nextDate = getNextRecurringDate(recurring.next_date, frequency);
    const shouldRemainActive = !recurring.end_date || nextDate <= recurring.end_date;
    await db.prepare(`
      UPDATE recurring_invoices SET
        next_date = ?,
        active = ?,
        updated_at = datetime('now')
      WHERE id = ? AND business_id = ?
    `).bind(nextDate, shouldRemainActive ? 1 : 0, recurring.id, businessId).run();
    generatedCount += 1;
  }
  return { generatedCount };
}
__name(generateDueRecurringInvoices, "generateDueRecurringInvoices");
async function authMiddleware(c, next) {
  await ensureCoreSchema(c.env.DB);
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7);
  const userId = await verifyJWT(token, c.env.JWT_SECRET);
  if (!userId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  c.set("userId", userId);
  const headerBizId = c.req.header("X-Business-Id");
  if (headerBizId) {
    const ownsBiz = await c.env.DB.prepare("SELECT id FROM businesses WHERE id = ? AND user_id = ?").bind(headerBizId, userId).first();
    if (ownsBiz) {
      c.set("businessId", headerBizId);
    } else {
      const teamAccess = await c.env.DB.prepare(
        "SELECT role FROM team_members WHERE business_id = ? AND user_id = ? AND status = 'active'"
      ).bind(headerBizId, userId).first();
      if (teamAccess) {
        c.set("businessId", headerBizId);
        c.set("teamRole", teamAccess.role);
      } else {
        return c.json({ error: "No access to this business" }, 403);
      }
    }
  } else {
    const biz = await c.env.DB.prepare("SELECT id FROM businesses WHERE user_id = ?").bind(userId).first();
    if (biz) {
      c.set("businessId", biz.id);
    }
  }
  await next();
}
__name(authMiddleware, "authMiddleware");
app.get("/api/health", (c) => c.json({ status: "ok", message: "BillKar API running" }));
app.post("/api/auth/signup", async (c) => {
  try {
    await ensureCoreSchema(c.env.DB);
    const { email, password, full_name } = await c.req.json();
    if (!email || !password) return c.json({ error: "Email and password required" }, 400);
    if (password.length < MIN_PASSWORD_LENGTH) {
      return c.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
    }
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase().trim()).first();
    if (existing) return c.json({ error: "Email already registered" }, 409);
    const userId = crypto.randomUUID();
    const businessId = crypto.randomUUID();
    const hash = await hashPassword(password);
    await c.env.DB.prepare(
      "INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)"
    ).bind(userId, email.toLowerCase().trim(), hash, full_name || "").run();
    await c.env.DB.prepare(
      "INSERT INTO businesses (id, user_id, name) VALUES (?, ?, ?)"
    ).bind(businessId, userId, full_name ? `${full_name}'s Business` : "My Business").run();
    const token = await createJWT(userId, c.env.JWT_SECRET);
    return c.json({
      token,
      user: { id: userId, email: email.toLowerCase().trim(), full_name: full_name || "" },
      business: { id: businessId, name: full_name ? `${full_name}'s Business` : "My Business" }
    });
  } catch (err) {
    console.error("Signup failed", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});
app.post("/api/auth/login", async (c) => {
  await ensureCoreSchema(c.env.DB);
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: "Email and password required" }, 400);
  const user = await c.env.DB.prepare(
    "SELECT id, email, password_hash, full_name, phone, avatar_url, plan, plan_expires_at FROM users WHERE email = ?"
  ).bind(email.toLowerCase().trim()).first();
  if (!user) return c.json({ error: "Invalid email or password" }, 401);
  const passwordCheck = await verifyPassword(password, user.password_hash);
  if (!passwordCheck.valid) return c.json({ error: "Invalid email or password" }, 401);
  if (passwordCheck.needsUpgrade) {
    const upgradedHash = await hashPassword(password);
    await c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(upgradedHash, user.id).run();
  }
  if (user.plan && user.plan !== "free" && user.plan_expires_at && new Date(user.plan_expires_at) < /* @__PURE__ */ new Date()) {
    user.plan = "free";
    user.plan_expires_at = null;
    await c.env.DB.prepare("UPDATE users SET plan = ?, plan_expires_at = NULL WHERE id = ?").bind("free", user.id).run();
  }
  const business = await c.env.DB.prepare(
    "SELECT * FROM businesses WHERE user_id = ?"
  ).bind(user.id).first();
  const token = await createJWT(user.id, c.env.JWT_SECRET);
  return c.json({ token, user, business });
});
app.post("/api/auth/forgot-password", async (c) => {
  await ensureCoreSchema(c.env.DB);
  const { email } = await c.req.json();
  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail) return c.json({ error: "Email is required" }, 400);
  const user = await c.env.DB.prepare(
    "SELECT id, email FROM users WHERE email = ?"
  ).bind(normalizedEmail).first();
  if (user?.id) {
    try {
      const token = await createPasswordResetToken(c.env.DB, user.id, getResetTokenTtlMinutes(c.env));
      const frontendUrl = c.env.FRONTEND_URL || "https://billkar.co.in";
      const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(c, normalizedEmail, resetLink);
    } catch (err) {
      console.error("Failed to process password reset request:", err);
      return c.json({ error: "Failed to send reset email. Please try again." }, 500);
    }
  }
  return c.json({
    success: true,
    message: "If an account exists for this email, a reset link has been sent."
  });
});
app.post("/api/auth/reset-password", async (c) => {
  await ensureCoreSchema(c.env.DB);
  const { token, password } = await c.req.json();
  if (!token || !password) return c.json({ error: "Token and password are required" }, 400);
  if (password.length < MIN_PASSWORD_LENGTH) {
    return c.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
  }
  await ensurePasswordResetTable(c.env.DB);
  const tokenHash = await sha256Hex(token);
  const resetRow = await c.env.DB.prepare(
    "SELECT id, user_id, token_hash, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? ORDER BY created_at DESC LIMIT 1"
  ).bind(tokenHash).first();
  if (!resetRow || resetRow.used_at) {
    return c.json({ error: "Invalid or expired reset link" }, 400);
  }
  if (new Date(resetRow.expires_at) < /* @__PURE__ */ new Date()) {
    await c.env.DB.prepare("DELETE FROM password_reset_tokens WHERE id = ?").bind(resetRow.id).run();
    return c.json({ error: "Invalid or expired reset link" }, 400);
  }
  const nextHash = await hashPassword(password);
  await c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(nextHash, resetRow.user_id).run();
  await c.env.DB.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?").bind(resetRow.id).run();
  await c.env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND id != ?").bind(resetRow.user_id, resetRow.id).run();
  return c.json({ success: true });
});
app.get("/api/auth/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const user = await c.env.DB.prepare(
    "SELECT id, email, full_name, phone, avatar_url, plan, plan_expires_at, created_at FROM users WHERE id = ?"
  ).bind(userId).first();
  const business = await c.env.DB.prepare(
    "SELECT * FROM businesses WHERE user_id = ?"
  ).bind(userId).first();
  if (user && user.plan && user.plan !== "free" && user.plan_expires_at) {
    if (new Date(user.plan_expires_at) < /* @__PURE__ */ new Date()) {
      user.plan = "free";
      user.plan_expires_at = null;
      await c.env.DB.prepare("UPDATE users SET plan = ?, plan_expires_at = NULL WHERE id = ?").bind("free", userId).run();
    }
  }
  const { results: teamMemberships } = await c.env.DB.prepare(
    `SELECT tm.role, tm.business_id, b.name as business_name
     FROM team_members tm JOIN businesses b ON tm.business_id = b.id
     WHERE tm.user_id = ? AND tm.status = 'active'`
  ).bind(userId).all();
  return c.json({ user, business, teamMemberships: teamMemberships || [] });
});
app.put("/api/auth/profile", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const { full_name, phone, avatar_url } = await c.req.json();
  await c.env.DB.prepare(
    "UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), avatar_url = COALESCE(?, avatar_url) WHERE id = ?"
  ).bind(full_name ?? null, phone ?? null, avatar_url ?? null, userId).run();
  const user = await c.env.DB.prepare(
    "SELECT id, email, full_name, phone, avatar_url FROM users WHERE id = ?"
  ).bind(userId).first();
  return c.json({ user });
});
app.post("/api/auth/change-password", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const { current_password, new_password } = await c.req.json();
  if (!current_password || !new_password) return c.json({ error: "Current and new password are required" }, 400);
  if (new_password.length < MIN_PASSWORD_LENGTH) {
    return c.json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
  }
  const user = await c.env.DB.prepare(
    "SELECT id, password_hash FROM users WHERE id = ?"
  ).bind(userId).first();
  if (!user?.id) return c.json({ error: "User not found" }, 404);
  const passwordCheck = await verifyPassword(current_password, user.password_hash);
  if (!passwordCheck.valid) return c.json({ error: "Current password is incorrect" }, 400);
  const nextHash = await hashPassword(new_password);
  await c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(nextHash, userId).run();
  await ensurePasswordResetTable(c.env.DB);
  await c.env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").bind(userId).run();
  return c.json({ success: true });
});
app.get("/api/auth/google", (c) => {
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: c.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent"
  });
  const inviteId = getOptionalString(c.req.query("invite"));
  if (inviteId) params.set("state", inviteId);
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});
app.get("/api/auth/google/callback", async (c) => {
  await ensureCoreSchema(c.env.DB);
  const code = c.req.query("code");
  const inviteId = getOptionalString(c.req.query("state"));
  if (!code) return c.json({ error: "Missing authorization code" }, 400);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: c.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    }).toString()
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return c.json({ error: "Failed to get access token", details: tokenData }, 400);
  }
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const googleUser = await userRes.json();
  if (!googleUser.email) {
    return c.json({ error: "Failed to get user info from Google" }, 400);
  }
  const email = googleUser.email.toLowerCase().trim();
  const fullName = googleUser.name || "";
  let user = await c.env.DB.prepare(
    "SELECT id, email, full_name, phone, avatar_url, plan, plan_expires_at FROM users WHERE email = ?"
  ).bind(email).first();
  if (!user) {
    const userId = crypto.randomUUID();
    const businessId = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO users (id, email, password_hash, full_name, avatar_url) VALUES (?, ?, ?, ?, ?)"
    ).bind(userId, email, "", fullName, googleUser.picture || "").run();
    await c.env.DB.prepare(
      "INSERT INTO businesses (id, user_id, name) VALUES (?, ?, ?)"
    ).bind(businessId, userId, fullName ? `${fullName}'s Business` : "My Business").run();
    user = { id: userId, email, password_hash: "", full_name: fullName, phone: "", avatar_url: googleUser.picture || "", plan: "free", plan_expires_at: null };
  } else {
    if (user.plan && user.plan !== "free" && user.plan_expires_at && new Date(user.plan_expires_at) < /* @__PURE__ */ new Date()) {
      user.plan = "free";
      user.plan_expires_at = null;
      await c.env.DB.prepare("UPDATE users SET plan = ?, plan_expires_at = NULL WHERE id = ?").bind("free", user.id).run();
    }
  }
  const token = await createJWT(user.id, c.env.JWT_SECRET);
  const userJson = encodeURIComponent(JSON.stringify(user));
  const inviteQuery = inviteId ? `&invite=${encodeURIComponent(inviteId)}` : "";
  const frontendUrl = c.env.FRONTEND_URL || "https://billkar.pages.dev";
  return c.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${userJson}${inviteQuery}`);
});
app.get("/api/business", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (businessId) {
    const business2 = await c.env.DB.prepare("SELECT * FROM businesses WHERE id = ?").bind(businessId).first();
    if (!business2) return c.json({ error: "No business found" }, 404);
    return c.json({ business: business2 });
  }
  const userId = c.get("userId");
  const business = await c.env.DB.prepare("SELECT * FROM businesses WHERE user_id = ?").bind(userId).first();
  if (!business) return c.json({ error: "No business found" }, 404);
  return c.json({ business });
});
app.put("/api/business", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  const teamRole = c.get("teamRole");
  if (teamRole && teamRole !== "owner" && teamRole !== "admin") {
    return c.json({ error: "You do not have permission to edit business settings" }, 403);
  }
  const b = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE businesses SET
      name = COALESCE(?, name), gstin = COALESCE(?, gstin), pan = COALESCE(?, pan),
      email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address),
      city = COALESCE(?, city), state = COALESCE(?, state), pincode = COALESCE(?, pincode),
      logo_url = COALESCE(?, logo_url), signature_url = COALESCE(?, signature_url),
      bank_name = COALESCE(?, bank_name), account_number = COALESCE(?, account_number),
      ifsc = COALESCE(?, ifsc), upi_id = COALESCE(?, upi_id),
      invoice_prefix = COALESCE(?, invoice_prefix), next_invoice_number = COALESCE(?, next_invoice_number)
    WHERE id = ?
  `).bind(
    b.name ?? null,
    b.gstin ?? null,
    b.pan ?? null,
    b.email ?? null,
    b.phone ?? null,
    b.address ?? null,
    b.city ?? null,
    b.state ?? null,
    b.pincode ?? null,
    b.logo_url ?? null,
    b.signature_url ?? null,
    b.bank_name ?? null,
    b.account_number ?? null,
    b.ifsc ?? null,
    b.upi_id ?? null,
    b.invoice_prefix ?? null,
    b.next_invoice_number ?? null,
    businessId
  ).run();
  const business = await c.env.DB.prepare("SELECT * FROM businesses WHERE id = ?").bind(businessId).first();
  return c.json({ business });
});
app.get("/api/invoices", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ invoices: [] });
  const { results } = await c.env.DB.prepare(
    `SELECT i.*, c.email as customer_email, c.phone as customer_phone, c.gstin as customer_gstin, c.state as customer_state
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.business_id = ? ORDER BY i.created_at DESC`
  ).bind(businessId).all();
  const invoices = results || [];
  if (!invoices.length) return c.json({ invoices });
  const invoiceIds = invoices.map((invoice) => String(invoice.id));
  const placeholders = invoiceIds.map(() => "?").join(", ");
  const { results: paymentResults } = await c.env.DB.prepare(
    `SELECT * FROM payments WHERE invoice_id IN (${placeholders}) ORDER BY payment_date DESC, created_at DESC`
  ).bind(...invoiceIds).all();
  const paymentsByInvoice = /* @__PURE__ */ new Map();
  for (const payment of paymentResults || []) {
    const invoiceId = String(payment.invoice_id || "");
    if (!paymentsByInvoice.has(invoiceId)) paymentsByInvoice.set(invoiceId, []);
    paymentsByInvoice.get(invoiceId)?.push(payment);
  }
  return c.json({
    invoices: invoices.map((invoice) => ({
      ...invoice,
      payments: paymentsByInvoice.get(String(invoice.id)) || []
    }))
  });
});
app.post("/api/invoices", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot create invoices" }, 403);
  const inv = await c.req.json();
  const invoiceId = crypto.randomUUID();
  const { customerId, customerName } = await upsertCustomerFromInvoiceInput(c.env.DB, businessId, inv);
  const subtotal = toFiniteNumber(inv.subtotal, 0);
  const taxableAmount = toFiniteNumber(inv.taxable_amount, subtotal);
  const cgst = toFiniteNumber(inv.cgst, 0);
  const sgst = toFiniteNumber(inv.sgst, 0);
  const igst = toFiniteNumber(inv.igst, 0);
  const totalAmount = toFiniteNumber(inv.total_amount, 0);
  const amountPaid = toFiniteNumber(inv.amount_paid, 0);
  const balanceDue = inv.balance_due !== void 0 ? toFiniteNumber(inv.balance_due, Math.max(totalAmount - amountPaid, 0)) : Math.max(totalAmount - amountPaid, 0);
  await c.env.DB.prepare(`
    INSERT INTO invoices (id, business_id, customer_id, customer_name, invoice_number,
      invoice_date, due_date, type, status, subtotal, taxable_amount,
      cgst, sgst, igst, total_amount, amount_paid, balance_due, notes, terms, template_id, is_inter_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    invoiceId,
    businessId,
    customerId,
    customerName,
    getTrimmedString(inv.invoice_number),
    getOptionalString(inv.invoice_date),
    getOptionalString(inv.due_date),
    getTrimmedString(inv.type) || "invoice",
    getTrimmedString(inv.status) || "draft",
    subtotal,
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalAmount,
    amountPaid,
    balanceDue,
    getTrimmedString(inv.notes),
    getTrimmedString(inv.terms),
    getTrimmedString(inv.template_id) || "modern",
    toBooleanInt(inv.is_inter_state)
  ).run();
  await replaceInvoiceItems(c.env.DB, invoiceId, inv.items);
  if (inv.recurring !== void 0) {
    await upsertRecurringInvoice(c.env.DB, businessId, invoiceId, customerId, customerName, inv);
  }
  const invoice = await fetchScopedInvoice(c.env.DB, invoiceId, businessId);
  return c.json({ invoice }, 201);
});
app.put("/api/invoices/:id", authMiddleware, async (c) => {
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot update invoices" }, 403);
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  const scopedBusinessId = businessId;
  const id = getTrimmedString(c.req.param("id"));
  if (!id) return c.json({ error: "Invoice not found" }, 404);
  const existingInvoice = await c.env.DB.prepare(
    "SELECT id FROM invoices WHERE id = ? AND business_id = ?"
  ).bind(id, scopedBusinessId).first();
  if (!existingInvoice?.id) return c.json({ error: "Invoice not found" }, 404);
  const updates = await c.req.json();
  const { customerId, customerName } = await upsertCustomerFromInvoiceInput(c.env.DB, scopedBusinessId, updates);
  const sets = [];
  const vals = [];
  const scalarFields = [
    ["invoice_number", updates.invoice_number, getTrimmedString],
    ["invoice_date", updates.invoice_date, getOptionalString],
    ["due_date", updates.due_date, getOptionalString],
    ["type", updates.type, (value) => getTrimmedString(value) || "invoice"],
    ["status", updates.status, (value) => getTrimmedString(value) || "draft"],
    ["subtotal", updates.subtotal, (value) => toFiniteNumber(value, 0)],
    ["taxable_amount", updates.taxable_amount, (value) => toFiniteNumber(value, 0)],
    ["cgst", updates.cgst, (value) => toFiniteNumber(value, 0)],
    ["sgst", updates.sgst, (value) => toFiniteNumber(value, 0)],
    ["igst", updates.igst, (value) => toFiniteNumber(value, 0)],
    ["total_amount", updates.total_amount, (value) => toFiniteNumber(value, 0)],
    ["amount_paid", updates.amount_paid, (value) => toFiniteNumber(value, 0)],
    ["balance_due", updates.balance_due, (value) => toFiniteNumber(value, 0)],
    ["notes", updates.notes, getTrimmedString],
    ["terms", updates.terms, getTrimmedString],
    ["template_id", updates.template_id, (value) => getTrimmedString(value) || "modern"],
    ["is_inter_state", updates.is_inter_state, toBooleanInt]
  ];
  for (const [field, value, normalize] of scalarFields) {
    if (value !== void 0) {
      sets.push(`${field} = ?`);
      vals.push(normalize(value));
    }
  }
  if (updates.customer_id !== void 0 || updates.customer_name !== void 0 || customerId) {
    sets.push("customer_id = ?");
    vals.push(customerId);
    sets.push("customer_name = ?");
    vals.push(customerName);
  }
  if (sets.length > 0) {
    vals.push(id, scopedBusinessId);
    await c.env.DB.prepare(
      `UPDATE invoices SET ${sets.join(", ")} WHERE id = ? AND business_id = ?`
    ).bind(...vals).run();
  }
  if (updates.items !== void 0) {
    await replaceInvoiceItems(c.env.DB, id, updates.items);
  }
  if (updates.recurring !== void 0) {
    await upsertRecurringInvoice(c.env.DB, scopedBusinessId, id, customerId, customerName, updates);
  }
  if (sets.length === 0 && updates.items === void 0 && updates.recurring === void 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  const invoice = await fetchScopedInvoice(c.env.DB, id, scopedBusinessId);
  return c.json({ invoice });
});
app.get("/api/invoices/:id/items", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  const id = c.req.param("id");
  const invoice = await c.env.DB.prepare("SELECT id FROM invoices WHERE id = ? AND business_id = ?").bind(id, businessId).first();
  if (!invoice) return c.json({ error: "Invoice not found" }, 404);
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order"
  ).bind(id).all();
  return c.json({ items: results });
});
app.get("/api/recurring-invoices", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ recurring_invoices: [], due_count: 0 });
  await ensureRecurringInvoicesTable(c.env.DB);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM recurring_invoices WHERE business_id = ? ORDER BY created_at DESC"
  ).bind(businessId).all();
  const recurringInvoices = (results || []).map((row) => ({
    ...row,
    auto_send: Boolean(row.auto_send),
    active: Boolean(row.active),
    invoice_data: safeJsonParse(row.invoice_data, {})
  }));
  const dueCount = recurringInvoices.filter(
    (row) => row.active && typeof row.next_date === "string" && row.next_date <= today && (!row.end_date || row.next_date <= row.end_date)
  ).length;
  return c.json({ recurring_invoices: recurringInvoices, due_count: dueCount });
});
app.post("/api/recurring-invoices/generate-due", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot generate recurring invoices" }, 403);
  const result = await generateDueRecurringInvoices(c.env.DB, businessId);
  return c.json(result);
});
app.put("/api/recurring-invoices/:id", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot update recurring invoices" }, 403);
  await ensureRecurringInvoicesTable(c.env.DB);
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare(
    "SELECT * FROM recurring_invoices WHERE id = ? AND business_id = ?"
  ).bind(id, businessId).first();
  if (!existing?.id) return c.json({ error: "Recurring invoice not found" }, 404);
  const updates = await c.req.json();
  const sets = [];
  const values = [];
  if (updates.active !== void 0) {
    sets.push("active = ?");
    values.push(toBooleanInt(updates.active));
  }
  const frequency = updates.frequency !== void 0 ? normalizeRecurringFrequency(updates.frequency) : null;
  if (updates.frequency !== void 0 && !frequency) return c.json({ error: "Invalid frequency" }, 400);
  if (frequency) {
    sets.push("frequency = ?");
    values.push(frequency);
  }
  const endDate = updates.end_date !== void 0 ? normalizeISODate(updates.end_date) : void 0;
  if (updates.end_date !== void 0) {
    sets.push("end_date = ?");
    values.push(endDate);
  }
  if (updates.auto_send !== void 0) {
    sets.push("auto_send = ?");
    values.push(toBooleanInt(updates.auto_send));
  }
  if (!sets.length) return c.json({ error: "No fields to update" }, 400);
  values.push(id, businessId);
  await c.env.DB.prepare(`
    UPDATE recurring_invoices SET
      ${sets.join(", ")},
      updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).bind(...values).run();
  const recurringInvoice = await c.env.DB.prepare(
    "SELECT * FROM recurring_invoices WHERE id = ? AND business_id = ?"
  ).bind(id, businessId).first();
  return c.json({
    recurring_invoice: recurringInvoice ? {
      ...recurringInvoice,
      auto_send: Boolean(recurringInvoice.auto_send),
      active: Boolean(recurringInvoice.active),
      invoice_data: safeJsonParse(recurringInvoice.invoice_data, {})
    } : null
  });
});
app.delete("/api/recurring-invoices/:id", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot delete recurring invoices" }, 403);
  await ensureRecurringInvoicesTable(c.env.DB);
  const id = c.req.param("id");
  await c.env.DB.prepare(
    "DELETE FROM recurring_invoices WHERE id = ? AND business_id = ?"
  ).bind(id, businessId).run();
  return c.json({ deleted: true });
});
app.get("/api/customers", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ customers: [] });
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM customers WHERE business_id = ? ORDER BY name"
  ).bind(businessId).all();
  return c.json({ customers: results });
});
app.post("/api/customers", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot create customers" }, 403);
  const cust = await c.req.json();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO customers (id, business_id, name, gstin, phone, email, billing_address, shipping_address, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id,
    businessId,
    cust.name ?? "",
    cust.gstin ?? "",
    cust.phone ?? "",
    cust.email ?? "",
    cust.billing_address ?? "",
    cust.shipping_address ?? "",
    cust.state ?? ""
  ).run();
  const customer = await c.env.DB.prepare(
    "SELECT * FROM customers WHERE id = ? AND business_id = ?"
  ).bind(id, businessId).first();
  return c.json({ customer }, 201);
});
app.put("/api/customers/:id", authMiddleware, async (c) => {
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot update customers" }, 403);
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  const id = c.req.param("id");
  const cust = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE customers SET
      name = COALESCE(?, name), gstin = COALESCE(?, gstin), phone = COALESCE(?, phone),
      email = COALESCE(?, email), billing_address = COALESCE(?, billing_address),
      shipping_address = COALESCE(?, shipping_address), state = COALESCE(?, state)
    WHERE id = ? AND business_id = ?
  `).bind(
    cust.name ?? null,
    cust.gstin ?? null,
    cust.phone ?? null,
    cust.email ?? null,
    cust.billing_address ?? null,
    cust.shipping_address ?? null,
    cust.state ?? null,
    id,
    businessId
  ).run();
  const updated = await c.env.DB.prepare("SELECT * FROM customers WHERE id = ? AND business_id = ?").bind(id, businessId).first();
  return c.json({ customer: updated });
});
app.delete("/api/customers/:id", authMiddleware, async (c) => {
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot delete customers" }, 403);
  const businessId = c.get("businessId");
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM customers WHERE id = ? AND business_id = ?").bind(id, businessId).run();
  return c.json({ deleted: true });
});
app.get("/api/products", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ products: [] });
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM products WHERE business_id = ? ORDER BY name"
  ).bind(businessId).all();
  return c.json({ products: results });
});
app.post("/api/products", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot create products" }, 403);
  const prod = await c.req.json();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO products (id, business_id, name, hsn_sac_code, type, unit,
      selling_price, purchase_price, gst_rate, stock_quantity, low_stock_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    businessId,
    prod.name ?? "",
    prod.hsn_sac_code ?? "",
    prod.type ?? "goods",
    prod.unit ?? "pcs",
    prod.selling_price ?? 0,
    prod.purchase_price ?? 0,
    prod.gst_rate ?? 18,
    prod.stock_quantity ?? 0,
    prod.low_stock_threshold ?? 10
  ).run();
  const product = await c.env.DB.prepare(
    "SELECT * FROM products WHERE id = ? AND business_id = ?"
  ).bind(id, businessId).first();
  return c.json({ product }, 201);
});
app.put("/api/products/:id", authMiddleware, async (c) => {
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot update products" }, 403);
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  const id = c.req.param("id");
  const prod = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE products SET
      name = COALESCE(?, name), hsn_sac_code = COALESCE(?, hsn_sac_code),
      type = COALESCE(?, type), unit = COALESCE(?, unit),
      selling_price = COALESCE(?, selling_price), purchase_price = COALESCE(?, purchase_price),
      gst_rate = COALESCE(?, gst_rate), stock_quantity = COALESCE(?, stock_quantity),
      low_stock_threshold = COALESCE(?, low_stock_threshold)
    WHERE id = ? AND business_id = ?
  `).bind(
    prod.name ?? null,
    prod.hsn_sac_code ?? null,
    prod.type ?? null,
    prod.unit ?? null,
    prod.selling_price ?? null,
    prod.purchase_price ?? null,
    prod.gst_rate ?? null,
    prod.stock_quantity ?? null,
    prod.low_stock_threshold ?? null,
    id,
    businessId
  ).run();
  const updated = await c.env.DB.prepare("SELECT * FROM products WHERE id = ? AND business_id = ?").bind(id, businessId).first();
  return c.json({ product: updated });
});
app.delete("/api/products/:id", authMiddleware, async (c) => {
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot delete products" }, 403);
  const businessId = c.get("businessId");
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM products WHERE id = ? AND business_id = ?").bind(id, businessId).run();
  return c.json({ deleted: true });
});
app.get("/api/expenses", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ expenses: [] });
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM expenses WHERE business_id = ? ORDER BY date DESC"
  ).bind(businessId).all();
  return c.json({ expenses: results });
});
app.post("/api/expenses", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot create expenses" }, 403);
  const exp = await c.req.json();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO expenses (id, business_id, category, description, amount, gst_amount, date, vendor_name, receipt_url, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    businessId,
    exp.category ?? "",
    exp.description ?? "",
    exp.amount ?? 0,
    exp.gst_amount ?? 0,
    exp.date ?? null,
    exp.vendor_name ?? "",
    exp.receipt_url ?? "",
    exp.payment_method ?? "cash"
  ).run();
  const expense = await c.env.DB.prepare(
    "SELECT * FROM expenses WHERE id = ? AND business_id = ?"
  ).bind(id, businessId).first();
  return c.json({ expense }, 201);
});
app.put("/api/expenses/:id", authMiddleware, async (c) => {
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot update expenses" }, 403);
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  const id = c.req.param("id");
  const exp = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE expenses SET
      category = COALESCE(?, category),
      description = COALESCE(?, description),
      amount = COALESCE(?, amount),
      gst_amount = COALESCE(?, gst_amount),
      date = COALESCE(?, date),
      vendor_name = COALESCE(?, vendor_name),
      receipt_url = COALESCE(?, receipt_url),
      payment_method = COALESCE(?, payment_method)
    WHERE id = ? AND business_id = ?
  `).bind(
    exp.category ?? null,
    exp.description ?? null,
    exp.amount ?? null,
    exp.gst_amount ?? null,
    exp.date ?? null,
    exp.vendor_name ?? null,
    exp.receipt_url ?? null,
    exp.payment_method ?? null,
    id,
    businessId
  ).run();
  const expense = await c.env.DB.prepare(
    "SELECT * FROM expenses WHERE id = ? AND business_id = ?"
  ).bind(id, businessId).first();
  return c.json({ expense });
});
app.delete("/api/expenses/:id", authMiddleware, async (c) => {
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot delete expenses" }, 403);
  const businessId = c.get("businessId");
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM expenses WHERE id = ? AND business_id = ?").bind(id, businessId).run();
  return c.json({ deleted: true });
});
app.post("/api/payments", authMiddleware, async (c) => {
  if (c.get("teamRole") === "viewer") return c.json({ error: "Viewers cannot record payments" }, 403);
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  const pay = await c.req.json();
  const invoiceId = getOptionalString(pay.invoice_id);
  const amount = toFiniteNumber(pay.amount, 0);
  if (!invoiceId) return c.json({ error: "Invoice is required" }, 400);
  if (amount <= 0) return c.json({ error: "Payment amount must be greater than zero" }, 400);
  const invoice = await c.env.DB.prepare(
    "SELECT id FROM invoices WHERE id = ? AND business_id = ?"
  ).bind(invoiceId, businessId).first();
  if (!invoice?.id) return c.json({ error: "Invoice not found" }, 404);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO payments (id, invoice_id, amount, payment_date, payment_method, reference_number, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    invoiceId,
    amount,
    getOptionalString(pay.payment_date),
    getTrimmedString(pay.payment_method) || "cash",
    getTrimmedString(pay.reference_number),
    getTrimmedString(pay.notes)
  ).run();
  const payment = await c.env.DB.prepare(
    "SELECT * FROM payments WHERE id = ?"
  ).bind(id).first();
  const updatedInvoice = await recalculateInvoicePaymentSummary(c.env.DB, invoiceId, businessId);
  return c.json({ payment, invoice: updatedInvoice }, 201);
});
app.get("/api/reports/gst", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  const month = c.req.query("month");
  if (!month) return c.json({ error: "month query param required (e.g. 2026-03)" }, 400);
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;
  const row = await c.env.DB.prepare(`
    SELECT
      COALESCE(SUM(taxable_amount), 0) as total_taxable,
      COALESCE(SUM(cgst), 0) as total_cgst,
      COALESCE(SUM(sgst), 0) as total_sgst,
      COALESCE(SUM(igst), 0) as total_igst,
      COALESCE(SUM(total_amount), 0) as total_amount,
      COUNT(*) as invoice_count
    FROM invoices
    WHERE business_id = ? AND invoice_date BETWEEN ? AND ? AND status != 'draft'
  `).bind(businessId, startDate, endDate).first();
  return c.json({ gst: row });
});
app.get("/api/reports/sales", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  const invoices = await c.env.DB.prepare(
    "SELECT * FROM invoices WHERE business_id = ? AND status NOT IN ('draft', 'cancelled') ORDER BY invoice_date DESC"
  ).bind(businessId).all();
  const expenses = await c.env.DB.prepare(
    "SELECT * FROM expenses WHERE business_id = ? ORDER BY date DESC"
  ).bind(businessId).all();
  const invoiceRows = invoices.results;
  const expenseRows = expenses.results;
  const totalRevenue = invoiceRows.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
  const totalExpenses = expenseRows.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  return c.json({
    invoices: invoices.results,
    expenses: expenses.results,
    summary: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalExpenses,
      invoice_count: invoices.results.length,
      expense_count: expenses.results.length
    }
  });
});
app.get("/api/team", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  if (!businessId) return c.json([]);
  const { results } = await c.env.DB.prepare(
    `SELECT tm.*, u.full_name, u.avatar_url
     FROM team_members tm
     LEFT JOIN users u ON tm.user_id = u.id
     WHERE tm.business_id = ?
     ORDER BY tm.invited_at DESC`
  ).bind(businessId).all();
  return c.json(results);
});
app.get("/api/team/invite/:id", async (c) => {
  await ensureCoreSchema(c.env.DB);
  const inviteId = c.req.param("id");
  const invite = await c.env.DB.prepare(
    `SELECT tm.email, tm.role, b.name as business_name
     FROM team_members tm JOIN businesses b ON tm.business_id = b.id
     WHERE tm.id = ? AND tm.status = 'pending'`
  ).bind(inviteId).first();
  if (!invite) return c.json({ error: "Invite not found or already used" }, 404);
  return c.json({ business_name: invite.business_name, email: invite.email, role: invite.role });
});
app.post("/api/team/accept/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const inviteId = c.req.param("id");
  const invite = await c.env.DB.prepare(
    "SELECT * FROM team_members WHERE id = ? AND status = 'pending'"
  ).bind(inviteId).first();
  if (!invite) return c.json({ error: "Invite not found or already accepted" }, 404);
  const user = await c.env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first();
  if (user?.email !== invite.email) return c.json({ error: "This invite is for a different email address" }, 400);
  await c.env.DB.prepare(
    "UPDATE team_members SET status = 'active', user_id = ?, joined_at = datetime('now') WHERE id = ?"
  ).bind(userId, inviteId).run();
  return c.json({ success: true, business_id: invite.business_id });
});
app.post("/api/team/invite", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const businessId = c.get("businessId");
  if (!businessId) return c.json({ error: "No business found" }, 404);
  const teamRole = c.get("teamRole");
  if (teamRole && teamRole !== "owner" && teamRole !== "admin") {
    return c.json({ error: "Only owners and admins can invite team members" }, 403);
  }
  const user = await c.env.DB.prepare("SELECT plan FROM users WHERE id = ?").bind(userId).first();
  const plan = user?.plan || "free";
  if (plan === "free" || !plan) {
    return c.json({ error: "Upgrade to Pro to invite team members" }, 400);
  }
  const teamCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM team_members WHERE business_id = ?"
  ).bind(businessId).first();
  const currentCount = (teamCount?.count || 0) + 1;
  const limit = plan === "business" ? 10 : plan === "pro" || plan === "trial" ? 3 : 1;
  if (currentCount >= limit) {
    return c.json({ error: `Team limit reached (${limit} members on your plan). Upgrade to add more.` }, 400);
  }
  const { email, role } = await c.req.json();
  if (!email) return c.json({ error: "Email required" }, 400);
  const normalizedRole = getAssignableTeamRole(role) || "staff";
  const normalizedEmail = email.toLowerCase().trim();
  const selfUser = await c.env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first();
  if (selfUser?.email === normalizedEmail) {
    return c.json({ error: "You cannot invite yourself" }, 400);
  }
  const existing = await c.env.DB.prepare(
    "SELECT id FROM team_members WHERE business_id = ? AND email = ?"
  ).bind(businessId, normalizedEmail).first();
  if (existing) return c.json({ error: "This email has already been invited" }, 400);
  const existingUser = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(normalizedEmail).first();
  const id = crypto.randomUUID();
  const status = "pending";
  await c.env.DB.prepare(
    "INSERT INTO team_members (id, business_id, invited_by, email, role, status, user_id) VALUES (?,?,?,?,?,?,?)"
  ).bind(id, businessId, userId, normalizedEmail, normalizedRole, status, existingUser?.id || null).run();
  const frontendUrl = c.env.FRONTEND_URL || "https://billkar.co.in";
  const inviteLink = `${frontendUrl}/invite/${id}`;
  return c.json({
    id,
    success: true,
    status,
    inviteLink,
    message: "Invite created. Share the invite link with them."
  }, 201);
});
app.put("/api/team/:id", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  const id = c.req.param("id");
  const teamRole = c.get("teamRole");
  if (teamRole && teamRole !== "owner" && teamRole !== "admin") {
    return c.json({ error: "Only owners and admins can change roles" }, 403);
  }
  const { role } = await c.req.json();
  const normalizedRole = getAssignableTeamRole(role);
  if (!normalizedRole) return c.json({ error: "Invalid team role" }, 400);
  await c.env.DB.prepare(
    "UPDATE team_members SET role = ? WHERE id = ? AND business_id = ?"
  ).bind(normalizedRole, id, businessId).run();
  return c.json({ success: true });
});
app.delete("/api/team/:id", authMiddleware, async (c) => {
  const businessId = c.get("businessId");
  const id = c.req.param("id");
  const teamRole = c.get("teamRole");
  if (teamRole && teamRole !== "owner" && teamRole !== "admin") {
    return c.json({ error: "Only owners and admins can remove members" }, 403);
  }
  await c.env.DB.prepare(
    "DELETE FROM team_members WHERE id = ? AND business_id = ?"
  ).bind(id, businessId).run();
  return c.json({ success: true });
});
var ADMIN_EMAILS = ["dropshippers024@gmail.com"];
async function adminGuard(c) {
  await ensureCoreSchema(c.env.DB);
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const userId = await verifyJWT(authHeader.slice(7), c.env.JWT_SECRET);
  if (!userId) return false;
  const user = await c.env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first();
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
}
__name(adminGuard, "adminGuard");
app.get("/api/admin/stats", async (c) => {
  if (!await adminGuard(c)) return c.json({ error: "Not admin" }, 403);
  try {
    const totalUsers = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
    const proUsers = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'").first();
    const businessUsers = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'business'").first();
    const totalInvoices = await c.env.DB.prepare("SELECT COUNT(*) as count FROM invoices").first();
    const todaySignups = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now')").first();
    const thisWeekSignups = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now', '-7 days')").first();
    return c.json({
      totalUsers: totalUsers?.count || 0,
      proUsers: proUsers?.count || 0,
      businessUsers: businessUsers?.count || 0,
      freeUsers: (totalUsers?.count || 0) - (proUsers?.count || 0) - (businessUsers?.count || 0),
      totalInvoices: totalInvoices?.count || 0,
      todaySignups: todaySignups?.count || 0,
      thisWeekSignups: thisWeekSignups?.count || 0
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch stats";
    return c.json({ error: message }, 500);
  }
});
app.get("/api/admin/users", async (c) => {
  if (!await adminGuard(c)) return c.json({ error: "Not admin" }, 403);
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.full_name, u.phone, u.plan, u.plan_expires_at, u.created_at,
        b.name as business_name, b.gstin,
        (SELECT COUNT(*) FROM invoices WHERE business_id = b.id) as invoice_count
      FROM users u LEFT JOIN businesses b ON b.user_id = u.id
      ORDER BY u.created_at DESC`
    ).all();
    return c.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch users";
    return c.json({ error: message }, 500);
  }
});
app.post("/api/admin/update-plan", async (c) => {
  if (!await adminGuard(c)) return c.json({ error: "Not admin" }, 403);
  try {
    const { user_id, plan, days } = await c.req.json();
    if (!user_id || !plan) return c.json({ error: "user_id and plan are required" }, 400);
    if (plan === "free") {
      await c.env.DB.prepare("UPDATE users SET plan = ?, plan_expires_at = NULL WHERE id = ?").bind("free", user_id).run();
    } else {
      const expiresAt = new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1e3).toISOString();
      await c.env.DB.prepare("UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?").bind(plan, expiresAt, user_id).run();
    }
    const updated = await c.env.DB.prepare(
      "SELECT id, email, full_name, plan, plan_expires_at FROM users WHERE id = ?"
    ).bind(user_id).first();
    return c.json({ success: true, user: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update plan";
    return c.json({ error: message }, 500);
  }
});
app.delete("/api/admin/users/:id", async (c) => {
  if (!await adminGuard(c)) return c.json({ error: "Not admin" }, 403);
  try {
    const targetId = c.req.param("id");
    await c.env.DB.prepare("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?))").bind(targetId).run();
    await c.env.DB.prepare("DELETE FROM invoices WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)").bind(targetId).run();
    await c.env.DB.prepare("DELETE FROM customers WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)").bind(targetId).run();
    await c.env.DB.prepare("DELETE FROM products WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)").bind(targetId).run();
    await c.env.DB.prepare("DELETE FROM expenses WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)").bind(targetId).run();
    await c.env.DB.prepare("DELETE FROM team_members WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)").bind(targetId).run();
    await c.env.DB.prepare("DELETE FROM team_members WHERE user_id = ?").bind(targetId).run();
    await c.env.DB.prepare("DELETE FROM businesses WHERE user_id = ?").bind(targetId).run();
    await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(targetId).run();
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    return c.json({ error: message }, 500);
  }
});
var workers_default = app;

// ../../../../usr/local/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../usr/local/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-EuXgRD/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = workers_default;

// ../../../../usr/local/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-EuXgRD/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
