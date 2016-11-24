/**
---
_bundle: PullToRefresh
---
*/

import { _getIcon, _getLabel, _closestElement } from './_helpers';

/* eslint-disable import/no-unresolved */

import _ptrMarkup from './_markup';
import _ptrStyles from './_styles';

const _SETTINGS = {};

const _defaults = {
  distTreshold: 60,
  distMax: 80,
  distReload: 50,
  bodyOffset: 20,
  mainElement: 'body',
  triggerElement: 'body',
  ptrElement: '.ptr',
  classPrefix: 'ptr--',
  cssProp: 'height',
  refreshTimeout: 500,
  getIcon: _getIcon,
  getLabel: _getLabel,
  getMarkup: _ptrMarkup,
  getStyles: _ptrStyles,
  onRefresh: () => location.reload(),
  resistanceFunction: t => Math.min(1, t / 2.5),
};

let pullStartY = null;
let pullMoveY = null;
let dist = 0;
let distResisted = 0;

let _state = 'pending';
let _setup = false;
let _enable = false;
let _timeout;

function _update() {
  const { getIcon, getLabel, ptrElement, classPrefix } = _SETTINGS;

  ptrElement.querySelector(`.${classPrefix}icon`).innerHTML = getIcon(_state);
  ptrElement.querySelector(`.${classPrefix}text`).innerHTML = getLabel(_state);
}

function _setupEvents() {
  const { classPrefix } = _SETTINGS;

  function onReset() {
    const { ptrElement } = _SETTINGS;

    ptrElement.classList.remove(`${classPrefix}refresh`);
    ptrElement.style[_SETTINGS.cssProp] = '0px';
  }

  window.addEventListener('touchstart', (e) => {
    const { triggerElement } = _SETTINGS;

    clearTimeout(_timeout);

    if (!window.scrollY) {
      pullStartY = e.touches[0].screenY;
    }

    _enable = _closestElement(e.target, triggerElement);
    _state = 'pending';
    _update();
  });

  window.addEventListener('touchmove', (e) => {
    const {
      ptrElement, resistanceFunction, distMax, distTreshold,
    } = _SETTINGS;

    if (!_enable) {
      return;
    }

    if (!pullStartY) {
      if (!window.scrollY) {
        pullStartY = e.touches[0].screenY;
      }
    } else {
      pullMoveY = e.touches[0].screenY;
    }

    if (_state === 'pending') {
      ptrElement.classList.add(`${classPrefix}pull`);
      _state = 'pulling';
      _update();
    }

    if (pullStartY && pullMoveY) {
      dist = pullMoveY - pullStartY;
    }

    if (dist > 0) {
      e.preventDefault();

      ptrElement.style[_SETTINGS.cssProp] = `${distResisted}px`;

      distResisted = resistanceFunction(dist / distTreshold)
        * Math.min(distMax, dist);

      if (_state === 'pulling' && distResisted > distTreshold) {
        ptrElement.classList.add(`${classPrefix}release`);
        _state = 'releasing';
        _update();
      }

      if (_state === 'releasing' && distResisted < distTreshold) {
        ptrElement.classList.remove(`${classPrefix}release`);
        _state = 'pulling';
        _update();
      }
    }
  });

  window.addEventListener('touchend', () => {
    const {
      ptrElement, onRefresh, refreshTimeout, distTreshold, distReload,
    } = _SETTINGS;

    if (_state === 'releasing' && distResisted > distTreshold) {
      _state = 'refreshing';

      ptrElement.style[_SETTINGS.cssProp] = `${distReload}px`;
      ptrElement.classList.add(`${classPrefix}refresh`);

      _timeout = setTimeout(() => {
        const retval = onRefresh(onReset);

        if (retval && typeof retval.then === 'function') {
          retval.then(onReset);
        }

        if (!retval && !onReset.length) {
          onReset();
        }
      }, refreshTimeout);
    } else {
      _state = 'pending';

      ptrElement.style[_SETTINGS.cssProp] = '0px';
    }

    _update();

    ptrElement.classList.remove(`${classPrefix}release`);
    ptrElement.classList.remove(`${classPrefix}pull`);

    pullStartY = pullMoveY = null;
    dist = distResisted = 0;
  });
}

function _run() {
  const {
    mainElement, getMarkup, getStyles, classPrefix,
  } = _SETTINGS;

  if (!_SETTINGS.ptrElement) {
    const ptr = document.createElement('div');

    if (mainElement !== document.body) {
      mainElement.parentNode.insertBefore(ptr, mainElement);
    } else {
      document.body.insertBefore(ptr, document.body.firstChild);
    }

    ptr.classList.add(`${classPrefix}ptr`);
    ptr.innerHTML = getMarkup()
      .replace(/__PREFIX__/g, classPrefix);

    _SETTINGS.ptrElement = ptr;
  }

  const styleEl = document.createElement('style');

  styleEl.innerText = getStyles()
    .replace(/__PREFIX__/g, classPrefix)
    .replace(/\s+/g, ' ');

  document.head.appendChild(styleEl);
}

export default {
  init(options = {}) {
    Object.keys(_defaults).forEach((key) => {
      _SETTINGS[key] = options[key] || _defaults[key];
    });

    if (typeof _SETTINGS.mainElement === 'string') {
      _SETTINGS.mainElement = document.querySelector(_SETTINGS.mainElement);
    }

    if (typeof _SETTINGS.ptrElement === 'string') {
      _SETTINGS.ptrElement = document.querySelector(_SETTINGS.ptrElement);
    }

    if (!_setup) {
      _setupEvents();
      _setup = true;
    }

    _run();
  },
};
