

importScripts("websocket-client.js");
let wsClient = new WebSocketClient();

wsClient.setMessageCallback(message => {
  const msg = { ...message, fromWS: true };
  chrome.tabs.query({ url: "*://*.soundcloud.com/*" }, tabs => {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, msg);
    }
  });
});

chrome.runtime.onMessage.addListener(message => {
  if (message.fromWS) return; // Skip messages from wsClient callback.
  wsClient.send(message);
});

chrome.runtime.onStartup.addListener(() => {
  console.log("Soundcloud Listen Along starting...");
});

function reconnectIfNeeded() {
  chrome.tabs.query({ url: "*://*.soundcloud.com/*" }, tabs => {
    if (tabs.length > 0 && (!wsClient || !wsClient.socket || (wsClient.status !== wsClient.Status.CONNECTED && wsClient.status !== wsClient.Status.CONNECTING))) {  
      console.clear();
      console.log("SoundCloud tab open and websocket not connected. Attempting reconnect...");
      wsClient.connect();
    }
  });
}

setInterval(reconnectIfNeeded, 2500);
