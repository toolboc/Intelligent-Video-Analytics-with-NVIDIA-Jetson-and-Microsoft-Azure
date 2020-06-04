class DeferredPromise {
    public then: any;
    public catch: any;
    public resolve: any;
    public reject: any;
    private promiseInternal: any;

    public constructor() {
        this.promiseInternal = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        this.then = this.promiseInternal.then.bind(this.promiseInternal);
        this.catch = this.promiseInternal.catch.bind(this.promiseInternal);
    }

    public get promise() {
        return this.promiseInternal;
    }
}

export function defer() {
    return new DeferredPromise();
}
