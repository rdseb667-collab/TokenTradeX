import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (this.socket) {
      return;
    }

    this.socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  subscribe(channel, tokenId) {
    if (this.socket) {
      this.socket.emit('subscribe', { channel, tokenId });
    }
  }

  unsubscribe(channel, tokenId) {
    if (this.socket) {
      this.socket.emit('unsubscribe', { channel, tokenId });
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export default new WebSocketService();
