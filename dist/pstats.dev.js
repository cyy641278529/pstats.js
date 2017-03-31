
/*
 * pstats.js v1.0.0
 * (c) 2017 @Johnny Wu
 * Released under the MIT License.
 */

var pstats = (function () {
'use strict';

function polyfill() {
  if (typeof window.performance === 'undefined') {
    window.performance = {};
  }

  if (!window.performance.now) {

    var nowOffset = Date.now();

    if (performance.timing && performance.timing.navigationStart) {
      nowOffset = performance.timing.navigationStart;
    }

    window.performance.now = function now() {
      return Date.now() - nowOffset;
    };
  }

  if (!window.performance.mark) {
    window.performance.mark = function () { };
  }

  if (!window.performance.measure) {
    window.performance.measure = function () { };
  }

  if (!window.performance.memory) {
    window.performance.memory = { usedJSHeapSize: 0, totalJSHeapSize: 0 };
  }
}

class Graph {
  constructor(dom, color) {
    this._color = color || '#666';
    this._max = 0;
    this._current = 0;

    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');

    this._canvasDot = document.createElement('canvas');
    this._ctxDot = this._canvasDot.getContext('2d');

    this._canvasAlarm = document.createElement('canvas'),
    this._ctxAlarm = this._canvasAlarm.getContext('2d');

    this._canvas.className = 'pstats-canvas';
    dom.appendChild(this._canvas);
  }

  init(width, height) {
    this._canvas.width = width;
    this._canvas.height = height;
    this._canvas.style.width = `${width}px`;
    this._canvas.style.height = `${height}px`;

    this._ctx.fillStyle = '#444';
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    this._canvasDot.width = 1;
    this._canvasDot.height = 2 * height;

    this._ctxDot.fillStyle = '#444';
    this._ctxDot.fillRect(0, 0, 1, 2 * height);
    this._ctxDot.fillStyle = this._color;
    this._ctxDot.fillRect(0, height, 1, height);
    this._ctxDot.fillStyle = '#fff';
    this._ctxDot.globalAlpha = 0.5;
    this._ctxDot.fillRect(0, height, 1, 1);
    this._ctxDot.globalAlpha = 1;

    this._canvasAlarm.width = 1;
    this._canvasAlarm.height = 2 * height;

    this._ctxAlarm.fillStyle = '#444';
    this._ctxAlarm.fillRect(0, 0, 1, 2 * height);
    this._ctxAlarm.fillStyle = '#b70000';
    this._ctxAlarm.fillRect(0, height, 1, height);
    this._ctxAlarm.globalAlpha = 0.5;
    this._ctxAlarm.fillStyle = '#fff';
    this._ctxAlarm.fillRect(0, height, 1, 1);
    this._ctxAlarm.globalAlpha = 1;
  }

  draw(value, alarm) {
    this._current += (value - this._current) * 0.1;
    this._max *= 0.99;

    if (this._current > this._max) {
      this._max = this._current;
    }

    // DISABLE: pstats is not designed for monitor ranged value
    // if (this._current < this._min) {
    //   this._min = this._current;
    // }
    // let ratio = (this._current - this._min) / (this._max - this._min);

    this._ctx.drawImage(this._canvas,
      1, 0, this._canvas.width - 1, this._canvas.height,
      0, 0, this._canvas.width - 1, this._canvas.height
    );

    if (alarm) {
      this._ctx.drawImage(this._canvasAlarm,
        this._canvas.width - 1,
        -this._canvas.height * this._current / this._max
      );
    } else {
      this._ctx.drawImage(this._canvasDot,
        this._canvas.width - 1,
        -this._canvas.height * this._current / this._max
      );
    }
  }
}

class StackGraph {
  constructor(dom, colors) {
    this._colors = colors;

    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');

    this._canvas.className = 'pstats-canvas';
    dom.appendChild(this._canvas);
  }

  init(width, height, n) {
    this._canvas.width = width;
    this._canvas.height = height * n;
    this._canvas.style.width = `${width}px`;
    this._canvas.style.height = `${height * n}px`;

    this._ctx.fillStyle = '#444';
    this._ctx.fillRect(0, 0, width, height * n);
  }

  draw(values) {
    this._ctx.drawImage(this._canvas,
      1, 0, this._canvas.width - 1, this._canvas.height,
      0, 0, this._canvas.width - 1, this._canvas.height
    );

    let th = 0;
    for (let i = 0; i < values.length; ++i) {
      let h = values[i] * this._canvas.height;
      this._ctx.fillStyle = this._colors[i];
      this._ctx.fillRect(this._canvas.width - 1, th, 1, h);
      th += h;
    }
  }
}

class Counter {
  constructor(id, opts) {
    this._id = id;
    this._opts = opts || {};

    this._value = 0;
    this._total = 0;
    this._averageValue = 0;
    this._accumValue = 0;
    this._accumSamples = 0;
    this._accumStart = window.performance.now();
  }

  _average(v) {
    if (this._opts.average) {
      this._accumValue += v;
      ++this._accumSamples;

      let t = performance.now();
      if (t - this._accumStart >= this._opts.average) {
        this._averageValue = this._accumValue / this._accumSamples;
        this._accumValue = 0;
        this._accumStart = t;
        this._accumSamples = 0;
      }
    }
  }

  get value() { return this._value; }
  set value(v) {
    this._value = v;
  }

  sample() {
    this._average(this._value);
  }

  human() {
    let v = this._opts.average ? this._averageValue : this._value;
    return Math.round(v * 100) / 100;
  }

  alarm() {
    return (
      (this._opts.below && this._value < this._opts.below) ||
      (this._opts.over && this._value > this._opts.over)
    );
  }
}

class PerfCounter extends Counter {
  constructor(id, opts) {
    super(id, opts);

    // DISABLE
    // this._idstart = `${id}_start`;
    // this._idend = `${id}_end`;

    this._time = performance.now();
  }

  start() {
    this._time = window.performance.now();

    // DISABLE: long time running will cause performance drop down
    // window.performance.mark(this._idstart);
  }

  end() {
    this._value = window.performance.now() - this._time;

    // DISABLE: long time running will cause performance drop down
    // window.performance.mark(this._idend);
    // window.performance.measure(this._id, this._idstart, this._idend);

    this._average(this._value);
  }

  tick() {
    this.end();
    this.start();
  }

  frame() {
    let t = window.performance.now();
    let e = t - this._time;
    this._total++;
    let avg = this._opts.average || 1000;

    if (e > avg) {
      this._value = this._total * 1000 / e;
      this._total = 0;
      this._time = t;
      this._average(this._value);
    }
  }
}

const log1024 = Math.log(1024);
const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

function _bytesToSize (bytes) {
  let precision = 100;
  let i = Math.floor(Math.log(bytes) / log1024);
  if (bytes === 0) {
    return 'n/a';
  }
  return Math.round(bytes * precision / Math.pow(1024, i)) / precision + ' ' + sizes[i];
}

class MemoryCounter extends Counter {
  constructor(stats, id, opts) {
    super(id, opts);
    this._stats = stats;
    this._start = 0;

    if ( opts.extension.indexOf('memory.') === 0 ) {
      this._field = opts.extension.substring(7);
    }
  }

  snapshot () {
    this._value = this._stats[this._field];
  }

  start() {
    this._start = this._stats[this._field];
  }

  end() {
    this._value = this._stats[this._field] - this._start;
  }

  human () {
    return _bytesToSize(super.human());
  }

  // alarm () {
  //   return this._stats.alarm;
  // }
}

class MemoryStats {
  constructor () {
    let memory = window.performance.memory;
    if (memory.totalJSHeapSize === 0) {
      console.warn('totalJSHeapSize === 0, performance.memory is only available in Chrome.');
    }

    this._used = 0;
    this._total = 0;
    this._lastUsed = 0;
  }

  tick () {
    let cur = window.performance.memory.usedJSHeapSize;
    this._lastUsed = this._used;
    this._used = cur;
    this._total = window.performance.memory.totalJSHeapSize;
  }

  get alarm() {
    // GC happens
    return this._used - this._lastUsed < 0;
  }

  get used() {
    return this._used;
  }

  get total() {
    return this._total;
  }

  counter(id, opts) {
    return new MemoryCounter(this, id, opts);
  }
}

let _hacked = false;
let _totalDrawArraysCalls = 0;
let _totalDrawElementsCalls = 0;
let _totalUseProgramCalls = 0;
let _totalFaces = 0;
let _totalVertices = 0;
let _totalPoints = 0;
let _totalBindTexures = 0;

function _hackWebGL() {
  if (_hacked) {
    return;
  }

  _hacked = true;

  function _h(f, c) {
    return function () {
      c.apply(this, arguments);
      f.apply(this, arguments);
    };
  }

  WebGLRenderingContext.prototype.drawArrays = _h(WebGLRenderingContext.prototype.drawArrays, function () {
    _totalDrawArraysCalls++;
    if (arguments[0] == this.POINTS) _totalPoints += arguments[2];
    else _totalVertices += arguments[2];
  });

  WebGLRenderingContext.prototype.drawElements = _h(WebGLRenderingContext.prototype.drawElements, function () {
    _totalDrawElementsCalls++;
    _totalFaces += arguments[1] / 3;
    _totalVertices += arguments[1];
  });

  WebGLRenderingContext.prototype.useProgram = _h(WebGLRenderingContext.prototype.useProgram, function () {
    _totalUseProgramCalls++;
  });

  WebGLRenderingContext.prototype.bindTexture = _h(WebGLRenderingContext.prototype.bindTexture, function () {
    _totalBindTexures++;
  });
}

class WebglCounter extends Counter {
  constructor(stats, id, opts) {
    super(id, opts);
    this._stats = stats;
    this._start = 0;

    if ( opts.extension.indexOf('webgl.') === 0 ) {
      this._field = opts.extension.substring(7);
    }
  }

  snapshot () {
    this._value = this._stats[this._filed];
  }

  start() {
    this._start = this._stats[this._filed];
  }

  end() {
    this._value = this._stats[this._filed] - this._start;
  }
}

class WebGLStats {
  constructor () {
    _hackWebGL();
  }

  tick () {
    _totalDrawArraysCalls = 0;
    _totalDrawElementsCalls = 0;
    _totalUseProgramCalls = 0;
    _totalFaces = 0;
    _totalVertices = 0;
    _totalPoints = 0;
    _totalBindTexures = 0;
  }

  counter(id, opts) {
    return new WebglCounter(this, id, opts);
  }

  get drawcalls () {
    return _totalDrawArraysCalls + _totalDrawElementsCalls;
  }

  get drawArrays () {
    return _totalDrawArraysCalls;
  }

  get drawElements () {
    return _totalDrawElementsCalls;
  }

  get faces () {
    return _totalFaces;
  }

  get vertices () {
    return _totalVertices;
  }

  get points () {
    return _totalPoints;
  }

  get programs () {
    return _totalUseProgramCalls;
  }

  get textures () {
    return _totalBindTexures;
  }
}

let extensions = {
  memory: MemoryStats,
  webgl: WebGLStats,
};

let _canvasWidth = 100;
let _canvasHeight = 10;
let _css = `
  .pstats {
    position: absolute;
    z-index: 9999;

    padding: 5px;
    width: ${_canvasWidth+150}px;
    right: 0;
    bottom: 0;

    font-size: 10px;
    font-family: 'Roboto Condensed', tahoma, sans-serif;
    overflow: hidden;
    user-select: none;
    cursor: default;

    background: #222;
    border-radius: 3px;

  }

  .pstats-container {
    display: flex;
    flex-direction: column;
    color: #888;
    white-space: nowrap;
  }

  .pstats-item {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .pstats-label {
    display: flex;
    flex-direction: row;
    flex: 1;

    text-align: left;
    margin-right: 5px;

    transition: background 0.3s;
  }

  .pstats-label.alarm {
    color: #ccc;
    background: #800;

    transition: background 0s;
  }

  .pstats-counter-id {
    flex: 1;
  }

  .pstats-counter-value {
    flex: 1;
    text-align: right;
  }

  .pstats-fraction {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .pstats-legend {
    display: flex;
    flex-direction: column;
    flex: 1;

    text-align: right;
    margin-right: 5px;
  }
`;

// DISABLE:
// let cssFont = 'https://fonts.googleapis.com/css?family=Roboto+Condensed:400,700,300';
// let cssFontEL = document.createElement('link');
// cssFontEL.href = cssFont;
// cssFontEL.rel = 'stylesheet';
// cssFontEL.type = 'text/css';
// document.head.appendChild(cssFontEL);

// add global style
let styleEL = document.createElement('style');
styleEL.type = 'text/css';
styleEL.textContent = _css;
document.head.appendChild(styleEL);

//
class Stats {
  constructor (dom, opts) {
    opts = opts || {};
    this._colors = opts.colors || ['#850700', '#c74900', '#fcb300', '#284280', '#4c7c0c'];
    this._values = opts.values || {};
    this._fractions = opts.fractions || [];
    this._id2counter = {};
    this._id2item = {};
    this._name2extStats = {};

    if (opts.css) {
      let styleEL = document.createElement('style');
      styleEL.type = 'text/css';
      styleEL.textContent = opts.css;
      document.head.appendChild(styleEL);
    }

    if (opts.extensions) {
      for (let i = 0; i < opts.extensions.length; ++i) {
        let name = opts.extensions[i];
        let ExtStats = extensions[name];
        if ( !ExtStats ) {
          console.warn(`Can not find extensions ${name}, please register your extension via pstats.register().`);
          continue;
        }

        this._name2extStats[name] = new ExtStats();
      }
    }

    // ==================
    // DOM
    // ==================

    this._root = document.createElement('div');
    this._root.className = 'pstats';

    let containerEL = document.createElement('div');
    containerEL.className = 'pstats-container';

    this._root.appendChild(containerEL);

    // pstats-item
    for (let id in this._values) {
      let vopts = this._values[id];

      // .pstats-item
      let itemEL = document.createElement('div');
      itemEL.className = 'pstats-item';

      // .pstats-label
      let label = document.createElement('div');
      label.className = 'pstats-label';

      let spanId = document.createElement('span');
      spanId.className = 'pstats-counter-id';
      spanId.textContent = vopts.desc || id;

      let spanValue = document.createElement('div');
      spanValue.className = 'pstats-counter-value';

      let spanValueText = document.createTextNode('');
      spanValueText.nodeValue = '0';

      label.appendChild(spanId);
      label.appendChild(spanValue);
      spanValue.appendChild(spanValueText);
      itemEL.appendChild(label);

      // graph
      let graph = new Graph(itemEL, vopts.color);
      graph.init(_canvasWidth, _canvasHeight);

      //
      this._id2item[id] = {
        label: label,
        valueText: spanValueText,
        graph,
      };

      containerEL.appendChild(itemEL);
    }

    // pstats-fraction
    if (opts.fractions) {
      for ( let i = 0; i < opts.fractions.length; ++i ) {
        let fraction = opts.fractions[i];

        let fractionEL = document.createElement('div');
        fractionEL.className = 'pstats-fraction';

        let legend = document.createElement('div');
        legend.className = 'pstats-legend';

        let steps = fraction.steps;
        for (let h = 0; h < steps.length; ++h) {
          let p = document.createElement('span');
          p.textContent = steps[h];
          p.style.color = this._colors[h];
          legend.appendChild(p);
        }

        fractionEL.appendChild(legend);
        fractionEL.style.height = steps.length * _canvasHeight + 'px';

        let graph = new StackGraph(fractionEL, this._colors);
        graph.init(_canvasWidth, _canvasHeight, steps.length);

        fraction.graph = graph;
        fraction.values = new Array(steps.length);

        containerEL.appendChild(fractionEL);
      }
    }

    dom.appendChild(this._root);
  }

  item(id) {
    if (!id) {
      return null;
    }

    let counter = this._id2counter[id];
    if (counter) {
      return counter;
    }

    let vopts = this._values[id];
    if (!vopts) {
      return null;
    }

    // if we have extension, use extension-counter
    if ( vopts.extension ) {
      let idx = vopts.extension.indexOf('.');
      let name = vopts.extension.substring(0,idx);
      let extStats = this._name2extStats[name];
      if (!extStats) {
        console.error(`extension ${name} not found, make sure you have register and enable it.`);
        return null;
      }

      counter = extStats.counter(id, vopts);
    } else {
      // default, use perf-counter
      counter = new PerfCounter(id, vopts);
    }

    this._id2counter[id] = counter;
    return counter;
  }

  tick() {
    // tick extensions
    for ( let name in this._name2extStats ) {
      let extStats = this._name2extStats[name];
      extStats.tick();
    }

    // values
    for (let id in this._values) {
      let counter = this._id2counter[id];
      if (counter) {
        counter.sample();
        let alarm = counter.alarm();
        let human = counter.human();

        let item = this._id2item[id];
        item.label.classList.toggle('alarm', alarm > 0);
        item.valueText.nodeValue = human;
        item.graph.draw(counter.value, alarm);
      }
    }

    // fractions
    for ( let i = 0; i < this._fractions.length; ++i ) {
      let fraction = this._fractions[i];
      let baseCounter = this._id2counter[fraction.base];
      if (baseCounter) {
        let steps = fraction.steps;

        for (let j = 0; j < steps.length; ++j) {
          let id = steps[j];
          let counter = this._id2counter[id];
          if (counter) {
            fraction.values[j] = counter.value / baseCounter.value;
          }
        }
        fraction.graph.draw(fraction.values);
      }
    }
  }
}

polyfill();

let pstats = {
  new (dom, settings) {
    let stats = new Stats(dom, settings);
    return function (id) {
      if (!id) {
        return stats;
      }

      return stats.item(id);
    };
  },

  register(name, ext) {
    extensions[name] = ext;
  },
};

return pstats;

}());
//# sourceMappingURL=pstats.dev.js.map