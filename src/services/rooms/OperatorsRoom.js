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
  CALL_ANSWER_PERMISSION,
  REALTIME_DASHBOARD_SUBSCRIPTION_PERMISSION,
} = require('@/constants/permissions');

const {
  TOKEN_INVALID,
  UNAUTHORIZED,
  FORBIDDEN,
} = require('@/constants/connection');

const {
  STATUS_CHANGED_ONLINE,
  STATUS_CHANGED_OFFLINE,
} = require('@/constants/operatorStatuses');

const {
  REALTIME_DASHBOARD_SUBSCRIBE,
  REALTIME_DASHBOARD_SUBSCRIBED,
  REALTIME_DASHBOARD_UNSUBSCRIBE,
  REALTIME_DASHBOARD_CALL_FINISHED,
  REALTIME_DASHBOARD_CALL_ACCEPTED,
  REALTIME_DASHBOARD_SUBSCRIPTION_ERROR,
  REALTIME_DASHBOARD_ACTIVE_CALLS_CHANGED,
  REALTIME_DASHBOARD_WAITING_CALLS_CHANGED,
  REALTIME_DASHBOARD_OPERATORS_STATUSES_CHANGED,
} = require('@/constants/realtimeDashboard');

const calls = require('@/services/calls');
const twilio = require('@/services/twilio');
const timeHelper = require('@/services/time');

const socketAuth = require('@/services/socketAuth');
const { authenticateOperator } = socketAuth;

const { connectionsHeap } = require('@/services/connectionsHeap');
const { getOperatorCallFailReason } = require('./utils');
const logger = require('@/services/logger')(module);

const isMaster = !process.env.INSTANCE_ID || process.env.INSTANCE_ID === '0';

