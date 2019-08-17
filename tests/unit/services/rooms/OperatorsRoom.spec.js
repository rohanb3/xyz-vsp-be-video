jest.mock('socketio-auth', () => () => {});
jest.mock('@/services/calls', () => ({
  subscribeToCallbackAccepting: jest.fn(() => {}),
  subscribeToCallbackDeclining: jest.fn(() => {}),
  subscribeToCallsLengthChanging: jest.fn(() => {}),
  subscribeToCallFinishing: jest.fn(() => {}),
  getCallsInfo: jest.fn(() => Promise.resolve({})),
  finishCall: jest.fn(() => Promise.resolve()),
  requestCallback: jest.fn(() => Promise.resolve()),
  acceptCall: jest.fn(() => Promise.resolve({})),
}));
jest.mock('@/services/twilio');

const twilio = require('@/services/twilio');
const calls = require('@/services/calls');
const OperatorsRoom = require('@/services/rooms/OperatorsRoom');

const { connectionsHeap } = require('@/services/connectionsHeap');
const {
  CONNECTION,
  DISCONNECT,
  ROOM_CREATED,
  ACTIVE_OPERATORS,
  OPERATORS,
} = require('@/constants/rooms');
const {
  CALL_ACCEPTED,
  CALL_FINISHED,
  CALLBACK_REQUESTED,
  CALLBACK_ACCEPTED,
  CALLBACK_DECLINED,
  CALLS_CHANGED,
  CALLS_EMPTY,
  CALL_ACCEPTING_FAILED,
  CALL_FINISHED_BY_CUSTOMER,
} = require('@/constants/calls');

const { STATUS_CHANGED_ONLINE, STATUS_CHANGED_OFFLINE } = require('@/constants/operatorStatuses');
const { CallsPendingEmptyError, CallNotFoundError } = require('@/services/calls/errors');

let operatorsRoom = null;
let operator = null;
let socketId;
let operatorIdentity;
let callId;

const mockedNamespace = {
  on: jest.fn(),
  to: jest.fn(() => mockedNamespace),
  emit: jest.fn(),
};

const io = {
  of: jest.fn(() => mockedNamespace),
};

