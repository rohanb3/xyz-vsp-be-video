/* eslint-disable no-param-reassign, class-methods-use-this */

const socketIOAuth = require('socketio-auth');

const {
  CONNECTION,
  DISCONNECT,
  ROOM_CREATED,
  OPERATORS,
  CONNECTION_DROPPED,
} = require('@/constants/rooms');

const {
  CALL_ACCEPTED,
  CALL_FINISHED,
  CALLBACK_REQUESTED,
  CALLBACK_ACCEPTED,
  CALLBACK_DECLINED,
  CALLS_CHANGED,
  CALL_ACCEPTING_FAILED,
  CALLBACK_REQUESTING_FAILED,
  CUSTOMER_DISCONNECTED,
} = require('@/constants/calls');

const {
  STATUS_CHANGED_ONLINE,
  STATUS_CHANGED_OFFLINE,
} = require('@/constants/operatorStatuses');

const calls = require('@/services/calls');
const twilio = require('@/services/twilio');
const { authenticateOperator } = require('@/services/socketAuth');
const { connectionsHeap } = require('@/services/connectionsHeap');
const { getOperatorCallFailReason } = require('./utils');
const logger = require('@/services/logger')(module);

const isMaster = !process.env.INSTANCE_ID || process.env.INSTANCE_ID === '0';

class OperatorsRoom {
  constructor(io, mediator) {
    this.operators = io.of(OPERATORS);
    this.operators.on(CONNECTION, this.onOperatorConnected.bind(this));

    this.mediator = mediator;

    this.mediator.on(
      CUSTOMER_DISCONNECTED,
      this.notifyAboutCustomerDisconnected.bind(this)
    );

    socketIOAuth(this.operators, {
      authenticate: authenticateOperator.bind(
        null,
        this.disconnectOldSocket.bind(this)
      ),
      postAuthenticate: this.onOperatorAuthenticated.bind(this),
    });

    calls.subscribeToCallFinishing(this.onCallFinished.bind(this));

    calls.subscribeToCallbackAccepting(
      this.checkOperatorAndEmitCallbackAccepting.bind(this)
    );
    calls.subscribeToCallbackDeclining(
      this.checkOperatorAndEmitCallbackDeclining.bind(this)
    );

    if (isMaster) {
      calls.subscribeToCallsLengthChanging(this.emitCallsInfo.bind(this));
    }
  }

  disconnectOldSocket(socketId) {
    const connectedOperator = this.getConnectedOperator(socketId);
    if (connectedOperator) {
      connectedOperator.emit(CONNECTION_DROPPED);
    }
  }

  onOperatorConnected(operator) {
    operator.on(CALL_ACCEPTED, this.onOperatorAcceptCall.bind(this, operator));
    operator.on(
      CALLBACK_REQUESTED,
      this.onOperatorRequestedCallback.bind(this, operator)
    );
    operator.on(
      CALL_FINISHED,
      this.onOperatorFinishedCall.bind(this, operator)
    );
    operator.on(DISCONNECT, this.onOperatorDisconnected.bind(this, operator));
    operator.on(
      STATUS_CHANGED_ONLINE,
      this.addOperatorToActive.bind(this, operator)
    );
    operator.on(
      STATUS_CHANGED_OFFLINE,
      this.removeOperatorFromActive.bind(this, operator)
    );
  }

  onOperatorAuthenticated(operator) {
    logger.debug('Operator authenticated', operator.id, operator.identity);
    this.mapSocketIdentityToId(operator);
    this.addOperatorToActive(operator);
  }

  onOperatorAcceptCall(operator) {
    logger.debug(
      'Customer call: attempt to accept by operator',
      operator && operator.identity
    );
    return calls
      .acceptCall(operator.identity, operator.tenant)
      .then(call => {
        const {
          id,
          requestedAt,
          requestedBy,
          salesRepId,
          callbackEnabled,
        } = call;
        const token = twilio.getToken(operator.identity, id);
        operator.emit(ROOM_CREATED, {
          id,
          requestedAt,
          token,
          requestedBy,
          salesRepId,
          callbackEnabled,
        });
      })
      .then(() =>
        logger.debug('Customer call: accepted by operator', operator.identity)
      )
      .catch(err => this.onCallAcceptingFailed(err, operator));
  }

  onCallAcceptingFailed(err, operator) {
    const data = {
      reason: getOperatorCallFailReason(err),
    };

    logger.error(
      'Customer call: accepting failed',
      operator.identity,
      err,
      data
    );
    operator.emit(CALL_ACCEPTING_FAILED, data);
  }

  onCallFinished(call) {
    const callFinishedNotByByOperator = call.finishedBy !== call.acceptedBy;
    if (callFinishedNotByByOperator) {
      this.checkOperatorAndEmitCallFinishing(call);
    }
  }

