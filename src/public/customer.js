/* eslint-disable no-use-before-define */

const Video = require('twilio-video');

const socket = io('/customers', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  socket.emit('authentication', { userName: 'Joey' });
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

  document.getElementById('button-join').onclick = () => requestConnection(token);
  document.getElementById('button-leave').onclick = leaveRoomIfJoined;
}

function requestConnection(token) {
  socket.emit('call.requested', { query: token });
  socket.on('call.accepted', roomName => connectToRoom(roomName, token));
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

  document.getElementById('button-join').style.display = 'none';
  document.getElementById('button-leave').style.display = 'inline';

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
    detachParticipantTracks(participant);
    leaveRoomIfJoined();
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

function leaveRoomIfJoined() {
  if (activeRoom) {
    socket.emit('call.finished', { id: activeRoom.name });
    activeRoom.disconnect();
    activeRoom = null;
  }
}
