export type EditablePixelImage = { width: number; height: number; data: Uint8ClampedArray };
export type PixelBounds = { x: number; y: number; width: number; height: number };
export type NormalizedRect = { x: number; y: number; width: number; height: number };

function offset(index: number) { return index * 4; }
function withinTolerance(data: Uint8ClampedArray, index: number, red: number, green: number, blue: number, tolerance: number) {
  const byte = offset(index);
  if (data[byte + 3] === 0) return false;
  const dr = data[byte] - red; const dg = data[byte + 1] - green; const db = data[byte + 2] - blue;
  return dr * dr + dg * dg + db * db <= tolerance * tolerance * 3;
}

export function removeConnectedColor(image: EditablePixelImage, seedX: number, seedY: number, tolerance: number) {
  const { width, height, data } = image;
  const x = Math.max(0, Math.min(width - 1, Math.floor(seedX)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(seedY)));
  const seed = y * width + x; const seedByte = offset(seed);
  const red = data[seedByte]; const green = data[seedByte + 1]; const blue = data[seedByte + 2];
  const visited = new Uint8Array(width * height); const queue = new Int32Array(width * height);
  let head = 0; let tail = 0; let removed = 0;
  queue[tail++] = seed; visited[seed] = 1;
  while (head < tail) {
    const index = queue[head++];
    if (!withinTolerance(data, index, red, green, blue, tolerance)) continue;
    data[offset(index) + 3] = 0; removed += 1;
    const px = index % width; const py = Math.floor(index / width);
    const neighbors = [px > 0 ? index - 1 : -1, px + 1 < width ? index + 1 : -1, py > 0 ? index - width : -1, py + 1 < height ? index + width : -1];
    for (const next of neighbors) if (next >= 0 && !visited[next]) { visited[next] = 1; queue[tail++] = next; }
  }
  return removed;
}

export function removeEdgeBackground(image: EditablePixelImage, tolerance: number) {
  const { width, height, data } = image;
  const corner = (x: number, y: number) => {
    const byte = offset(y * width + x);
    return [data[byte], data[byte + 1], data[byte + 2]] as const;
  };
  const topLeft = corner(0, 0); const topRight = corner(width - 1, 0);
  const bottomLeft = corner(0, height - 1); const bottomRight = corner(width - 1, height - 1);
  const expected = (index: number) => {
    const x = index % width; const y = Math.floor(index / width);
    const horizontal = width > 1 ? x / (width - 1) : 0; const vertical = height > 1 ? y / (height - 1) : 0;
    return [0, 1, 2].map((channel) => {
      const top = topLeft[channel] + (topRight[channel] - topLeft[channel]) * horizontal;
      const bottom = bottomLeft[channel] + (bottomRight[channel] - bottomLeft[channel]) * horizontal;
      return top + (bottom - top) * vertical;
    }) as [number, number, number];
  };
  const visited = new Uint8Array(width * height); const queue = new Int32Array(width * height);
  let head = 0; let tail = 0; let removed = 0;
  const enqueue = (index: number) => { if (!visited[index]) { visited[index] = 1; queue[tail++] = index; } };
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 1; y + 1 < height; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++]; const [red, green, blue] = expected(index);
    if (!withinTolerance(data, index, red, green, blue, tolerance)) continue;
    data[offset(index) + 3] = 0; removed += 1;
    const x = index % width; const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1); if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width); if (y + 1 < height) enqueue(index + width);
  }
  return removed;
}

export function opaqueBounds(image: EditablePixelImage, padding = 0): PixelBounds | null {
  const { width, height, data } = image;
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[offset(y * width + x) + 3] <= 8) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) return null;
  const safePadding = Math.max(0, Math.floor(padding));
  left = Math.max(0, left - safePadding); top = Math.max(0, top - safePadding);
  right = Math.min(width - 1, right + safePadding); bottom = Math.min(height - 1, bottom + safePadding);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export function visibleContentBounds(image: EditablePixelImage, tolerance = 36, padding = 0): PixelBounds | null {
  const withoutEdgeBackground: EditablePixelImage = {
    width: image.width,
    height: image.height,
    data: new Uint8ClampedArray(image.data),
  };
  removeEdgeBackground(withoutEdgeBackground, tolerance);
  return opaqueBounds(withoutEdgeBackground, padding);
}

export function containedCropPlacement(container: NormalizedRect, stageAspect: number, sourceAspect: number, crop: NormalizedRect): NormalizedRect {
  const boxWidth = container.width * stageAspect;
  const boxHeight = container.height;
  const safeSourceAspect = Math.max(.01, sourceAspect);
  let contentWidth = boxWidth;
  let contentHeight = contentWidth / safeSourceAspect;
  let offsetX = 0;
  let offsetY = 0;
  if (contentHeight > boxHeight) {
    contentHeight = boxHeight;
    contentWidth = contentHeight * safeSourceAspect;
    offsetX = (boxWidth - contentWidth) / 2;
  } else {
    offsetY = (boxHeight - contentHeight) / 2;
  }
  const normalizedContentWidth = contentWidth / stageAspect;
  return {
    x: container.x + offsetX / stageAspect + normalizedContentWidth * crop.x,
    y: container.y + offsetY + contentHeight * crop.y,
    width: normalizedContentWidth * crop.width,
    height: contentHeight * crop.height,
  };
}
