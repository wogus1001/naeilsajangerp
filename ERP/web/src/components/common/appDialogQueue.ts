export type ResolvableDialogRequest = {
    readonly resolve: (result: boolean) => void;
};

export type AppDialogQueue<TRequest extends ResolvableDialogRequest> = {
    readonly enqueue: (request: TRequest) => void;
    readonly resolveActive: (result: boolean) => void;
    readonly dispose: () => void;
};

export function createAppDialogQueue<TRequest extends ResolvableDialogRequest>(
    onActiveChange: (request: TRequest | null) => void
): AppDialogQueue<TRequest> {
    let active: TRequest | null = null;
    const pending: TRequest[] = [];

    return {
        enqueue(request) {
            if (active) {
                pending.push(request);
                return;
            }
            active = request;
            onActiveChange(request);
        },
        resolveActive(result) {
            if (!active) return;
            active.resolve(result);
            active = pending.shift() ?? null;
            onActiveChange(active);
        },
        dispose() {
            active?.resolve(false);
            pending.forEach(request => request.resolve(false));
            active = null;
            pending.length = 0;
        }
    };
}
