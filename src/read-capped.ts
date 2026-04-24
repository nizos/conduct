export function readCapped(
  read: (buffer: Buffer, offset: number, length: number) => number,
  maxBytes: number,
): string {
  const buffer = Buffer.alloc(maxBytes + 1)
  let total = 0
  while (true) {
    const n = read(buffer, total, buffer.length - total)
    if (n === 0) break
    total += n
    if (total > maxBytes) {
      throw new Error(`input exceeds ${maxBytes} bytes`)
    }
  }
  return buffer.subarray(0, total).toString('utf8')
}
