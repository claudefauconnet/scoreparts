let ioInstance = null;

export function setIo(io) {
  ioInstance = io;
}

export function getIo() {
  return ioInstance;
}

export function emitTo(socketId, event, payload) {
  if (!ioInstance || !socketId) return;
  ioInstance.to(socketId).emit(event, payload);
}