// const operatorsGroups = {};

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
      timeout: 15000,
    });

    calls.subscribeToCallFinishing(this.onCallFinished.bind(this));
    calls.subscribeToCallAccepting(this.onCallAccepted.bind(this));

    calls.subscribeToCallbackAccepting(
      this.checkOperatorAndEmitCallbackAccepting.bind(this)
    );
    calls.subscribeToCallbackDeclining(
      this.checkOperatorAndEmitCallbackDeclining.bind(this)
    );

    calls.subscribeToActiveCallsHeapAdding(
      this.onActiveCallsHeapChanged.bind(this)
    );
    calls.subscribeToActiveCallsHeapTaking(
      this.onActiveCallsHeapChanged.bind(this)
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
    operator.on(DISCONNECT, this.onOperatorDisconnected.bind(this, operator));
  }

  subscribeToSocketEvents(operator) {
    // Calls
    const callsAllowed = socketAuth.checkConnectionPermission(
      operator,
      CALL_ANSWER_PERMISSION
    );

    operator.on(
      CALL_ACCEPTED,
      callsAllowed
        ? this.onOperatorAcceptCall.bind(this, operator)
        : this.emitOperationNotAllowed.bind(this, operator, CALL_ACCEPTED)
    );
    operator.on(
      CALLBACK_REQUESTED,
      callsAllowed
        ? this.onOperatorRequestedCallback.bind(this, operator)
        : this.emitOperationNotAllowed.bind(this, operator, CALLBACK_REQUESTED)
    );
    operator.on(
      CALL_FINISHED,
      callsAllowed
        ? this.onOperatorFinishedCall.bind(this, operator)
        : this.emitOperationNotAllowed.bind(this, operator, CALL_FINISHED)
    );
    operator.on(
      STATUS_CHANGED_ONLINE,
      callsAllowed
        ? this.addOperatorToActive.bind(this, operator)
        : this.emitOperationNotAllowed.bind(
            this,
            operator,
            STATUS_CHANGED_ONLINE
          )
    );
    operator.on(
      STATUS_CHANGED_OFFLINE,
      callsAllowed
        ? this.removeOperatorFromActive.bind(this, operator)
        : this.emitOperationNotAllowed.bind(
            this,
            operator,
            STATUS_CHANGED_OFFLINE
          )
    );

    // Realtime Dashboards
    const realtimeDashboardsAllowed = socketAuth.checkConnectionPermission(
      operator,
      REALTIME_DASHBOARD_SUBSCRIPTION_PERMISSION
    );

    operator.on(
      REALTIME_DASHBOARD_SUBSCRIBE,
      realtimeDashboardsAllowed
        ? this.subscribeToRealtimeDashboardUpdates.bind(this, operator)
        : this.emitOperationNotAllowed.bind(
            this,
            operator,
            REALTIME_DASHBOARD_SUBSCRIBE
          )
    );
    operator.on(
      REALTIME_DASHBOARD_UNSUBSCRIBE,
      realtimeDashboardsAllowed
        ? this.unsubscribeFromRealtimeDashboardUpdates.bind(this, operator)
        : this.emitOperationNotAllowed.bind(
            this,
            operator,
            REALTIME_DASHBOARD_UNSUBSCRIBE
          )
    );
  }

  onOperatorAuthenticated(operator, data) {
    logger.debug(
      'Operator authenticated',
      operator.id,
      operator.identity,
      operator.tenantId
    );

    this.subscribeToSocketEvents(operator);
    this.mapSocketIdentityToId(operator);
    this.addOperatorToActive(operator, data);
  }

  async onOperatorAcceptCall({ id }) {
    const connectedOperator = this.getConnectedOperator(id);
    if (
      connectedOperator &&
      socketAuth.checkConnectionPermission(
        connectedOperator,
        CALL_ANSWER_PERMISSION
      )
    ) {
      logger.debug(
        'Customer call: attempt to accept by operator',
        connectedOperator.identity
      );

      return calls
        .acceptCall(connectedOperator)
        .then(call => {
          const {
            id,
            requestedAt,
            requestedBy,
            salesRepId,
            callbackEnabled,
          } = call;

          const token = twilio.getToken(connectedOperator.identity, id);
          connectedOperator.emit(ROOM_CREATED, {
            id,
            requestedAt,
            token,
            requestedBy,
            salesRepId,
            callbackEnabled,
          });
        })
        .then(() =>
          logger.debug(
            'Customer call: accepted by operator',
            connectedOperator.identity
          )
        )
        .catch(err => this.onCallAcceptingFailed(err, connectedOperator));
    } else {
      this.onCallAcceptingFailed('Permission Denied', connectedOperator);
    }
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

  onActiveCallsHeapChanged(changedCall = {}) {
    this.emitRealtimeDashboardActiveCallsInfo(changedCall);
  }

  onCallFinished(call) {
    const callFinishedNotByByOperator = call.finishedBy !== call.acceptedBy;
    if (callFinishedNotByByOperator) {
      this.checkOperatorAndEmitCallFinishing(call);
    }

    this.emitRealtimeDashboardCallFinished(call);
  }

  onCallAccepted(call) {
    this.emitRealtimeDashboardCallAccepted(call);
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

  onOperatorDisconnected(operator, reason) {
    this.unsubscribeFromRealtimeDashboardUpdates(operator);
    this.removeOperatorFromActive(operator);
    this.checkAndUnmapSocketIdentityFromId(operator);
    logger.debug('Operator disconnected:', operator.identity, reason);
    this.emitOperatorsStatusesChanged(operator);
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
    const { data, tenantId } = info;
    const groupName = this.getActiveOperatorsGroupName(tenantId);

    this.emitToLocalGroup(groupName, CALLS_CHANGED, {
      ...data,
      serverTime: timeHelper.formattedTimestamp(),
    });
    logger.debug('Operator: calls info emitted to group', groupName);

    this.emitRealtimeDashboardWaitingCallsInfo(tenantId);
  }

  // TODO: check
  // Data is not in use, maybe BUG of missing data?
  async addOperatorToActive({ id }, data = {}) {
    const connectedOperator = this.getConnectedOperator(id);
    if (connectedOperator) {
      logger.debug('Operator: add to active operators group', id);

      if (!(await this.verifyToken(connectedOperator))) {
        return false;
      }

      if (
        socketAuth.checkConnectionPermission(
          connectedOperator,
          CALL_ANSWER_PERMISSION
        )
      ) {
        const tenantId = connectedOperator.tenantId;
        const activeGroupName = this.getActiveOperatorsGroupName(tenantId);
        const inactiveGroupName = this.getInactiveOperatorsGroupName(tenantId);

        connectedOperator.join(activeGroupName);
        logger.debug('Operator: add to group', id, activeGroupName);
        connectedOperator.leave(inactiveGroupName);
        logger.debug('Operator: remove from group', id, inactiveGroupName);

        this.emitOperatorsStatusesChanged(connectedOperator);

        // this.joinGroup(connectedOperator, groupName);
        logger.debug('Operator: joined group', id, activeGroupName);

        const info = await calls.getCallsInfo(tenantId);
        connectedOperator.emit(CALLS_CHANGED, {
          ...info,
          serverTime: timeHelper.formattedTimestamp(),
        });
        logger.debug('Operator: calls info emitted directly', id);
      } else {
        logger.debug(
          `Operator: wasn't added to active operators group because of missed answering call permission`
        );
      }
    }
  }

  removeOperatorFromActive({ id }) {
    const connectedOperator = this.getConnectedOperator(id);
    if (connectedOperator) {
      const tenantId = connectedOperator.tenantId;
      const activeGroupName = this.getActiveOperatorsGroupName(tenantId);
      const inactiveGroupName = this.getInactiveOperatorsGroupName(tenantId);

      connectedOperator.join(inactiveGroupName);
      logger.debug('Operator: add to group', id, inactiveGroupName);
      connectedOperator.leave(activeGroupName);
      logger.debug('Operator: remove from group', id, activeGroupName);
      // this.leaveGroup(connectedOperator, groupName);

      this.emitOperatorsStatusesChanged(connectedOperator);
    }
  }

  async subscribeToRealtimeDashboardUpdates({ id }) {
    logger.debug('Operator: subscribe to realtime dashboard', id);

    const connectedOperator = this.getConnectedOperator(id);
    if (connectedOperator) {
      const tenantId = connectedOperator.tenantId;

      if (!(await this.verifyToken(connectedOperator))) {
        return false;
      }

      if (
        socketAuth.checkConnectionPermission(
          connectedOperator,
          REALTIME_DASHBOARD_SUBSCRIPTION_PERMISSION
        )
      ) {
        const groupName = this.getRealtimeDashboardGroupName(tenantId);
        connectedOperator.join(groupName);
        connectedOperator.emit(REALTIME_DASHBOARD_SUBSCRIBED);
        logger.debug(
          'Operator: subscribed to realtime dashboard',
          id,
          groupName
        );

        this.emitOperatorsStatusesChangedDirectly(connectedOperator);
        this.emitRealtimeDashboardActiveCallsInfoDirectly(connectedOperator);
        this.emitRealtimeDashboardWaitingCallsInfoDirectly(connectedOperator);
      } else {
        connectedOperator.emit(REALTIME_DASHBOARD_SUBSCRIPTION_ERROR);
        logger.debug('Operator: not subscribed to realtime dashboard', id);
      }
    }
  }

  unsubscribeFromRealtimeDashboardUpdates({ id }) {
    const connectedOperator = this.getConnectedOperator(id);
    if (connectedOperator) {
      logger.debug('Operator: unsubscribe from realtime dashboard', id);

      const tenantId = connectedOperator.tenantId;
      const groupName = this.getRealtimeDashboardGroupName(tenantId);
      connectedOperator.leave(groupName);
      logger.debug(
        'Operator: unsubscribed from realtime dashboard',
        id,
        groupName
      );
    }
  }

  async emitRealtimeDashboardWaitingCallsInfoDirectly({ id }) {
    const connectedOperator = this.getConnectedOperator(id);
    if (connectedOperator) {
      const items = await calls.getPendingCalls(connectedOperator.tenantId);

      connectedOperator.emit(REALTIME_DASHBOARD_WAITING_CALLS_CHANGED, {
        count: items.length,
        items,
        serverTime: timeHelper.formattedTimestamp(),
      });

      logger.debug(
        'Operator: realtime dashboard waiting calls info emited directly',
        id
      );
    }
  }

  async emitRealtimeDashboardWaitingCallsInfo(tenantId) {
    const groupName = this.getRealtimeDashboardGroupName(tenantId);

    if (this.isLocalGroupNonEmpty(groupName)) {
      const items = await calls.getPendingCalls(tenantId);

      this.emitToLocalGroup(
        groupName,
        REALTIME_DASHBOARD_WAITING_CALLS_CHANGED,
        {
          count: items.length,
          items,
          serverTime: timeHelper.formattedTimestamp(),
        }
      );

      logger.debug(
        'Operator: realtime dashboard waiting calls info emited to non empty group',
        groupName
      );
    } else {
      logger.debug(
        "Operator: realtime dashboard waiting calls info didn't emited because group is empty",
        groupName
      );
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
    return (this.operators.connected || {})[id];
  }

  getRealtimeDashboardGroupName(tenantId) {
    return `tenant.${tenantId}.realtimeDashboard`;
  }

  getActiveOperatorsGroupName(tenantId) {
    return `tenant.${tenantId}.activeOperators`;
  }

  getInactiveOperatorsGroupName(tenantId) {
    return `tenant.${tenantId}.inactiveOperators`;
  }

  async verifyToken(connection) {
    const tokenStatus = await socketAuth.verifyConnectionToken(connection);
    if (!tokenStatus) {
      connection.emit(UNAUTHORIZED, {
        message: TOKEN_INVALID,
      });
      logger.error(
        'Operator: invalid token message emitted to',
        connection.id,
        connection.identity
      );
      return false;
    }

    return true;
  }

  emitOperationNotAllowed({ id }, operationName) {
    const connectedOperator = this.getConnectedOperator(id);

    if (connectedOperator) {
      connectedOperator.emit(FORBIDDEN, {
        message: `Operation "${operationName}" is not allowed.`,
        operation: operationName,
      });

      logger.error('Operator: operation is forbidden', id, operationName);
    }
  }

  emitRealtimeDashboardCallFinished(call) {
    const groupName = this.getRealtimeDashboardGroupName(call.tenantId);

    this.emitToLocalGroup(groupName, REALTIME_DASHBOARD_CALL_FINISHED, call);
    const message = `Operator: ${REALTIME_DASHBOARD_CALL_FINISHED} emitted to tenant group ${call.tenantId} with call:`;
    logger.debug(message, call);
  }

  emitRealtimeDashboardCallAccepted(call) {
    const groupName = this.getRealtimeDashboardGroupName(call.tenantId);

    this.emitToLocalGroup(groupName, REALTIME_DASHBOARD_CALL_ACCEPTED, call);

    const message = `Operator: ${REALTIME_DASHBOARD_CALL_ACCEPTED} emitted to tenant group ${call.tenantId} with call:`;
    logger.debug(message, call);
  }

  async emitRealtimeDashboardActiveCallsInfoDirectly({ id }) {
    const connectedOperator = this.getConnectedOperator(id);
    if (connectedOperator) {
      const items = await calls.getActiveCallsByTenantId(
        connectedOperator.tenantId
      );

      connectedOperator.emit(REALTIME_DASHBOARD_ACTIVE_CALLS_CHANGED, {
        count: items.length,
        items,
        serverTime: timeHelper.formattedTimestamp(),
      });

      logger.debug(
        'Operator: realtime dashboard active calls info emited directly',
        id
      );
    }
  }

  async emitRealtimeDashboardActiveCallsInfo(changedCall) {
    const groupName = this.getRealtimeDashboardGroupName(changedCall.tenantId);

    try {
      if (this.isLocalGroupNonEmpty(groupName)) {
        const items = await calls.getActiveCallsByTenantId(
          changedCall.tenantId
        );
        this.emitToLocalGroup(
          groupName,
          REALTIME_DASHBOARD_ACTIVE_CALLS_CHANGED,
          {
            count: items.length,
            items,
            serverTime: timeHelper.formattedTimestamp(),
          }
        );
        const message = `${REALTIME_DASHBOARD_ACTIVE_CALLS_CHANGED} emitted to ${groupName} with calls:`;
        logger.debug(message, items);
      } else {
        const message = `${REALTIME_DASHBOARD_ACTIVE_CALLS_CHANGED} didn't emitted to ${groupName} because group is empty`;
        logger.debug(message, groupName);
      }
    } catch (error) {
      logger.error(
        'Operator: realtime dashboard active calls error',
        groupName,
        error
      );
    }
  }

  async emitOperatorsStatusesChanged({ tenantId } = {}) {
    const realtimeDashboardGroup = this.getRealtimeDashboardGroupName(tenantId);
    if (this.isLocalGroupNonEmpty) {
      const data = await this.prepareOperatorStatusesInfo(tenantId);

      this.emitToLocalGroup(
        realtimeDashboardGroup,
        REALTIME_DASHBOARD_OPERATORS_STATUSES_CHANGED,
        data
      );

      logger.debug(
        `Operators: emitOperatorsActivityChanged to ${realtimeDashboardGroup}`,
        data
      );
    } else {
      const message =
        "Operator: realtime dashboard waiting calls info didn't emited because group is empty";

      logger.debug(message, realtimeDashboardGroup);
    }
  }

  async emitOperatorsStatusesChangedDirectly(connectedOperator) {
    const data = await this.prepareOperatorStatusesInfo(
      connectedOperator.tenantId
    );

    connectedOperator.emit(REALTIME_DASHBOARD_OPERATORS_STATUSES_CHANGED, data);

    logger.debug(
      `Operators: emitOperatorsActivityChanged to ${connectedOperator.id} directly`,
      data
    );
  }

  async prepareOperatorStatusesInfo(tenantId) {
    const activeOperatorsGroup = this.getActiveOperatorsGroupName(tenantId);
    const inactiveOperatorsGroup = this.getInactiveOperatorsGroupName(tenantId);

    const activeOperatorsCount = await this.getGroupInfo(
      activeOperatorsGroup
    ).catch(err => this.handleGetGroupInfoError(err, activeOperatorsGroup));

    const inactiveOperatorsCount = await this.getGroupInfo(
      inactiveOperatorsGroup
    ).catch(err => this.handleGetGroupInfoError(err, inactiveOperatorsCount));

    const data = {
      activeOperators: {
        count: activeOperatorsCount,
      },
      inactiveOperators: {
        count: inactiveOperatorsCount,
      },
    };
    return data;
  }

  isLocalGroupNonEmpty(groupName) {
    return !!this.getLocalGroupMembers(groupName).length;
  }

  emitToLocalGroup(groupName, message, data) {
    const members = this.getLocalGroupMembers(groupName);
    members.forEach(connection => {
      connection.emit(message, data);
    });

    logger.debug(
      'Operator: message emitted to',
      members.length,
      'members of local group',
      groupName,
      message,
      data
    );
  }

  getLocalGroupMembers(groupName) {
    const members = Object.values(
      this.operators.connected || {}
    ).filter(connection => Object.keys(connection.rooms).includes(groupName));

    logger.debug(
      'Operator: getLocalGroupMembers',
      groupName,
      'members:',
      members.length
    );

    return members;
  }

  getGroupInfo(groupName) {
    return new Promise((resolve, reject) =>
      this.operators
        .to(groupName)
        .clients((err, data) => (err ? reject(err) : resolve(data.length)))
    );
  }

  handleGetGroupInfoError(err, group) {
    logger.error(
      `Operators: emitOperatorsActivityChanged failed for ${group}`,
      err
    );
    return 0;
  }
}

module.exports = OperatorsRoom;
