const TURN = Math.PI * 2;
const ARROW_STEP = Math.PI / 12;
const BLOOM_MS = 3600;
const FRAME_MS = 1000 / 30;
const DRAG_THRESHOLD = 8;
const MAX_VELOCITY = .0045; // radians per millisecond
const FRICTION_MS = 190;
const FLICK_MIN = .0004; // radians per ms: a faster release than this sets the new turning direction

/** Owns the animation clock and input for one bouquet canvas. Supports swapping artwork without leaking listeners. */
export function createBouquetMotion(canvas, initialArtwork, options = {}) {
  let artwork = initialArtwork;
  let cruise = toCruise(options.spinSpeed);
  let direction = 1; // which way it turns by itself; a flick can reverse it
  let velocity = 0; // current turning speed (radians per ms); eases towards direction * cruise
  let active = false;
  let inView = false;
  let progress = 1;
  let angle = 0;
  let drag = null;
  let bloom = null;
  let dirty = false;
  let frame = null;
  let lastDraw = null;

  function toCruise(spinSpeed) {
    const speed = Number.isFinite(spinSpeed) ? Math.max(0, spinSpeed) : .35;
    return speed / 1000;
  }

  function setReady(ready) {
    canvas.tabIndex = ready ? 0 : -1;
    canvas.classList.toggle('is-turnable', ready);
    options.onReadyChange?.(ready);
  }

  function draw() {
    artwork.draw(angle, progress);
    dirty = false;
  }

  function schedule() {
    const turning = inView && !drag && (cruise > 0 || velocity !== 0); // it never rests, except off-screen
    const needsFrame = active && !document.hidden && (bloom || dirty || turning);
    if (needsFrame) {
      if (frame === null) {
        frame = requestAnimationFrame(tick);
      }
    } else if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }

  function completeBloom(notify) {
    const onComplete = bloom?.onComplete;
    bloom = null;
    progress = 1;
    draw();
    setReady(true);
    if (notify) {
      onComplete?.();
    }
    schedule();
  }

  function tick(now) {
    frame = null;
    const elapsed = lastDraw === null ? FRAME_MS : now - lastDraw;
    if (elapsed < FRAME_MS - 1) {
      schedule();
      return;
    }
    lastDraw = now;

    if (bloom) {
      progress = Math.max(0, (now - bloom.started) / bloom.duration);
      if (progress >= 1) {
        completeBloom(true);
        return;
      }
      if (inView || dirty) {
        draw();
      }
    } else {
      const delta = Math.min(elapsed, 80);
      if (inView && !drag) {
        // After a flick the speed eases back to the steady turn, so it never jerks.
        const target = direction * cruise;
        const decay = Math.exp(-delta / FRICTION_MS);
        angle = (angle + target * delta + (velocity - target) * FRICTION_MS * (1 - decay)) % TURN;
        velocity = target + (velocity - target) * decay;
        if (Math.abs(velocity - target) < .00002) velocity = target;
      }
      draw();
    }
    schedule();
  }

  function setAngle(nextAngle) {
    if (!active || bloom) {
      return;
    }
    angle = nextAngle % TURN; // used by the arrow keys; the bouquet carries on turning afterwards
    dirty = true;
    schedule();
  }

  function turnBy(stepDirection) {
    setAngle(angle - stepDirection * ARROW_STEP);
  }

  function clearDrag() {
    const pointerId = drag?.pointerId;
    drag = null;
    canvas.classList.remove('is-dragging');
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }

  function stop() {
    active = false;
    bloom = null;
    dirty = false;
    lastDraw = null;
    velocity = 0;
    clearDrag();
    setReady(false);
    schedule();
  }

  function setArtwork(nextArtwork, { spinSpeed } = {}) {
    artwork = nextArtwork;
    if (spinSpeed !== undefined) cruise = toCruise(spinSpeed);
  }

  function play({ instant = false, bloomMs = BLOOM_MS, onComplete } = {}) {
    stop();
    active = true;
    angle = 0;
    direction = 1;
    velocity = direction * cruise; // turns as soon as it has bloomed
    artwork.resize(canvas.clientWidth);
    if (instant) {
      completeBloom(false);
      onComplete?.();
      return;
    }
    bloom = { started: performance.now(), duration: Math.max(200, bloomMs), onComplete };
    progress = 0;
    draw();
    schedule();
  }

  canvas.addEventListener('keydown', event => {
    if (!active || bloom || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
      return;
    }
    event.preventDefault();
    turnBy(event.key === 'ArrowLeft' ? -1 : 1);
  });

  canvas.addEventListener('pointerdown', event => {
    if (!active || bloom || drag || !event.isPrimary || event.button !== 0) {
      return;
    }
    velocity = 0; // Catch the bouquet at its current angle, even during a fling.
    drag = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, horizontal: false,
      radiansPerPixel: Math.PI / Math.max(1, canvas.clientWidth),
    };
    schedule();
  });

  canvas.addEventListener('pointermove', event => {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }
    if (!drag.horizontal) {
      const horizontal = Math.abs(event.clientX - drag.startX);
      const vertical = Math.abs(event.clientY - drag.startY);
      if (Math.max(horizontal, vertical) < DRAG_THRESHOLD) {
        return;
      }
      if (vertical >= horizontal) {
        clearDrag();
        schedule();
        return;
      }
      drag.horizontal = true;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
    }

    const distance = (drag.lastX - event.clientX) * drag.radiansPerPixel;
    const elapsed = Math.max(4, event.timeStamp - drag.lastTime);
    drag.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, distance / elapsed));
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    angle = (angle + distance) % TURN;
    dirty = true;
    schedule();
  });

  function endDrag(event) {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }
    if (event.type === 'pointerup' && drag.horizontal && event.timeStamp - drag.lastTime < 90) {
      velocity = drag.velocity; // keep the flick's speed...
      if (Math.abs(velocity) > FLICK_MIN) direction = Math.sign(velocity); // ...and carry on the way it was flicked
    } else {
      velocity = 0; // let go slowly: ease back up to the steady turn
    }
    clearDrag();
    schedule();
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && !drag?.horizontal) {
      endDrag(event);
    }
  });

  new ResizeObserver(([entry]) => {
    if (!active || entry.contentRect.width === 0) {
      return;
    }
    artwork.resize(entry.contentRect.width);
    draw();
  }).observe(canvas);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    lastDraw = null;
    schedule();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    lastDraw = null;
    if (document.hidden) {
      clearDrag();
    }
    schedule();
  });

  return {
    play,
    stop,
    setArtwork,
    finish() { completeBloom(false); },
    setAngle,
    turnBy,
  };
}
