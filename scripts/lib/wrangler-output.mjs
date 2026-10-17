export function parseWranglerJson(output) {
  const start = output.search(/^[\t ]*[\[{]/m);
  if (start < 0) throw new Error("WranglerからJSON応答がありません。");
  return JSON.parse(output.slice(start).trim());
}

export function redactWranglerOutput(output) {
  return output.replace(/https:\/\/[^\s"'<>]*[?&]X-Amz-[^\s"'<>]*/gi, "[一時ダウンロードURLは非表示]");
}
