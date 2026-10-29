import {expect, test} from "@playwright/test";
import {isExternalWebViewScrollBridgeError} from "../../src/infrastructure/observability/sentry-client-filter";

const message = "undefined is not an object (evaluating 'window.webkit.messageHandlers.scrollEventHandler.postMessage')";

function errorEvent(type = "TypeError", value = message, filename = "app:///:20:57", functionName = "sendScrollEvent") {
  return {exception: {values: [{type, value, stacktrace: {frames: [{filename, function: functionName}]}}]}};
}

test("filters the observed external WebView scroll bridge exception", () => {
  const observedEvent = errorEvent();
  observedEvent.exception.values[0].stacktrace.frames.unshift({filename: "app:///_next/static/chunks/33xxqriuw95x6.js", function: "n"});
  expect(isExternalWebViewScrollBridgeError(observedEvent)).toBe(true);
});

test("keeps application errors and other WebView exceptions", () => {
  expect(isExternalWebViewScrollBridgeError(errorEvent("TypeError", message, "https://sapporo-concafe-map.com/app.js"))).toBe(false);
  expect(isExternalWebViewScrollBridgeError(errorEvent("TypeError", message, "app:///:20:57", "otherHandler"))).toBe(false);
  expect(isExternalWebViewScrollBridgeError(errorEvent("TypeError", "Cannot read properties of undefined", "app:///:20:57"))).toBe(false);
  expect(isExternalWebViewScrollBridgeError(errorEvent("Error"))).toBe(false);
  expect(isExternalWebViewScrollBridgeError({})).toBe(false);
  expect(isExternalWebViewScrollBridgeError({exception: {values: [{type: "TypeError", value: message}]}})).toBe(false);
});
