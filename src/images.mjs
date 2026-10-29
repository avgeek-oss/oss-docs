const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const jpegFrames = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpegDimensions(image) {
  let offset = 2;
  while (offset + 8 < image.length) {
    if (image[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = image[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = image.readUInt16BE(offset + 2);
    if (jpegFrames.has(marker))
      return {
        format: "jpeg",
        height: image.readUInt16BE(offset + 5),
        width: image.readUInt16BE(offset + 7),
      };
    if (length < 2) break;
    offset += length + 2;
  }
  throw new Error("JPEG has no frame dimensions");
}

function svgDimensions(image) {
  const root = image.toString("utf8").match(/<svg\b[^>]*>/);
  if (!root) throw new Error("SVG has no root element");
  const attribute = (name) =>
    root[0].match(new RegExp(`\\s${name}=["']([^"']+)["']`))?.[1];
  const number = (value) =>
    value && /^\d+(?:\.\d+)?(?:px)?$/.test(value)
      ? Number.parseFloat(value)
      : undefined;
  let width = number(attribute("width"));
  let height = number(attribute("height"));
  const box = attribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box?.length === 4 && box.every(Number.isFinite)) {
    width ??= box[2];
    height ??= box[3];
  }
  if (width === undefined || height === undefined)
    throw new Error("SVG has no width/height or viewBox");
  return { format: "svg", width, height };
}

// Intrinsic dimensions of a PNG, JPEG or SVG image, read from its header.
export function imageDimensions(image) {
  if (image.length >= 24 && image.subarray(0, 8).equals(pngSignature)) {
    if (image.toString("ascii", 12, 16) !== "IHDR")
      throw new Error("PNG has no IHDR header");
    return {
      format: "png",
      width: image.readUInt32BE(16),
      height: image.readUInt32BE(20),
    };
  }
  if (image[0] === 0xff && image[1] === 0xd8) return jpegDimensions(image);
  if (startsWithSvg(image.toString("utf8", 0, 4096)))
    return svgDimensions(image);
  throw new Error("unsupported image format; use PNG, JPEG or SVG");
}

// True when the text is an SVG document: an optional XML declaration, then
// any comments and doctype, then `<svg`. Scanned by hand because the
// equivalent regex backtracks badly on repeated comments.
function startsWithSvg(text) {
  let index = 0;
  const skipSpace = () => {
    while (index < text.length && /\s/.test(text[index])) index++;
  };
  const skipPast = (end) => {
    const found = text.indexOf(end, index);
    if (found === -1) return false;
    index = found + end.length;
    return true;
  };
  const startsAt = (prefix) =>
    text.slice(index, index + prefix.length).toLowerCase() === prefix;
  skipSpace();
  if (startsAt("<?xml") && !skipPast(">")) return false;
  for (;;) {
    skipSpace();
    if (startsAt("<!--")) {
      index += 4;
      if (!skipPast("-->")) return false;
    } else if (startsAt("<!doctype")) {
      if (!skipPast(">")) return false;
    } else break;
  }
  return startsAt("<svg") && !/\w/.test(text[index + 4] ?? "");
}
