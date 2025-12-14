export async function withMinDelay(promise, minMs = 1000) {
    const start = Date.now();

    const result = await promise;

    const elapsed = Date.now() - start;
    if (elapsed < minMs) {
        await new Promise((r) => setTimeout(r, minMs - elapsed));
    }

    return result;
}
