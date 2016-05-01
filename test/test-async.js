import {describe, it, expect} from './testing';

import {
    sleep, defer, all, SomeRejected, TaskSet, wrap, wraps
} from 'nuss/async';

const DEFER_RESULT = 1234;

class Counter {
    value = 0;

    inc() {
        this.value += 1;
        return this.value;
    }
}

describe('sleep()', ()=> {
    it('should be awaitable', async ()=> {
        let task = sleep(0);
        let result = await task;

        expect(task).to.be.an.instanceof(Promise);
        expect(result).to.equal(undefined);
    });
});


describe('defer()', ()=> {
    it('should call function later', async ()=> {
        let result = null;

        let task = defer(()=> {
            result = DEFER_RESULT;
            return DEFER_RESULT;
        });

        expect(task).to.be.an.instanceof(Promise);

        // we should only see a result if once we awaited the promise
        expect(result).to.equal(null);
        expect(await task).to.equal(DEFER_RESULT);
        expect(result).to.equal(DEFER_RESULT);
    });
});


describe('all()', ()=> {
    it('should wait for all tasks', async ()=> {
        let counter = new Counter();

        let tasks = [
            defer(()=> counter.inc()),
            defer(()=> counter.inc())
        ];
        let allTasks = all(tasks);

        await allTasks;

        expect(allTasks).to.be.an.instanceof(Promise);
        expect(counter.value).to.equal(tasks.length);
    });

    it('should wait for failed and succeeded promises', async ()=> {
        let counter = new Counter();
        let taskError = new Error();
        let tasks = [
            defer(()=> {
                counter.inc();
                throw taskError;
            }),
            defer(()=> counter.inc())
        ];

        try {
            await all(tasks);
        } catch (err) {
            expect(err).to.be.instanceof(SomeRejected);
            expect(err.errors).to.deep.equal([taskError]);
        }
        expect(counter.value).to.equals(tasks.length);
    });
});


describe('class TaskSet()', ()=> {
    it('should be a subclass of Set', ()=> {
        let tasks = new TaskSet();

        expect(tasks).to.be.an.instanceof(Set);
    });

    it('should spawn and auto remove tasks', async ()=> {
        const ONE_TASK = 1;
        const NO_TASKS = 0;

        let tasks = new TaskSet();

        tasks.spawn(()=> DEFER_RESULT);

        expect(tasks.size).to.equal(ONE_TASK);
        await all(tasks);
        expect(tasks.size).to.equal(NO_TASKS);
    });

    it('should spawn and auto remove tasks', async ()=> {
        const ONE_TASK = 1;
        const NO_TASKS = 0;

        let tasks = new TaskSet();

        tasks.spawn(()=> DEFER_RESULT);

        expect(tasks.size).to.equal(ONE_TASK);
        await all(tasks);
        expect(tasks.size).to.equal(NO_TASKS);
    });

    it('should auto remove errored tasks', async ()=> {
        const NO_TASKS = 0;

        let tasks = new TaskSet();

        tasks.spawn(()=> {
            throw new Error();
        });

        try {
            await all(tasks);
        } catch (err) {
            // don't care
        }
        expect(tasks.size).to.equal(NO_TASKS);
    });
});


describe('@wrap', ()=> {
    @wraps('wrapped')
    class Foo {
        wrapped = {
            spam(arg, raise, handle) {
                if (raise) {
                    handle(new Error(arg));
                } else {
                    handle(undefined, arg);
                }
            }
        }

        @wrap
        spam
    }

    it('should call wrapped node-style', async ()=> {
        let foo = new Foo();

        let rslt = await foo.spam('foobar', false);

        expect(rslt).to.equal('foobar');
    });

    it('should call wrapped node-style and raise', async ()=> {
        let foo = new Foo();

        let rslt = null;
        try {
            rslt = await foo.spam('foobar', true);
        } catch (err) {
            expect(err).to.be.instanceof(Error);
            expect(err.message).to.equal('foobar');
        }

        expect(rslt).to.equal(null);
    });
});
