class WebSocketClient {

  constructor(port = 9005) 
  {
    this.port = port;
    this.socket = null;
    this.status = this.Status.NONE; // Connection status
    this.messageCallback = null; // Callback to handle incoming messages
  }

  Status = Object.freeze({
    NONE: 0,
    CONNECTING: 1,
    CONNECTED: 2,
  });

  // Allow background.js to register a callback for received messages
  setMessageCallback(callback) {
    this.messageCallback = callback;
  }

  connect() {
    this.socket = new WebSocket(`ws://127.0.0.1:${this.port}`);
    this.status = this.Status.CONNECTING; // Update status to connecting

    this.socket.onopen = () => {
      this.status = this.Status.CONNECTED; // Update status to connected
      console.log('Connected to desktop app');
    };

    this.socket.onmessage = event => this.handleMessage(event.data);

    this.socket.onclose = () => {
      this.status = this.Status.NONE; // Update status to none
      console.log('Disconnected from desktop app');
    };

    this.socket.onerror = error => {
      this.socket.close(); // Close the socket on error
      this.status = this.Status.NONE; // Update status to none
      console.error('WebSocket error:', error);
    }
  };

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      // If a callback has been set, call it with the received message.
      if (this.messageCallback) {
        this.messageCallback(message);
      } else {
        // Fallback: send the message using chrome.runtime.sendMessage
        chrome.runtime.sendMessage(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}