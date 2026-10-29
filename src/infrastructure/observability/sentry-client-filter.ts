type ErrorEvent = {
  exception?: {
    values?: {
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: {filename?: string; function?: string}[];
      };
    }[];
  };
};

const webViewScrollBridgeError = "undefined is not an object (evaluating 'window.webkit.messageHandlers.scrollEventHandler.postMessage')";

// SAPPORO-CONCAFE-MAP-6 came from an app:// sendScrollEvent frame, while the
// site's source contains no call to this bridge. Keep other errors visible.
export function isExternalWebViewScrollBridgeError(event: ErrorEvent): boolean {
  return event.exception?.values?.some(value =>
    value.type === "TypeError" &&
    value.value === webViewScrollBridgeError &&
    value.stacktrace?.frames?.some(frame =>
      frame.filename?.startsWith("app://") && frame.function === "sendScrollEvent"
    )
  ) ?? false;
}
