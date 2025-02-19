// https://github.com/embedly/player.js

import { streamable as MATCH_SRC } from '../constants/src-regex.js';
import {
  getVideoId,
  createPlayPromise,
  createEmbedIframe,
} from '../helpers.js';
import {
  removeNode,
  loadScript,
  publicPromise,
  promisify,
} from '../utils.js';

const EMBED_BASE = 'https://streamable.com/o';
const API_URL = 'https://cdn.embed.ly/player-0.1.0.min.js';
const API_GLOBAL = 'playerjs';

export function createPlayer(element) {
  let api;
  let iframe;
  let ready;

  function getOptions() {
    return {
      autoplay: element.playing || element.autoplay,
      muted: element.muted,
      loop: element.loop,
      ...element.config.streamable,
    };
  }

  async function init() {
    ready = publicPromise();

    const opts = getOptions();
    const videoId = getVideoId(MATCH_SRC, element.src);
    const src = `${EMBED_BASE}/${videoId}`;
    iframe = createEmbedIframe({ src });

    const playerjs = await loadScript(opts.apiUrl || API_URL, API_GLOBAL);
    api = new playerjs.Player(iframe);

    opts.autoplay && api.play();

    await promisify(api.on, api)('ready');
    ready.resolve();
  }

  const eventAliases = {
    playing: 'play',
  };

  const customEvents = {
    progress: undefined,
  };

  const unsupported = {
    playbackRate: undefined,
    controls: undefined,
  };

  const methods = {
    name: 'Streamable',
    version: '1.x.x',
    unsupported,

    get element() {
      return iframe;
    },

    get api() {
      return api;
    },

    get videoId() {
      return getVideoId(MATCH_SRC, element.src);
    },

    ready() {
      return ready;
    },

    remove() {
      removeNode(iframe);
    },

    play() {
      // play doesn't return a play promise.
      api.play();
      return createPlayPromise(element);
    },

    on(eventName, callback) {
      if (eventName in customEvents) return;
      api.on(eventAliases[eventName] || eventName, callback);
    },

    off(eventName, callback) {
      if (eventName in customEvents) return;
      api.off(eventAliases[eventName] || eventName, callback);
    },

    setSrc() {
      // Must return promise here to await ready state.
      return element.load();
    },

    async getPaused() {
      return promisify(api.getPaused, api)();
    },

    async getCurrentTime() {
      return promisify(api.getCurrentTime, api)();
    },

    async getDuration() {
      return promisify(api.getDuration, api)();
    },

    async getLoop() {
      return promisify(api.getLoop, api)();
    },

    set volume(volume) {
      api.setVolume(volume * 100);
    },

    async getVolume() {
      const volume = await promisify(api.getVolume, api)();
      return volume / 100;
    },

    set muted(muted) {
      muted ? api.mute() : api.unmute();
    },

    async getMuted() {
      return promisify(api.getMuted, api)();
    },

    // getBuffered() {
    //   // bug in player.js - https://github.com/embedly/player.js/issues/79
    //   return createTimeRanges();
    // },
  };

  init();

  return methods;
}
