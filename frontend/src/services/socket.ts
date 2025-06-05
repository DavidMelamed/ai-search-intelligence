import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: any;

  connect(token: string) {
    this.socket = io(SOCKET_URL, {
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  subscribeToDomain(domain: string) {
    if (this.socket) {
      this.socket.emit('subscribe:domain', domain);
    }
  }

  unsubscribeFromDomain(domain: string) {
    if (this.socket) {
      this.socket.emit('unsubscribe:domain', domain);
    }
  }

  onCitationUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('citation:new', callback);
    }
  }

  offCitationUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off('citation:new', callback);
    }
  }
}

export default new SocketService();