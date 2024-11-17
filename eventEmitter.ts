// eventEmitter.js
import EventEmitter from 'events';

export const eventEmitter = new EventEmitter();


// waitForEvent.js
export const waitForEvent = (emitter: EventEmitter, eventName: string, timeout: number, queueId: string) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            emitter.removeListener(eventName, onEvent);
            reject(new Error(`Timeout: Did not receive ${eventName} within ${timeout}ms`));
        }, timeout);

        const onEvent = (data: any) => {
            clearTimeout(timer);
            if (data.queueId === queueId) {
                resolve(data);
            }
        };

        emitter.once(eventName, onEvent);
    });
};
