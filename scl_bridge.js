// Forward messages from service worker to main world.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  window.postMessage({ source: "SOUNDCLOUD_EXTENSION", payload: msg }, "*");
  sendResponse({ status: "OK" });
});

// Forward messages from main world to service worker.
window.addEventListener("message", event => {
  if (event.source !== window) return;
  if (event.data && event.data.source === "SOUNDCLOUD_EXTENSION") {
    chrome.runtime.sendMessage(event.data.payload);
  }
});