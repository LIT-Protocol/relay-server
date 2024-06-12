export function assertStatus(code: number, error: string) {
    return (response: Response) => {
        if (response.status !== code) {
            throw new Error(error);
        }

        return response;
    };
}

export function assertNotNull(value: any, error: string) {
    if (value === null || value === undefined) {
        throw new Error(error);
    }

    return value;
}

export function assertString(value: any, error: string) {
    if (typeof value !== "string") {
        throw new Error(error);
    }

    return value as string;
}