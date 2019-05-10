/* eslint-disable no-use-before-define */

const Video = require('twilio-video');

const isLocal = prompt('Is local?');
const isProd = prompt('Is production?');
const deviceId = prompt('Tell me device id') || 'localTablet';
const identity = prompt('Tell me your identity') || 'Joey';

let socketUrl = 'wss://vsp.xyzies.ardas.biz/customers';
let socketOptions = {
  path: '/api/video/socket.io',
  transports: ['websocket'],
};

if (typeof isLocal === 'string') {
  socketUrl = '/customers';
  socketOptions = { transports: ['websocket'] };
}

if (typeof isProd === 'string') {
  socketUrl = 'wss://portal.xyzvsp.com/customers';
}

const socket = io(socketUrl, socketOptions);

let globalToken = null;
let roomId = null;

socket.on('connect', () => {
  socket.emit('authentication', { identity, deviceId, });
  socket.on('authenticated', (token) => {
    console.log('authenticated');
    onTokenReceived({ token });
  });
  socket.on('unauthorized', err => console.log(err));
});

let activeRoom;
let previewTracks;

function attachTracks(tracks, container) {
  setTimeout(() => {
    tracks.forEach((track) => {
      if (track.attach || (track.track && track.track.attach)) {
        container.appendChild(
          (track.attach && track.attach()) || (track.track.attach && track.track.attach()),
        );
      }
    });
  }, 2000);
}

function attachParticipantTracks(participant, container) {
  const tracks = Array.from(participant.tracks.values());
  attachTracks(tracks, container);
}

function detachTracks(tracks) {
  tracks.forEach((track) => {
    if (track.detach || (track.track && track.track.detach)) {
      const detachedElements = (track.detach && track.detach()) || (track.track.detach && track.track.detach()) || [];
      (detachedElements || []).forEach(detachedElement => detachedElement.remove());
    }
  });
}

function detachParticipantTracks(participant) {
  const tracks = Array.from(participant.tracks.values());
  detachTracks(tracks);
}

window.addEventListener('beforeunload', leaveRoomIfJoined);

function onTokenReceived(data) {
  const { token } = data;
  globalToken = token;

  document.getElementById('button-join').onclick = () => requestConnection(token);
  document.getElementById('button-leave').onclick = leaveRoomIfJoined;

  socket.on('callback.requested', onCallbackRequested);
}

function requestConnection() {
  const salesRepId = '0343694f-9005-4bc9-bd37-2746264ab82d';
  socket.emit('call.requested', { salesRepId });
  socket.once('call.enqueued', (callId) => {
    roomId = callId;
    document.getElementById('button-join').style.display = 'none';
    document.getElementById('button-leave').style.display = 'inline';
  });
  socket.once('call.accepted', ({ roomId, operatorId, token }) => connectToRoom(roomId, token));
}

function onCallbackRequested() {
  document.getElementById('incoming-callback-controls').style.display = 'flex';
  setTimeout(() => {
    document.getElementById('accept-button').onclick = acceptCallback;
    document.getElementById('decline-button').onclick = declineCallback;
  });
}

function acceptCallback() {
  hideIncoming();
  socket.emit('callback.accepted');
  socket.once('room.created', roomId => connectToRoom(roomId, globalToken));
}

function declineCallback() {
  hideIncoming();
  socket.emit('callback.declined');
}

function hideIncoming() {
  document.getElementById('incoming-callback-controls').style.display = 'none';
}

function connectToRoom(name, token) {
  console.log(name, token);
  const connectOptions = {
    name,
  };

  if (previewTracks) {
    connectOptions.tracks = previewTracks;
  }

  return Video.connect(
    token,
    connectOptions,
  )
    .then(roomJoined)
    .catch(error => console.error('Could not connect: ', error.message));
}

function roomJoined(room) {
  window.room = room;
  activeRoom = room;

  socket.on('operator.disconnected', leaveRoomIfJoined);

  const previewContainer = document.getElementById('local-media');
  if (!previewContainer.querySelector('video')) {
    attachParticipantTracks(room.localParticipant, previewContainer);
  }

  room.participants.forEach((participant) => {
    const container = document.getElementById('remote-media');
    // attachParticipantTracks(participant, container);
  });

  room.on('participantConnected', (participant) => {
    console.log('Joining: ', participant.identity);
  });

  room.on('trackSubscribed', (track) => {
    console.log('trackSubscribed', track);
    const container = document.getElementById('remote-media');
    attachTracks([track], container);
  });

  room.on('trackUnsubscribed', (track) => {
    console.log('trackUnsubscribed');
    detachTracks([track]);
  });

  room.on('participantDisconnected', (participant) => {
    console.log('participant', new Date());
    detachParticipantTracks(participant);
    leaveRoomIfJoined(false);
  });

  room.on('disconnected', () => {
    if (previewTracks) {
      previewTracks.forEach(track => track.stop());
      previewTracks = null;
    }
    detachParticipantTracks(room.localParticipant);
    room.participants.forEach(detachParticipantTracks);
    activeRoom = null;
    document.getElementById('button-join').style.display = 'inline';
    document.getElementById('button-leave').style.display = 'none';
  });
}

document.getElementById('button-preview').onclick = () => {
  const localTracksPromise = previewTracks
    ? Promise.resolve(previewTracks)
    : Video.createLocalTracks();

  localTracksPromise.then(
    (tracks) => {
      window.previewTracks = tracks;
      previewTracks = tracks;
      const previewContainer = document.getElementById('local-media');
      if (!previewContainer.querySelector('video')) {
        attachTracks(tracks, previewContainer);
      }
    },
    (error) => {
      console.error('Unable to access local media', error);
    },
  );
};

function leaveRoomIfJoined(notifyBE = true) {
  if (activeRoom) {
    if (notifyBE) {
      socket.emit('call.finished', { id: activeRoom.name });
    }
    activeRoom.disconnect();
    activeRoom = null;
  } else {
    socket.emit('call.finished', { id: roomId });
    document.getElementById('button-join').style.display = 'inline';
    document.getElementById('button-leave').style.display = 'none';
  }
}
