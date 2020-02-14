jest.mock('socketio-auth', () => () => {});
jest.mock('@/services/calls', () => ({
  subscribeToCallbackAccepting: jest.fn(() => {}),
  subscribeToCallbackDeclining: jest.fn(() => {}),
  subscribeToCallsLengthChanging: jest.fn(() => {}),
  subscribeToCallFinishing: jest.fn(() => {}),
  subscribeToCallAccepting: jest.fn(() => {}),
  subscribeToActiveCallsHeapAdding: jest.fn(() => {}),
  subscribeToActiveCallsHeapTaking: jest.fn(() => {}),
  unsubscribeFromActiveCallsHeapAdding: jest.fn(() => {}),
  unsubscribeFromActiveCallsHeapTaking: jest.fn(() => {}),
  getCallsInfo: jest.fn(() => Promise.resolve({})),
  finishCall: jest.fn(() => Promise.resolve()),
  requestCallback: jest.fn(() => Promise.resolve()),
  acceptCall: jest.fn(() => Promise.resolve({})),
}));
jest.mock('@/services/twilio');

const twilio = require('@/services/twilio');
const calls = require('@/services/calls');
const socketAuth = require('@/services/socketAuth');
const OperatorsRoom = require('@/services/rooms/OperatorsRoom');

const { connectionsHeap } = require('@/services/connectionsHeap');
const {
  CONNECTION,
  DISCONNECT,
  ROOM_CREATED,
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
  CUSTOMER_DISCONNECTED,
  CALLBACK_REQUESTING_FAILED,
} = require('@/constants/calls');

const {
  REALTIME_DASHBOARD_SUBSCRIBE,
  REALTIME_DASHBOARD_UNSUBSCRIBE,
  REALTIME_DASHBOARD_CALL_FINISHED,
  REALTIME_DASHBOARD_CALL_ACCEPTED,
  REALTIME_DASHBOARD_ACTIVE_CALLS_CHANGED,
  REALTIME_DASHBOARD_OPERATORS_STATUSES_CHANGED,
} = require('@/constants/realtimeDashboard');

const {
  CALL_ANSWER_PERMISSION,
  REALTIME_DASHBOARD_SUBSCRIPTION_PERMISSION,
} = require('@/constants/permissions');

const {
  STATUS_CHANGED_ONLINE,
  STATUS_CHANGED_OFFLINE,
} = require('@/constants/operatorStatuses');
const {
  CallsPendingEmptyError,
  CallNotFoundError,
} = require('@/services/calls/errors');

const { TOKEN_INVALID, UNAUTHORIZED } = require('@/constants/connection');

let operatorsRoom = null;
let operator = null;
let socketId;
let operatorIdentity;
let customerIdentity;
let callId;
let tenantId;
let data;
let realtimeDashboardGroupName;
let activeOperatorsGroupName;
let inactiveOperatorsGroupName;

const mockedNamespace = {
  on: jest.fn(),
  to: jest.fn(() => mockedNamespace),
  emit: jest.fn(),
  clients: jest.fn(),
};

const io = {
  of: jest.fn(() => mockedNamespace),
};

const mediator = {
  on: jest.fn(() => mockedNamespace),
};

