/* eslint-disable no-use-before-define */

const Video = require('twilio-video');

const socket = io('/customers');

setTimeout(() => {
  socket.emit('operators length');
}, 100);

socket.on('operators length', ({ all = 0, active = 0 }) => {
  console.log('operators length', all, active);
  const allOperators = document
    .querySelector('.operators-info .all-operators span');
  const activeOperators = document
    .querySelector('.operators-info .active-operators span');

  allOperators.innerHTML = all;
  activeOperators.innerHTML = active;
});

let activeRoom;
let previewTracks;

function attachTracks(tracks, container) {
  setTimeout(() => {
    tracks.forEach((track) => {
      if (track.attach || (track.track && track.track.attach)) {
        container.appendChild(
          (track.attach && track.attach())
          || (track.track.attach && track.track.attach()),
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
      const detachedElements = (
        (track.detach && track.detach)
        || (track.track.detach && track.track.detach())
        || []
      );
      detachedElements.forEach(detachedElement => detachedElement.remove());
    }
  });
}

function detachParticipantTracks(participant) {
  const tracks = Array.from(participant.tracks.values());
  detachTracks(tracks);
}

window.addEventListener('beforeunload', leaveRoomIfJoined);

$.getJSON('/token', onTokenReceived);

function onTokenReceived(data) {
  const { token } = data;

  document.getElementById('button-join').onclick = () => requestConnection(token);
  document.getElementById('button-leave').onclick = leaveRoomIfJoined;
}

function requestConnection(token) {
  socket.emit('request call', { query: token });
  socket.on('call accepted', roomName => connectToRoom(roomName, token));
}

function connectToRoom(name, token) {
  const connectOptions = {
    name,
  };

  if (previewTracks) {
    connectOptions.tracks = previewTracks;
  }

  return Video.connect(token, connectOptions)
    .then(roomJoined)
    .catch(error => console.error('Could not connect: ', error.message));
}

function roomJoined(room) {
  window.room = room;
  activeRoom = room;

  socket.on('operator disconnected', leaveRoomIfJoined);

  document.getElementById('button-join').style.display = 'none';
  document.getElementById('button-leave').style.display = 'inline';

  const previewContainer = document.getElementById('local-media');
  if (!previewContainer.querySelector('video')) {
    attachParticipantTracks(room.localParticipant, previewContainer);
  }

  room.participants.forEach((participant) => {
    const container = document.getElementById('remote-media');
    attachParticipantTracks(participant, container);
  });

  room.on('participantConnected', (participant) => {
    console.log('Joining: ', participant.identity);
  });

  room.on('trackAdded', (track) => {
    const container = document.getElementById('remote-media');
    attachTracks([track], container);
  });

  room.on('trackRemoved', (track) => {
    detachTracks([track]);
  });

  room.on('participantDisconnected', (participant) => {
    detachParticipantTracks(participant);
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
  socket.emit('finish call');
  if (activeRoom) {
    activeRoom.disconnect();
  }
}
