(function() {
    "use strict";
    // Prevent multiple injections of the extension script
    if (window.__SOUNDCLOUD_EXTENSION_LOADED__) return;
    window.__SOUNDCLOUD_EXTENSION_LOADED__ = true;
  
    // Will later store the model constructor for creating track models
    window.SoundCloudModelConstructor = null;
  
    // Variables to hold references to key functions from SoundCloud's internal modules
    let originalPlayCurrent = null,
        getQueueFunction = null,
        addExplicitQueueItemFunction = null,
        getCurrentQueueItemFunction = null,
        playAudibleFunction = null,
        prepareModelFunction = null;
  
    /**
     * Posts information about the currently playing track with Unix timestamps.
     * @param {Object} sound - The sound object with track details.
     */
    function sendPlayingTrackInfo(sound) {
      var currentTime = 0;
      try {
          currentTime = sound.player.getPosition(); // Current position in ms
      } catch (error) {
          // This can happen when we go next song. Just ignore.
      }
      
      // Get current Unix timestamp in milliseconds
      const currentUnixTimestamp = Date.now();
      
      // Calculate start and end timestamps
      const startUnixTimestamp = currentUnixTimestamp - currentTime;
      const timeLeft = sound.attributes.duration - currentTime;
      const endUnixTimestamp = currentUnixTimestamp + timeLeft;
      
      window.postMessage({
        source: "SOUNDCLOUD_EXTENSION",
        payload: {
          type: "WS_SEND_TRACK",
          data: {
            artist: sound.computed__displayArtist,
            title: sound.attributes.title,
            start_time: startUnixTimestamp,
            end_time: endUnixTimestamp,
            artwork_url: sound.attributes.artwork_url,
            track_url: sound.attributes.permalink_url,
          }
        }
      }, "*");
    }

     /**
     * Sends information about the seek event.
     * @param {Object} e - The event object.
     * @param {Object} t - The time integer in milliseconds.
     */
    function sendSeekInfo(e, t){
        console.log(t);
    }
  
    /**
     * Scans a module for functions we need to override/hook.
     * @param {Object} module - The module exports.
     * @param {string} moduleId - Identifier for the module (for debugging if needed).
     */
    function searchModuleForFunctions(module, moduleId) {
      if (!module) return;
  
      // Hook playCurrent to send track info when a track starts playing.
      if (module.playCurrent && !originalPlayCurrent) {
        originalPlayCurrent = module.playCurrent;
        module.playCurrent = function(e) {
          let currentSound = this.getCurrentSound();
          if (currentSound && currentSound.attributes){
            sendPlayingTrackInfo(currentSound);
          }
          return originalPlayCurrent.apply(this, arguments);
        };
      }
  
      // Save references to various functions if available for external use.
      if (module.getQueue && !getQueueFunction) {
        getQueueFunction = module.getQueue.bind(module);
      }
      if (module.addExplicitQueueItem && !addExplicitQueueItemFunction) {
        addExplicitQueueItemFunction = module.addExplicitQueueItem.bind(module);
      }
      if (module.getCurrentQueueItem && !getCurrentQueueItemFunction) {
        getCurrentQueueItemFunction = module.getCurrentQueueItem.bind(module);
      }
      // Hook into playAudible: used to actually start track playback.
      if (module.properties && module.properties.playAudible && module.properties.after) {
        const originalAfterSetupFunction = module.properties.after.setup;
        module.properties.after.setup = function() {
          if (playAudibleFunction === null)
            playAudibleFunction = this.playAudible.bind(this);
          return originalAfterSetupFunction.call(this);
        };
      }
      // Hook _prepareModel to capture the model constructor.
      if (module.prototype && module.prototype._prepareModel && !prepareModelFunction) {
        const originalPrepareModel = module.prototype._prepareModel;
        prepareModelFunction = function() {
          return originalPrepareModel.apply(this, arguments);
        }.bind(module.prototype);
        module.prototype._prepareModel = function(e, options) {
          // Abort if this.model is not a constructor function.
          if (typeof this.model !== "function") return null;
          const result = originalPrepareModel.call(this, e, options);
          // Store the model constructor for future use, if not already set.
          if (result.requestPreloading && window.SoundCloudModelConstructor === null) {
            window.SoundCloudModelConstructor = this.model;
          }
          return result;
        };
      }
    }
  
    /**
     * Hooks into webpack's module push method to intercept module definitions.
     * This allows us to search for our target functions as modules load.
     * @param {Array} arr - The webpack module array.
     * @returns {Array} The hooked module array.
     */
    function hookPushMethod(arr) {
      const originalPush = arr.push || Array.prototype.push;
      arr.push = function() {
        const chunkArguments = arguments[0];
        // chunkArguments[1] should be the modules object.
        if (chunkArguments && chunkArguments[1]) {
          const modules = chunkArguments[1];
          Object.keys(modules).forEach(moduleId => {
            const originalModuleFunction = modules[moduleId];
            // Wrap the module function to run our search after module initialization.
            modules[moduleId] = function(module, exports, __webpack_require__) {
              originalModuleFunction(module, exports, __webpack_require__);
              searchModuleForFunctions(module.exports, moduleId);
            };
          });
        }
        return originalPush.apply(this, arguments);
      };
      return arr;
    }
  
    // Override webpackJsonp to hook our search logic into module loading.
    let webpackJsonp = hookPushMethod(window.webpackJsonp || []);
    Object.defineProperty(window, 'webpackJsonp', {
      get: () => webpackJsonp,
      set: value => (webpackJsonp = hookPushMethod(value)),
      configurable: false
    });
  
    // Expose functions to interact with SoundCloud's internal logic
  
    /**
     * Retrieves the current playback queue.
     */
    window.callGetQueue = function() {
      if (getQueueFunction) return getQueueFunction();
    };
  
    /**
     * Adds a track to the playback queue.
     * @param {Object} queueItem - The queue item to add.
     */
    window.callAddExplicitQueueItem = function(queueItem) {
      if (addExplicitQueueItemFunction) return addExplicitQueueItemFunction(queueItem);
    };
  
    /**
     * Retrieves the current item in the playback queue.
     */
    window.callGetCurrentQueueItem = function() {
      if (getCurrentQueueItemFunction) return getCurrentQueueItemFunction();
    };
  
    /**
     * Initiates playback using the playAudible function.
     * @param {Object} model - The track model to play.
     */
    window.callPlayAudible = function(model) {
      if (playAudibleFunction) return playAudibleFunction(model);
    };
  
    /**
     * Prepares a model instance from given data using the stored constructor.
     * @param {Object} modelData - The track data.
     * @returns {Object} A new model instance.
     */
    window.callPrepareModel = function(modelData) {
      if (prepareModelFunction) {
        // Instantiate a new model using the saved constructor
        var instance = new window.SoundCloudModelConstructor(modelData);
        return instance;
      }
    };
  
    /**
     * Event listener for messages from the extension.
     * Expects messages with type "WS_PLAY_TRACK" containing a track URL.
     */
    window.addEventListener("message", event => {
      // Process only messages from the same window
      if (event.source !== window) return;
      if (event.data && event.data.source === "SOUNDCLOUD_EXTENSION") {
        const msg = event.data.payload;
        if (msg.type === "WS_PLAY_TRACK" && msg.data.trackUrl) {
          // Fetch track info and trigger playback
          fetchTrackInfo(msg.data.trackUrl)
            .then(trackData => {
              if (trackData) {
                const model = window.callPrepareModel(trackData);
                model.requestPreloading();
                model.player.seek(0);
                window.callPlayAudible(model);
              }
            })
            .catch(() => {}); // Silently ignore errors
        }
      }
    });
  
    /**
     * Fetches and parses track information from a SoundCloud track URL.
     * @param {string} url - The URL of the track page.
     * @returns {Object|null} The parsed track data or null if not found.
     */
    async function fetchTrackInfo(url) {
      const res = await fetch(url);
      const html = await res.text();
      // Parse HTML content to locate the hydration script containing track data.
      const doc = new DOMParser().parseFromString(html, "text/html");
      const scripts = [...doc.querySelectorAll("script")];
      for (const script of scripts) {
        if (script.textContent.includes("window.__sc_hydration")) {
          const match = script.textContent.match(/window\.__sc_hydration\s*=\s*(\[[\s\S]*?\]);/);
          if (match && match[1]) {
            const data = JSON.parse(match[1]);
            // Return the first occurrence of sound data
            return data.find(o => o.hydratable === "sound")?.data;
          }
        }
      }
      return null;
    }
  })();
  