describe('OperatorsRoom: ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketId = '/operators#42';
    operatorIdentity = 'operator42';
    customerIdentity = 'customer91';
    tenantId = 'spectrum';
    callId = 'call42';
    realtimeDashboardGroupName = `tenant.${tenantId}.realtimeDashboard`;
    activeOperatorsGroupName = `tenant.${tenantId}.activeOperators`;
    inactiveOperatorsGroupName = `tenant.${tenantId}.inactiveOperators`;
    operatorsRoom = new OperatorsRoom(io, mediator);
    operator = {
      on: jest.fn(),
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      identity: operatorIdentity,
      id: socketId,
      tenantId: tenantId,
      securityToken: 'security-token',
    };
    data = {};
  });

  describe('constructor(): ', () => {
    it('should create operators namespace', () => {
      expect(io.of).toHaveBeenCalledWith(OPERATORS);
    });
    it('should add listener to namespace customer disconnected event', () => {
      expect(mediator.on).toHaveBeenCalledWith(
        CUSTOMER_DISCONNECTED,
        expect.any(Function)
      );
    });

    it('should add listener to namespace connection event', () => {
      expect(mockedNamespace.on).toHaveBeenCalledWith(
        CONNECTION,
        expect.any(Function)
      );
    });

    it('should subscribe to call finishing', () => {
      expect(calls.subscribeToCallFinishing).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should subscribe to call accepting', () => {
      expect(calls.subscribeToCallAccepting).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should subscribe to callback accepting', () => {
      expect(calls.subscribeToCallbackAccepting).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should subscribe to callback declining', () => {
      expect(calls.subscribeToCallbackDeclining).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should subscribe to pending calls length changing', () => {
      expect(calls.subscribeToCallsLengthChanging).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('onOperatorConnected(): ', () => {
    it('should subscribe to DISCONNECT event', () => {
      jest.spyOn(operatorsRoom.onOperatorDisconnected, 'bind');

      operatorsRoom.onOperatorConnected(operator);

      expect(operator.on).toHaveBeenCalledWith(
        DISCONNECT,
        expect.any(Function)
      );
      expect(operatorsRoom.onOperatorDisconnected.bind).toHaveBeenCalledWith(
        operatorsRoom,
        operator
      );
    });
  });

  describe('onOperatorAuthenticated(): ', () => {
    beforeEach(() => {
      operatorsRoom.mapSocketIdentityToId = jest.fn();
      operatorsRoom.addOperatorToActive = jest.fn();
    });

    it('should map identity to socket id', () => {
      operatorsRoom.onOperatorAuthenticated(operator);

      expect(operatorsRoom.mapSocketIdentityToId).toHaveBeenCalledWith(
        operator
      );
    });

    it('should add operator to active', () => {
      operatorsRoom.onOperatorAuthenticated(operator, data);

      expect(operatorsRoom.addOperatorToActive).toHaveBeenCalledWith(
        operator,
        data
      );
    });
  });

  describe('onOperatorAcceptCall(): ', () => {
    let checkConnectionPermissionSpy;

    afterEach(() => {
      if (checkConnectionPermissionSpy) {
        checkConnectionPermissionSpy.mockRestore();
      }
    });

    it('should accept call and emit room creation on success', () => {
      operator.permissions = [CALL_ANSWER_PERMISSION];

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      checkConnectionPermissionSpy = jest.spyOn(
        socketAuth,
        'checkConnectionPermission'
      );

      const token = '777';
      const requestedAt = '123';
      const roomData = {
        id: callId,
        requestedAt,
        token,
      };

      twilio.getToken = jest.fn(() => token);
      calls.acceptCall = jest.fn(() =>
        Promise.resolve({ id: callId, requestedAt })
      );

      return operatorsRoom.onOperatorAcceptCall(operator).then(() => {
        expect(calls.acceptCall).toHaveBeenCalledWith(operator);
        expect(twilio.getToken).toHaveBeenCalledWith(operatorIdentity, callId);
        expect(operator.emit).toHaveBeenCalledWith(ROOM_CREATED, roomData);
        expect(checkConnectionPermissionSpy).toHaveBeenCalledWith(
          operator,
          CALL_ANSWER_PERMISSION
        );
      });
    });

    it("should do nothing if operator doesn't have answer call permission", async () => {
      operator.permissions = [];

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      const token = '777';
      const requestedAt = '123';

      operatorsRoom.onCallAcceptingFailed = jest.fn();
      twilio.getToken = jest.fn(() => token);
      calls.acceptCall = jest.fn(() =>
        Promise.resolve({ id: callId, requestedAt })
      );

      const promise = operatorsRoom.onOperatorAcceptCall(operator);

      await expect(promise).resolves.toBe(undefined);
      expect(calls.acceptCall).not.toHaveBeenCalled();
    });

    it('should emit correct error if calls were empty', () => {
      operator.permissions = [CALL_ANSWER_PERMISSION];

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      const token = '777';
      const error = new CallsPendingEmptyError();
      const expectedDataToEmit = {
        reason: CALLS_EMPTY,
      };

      twilio.getToken = jest.fn(() => token);
      calls.acceptCall = jest.fn(() => Promise.reject(error));

      return operatorsRoom.onOperatorAcceptCall(operator).then(() => {
        expect(calls.acceptCall).toHaveBeenCalledWith(operator);
        expect(twilio.getToken).not.toHaveBeenCalled();
        expect(operator.emit).not.toHaveBeenCalledWith(
          ROOM_CREATED,
          expect.any(Object)
        );
        expect(operator.emit).toHaveBeenCalledWith(
          CALL_ACCEPTING_FAILED,
          expectedDataToEmit
        );
      });
    });

    it('should emit correct error if calls was finished', () => {
      operator.permissions = [CALL_ANSWER_PERMISSION];

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      const token = '777';
      const error = new CallNotFoundError();
      const expectedDataToEmit = {
        reason: CALL_FINISHED_BY_CUSTOMER,
      };

      twilio.getToken = jest.fn(() => token);
      calls.acceptCall = jest.fn(() => Promise.reject(error));

      return operatorsRoom.onOperatorAcceptCall(operator).then(() => {
        expect(calls.acceptCall).toHaveBeenCalledWith(operator);
        expect(twilio.getToken).not.toHaveBeenCalled();
        expect(operator.emit).not.toHaveBeenCalledWith(
          ROOM_CREATED,
          expect.any(Object)
        );
        expect(operator.emit).toHaveBeenCalledWith(
          CALL_ACCEPTING_FAILED,
          expectedDataToEmit
        );
      });
    });

    it('should emit correct error if other error happened', () => {
      operator.permissions = [CALL_ANSWER_PERMISSION];

      const token = '777';
      const error = new Error();
      const expectedDataToEmit = {
        reason: null,
      };

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      twilio.getToken = jest.fn(() => token);
      calls.acceptCall = jest.fn(() => Promise.reject(error));

      return operatorsRoom.onOperatorAcceptCall(operator).then(() => {
        expect(calls.acceptCall).toHaveBeenCalledWith(operator);
        expect(twilio.getToken).not.toHaveBeenCalled();
        expect(operator.emit).not.toHaveBeenCalledWith(
          ROOM_CREATED,
          expect.any(Object)
        );
        expect(operator.emit).toHaveBeenCalledWith(
          CALL_ACCEPTING_FAILED,
          expectedDataToEmit
        );
      });
    });
  });

  describe('onOperatorRequestedCallback(): ', () => {
    it('should request callback', async () => {
      operator.permissions = [CALL_ANSWER_PERMISSION];

      const promise = operatorsRoom.onOperatorRequestedCallback(
        operator,
        callId
      );
      await expect(promise).resolves.toBe(undefined);
      expect(calls.requestCallback).toHaveBeenCalledWith(
        callId,
        operatorIdentity
      );
    });

    it('should send error message if request callback will fails', async () => {
      operator.permissions = [CALL_ANSWER_PERMISSION];

      const err = {};
      calls.requestCallback = jest.fn().mockRejectedValue(err);

      const promise = operatorsRoom.onOperatorRequestedCallback(
        operator,
        callId
      );
      await expect(promise).resolves.toBe(undefined);
      expect(operator.emit).toHaveBeenCalledWith(CALLBACK_REQUESTING_FAILED);
    });

    it('should do nothing if no call id was provided', () =>
      operatorsRoom.onOperatorRequestedCallback(operator).then(() => {
        expect(calls.requestCallback).not.toHaveBeenCalled();
      }));
  });

  describe('onOperatorFinishedCall(): ', () => {
    it('should finish call', () =>
      operatorsRoom.onOperatorFinishedCall(operator, callId).then(() => {
        expect(calls.finishCall).toHaveBeenCalledWith(callId, operatorIdentity);
      }));

    it('should do nothing if no call was provided', () =>
      operatorsRoom.onOperatorFinishedCall(operator).then(() => {
        expect(calls.finishCall).not.toHaveBeenCalled();
      }));
  });

  describe('onOperatorDisconnected(): ', () => {
    it('should delete operator identity from connectionsHeap', () => {
      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      operatorsRoom.removeOperatorFromActive = jest.fn();
      operatorsRoom.emitOperatorsStatusesChanged = jest.fn();
      operatorsRoom.checkAndUnmapSocketIdentityFromId = jest.fn();
      operatorsRoom.unsubscribeFromRealtimeDashboardUpdates = jest.fn();

      operatorsRoom.onOperatorDisconnected(operator);
      expect(
        operatorsRoom.checkAndUnmapSocketIdentityFromId
      ).toHaveBeenCalledWith(operator);
      expect(
        operatorsRoom.unsubscribeFromRealtimeDashboardUpdates
      ).toHaveBeenCalledWith(operator);
      expect(operatorsRoom.removeOperatorFromActive).toHaveBeenCalledWith(
        operator
      );
      expect(operatorsRoom.emitOperatorsStatusesChanged).toHaveBeenCalledWith(
        operator.tenantId
      );
    });
  });

  describe('checkOperatorAndEmitCallbackAccepting(): ', () => {
    beforeEach(() => {
      operatorsRoom.getSocketIdByIdentity = jest.fn(() =>
        Promise.resolve(socketId)
      );
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

      return operatorsRoom
        .checkOperatorAndEmitCallbackAccepting(call)
        .then(() => {
          expect(operatorsRoom.getSocketIdByIdentity).toHaveBeenCalledWith(
            operatorIdentity
          );
          expect(operatorsRoom.emitCallbackAccepting).toHaveBeenCalledWith(
            operator,
            callId
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

      return operatorsRoom
        .checkOperatorAndEmitCallbackAccepting(call)
        .then(() => {
          expect(operatorsRoom.getSocketIdByIdentity).toHaveBeenCalledWith(
            operatorIdentity
          );
          expect(operatorsRoom.emitCallbackAccepting).not.toHaveBeenCalled();
        });
    });
  });

  describe('checkOperatorAndEmitCallbackDeclining(): ', () => {
    beforeEach(() => {
      operatorsRoom.getSocketIdByIdentity = jest.fn(() =>
        Promise.resolve(socketId)
      );
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

      return operatorsRoom
        .checkOperatorAndEmitCallbackDeclining(call)
        .then(() => {
          expect(operatorsRoom.getSocketIdByIdentity).toHaveBeenCalledWith(
            operatorIdentity
          );
          expect(operatorsRoom.emitCallbackDeclining).toHaveBeenCalledWith(
            operator,
            expectedDataToEmit
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

      return operatorsRoom
        .checkOperatorAndEmitCallbackDeclining(call)
        .then(() => {
          expect(operatorsRoom.getSocketIdByIdentity).toHaveBeenCalledWith(
            operatorIdentity
          );
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
      const info = { tenantId };
      const callsInfo = {
        data: info,
        tenantId,
      };
      const expectedInfo = {
        ...info,
        serverTime: expect.any(String),
      };

      const groupName = 'group-name';
      operatorsRoom.getActiveOperatorsGroupName = jest.fn(() => groupName);
      operatorsRoom.emitRealtimeDashboardWaitingCallsInfo = jest.fn();

      operatorsRoom.emitCallsInfo(callsInfo);
      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(groupName);
      expect(operatorsRoom.operators.emit).toHaveBeenCalledWith(
        CALLS_CHANGED,
        expectedInfo
      );

      expect(
        operatorsRoom.emitRealtimeDashboardWaitingCallsInfo
      ).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('addOperatorToActive(): ', () => {
    let checkConnectionPermissionSpy;

    afterEach(() => {
      if (checkConnectionPermissionSpy) {
        checkConnectionPermissionSpy.mockRestore();
      }
    });

    it('should add operator to active and emit calls info to him', async () => {
      operator.permissions = [CALL_ANSWER_PERMISSION];

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      const callsInfo = { count: 2, peak: {} };
      const expectedCallsInfo = {
        ...callsInfo,
        serverTime: expect.any(String),
      };

      operatorsRoom.verifyToken = jest.fn(() => true);
      operatorsRoom.getActiveOperatorsGroupName = jest.fn(
        () => activeOperatorsGroupName
      );
      operatorsRoom.getInactiveOperatorsGroupName = jest.fn(
        () => inactiveOperatorsGroupName
      );
      operatorsRoom.emitOperatorsStatusesChanged = jest.fn();
      calls.getCallsInfo = jest.fn().mockResolvedValue(callsInfo);
      checkConnectionPermissionSpy = jest.spyOn(
        socketAuth,
        'checkConnectionPermission'
      );

      const promise = operatorsRoom.addOperatorToActive(operator);

      await expect(promise).resolves.toBe(undefined);
      expect(operatorsRoom.verifyToken).toHaveBeenCalledWith(operator);
      expect(operatorsRoom.getActiveOperatorsGroupName).toHaveBeenCalledWith(
        tenantId
      );
      expect(operatorsRoom.emitOperatorsStatusesChanged).toHaveBeenCalledWith(
        tenantId
      );
      expect(operator.join).toHaveBeenCalledWith(activeOperatorsGroupName);
      expect(operator.leave).toHaveBeenCalledWith(inactiveOperatorsGroupName);
      expect(calls.getCallsInfo).toHaveBeenCalledWith(tenantId);
      expect(operator.emit).toHaveBeenCalledWith(
        CALLS_CHANGED,
        expectedCallsInfo
      );
      expect(checkConnectionPermissionSpy).toHaveBeenCalledWith(
        operator,
        CALL_ANSWER_PERMISSION
      );
    });

    it("shouldn't add operator to active it his token is invalid", async () => {
      operator.permissions = [CALL_ANSWER_PERMISSION];

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      operatorsRoom.verifyToken = jest.fn(() => false);

      const promise = operatorsRoom.addOperatorToActive(operator);

      await expect(promise).resolves.toBe(false);

      expect(operator.join).not.toHaveBeenCalled();
      expect(calls.getCallsInfo).not.toHaveBeenCalled();
      expect(operator.emit).not.toHaveBeenCalled();
    });

    it("shouldn't add operator to active if it doesn't have such permission", async () => {
      operator.permissions = [];

      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      operatorsRoom.verifyToken = jest.fn(() => true);
      calls.getCallsInfo = jest.fn();

      const promise = operatorsRoom.addOperatorToActive(operator);

      await expect(promise).resolves.toBe(undefined);

      expect(operatorsRoom.verifyToken).toHaveBeenCalledWith(operator);

      expect(operator.join).not.toHaveBeenCalled();
      expect(calls.getCallsInfo).not.toHaveBeenCalled();
      expect(operator.emit).not.toHaveBeenCalled();
    });
  });

  describe('removeOperatorFromActive(): ', () => {
    it('should remove operator from active', () => {
      operatorsRoom.operators = {
        connected: {
          [socketId]: operator,
        },
      };

      operatorsRoom.getActiveOperatorsGroupName = jest.fn(
        () => activeOperatorsGroupName
      );
      operatorsRoom.getInactiveOperatorsGroupName = jest.fn(
        () => inactiveOperatorsGroupName
      );
      operatorsRoom.emitOperatorsStatusesChanged = jest.fn();

      operatorsRoom.removeOperatorFromActive(operator);
      expect(operatorsRoom.emitOperatorsStatusesChanged).toHaveBeenCalledWith(
        operator.tenantId
      );
      expect(operator.join).toHaveBeenCalledWith(inactiveOperatorsGroupName);
      expect(operator.leave).toHaveBeenCalledWith(activeOperatorsGroupName);
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
        expect(connectionsHeap.add).toHaveBeenCalledWith(operatorIdentity, {
          socketId,
        });
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

      return operatorsRoom
        .checkAndUnmapSocketIdentityFromId(socket)
        .then(() => {
          expect(connectionsHeap.remove).toHaveBeenCalledWith(operatorIdentity);
        });
    });

    it('should do nothing if no identity provided', () => {
      const socket = {};
      return operatorsRoom
        .checkAndUnmapSocketIdentityFromId(socket)
        .then(() => {
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

  describe('getActiveOperatorsGroupName(): ', () => {
    it('should return tenant active operators group name', () => {
      const expectedGroupName = 'tenant.spectrum.activeOperators';
      expect(operatorsRoom.getActiveOperatorsGroupName(tenantId)).toBe(
        expectedGroupName
      );
    });
  });

  describe('verifyToken(): ', () => {
    it('should return true if token still valid', async () => {
      socketAuth.verifyConnectionToken = jest.fn().mockResolvedValue(true);

      const promise = operatorsRoom.verifyToken(operator);

      await expect(promise).resolves.toBe(true);
      expect(socketAuth.verifyConnectionToken).toHaveBeenCalledWith(operator);
    });

    it('should return false and notify operator if token is invalid', async () => {
      const errorMessage = {
        message: TOKEN_INVALID,
      };
      socketAuth.verifyConnectionToken = jest.fn().mockResolvedValue(false);

      const promise = operatorsRoom.verifyToken(operator);

      await expect(promise).resolves.toBe(false);
      expect(operator.emit).toHaveBeenCalledWith(UNAUTHORIZED, errorMessage);
    });
  });

  describe('subscribeToSocketEvents(): ', () => {
    describe('CALL_ACCEPTED event', () => {
      it('should subscribe onOperatorAcceptCall() if operator has call answer permission', () => {
        operator.permissions = [CALL_ANSWER_PERMISSION];

        jest.spyOn(operatorsRoom.onOperatorAcceptCall, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          CALL_ACCEPTED,
          expect.any(Function)
        );
        expect(operatorsRoom.onOperatorAcceptCall.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator
        );
      });

      it("should subscribe emitOperationNotAllowed() if operator doesn't have call answer permission", () => {
        operator.permissions = [];

        jest.spyOn(operatorsRoom.emitOperationNotAllowed, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          CALL_ACCEPTED,
          expect.any(Function)
        );
        expect(operatorsRoom.emitOperationNotAllowed.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator,
          CALL_ACCEPTED
        );
      });
    });

    describe('CALLBACK_REQUESTED event', () => {
      it('should subscribe onOperatorRequestedCallback() if operator has call answer permission', () => {
        operator.permissions = [CALL_ANSWER_PERMISSION];

        jest.spyOn(operatorsRoom.onOperatorRequestedCallback, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          CALLBACK_REQUESTED,
          expect.any(Function)
        );
        expect(
          operatorsRoom.onOperatorRequestedCallback.bind
        ).toHaveBeenCalledWith(operatorsRoom, operator);
      });

      it("should subscribe emitOperationNotAllowed() if operator doesn't have call answer permission", () => {
        operator.permissions = [];

        jest.spyOn(operatorsRoom.emitOperationNotAllowed, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          CALLBACK_REQUESTED,
          expect.any(Function)
        );
        expect(operatorsRoom.emitOperationNotAllowed.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator,
          CALLBACK_REQUESTED
        );
      });
    });

    describe('CALL_FINISHED event', () => {
      it('should subscribe onOperatorFinishedCall() if operator has call answer permission', () => {
        operator.permissions = [CALL_ANSWER_PERMISSION];

        jest.spyOn(operatorsRoom.onOperatorFinishedCall, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          CALL_FINISHED,
          expect.any(Function)
        );
        expect(operatorsRoom.onOperatorFinishedCall.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator
        );
      });

      it("should subscribe emitOperationNotAllowed() if operator doesn't have call answer permission", () => {
        operator.permissions = [];

        jest.spyOn(operatorsRoom.emitOperationNotAllowed, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          CALL_FINISHED,
          expect.any(Function)
        );
        expect(operatorsRoom.emitOperationNotAllowed.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator,
          CALL_FINISHED
        );
      });
    });

    describe('STATUS_CHANGED_ONLINE event', () => {
      it('should subscribe addOperatorToActive() if operator has call answer permission', () => {
        operator.permissions = [CALL_ANSWER_PERMISSION];

        jest.spyOn(operatorsRoom.addOperatorToActive, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          STATUS_CHANGED_ONLINE,
          expect.any(Function)
        );
        expect(operatorsRoom.addOperatorToActive.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator
        );
      });

      it("should subscribe emitOperationNotAllowed() if operator doesn't have call answer permission", () => {
        operator.permissions = [];

        jest.spyOn(operatorsRoom.emitOperationNotAllowed, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          STATUS_CHANGED_ONLINE,
          expect.any(Function)
        );
        expect(operatorsRoom.emitOperationNotAllowed.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator,
          STATUS_CHANGED_ONLINE
        );
      });
    });

    describe('STATUS_CHANGED_OFFLINE event', () => {
      it('should subscribe removeOperatorFromActive() if operator has call answer permission', () => {
        operator.permissions = [CALL_ANSWER_PERMISSION];

        jest.spyOn(operatorsRoom.removeOperatorFromActive, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          STATUS_CHANGED_OFFLINE,
          expect.any(Function)
        );
        expect(
          operatorsRoom.removeOperatorFromActive.bind
        ).toHaveBeenCalledWith(operatorsRoom, operator);
      });

      it("should subscribe emitOperationNotAllowed() if operator doesn't have call answer permission", () => {
        operator.permissions = [];

        jest.spyOn(operatorsRoom.emitOperationNotAllowed, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          STATUS_CHANGED_OFFLINE,
          expect.any(Function)
        );
        expect(operatorsRoom.emitOperationNotAllowed.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator,
          STATUS_CHANGED_OFFLINE
        );
      });
    });

    describe('REALTIME_DASHBOARD_SUBSCRIBE event', () => {
      it('should subscribe subscribeToRealtimeDashboardUpdates() if operator has realtime dashboard permission', () => {
        operator.permissions = [REALTIME_DASHBOARD_SUBSCRIPTION_PERMISSION];

        jest.spyOn(operatorsRoom.subscribeToRealtimeDashboardUpdates, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          REALTIME_DASHBOARD_SUBSCRIBE,
          expect.any(Function)
        );
        expect(
          operatorsRoom.subscribeToRealtimeDashboardUpdates.bind
        ).toHaveBeenCalledWith(operatorsRoom, operator);
      });

      it("should subscribe emitOperationNotAllowed() if operator doesn't have realtime dashboard permission", () => {
        operator.permissions = [];

        jest.spyOn(operatorsRoom.emitOperationNotAllowed, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          REALTIME_DASHBOARD_SUBSCRIBE,
          expect.any(Function)
        );
        expect(operatorsRoom.emitOperationNotAllowed.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator,
          REALTIME_DASHBOARD_SUBSCRIBE
        );
      });
    });

    describe('REALTIME_DASHBOARD_UNSUBSCRIBE event', () => {
      it('should subscribe unsubscribeFromRealtimeDashboardUpdates() if operator has realtime dashboard permission', () => {
        operator.permissions = [REALTIME_DASHBOARD_SUBSCRIPTION_PERMISSION];

        jest.spyOn(
          operatorsRoom.unsubscribeFromRealtimeDashboardUpdates,
          'bind'
        );

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          REALTIME_DASHBOARD_UNSUBSCRIBE,
          expect.any(Function)
        );
        expect(
          operatorsRoom.unsubscribeFromRealtimeDashboardUpdates.bind
        ).toHaveBeenCalledWith(operatorsRoom, operator);
      });

      it("should subscribe emitOperationNotAllowed() if operator doesn't have realtime dashboard permission", () => {
        operator.permissions = [];

        jest.spyOn(operatorsRoom.emitOperationNotAllowed, 'bind');

        operatorsRoom.subscribeToSocketEvents(operator);

        expect(operator.on).toHaveBeenCalledWith(
          REALTIME_DASHBOARD_UNSUBSCRIBE,
          expect.any(Function)
        );
        expect(operatorsRoom.emitOperationNotAllowed.bind).toHaveBeenCalledWith(
          operatorsRoom,
          operator,
          REALTIME_DASHBOARD_UNSUBSCRIBE
        );
      });
    });
  });
  describe('onCallFinished()', () => {
    it('should call emitRealtimeDashboardCallFinished', () => {
      operatorsRoom.emitRealtimeDashboardCallFinished = jest.fn();
      const call = {
        finishedBy: operatorIdentity,
        acceptedBy: operatorIdentity,
        id: callId,
      };

      operatorsRoom.onCallFinished(call);

      expect(
        operatorsRoom.emitRealtimeDashboardCallFinished
      ).toHaveBeenCalledWith(call);
    });
    it('should call checkOperatorAndEmitCallFinishing if call finished not by operator', () => {
      operatorsRoom.checkOperatorAndEmitCallFinishing = jest.fn();
      operatorsRoom.emitRealtimeDashboardCallFinished = jest.fn();
      const call = {
        finishedBy: customerIdentity,
        acceptedBy: operatorIdentity,
        id: callId,
      };

      operatorsRoom.onCallFinished(call);

      expect(
        operatorsRoom.checkOperatorAndEmitCallFinishing
      ).toHaveBeenCalledWith(call);
      expect(
        operatorsRoom.emitRealtimeDashboardCallFinished
      ).toHaveBeenCalledWith(call);
    });
  });
  describe('onCallAccepted()', () => {
    it('should call emitRealtimeDashboardCallAccepted', () => {
      operatorsRoom.emitRealtimeDashboardCallAccepted = jest.fn();
      const call = {
        finishedBy: operatorIdentity,
        acceptedBy: operatorIdentity,
        id: callId,
      };

      operatorsRoom.onCallAccepted(call);

      expect(
        operatorsRoom.emitRealtimeDashboardCallAccepted
      ).toHaveBeenCalledWith(call);
    });
  });
  describe('onActiveCallsHeapChanged()', () => {
    it('should call emitRealtimeDashboardActiveCallsInfo', () => {
      operatorsRoom.emitRealtimeDashboardActiveCallsInfo = jest.fn();
      const call = {
        finishedBy: operatorIdentity,
        acceptedBy: operatorIdentity,
        id: callId,
        tenantId: tenantId,
      };

      operatorsRoom.onActiveCallsHeapChanged(call);

      expect(
        operatorsRoom.emitRealtimeDashboardActiveCallsInfo
      ).toHaveBeenCalledWith(call);
    });
  });
  describe('emitRealtimeDashboardActiveCallsInfo()', () => {
    it("should emit event to operators in non-empty group with only operator's tenant calls", async () => {
      const ownTenantCall = {
        acceptedBy: operatorIdentity,
        id: callId,
        tenantId,
      };

      calls.getActiveCallsByTenantId = jest
        .fn()
        .mockResolvedValue([ownTenantCall]);
      operatorsRoom.isEmptyGroup = jest.fn().mockResolvedValue(false);

      await operatorsRoom.emitRealtimeDashboardActiveCallsInfo(ownTenantCall);

      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(
        realtimeDashboardGroupName
      );
      expect(
        operatorsRoom.operators.emit
      ).toHaveBeenCalledWith(REALTIME_DASHBOARD_ACTIVE_CALLS_CHANGED, [
        ownTenantCall,
      ]);
    });
    it('should not emit event to empty group', async () => {
      const ownTenantCall = {
        acceptedBy: operatorIdentity,
        id: callId,
        tenantId,
      };

      calls.getActiveCallsByTenantId = jest
        .fn()
        .mockResolvedValue([ownTenantCall]);
      operatorsRoom.isEmptyGroup = jest.fn().mockResolvedValue(true);

      await operatorsRoom.emitRealtimeDashboardActiveCallsInfo(ownTenantCall);

      expect(operatorsRoom.operators.to).not.toHaveBeenCalled();
      expect(operatorsRoom.operators.emit).not.toHaveBeenCalledWith();
    });
  });
  describe('emitRealtimeDashboardCallFinished()', () => {
    it('should emit event to operators in group', () => {
      const call = {
        finishedBy: operatorIdentity,
        acceptedBy: operatorIdentity,
        id: callId,
        tenantId: tenantId,
      };

      operatorsRoom.emitRealtimeDashboardCallFinished(call);

      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(
        realtimeDashboardGroupName
      );
      expect(operatorsRoom.operators.emit).toHaveBeenCalledWith(
        REALTIME_DASHBOARD_CALL_FINISHED,
        call
      );
    });
  });
  describe('emitRealtimeDashboardCallAccepted()', () => {
    it('should emit event to operators in group', () => {
      const call = {
        acceptedBy: operatorIdentity,
        id: callId,
        tenantId,
      };

      operatorsRoom.emitRealtimeDashboardCallAccepted(call);

      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(
        realtimeDashboardGroupName
      );
      expect(operatorsRoom.operators.emit).toHaveBeenCalledWith(
        REALTIME_DASHBOARD_CALL_ACCEPTED,
        call
      );
    });
  });
  describe('isEmptyGroup():', () => {
    it('should return true if there are users in group and count is available', async () => {
      const err = null;
      const groupName = 'group';
      const group = ['1', '2', '3'];

      mockedNamespace.clients = jest.fn(callback => callback(err, group));

      const res = await operatorsRoom.isEmptyGroup(groupName);

      expect(res).toBe(false);
      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(groupName);
      expect(operatorsRoom.operators.clients).toHaveBeenCalled();
    });
    it('should return false if there are no users in group and count is available', async () => {
      const err = null;
      const groupName = 'group';
      const group = [];

      mockedNamespace.clients = jest.fn(callback => callback(err, group));

      const res = await operatorsRoom.isEmptyGroup(groupName);

      expect(res).toBe(true);
      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(groupName);
      expect(operatorsRoom.operators.clients).toHaveBeenCalled();
    });
    it('should reject err if count of users is not available', async () => {
      const err = { text: 'Some error' };
      const groupName = 'group';
      const group = null;

      mockedNamespace.clients = jest.fn(callback => callback(err, group));

      await expect(operatorsRoom.isEmptyGroup(groupName)).rejects.toEqual(err);
      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(groupName);
      expect(operatorsRoom.operators.clients).toHaveBeenCalled();
    });
  });
  describe('getGroupInfo():', () => {
    it('should return users count if count is available', async () => {
      const err = null;
      const groupName = 'group';
      const group = ['1', '2', '3'];

      mockedNamespace.clients = jest.fn(callback => callback(err, group));

      const res = await operatorsRoom.getGroupInfo(groupName);

      expect(res).toBe(3);
      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(groupName);
      expect(operatorsRoom.operators.clients).toHaveBeenCalled();
    });
    it('should reject err if count of users is not available', async () => {
      const err = { text: 'Some error' };
      const groupName = 'group';
      const group = null;

      mockedNamespace.clients = jest.fn(callback => callback(err, group));

      await expect(operatorsRoom.getGroupInfo(groupName)).rejects.toEqual(err);
      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(groupName);
      expect(operatorsRoom.operators.clients).toHaveBeenCalled();
    });
  });

  describe('emitOperatorsStatusesChanged():', () => {
    it('should emit data to realtime dashboard group', async () => {
      const operatorsCount = 5;
      const data = {
        activeOperators: {
          count: operatorsCount,
        },
        inactiveOperators: {
          count: operatorsCount,
        },
      };

      operatorsRoom.getGroupInfo = jest.fn().mockResolvedValue(operatorsCount);

      operatorsRoom.getActiveOperatorsGroupName = jest.fn(
        () => activeOperatorsGroupName
      );
      operatorsRoom.getInactiveOperatorsGroupName = jest.fn(
        () => inactiveOperatorsGroupName
      );
      operatorsRoom.getRealtimeDashboardGroupName = jest.fn(
        () => realtimeDashboardGroupName
      );

      await operatorsRoom.emitOperatorsStatusesChanged(tenantId);

      expect(operatorsRoom.getGroupInfo).toHaveBeenCalledTimes(2);
      expect(operatorsRoom.getGroupInfo).toHaveBeenCalledWith(
        activeOperatorsGroupName
      );
      expect(operatorsRoom.getGroupInfo).toHaveBeenCalledWith(
        inactiveOperatorsGroupName
      );
      expect(operatorsRoom.operators.to).toHaveBeenCalledWith(
        realtimeDashboardGroupName
      );
      expect(operatorsRoom.operators.emit).toHaveBeenCalledWith(
        REALTIME_DASHBOARD_OPERATORS_STATUSES_CHANGED,
        data
      );
      expect(operatorsRoom.getActiveOperatorsGroupName).toHaveBeenCalledWith(
        tenantId
      );
      expect(operatorsRoom.getInactiveOperatorsGroupName).toHaveBeenCalledWith(
        tenantId
      );
      expect(operatorsRoom.getRealtimeDashboardGroupName).toHaveBeenCalledWith(
        tenantId
      );
    });
  });
});
