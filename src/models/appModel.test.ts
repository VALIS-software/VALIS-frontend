import { default as AppModel, AppEvent } from './appModel';
import * as sinon from 'sinon';

describe('AppModel', () => {
    describe('events', () => {
        let model: any;

        beforeAll(() => {
            model = new AppModel();
        });

        test('loading state changed', () => {
            const cb = sinon.spy();
            model.addListener(cb, AppEvent.LoadingStateChanged);
            model.notifyListeners(AppEvent.LoadingStateChanged, true);
            expect(cb.callCount).toBe(1);
        });
    });
});
