export async function settleInBatches<T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  batchSize = 10,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let index = 0; index < items.length; index += batchSize) {
    const results = await Promise.allSettled(
      items.slice(index, index + batchSize).map(operation),
    );
    sent += results.filter((result) => result.status === "fulfilled").length;
    failed += results.filter((result) => result.status === "rejected").length;
  }
  return { sent, failed };
}