describe('OperatorsRoom: ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketId = '/operators#42';
    operatorIdentity = 'operator42';
    callId = 'call42';
    operatorsRoom = new OperatorsRoom(io);
    operator = {
      on: jest.fn(),
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      identity: operatorIdentity,
      id: socketId,
    };
  });

  describe('constructor(): ', () => {
    it('should create operators namespace', () => {
      expect(io.of).toHaveBeenCalledWith(OPERATORS);
    });

    it('should add listener to namespace connection event', () => {
      expect(mockedNamespace.on).toHaveBeenCalledWith(CONNECTION, expect.any(Function));
    });

    it('should subscribe to call finishing', () => {
      expect(calls.subscribeToCallFinishing).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should subscribe to callback accepting', () => {
      expect(calls.subscribeToCallbackAccepting).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should subscribe to callback declining', () => {
      expect(calls.subscribeToCallbackDeclining).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should subscribe to pending calls length changing', () => {
      expect(calls.subscribeToCallsLengthChanging).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('onOperatorConnected(): ', () => {
    it('should subscribe to call accepting', () => {
      jest.spyOn(operatorsRoom.onOperatorAcceptCall, 'bind');
      operatorsRoom.onOperatorConnected(operator);
      expect(operator.on).toHaveBeenCalledWith(CALL_ACCEPTED, expect.any(Function));
      expect(operatorsRoom.onOperatorAcceptCall.bind).toHaveBeenCalledWith(operatorsRoom, operator);
    });

    it('should subscribe to callback requesting', () => {
      jest.spyOn(operatorsRoom.onOperatorRequestedCallback, 'bind');
      operatorsRoom.onOperatorConnected(operator);
      expect(operator.on).toHaveBeenCalledWith(CALLBACK_REQUESTED, expect.any(Function));
      expect(operatorsRoom.onOperatorRequestedCallback.bind).toHaveBeenCalledWith(
        operatorsRoom,
        operator,
      );
    });

    it('should subscribe to call finishig', () => {
      jest.spyOn(operatorsRoom.onOperatorFinishedCall, 'bind');
      operatorsRoom.onOperatorConnected(operator);
      expect(operator.on).toHaveBeenCalledWith(CALL_FINISHED, expect.any(Function));
      expect(operatorsRoom.onOperatorFinishedCall.bind).toHaveBeenCalledWith(
        operatorsRoom,
        operator,
      );
    });

    it('should subscribe to disconnection', () => {
      jest.spyOn(operatorsRoom.onOperatorDisconnected, 'bind');
      operatorsRoom.onOperatorConnected(operator);
      expect(operator.on).toHaveBeenCalledWith(DISCONNECT, expect.any(Function));
      expect(operatorsRoom.onOperatorDisconnected.bind).toHaveBeenCalledWith(
        operatorsRoom,
        operator,
      );
    });

    it('should subscribe to status changing to online', () => {
      jest.spyOn(operatorsRoom.addOperatorToActive, 'bind');
      operatorsRoom.onOperatorConnected(operator);
      expect(operator.on).toHaveBeenCalledWith(STATUS_CHANGED_ONLINE, expect.any(Function));
      expect(operatorsRoom.addOperatorToActive.bind).toHaveBeenCalledWith(operatorsRoom, operator);
    });

    it('should subscribe to status changing to offline', () => {
      jest.spyOn(operatorsRoom.removeOperatorFromActive, 'bind');
      operatorsRoom.onOperatorConnected(operator);
      expect(operator.on).toHaveBeenCalledWith(STATUS_CHANGED_OFFLINE, expect.any(Function));
      expect(operatorsRoom.removeOperatorFromActive.bind).toHaveBeenCalledWith(
        operatorsRoom,
        operator,
      );
    });
  });

  describe('onOperatorAuthenticated(): ', () => {
    beforeEach(() => {
      operatorsRoom.mapSocketIdentityToId = jest.fn();
      operatorsRoom.addOperatorToActive = jest.fn();
    });

    it('should map idaentity to socket id', () => {
      operatorsRoom.onOperatorAuthenticated(operator);

      expect(operatorsRoom.mapSocketIdentityToId).toHaveBeenCalledWith(operator);
    });

    it('should add operator to active', () => {
      operatorsRoom.onOperatorAuthenticated(operator);

      expect(operatorsRoom.addOperatorToActive).toHaveBeenCalledWith(operator);
    });
  });

  describe('onOperatorAcceptCall(): ', () => {
    it('should accept call and emit room creation on success', () => {
      const token = '777';
      const requestedAt = '123';
      const roomData = {
        id: callId,
        requestedAt,
        token,
      };

      twilio.getToken = jest.fn(() => token);
      calls.acceptCall = jest.fn(() => Promise.resolve({ id: callId, requestedAt }));

      return operatorsRoom.onOperatorAcceptCall(operator).then(() => {
        expect(calls.acceptCall).toHaveBeenCalledWith(operatorIdentity);
        expect(twilio.getToken).toHaveBeenCalledWith(operatorIdentity, callId);
        expect(operator.emit).toHaveBeenCalledWith(ROOM_CREATED, roomData);
      });
    });

    it('should emit correct error if calls were empty', () => {
      const token = '777';
      const error = new CallsPendingEmptyError();
      const expectedDataToEmit = {
        reason: CALLS_EMPTY,
      };

      twilio.getToken = jest.fn(() => token);
      calls.acceptCall = jest.fn(() => Promise.reject(error));

      return operatorsRoom.onOperatorAcceptCall(operator).then(() => {
        expect(calls.acceptCall).toHaveBeenCalledWith(operatorIdentity);
        expect(twilio.getToken).not.toHaveBeenCalled();
        expect(operator.emit).not.toHaveBeenCalledWith(ROOM_CREATED, expect.any(Object));
        expect(operator.emit).toHaveBeenCalledWith(CALL_ACCEPTING_FAILED, expectedDataToEmit);
      });
    });

    it('should emit correct error if calls was finished', () => {
      const token = '777';
      const error = new CallNotFoundError();
      const expectedDataToEmit = {
        reason: CALL_FINISHED_BY_CUSTOMER,
      };

      twilio.getToken = jest.fn(() => token);
      calls.acceptCall = jest.fn(() => Promise.reject(error));

      return operatorsRoom.onOperatorAcceptCall(operator).then(() => {
        expect(calls.acceptCall).toHaveBeenCalledWith(operatorIdentity);
        expect(twilio.getToken).not.toHaveBeenCalled();
        expect(operator.emit).not.toHaveBeenCalledWith(ROOM_CREATED, expect.any(Object));
        expect(operator.emit).toHaveBeenCalledWith(CALL_ACCEPTING_FAILED, expectedDataToEmit);
      });
    });

    it('should emit correct error if other error happened', () => {
      const token = '777';
      const error = new Error();
      const expectedDataToEmit = {
        reason: null,
      };

      twilio.getToken = jest.fn(() => token);
      calls.acceptCall = jest.fn(() => Promise.reject(error));

      return operatorsRoom.onOperatorAcceptCall(operator).then(() => {
        expect(calls.acceptCall).toHaveBeenCalledWith(operatorIdentity);
        expect(twilio.getToken).not.toHaveBeenCalled();
        expect(operator.emit).not.toHaveBeenCalledWith(ROOM_CREATED, expect.any(Object));
        expect(operator.emit).toHaveBeenCalledWith(CALL_ACCEPTING_FAILED, expectedDataToEmit);
      });
    });
  });

  describe('onOperatorRequestedCallback(): ', () => {
    it('should request callback', () => operatorsRoom.onOperatorRequestedCallback(operator, callId).then(() => {
      expect(calls.requestCallback).toHaveBeenCalledWith(callId, operatorIdentity);
    }));

    it('should do nothing if no call id was provided', () => operatorsRoom.onOperatorRequestedCallback(operator).then(() => {
      expect(calls.requestCallback).not.toHaveBeenCalled();
    }));
  });

  describe('onOperatorFinishedCall(): ', () => {
    it('should finish call', () => operatorsRoom.onOperatorFinishedCall(operator, callId).then(() => {
      expect(calls.finishCall).toHaveBeenCalledWith(callId, operatorIdentity);
    }));

    it('should do nothing if no call was provided', () => operatorsRoom.onOperatorFinishedCall(operator).then(() => {
      expect(calls.finishCall).not.toHaveBeenCalled();
    }));
  });

  describe('onOperatorDisconnected(): ', () => {
    it('should delete operator identity from connectionsHeap', () => {
      operatorsRoom.checkAndUnmapSocketIdentityFromId = jest.fn();
      operatorsRoom.onOperatorDisconnected(operator);
      expect(operatorsRoom.checkAndUnmapSocketIdentityFromId).toHaveBeenCalledWith(operator);
    });
  });

  describe('checkOperatorAndEmitCallbackAccepting(): ', () => {
    beforeEach(() => {
      operatorsRoom.getSocketIdByIdentity = jest.fn(() => Promise.resolve(socketId));
      operatorsRoom.emitCallbackAccepting = jest.fn();
    });

    it('should emit callback accepting if operator connected to room', () => {
      const call = {
        acceptedBy: operatorIdentity,
        id: callId,
      };

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      return operatorsRoom.checkOperatorAndEmitCallbackAccepting(call).then(() => {
        expect(operatorsRoom.getSocketIdByIdentity).toHaveBeenCalledWith(operatorIdentity);
        expect(operatorsRoom.emitCallbackAccepting).toHaveBeenCalledWith(operator, callId);
      });
    });

    it('should not emit callback accepting if no operator connected to room', () => {
      const call = {
        acceptedBy: operatorIdentity,
        id: callId,
      };

      operatorsRoom.operators = {
        connected: {},
      };

      return operatorsRoom.checkOperatorAndEmitCallbackAccepting(call).then(() => {
        expect(operatorsRoom.getSocketIdByIdentity).toHaveBeenCalledWith(operatorIdentity);
        expect(operatorsRoom.emitCallbackAccepting).not.toHaveBeenCalled();
      });
    });
  });

  describe('checkOperatorAndEmitCallbackDeclining(): ', () => {
    beforeEach(() => {
      operatorsRoom.getSocketIdByIdentity = jest.fn(() => Promise.resolve(socketId));
      operatorsRoom.emitCallbackDeclining = jest.fn();
    });

    it('should emit callback accepting if operator connected to room', () => {
      const call = {
        acceptedBy: operatorIdentity,
        id: callId,
        reason: 'test',
      };

      const expectedDataToEmit = {
        id: callId,
        reason: 'test',
      };

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      return operatorsRoom.checkOperatorAndEmitCallbackDeclining(call).then(() => {
        expect(operatorsRoom.getSocketIdByIdentity).toHaveBeenCalledWith(operatorIdentity);
        expect(operatorsRoom.emitCallbackDeclining).toHaveBeenCalledWith(
          operator,
          expectedDataToEmit,
        );
      });
    });

    it('should not emit callback accepting if no operator connected to room', () => {
      const call = {
        acceptedBy: operatorIdentity,
        id: callId,
      };

      operatorsRoom.operators = {
        connected: {},
      };

      return operatorsRoom.checkOperatorAndEmitCallbackDeclining(call).then(() => {
        expect(operatorsRoom.getSocketIdByIdentity).toHaveBeenCalledWith(operatorIdentity);
        expect(operatorsRoom.emitCallbackDeclining).not.toHaveBeenCalled();
      });
    });
  });

  describe('emitCallbackAccepting(): ', () => {
    it('should emit callback declining to operator', () => {
      operatorsRoom.emitCallbackAccepting(operator, callId);
      expect(operator.emit).toHaveBeenCalledWith(CALLBACK_ACCEPTED, callId);
    });
  });

  describe('emitCallbackDeclining(): ', () => {
    it('should emit callback declining to operator', () => {
      operatorsRoom.emitCallbackDeclining(operator, callId);
      expect(operator.emit).toHaveBeenCalledWith(CALLBACK_DECLINED, callId);
    });
  });

  describe('emitCallsInfo(): ', () => {
    it('should emit only to active operators', () => {
      const callsInfo = {};
      operatorsRoom.emitCallsInfo(callsInfo);
      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(ACTIVE_OPERATORS);
      expect(operatorsRoom.operators.emit).toHaveBeenCalledWith(CALLS_CHANGED, callsInfo);
    });
  });

  describe('addOperatorToActive(): ', () => {
    it('should add operator to active and emit calls info to him', () => {
      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      return operatorsRoom.addOperatorToActive(operator).then(() => {
        expect(operator.join).toHaveBeenCalledWith(ACTIVE_OPERATORS);
        expect(operator.emit).toHaveBeenCalledWith(CALLS_CHANGED, {});
      });
    });
  });

  describe('removeOperatorFromActive(): ', () => {
    it('should remove operator from active', () => {
      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      operatorsRoom.removeOperatorFromActive(operator);

      expect(operator.leave).toHaveBeenCalledWith(ACTIVE_OPERATORS);
    });
  });

  describe('mapSocketIdentityToId(): ', () => {
    beforeEach(() => {
      connectionsHeap.add = jest.fn(() => Promise.resolve());
    });

    it('should add to connectionsHeap', () => {
      const socket = {
        identity: operatorIdentity,
        id: socketId,
      };
      return operatorsRoom.mapSocketIdentityToId(socket).then(() => {
        expect(connectionsHeap.add).toHaveBeenCalledWith(operatorIdentity, { socketId });
      });
    });
  });

   describe('checkAndUnmapSocketIdentityFromId(): ', () => {
     beforeEach(() => {
      connectionsHeap.remove = jest.fn(() => Promise.resolve());
    });

    it('should remove identity from connectionsHeap', () => {
      const socket = {
        identity: operatorIdentity,
      };
      connectionsHeap.get = jest.fn(() => Promise.resolve(operatorIdentity));

      return operatorsRoom.checkAndUnmapSocketIdentityFromId(socket).then(() => {
        expect(connectionsHeap.remove).toHaveBeenCalledWith(operatorIdentity);
      });
    });

    it('should do nothing if no identity provided', () => {
      const socket = {};
      return operatorsRoom.checkAndUnmapSocketIdentityFromId(socket).then(() => {
        expect(connectionsHeap.remove).not.toHaveBeenCalled();
      });
    });
  });

  describe('getSocketIdByIdentity(): ', () => {
    it('should call connectionsHeap', () => {
      connectionsHeap.get = jest.fn(() => Promise.resolve());
      return operatorsRoom.getSocketIdByIdentity(operatorIdentity).then(() => {
        expect(connectionsHeap.get).toHaveBeenCalledWith(operatorIdentity);
      });
    });
  });
});
