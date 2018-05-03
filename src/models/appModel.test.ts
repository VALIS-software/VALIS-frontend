import { default as AppModel, APP_EVENT_LOADING_STATE_CHANGED } from './appModel';
import * as sinon from 'sinon';

describe('AppModel', () => {
    describe('events', () => {
        let model: any;

        beforeAll(() => {
            model = new AppModel();
        });

        test('loading state changed', () => {
            const cb = sinon.spy();
            model.addListener(cb, APP_EVENT_LOADING_STATE_CHANGED);
            model.notifyListeners(APP_EVENT_LOADING_STATE_CHANGED, true);
            expect(cb.callCount).toBe(1);
        });
    });
});
