export function forget(fireAndForgetAsyncFunc: any, ...params) {
    (async () => {
        await fireAndForgetAsyncFunc(...params);
    })().catch();
}
