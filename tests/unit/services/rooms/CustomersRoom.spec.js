jest.mock('socketio-auth', () => () => {});
jest.mock('@/services/calls', () => ({
  subscribeToCallAccepting: jest.fn(() => {}),
  subscribeToCallbackRequesting: jest.fn(() => {}),
  subscribeToCallbackAbort: jest.fn(() => {}),
  subscribeToCallFinishing: jest.fn(() => {}),
  requestCall: jest.fn(() => Promise.resolve()),
  acceptCallback: jest.fn(() => Promise.resolve({})),
  finishCall: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/twilio');

jest.mock('@/services/rooms/utils', () => ({
  repeatUntilDelivered: jest.fn(() => Promise.resolve({})),
}));

const twilio = require('@/services/twilio');
const calls = require('@/services/calls');
const CustomersRoom = require('@/services/rooms/CustomersRoom');

const { connectionsHeap } = require('@/services/connectionsHeap');

const { CONNECTION, CUSTOMERS } = require('@/constants/rooms');
const {
  CALL_ENQUEUED,
  CALL_NOT_ENQUEUED,
  CALL_ACCEPTED,
  CALLBACK_REQUESTED,
} = require('@/constants/calls');

let customersRoom = null;
let customer = null;
let socketId = null;
let customerIdentity = null;
let deviceId = null;
let callId = null;
let salesRepId = null;

const mockedNamespace = {
  on: jest.fn(),
  to: jest.fn(() => mockedNamespace),
  emit: jest.fn(),
};

const io = {
  of: jest.fn(() => mockedNamespace),
};

const mediator = {
  on: jest.fn(() => mockedNamespace),
  once: jest.fn(() => mockedNamespace),
};

describe('CustomersRoom: ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketId = '/customers#42';
    customerIdentity = 'customer42';
    deviceId = 'device42';
    callId = 'call42';
    salesRepId = 'salesRep42';
    customersRoom = new CustomersRoom(io, mediator);
    customer = {
      on: jest.fn(),
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      identity: customerIdentity,
      deviceId,
      id: socketId,
      once: jest.fn(),
    };
  });

  describe('constructor(): ', () => {
    it('should create customers namespace', () => {
      expect(io.of).toHaveBeenCalledWith(CUSTOMERS);
    });

    it('should add listener to namespace connection event', () => {
      expect(mockedNamespace.on).toHaveBeenCalledWith(
        CONNECTION,
        expect.any(Function)
      );
    });

    it('should subscribe to call accepting', () => {
      expect(calls.subscribeToCallAccepting).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should subscribe to callback requesting', () => {
      expect(calls.subscribeToCallbackRequesting).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should subscribe to callback request aborting', () => {
      expect(calls.subscribeToCallbackAbort).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('onCustomerAuthenticated(): ', () => {
    it('should map device id on socket id', () => {
      customersRoom.mapDeviceIdToSocketId = jest.fn(() => Promise.resolve());
      customersRoom.getSocketIdByDeviceId = jest.fn(() =>
        Promise.resolve(socketId)
      );
      customersRoom.customers.connected = {};

      return customersRoom.onCustomerAuthenticated(customer).then(() => {
        expect(customersRoom.mapDeviceIdToSocketId).toHaveBeenCalledWith(
          customer
        );
      });
    });
  });

  describe('onCustomerRequestedCall(): ', () => {
    it('should request call and notify customer about enqueuing', () => {
      const call = {
        id: callId,
      };
      const data = {
        salesRepId,
        callbackEnabled: true,
      };
      const expectedPayload = {
        requestedBy: customerIdentity,
        salesRepId,
        deviceId,
        callbackEnabled: true,
      };
      calls.requestCall = jest.fn(() => Promise.resolve(call));

      return customersRoom.onCustomerRequestedCall(customer, data).then(() => {
        expect(calls.requestCall).toHaveBeenCalledWith(expectedPayload);
        expect(customer.pendingCallId).toBe(callId);
        expect(customer.emit).toHaveBeenCalledWith(CALL_ENQUEUED, callId);
      });
    });

    it('should request call and notify customer about not enqueuing if error occured', () => {
      const data = {
        salesRepId,
        callbackEnabled: true,
      };
      const expectedPayload = {
        requestedBy: customerIdentity,
        salesRepId,
        deviceId,
        callbackEnabled: true,
      };
      calls.requestCall = jest.fn(() => Promise.reject());

      return customersRoom.onCustomerRequestedCall(customer, data).then(() => {
        expect(calls.requestCall).toHaveBeenCalledWith(expectedPayload);
        expect(customer.pendingCallId).toBeUndefined();
        expect(customer.emit).toHaveBeenCalledWith(CALL_NOT_ENQUEUED);
      });
    });
  });

  describe('onCustomerFinishedCall(): ', () => {
    it('should do nothing if no call was provided', () => {
      calls.finishCall = jest.fn(() => Promise.resolve());
      return customersRoom.onCustomerFinishedCall(customer).then(() => {
        expect(calls.finishCall).not.toHaveBeenCalled();
      });
    });

    it('should do nothing if no call id was provided', () => {
      calls.finishCall = jest.fn(() => Promise.resolve());
      return customersRoom.onCustomerFinishedCall(customer, {}).then(() => {
        expect(calls.finishCall).not.toHaveBeenCalled();
      });
    });

    it('should finish call', () => {
      const call = {
        id: callId,
      };
      calls.finishCall = jest.fn(() => Promise.resolve());
      return customersRoom.onCustomerFinishedCall(customer, call).then(() => {
        expect(calls.finishCall).toHaveBeenCalledWith(callId, customerIdentity);
      });
    });
  });

  describe('onCustomerDisconnected(): ', () => {
    it('should unmap socket id from deviceId if no pending call from customer', () => {
      customersRoom.checkAndUnmapDeviceIdFromSocketId = jest.fn(() =>
        Promise.resolve()
      );
      calls.finishCall = jest.fn(() => Promise.resolve());

      return customersRoom.onCustomerDisconnected(customer).then(() => {
        expect(calls.finishCall).not.toHaveBeenCalled();
        expect(
          customersRoom.checkAndUnmapDeviceIdFromSocketId
        ).toHaveBeenCalledWith(customer);
      });
    });

    it('should finish call if call was pending', () => {
      customersRoom.checkAndUnmapDeviceIdFromSocketId = jest.fn(() =>
        Promise.resolve()
      );
      calls.finishCall = jest.fn(() => Promise.resolve());
      customer.pendingCallId = callId;

      return customersRoom.onCustomerDisconnected(customer).then(() => {
        expect(calls.finishCall).toHaveBeenCalledWith(callId, customerIdentity);
        expect(
          customersRoom.checkAndUnmapDeviceIdFromSocketId
        ).toHaveBeenCalledWith(customer);
      });
    });
  });

  describe('onCallAccepted(): ', () => {
    it('should check connnected customer and emit event to him', () => {
      const acceptedBy = 'operator42';
      const call = {
        id: callId,
        requestedBy: customerIdentity,
        acceptedBy,
        deviceId,
      };
      customersRoom.getSocketIdByDeviceId = jest.fn(() =>
        Promise.resolve(socketId)
      );
      customersRoom.getCustomer = jest.fn(() =>
        Promise.resolve({ connectedCustomer: customer, callData: {} })
      );

      return customersRoom.onCallAccepted(call).then(() => {
        expect(customersRoom.getSocketIdByDeviceId).toHaveBeenCalledWith(
          deviceId
        );
        expect(customersRoom.getCustomer).toHaveBeenCalledWith(
          socketId,
          callId,
          acceptedBy
        );
      });
    });
  });

  describe('getCustomer(): ', () => {
    it('should do nothing if not connected customer', () => {
      const acceptedBy = 'operator42';
      twilio.getToken = jest.fn(() => Promise.resolve());
      customersRoom.emitCallAccepting = jest.fn();
      customersRoom.customers.connected = {};

      customersRoom.getCustomer(socketId, callId, acceptedBy);

      expect(twilio.getToken).not.toHaveBeenCalled();
      expect(customersRoom.emitCallAccepting).not.toHaveBeenCalled();
    });

    it('should emit to connected customer', () => {
      const acceptedBy = 'operator42';
      const token = 'token';

      twilio.getToken = jest.fn(() => token);
      customersRoom.emitCallAccepting = jest.fn();
      customersRoom.customers.connected = {
        [socketId]: customer,
      };

      customersRoom.getCustomer(socketId, callId, acceptedBy);

      expect(twilio.getToken).toHaveBeenCalledWith(deviceId, callId);
    });
  });

  describe('emitCallAccepting(): ', () => {
    it('should emit correct event to customer', () => {
      const call = {
        id: callId,
      };
      customersRoom.emitCallAccepting(customer, call);
      expect(customer.emit).toHaveBeenCalledWith(CALL_ACCEPTED, call);
    });
  });

  describe('emitCallbackRequesting(): ', () => {
    it('should emit correct event to socket', () => {
      const callback = {
        id: callId,
      };
      customersRoom.emitCallbackRequesting(customer, callback);
      expect(customer.emit).toHaveBeenCalledWith(CALLBACK_REQUESTED, callback);
    });
  });

  describe('onCallbackRequestAborted(): ', () => {
    it('should emit callback requesting abort to customer', async () => {
      const call = {
        deviceId,
        id: callId,
        callbacks: [{ requestedAt: 'time', declinedAt: 'another time' }],
      };

      customersRoom.getSocketIdByDeviceId = jest.fn(() =>
        Promise.resolve(socketId)
      );
      customersRoom.emitCallbackRequestingAborted = jest.fn(() => {});
      customersRoom.getConnectedCustomer = jest.fn(() => customer);

      await customersRoom.onCallbackRequestAborted(call);

      expect(customersRoom.getConnectedCustomer).toHaveBeenCalledWith(socketId);
      expect(
        customersRoom.emitCallbackRequestingAborted
      ).toHaveBeenCalledWith(customer, { call });
    });
    it('should not emit callback requesting abort if customer was not found', async () => {
      const call = {
        deviceId,
        id: callId,
        callbacks: [{ requestedAt: 'time', declinedAt: 'another time' }],
      };

      customersRoom.getSocketIdByDeviceId = jest.fn(() =>
        Promise.resolve(socketId)
      );
      customersRoom.emitCallbackRequestingAborted = jest.fn(() => {});
      customersRoom.getConnectedCustomer = jest.fn(() => null);

      await customersRoom.onCallbackRequestAborted(call);

      expect(customersRoom.getConnectedCustomer).toHaveBeenCalledWith(socketId);
      expect(
        customersRoom.emitCallbackRequestingAborted
      ).not.toHaveBeenCalledWith();
    });
  });

  describe('mapDeviceIdToSocketId(): ', () => {
    it('should map device id on socket id', () => {
      connectionsHeap.add = jest.fn(() => Promise.resolve());

      return customersRoom.mapDeviceIdToSocketId(customer).then(() => {
        expect(connectionsHeap.add).toHaveBeenCalledWith(deviceId, socketId);
      });
    });
  });

  describe('checkAndUnmapDeviceIdFromSocketId(): ', () => {
    it('should do nothing if no device id', () => {
      connectionsHeap.remove = jest.fn(() => Promise.resolve());

      return customersRoom.checkAndUnmapDeviceIdFromSocketId({}).then(() => {
        expect(connectionsHeap.remove).not.toHaveBeenCalled();
      });
    });

    it('should remove device id', () => {
      connectionsHeap.remove = jest.fn(() => Promise.resolve());

      return customersRoom
        .checkAndUnmapDeviceIdFromSocketId(customer)
        .then(() => {
          expect(connectionsHeap.remove).toHaveBeenCalledWith(deviceId);
        });
    });
  });

  describe('getSocketIdByDeviceId(): ', () => {
    it('should call connectionsHeap', () => {
      connectionsHeap.get = jest.fn(() => Promise.resolve());

      return customersRoom.getSocketIdByDeviceId(deviceId).then(() => {
        expect(connectionsHeap.get).toHaveBeenCalledWith(deviceId);
      });
    });
  });
});
