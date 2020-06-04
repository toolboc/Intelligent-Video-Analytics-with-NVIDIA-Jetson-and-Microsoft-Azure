export function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            return resolve();
        }, milliseconds);
    });
}