  onOperatorRequestedCallback(operator, callId) {
    logger.debug(
      'Operator callback: attempt to request',
      operator.identity,
      callId
    );
    if (!callId) {
      logger.error('Operator callback requested: no callId', operator.identity);
      return Promise.resolve();
    }
    return calls
      .requestCallback(callId, operator.identity)
      .then(callback => {
        operator.pendingCallbackId = callback.id;
      })
      .then(() => logger.debug('Operator callback: requested', operator.id))
      .catch(err => {
        const reason = getOperatorCallFailReason(err);
        if (reason) {
          logger.error('Operator callback: requesting failed: ', reason, err);
          const data = {
            reason,
          };
          this.emitCallbackDeclining(operator, data);
        } else {
          logger.error('Operator callback: requesting failed', err);
          operator.emit(CALLBACK_REQUESTING_FAILED);
        }
      });
  }

  onOperatorFinishedCall(operator, callId) {
    logger.debug(
      'Call: attempt to finish by operator',
      callId,
      operator.identity
    );
    return callId
      ? calls
          .finishCall(callId, operator.identity)
          .then(() =>
            logger.debug(
              'Call: finished by operator',
              callId,
              operator.identity
            )
          )
          .catch(err => logger.error('Call: finishing by operator failed', err))
      : Promise.resolve();
  }

  onOperatorDisconnected(operator) {
    this.checkAndUnmapSocketIdentityFromId(operator);
    logger.debug('Operator disconnected:', operator.identity);
  }

  checkOperatorAndEmitCallbackAccepting(call) {
    const { acceptedBy, id } = call;
    return this.getSocketIdByIdentity(acceptedBy).then(socketId => {
      const connectedOperator = this.getConnectedOperator(socketId);
      if (connectedOperator) {
        this.emitCallbackAccepting(connectedOperator, id);
      }
    });
  }

  checkOperatorAndEmitCallbackDeclining(call) {
    const { acceptedBy, id, reason } = call;
    return this.getSocketIdByIdentity(acceptedBy).then(socketId => {
      const connectedOperator = this.getConnectedOperator(socketId);
      if (connectedOperator) {
        this.emitCallbackDeclining(connectedOperator, { id, reason });
      }
    });
  }

  checkOperatorAndEmitCallFinishing(call) {
    const { acceptedBy, id } = call;
    return this.getSocketIdByIdentity(acceptedBy).then(socketId => {
      const connectedOperator = this.getConnectedOperator(socketId);
      if (connectedOperator) {
        logger.debug('Call finished: emitting to operator', id, acceptedBy);
        this.emitCallFinishing(connectedOperator, { id });
      }
    });
  }

  emitCallbackAccepting(operator, callId) {
    operator.emit(CALLBACK_ACCEPTED, callId);
  }

  emitCallbackDeclining(operator, data) {
    operator.emit(CALLBACK_DECLINED, data);
  }

  emitCallFinishing(operator, data) {
    operator.emit(CALL_FINISHED, data);
  }

  emitCallsInfo(info) {
    const { data, tenant } = info;
    return this.operators.to(tenant).emit(CALLS_CHANGED, data);
  }

  addOperatorToActive(operator) {
    const operatorId = operator.id;

    const connectedOperator = this.getConnectedOperator(operatorId);
    const tenant = connectedOperator.tenant;
    if (connectedOperator) {
      logger.debug('Operator: added to active', operatorId);
      connectedOperator.join(tenant);

      return calls
        .getCallsInfo(tenant)
        .then(info => {
          connectedOperator.emit(CALLS_CHANGED, info);
          logger.debug('Operator: emitted calls info', operatorId);
        })
        .catch(err =>
          logger.error('Calls info: emitting to active operator failed', err)
        );
    }
    return Promise.resolve();
  }

  removeOperatorFromActive(operator) {
    const operatorId = operator.id;
    const tenant = operator.tenant;
    const connectedOperator = this.getConnectedOperator(operatorId);
    if (connectedOperator) {
      logger.debug('Operator: removed from active', operatorId);
      connectedOperator.leave(tenant);
    }
  }

  mapSocketIdentityToId(socket) {
    return connectionsHeap
      .add(socket.identity, { socketId: socket.id })
      .catch(err => {
        logger.error(
          'Operator: mapping socket identity to id failed:',
          socket.identity,
          socket.id,
          err
        );
      });
  }

  checkAndUnmapSocketIdentityFromId(socket) {
    return socket.identity
      ? connectionsHeap
          .get(socket.identity)
          .then(heapSocket => {
            if (heapSocket.socketId === socket.id) {
              return connectionsHeap.remove(socket.identity);
            }
          })
          .catch(err =>
            logger.error(
              'Operator: unmapping identity from id failed',
              socket.identity,
              err
            )
          )
      : Promise.resolve();
  }

  getSocketIdByIdentity(identity) {
    return connectionsHeap
      .get(identity)
      .then((connectionData = {}) =>
        connectionData ? connectionData.socketId : null
      )
      .catch(err =>
        logger.error('Operator: getting id by identity failed', identity, err)
      );
  }

  notifyAboutCustomerDisconnected({ operatorId }) {
    return this.getSocketIdByIdentity(operatorId).then(socketId => {
      const connectedOperator = this.getConnectedOperator(socketId);

      if (connectedOperator) {
        connectedOperator.emit(CUSTOMER_DISCONNECTED);
      }
    });
  }

  getConnectedOperator(id) {
    return this.operators.connected[id];
  }
}

module.exports = OperatorsRoom;
