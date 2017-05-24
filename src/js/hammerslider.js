function HammerSlider(_this, options) {
  'use strict';

  // Main declarations
  let slider = {
      slides: [],
      dots: []
    },
    slidePercentWidths = [],
    stopPositions = [],
    flipPoints = {},
    slideIndex = 0,
    nrOfSlides = 0,
    nrOfClones = 0,
    currentSlideNr = 0,
    prefixedTransform,
    u; // Utilities


  // Default options
  const o = {
    slideShow: false,
    slideInterval: 5000,
    slideSpeed: 50,
    touchSpeed: 50,
    startSlide: 0,
    dragThreshold: 10,
    minimumDragDistance: 30,
    stopAfterInteraction: true,
    rewind: false,
    dots: false,
    mouseDrag: false,
    dotContainer: undefined,
    slideContainer: undefined,
    beforeSlideChange: undefined,
    afterSlideChange: undefined,
    onSetup: undefined,
    cssPrefix: 'c-slider'
  };


  // Merge user options into defaults
  options && mergeObjects(o, options);


  // Class names
  const classes = {
    dotWrap: `${o.cssPrefix}__dots`,
    dotItem: `${o.cssPrefix}__dot`,
    dotActiveClass: `${o.cssPrefix}__dot--is-active`,
    dragging: `${o.cssPrefix}__container--is-dragging`,
    mouseDrag: `${o.cssPrefix}__container--mouse-drag-enabled`
  };


  function mergeObjects(target, source) {
    for (let key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
  }


  function addEvent(el, event, func, bool) {
    el && el.addEventListener(event, func, !!bool);
  }


  function addClass(el, className) {
    el && el.classList.add(className);
  }


  function removeClass(el, className) {
    el && el.classList.remove(className);
  }


  function transform(el, value, type) {
    const translate = type || 'X'
    if (!type) {
      el.style[prefixedTransform] = `translateX(${value}%)`;
    } else {
      el.style[prefixedTransform] = `translate3d(${value}%, 0, 0)`;
    }

  }


  function getSupport(property) {
    const prefixes = ['', '-webkit-', '-moz-', '-ms-', '-o-'],
      div = document.createElement('div');

    for (let i in prefixes) {
      if (typeof div.style[prefixes[i] + property] !== 'undefined') {
        return prefixes[i] + property;
      }
    }
    return false;
  }


  function forEachSlide(callback) {
    // Pass slider object as context for "this" in loop since looping
    // slides will involve making changes to slider elements of some sort.
    for (let i = 0; i < nrOfSlides; i++) {
      callback.call(slider, i);
    }
  }


  function getCurrentPosition() {
    // Gets current translateX value for slider container.
    const transform = window.getComputedStyle(slider.container, null).getPropertyValue(prefixedTransform);
    const matrixType = transform.match('matrix3d') ? 12 : 4;

    return parseFloat(transform.split(',')[matrixType]);
  }


  function makeUtilities() {
    return {
      getNextSlideNr: o.rewind ? getNextRewindSlideNr : getNextSlideNr,
      getRelativeSlideNr: nrOfClones ? getRelativeCloneNr : getRelativeSlideNr,
      nrSlidesInPercent: nrOfSlides * 100,
      lastSlide: nrOfSlides - 1,
      isLastSlide: function(nr) {
        return nr === this.lastSlide;
      }
    };
  }


  function setupSlider(startSlide) {
    const pos = startSlide ? Math.abs(startSlide) : o.startSlide;
    slideIndex = pos;
    currentSlideNr = pos;
    slider.width = _this.offsetWidth;

    if (!o.rewind) {
      // Flip points will be the breakpoints for slide flipping used to make
      // an infinite carousel effect. Flip points will always be set halfway
      // through a slide transition to get rid of flicking when slide speed is
      // not fast enough to hide it. 1 is forward and -1 is backward.
      flipPoints['1'] = {
        slide: !pos ? u.lastSlide : 0,
        flipPoint: (u.isLastSlide(pos) ? pos - 1 : pos) * (100 / nrOfSlides) * -1 + (100 / nrOfSlides) * -0.5,
        toPos: !pos ? 0 : u.nrSlidesInPercent
      };

      flipPoints['-1'] = {
        slide: u.isLastSlide(pos) ? 0 : !pos ? u.lastSlide - 1 : u.lastSlide,
        flipPoint: pos * (100 / nrOfSlides) * -1 + (100 / nrOfSlides) * 0.5,
        toPos: u.isLastSlide(pos) ? 0 : u.nrSlidesInPercent * -1
      };
    }

    const slideWidths = [];

    forEachSlide(function(i) {
      const slideWidth = Math.round((this.slides[i].offsetWidth / _this.offsetWidth) * 100) / 100; // round to two decimals
      slideWidths.push(slideWidth * 100);

      let slidePosition = 0;

      if (!o.rewind) {
        // Position slides so there's always one slide before current
        // and one after for the infinite carousel effect.
        if (!i && u.isLastSlide(pos)) {
          slidePosition = u.nrSlidesInPercent;
        } else if (u.isLastSlide(i) && !pos) {
          slidePosition = u.nrSlidesInPercent * -1;
        }
      }

      this.slides[i].style.width = `${100 / nrOfSlides}%`;
      transform(this.slides[i], slidePosition);

      setActiveDot(pos);
    });

    const totalWidth = slideWidths.reduce((prevWidth, currentWidth) => prevWidth + currentWidth);
    slider.container.style.width = `${totalWidth}%`;

    const containerWidthOfWrapper = (100 / totalWidth) * 100;

    // Calculate stopPositions
    let totalPosition = 0;
    forEachSlide(function(i) {
      const baseSlidePosition = containerWidthOfWrapper - (100 / nrOfSlides);
      const finalPosition = baseSlidePosition / 2;

      if (i > 0) {
        totalPosition -= (100 / nrOfSlides);
      } else {
        totalPosition = finalPosition;
      }

      stopPositions.push(totalPosition);
    });

    transform(slider.container, stopPositions[pos], '3d');
  }


  function hasReachedFlipPoint(position) {
    const forwardFlip = flipPoints[1].flipPoint,
      backwardFlip = flipPoints[-1].flipPoint;
    // Return direction if forward or backward flip point has passed
    return position < forwardFlip ? 1 : position > backwardFlip ? -1 : false;
  }


  function flip(direction) {
    if (!direction) return;

    const opposite = direction > 0 ? -1 : 1,
      currFlip = flipPoints[direction];

    transform(slider.slides[currFlip.slide], currFlip.toPos);
    mergeObjects(flipPoints[opposite], {
      flipPoint: currFlip.flipPoint,
      slide: currFlip.slide,
      toPos: currFlip.toPos + u.nrSlidesInPercent * opposite
    });
    currFlip.flipPoint += (100 / nrOfSlides) * opposite;

    if (updateFlipSlide(currFlip, direction)) {
      currFlip.toPos += u.nrSlidesInPercent * direction;
    }
  }


  function updateFlipSlide(obj, direction) {
    switch (direction) {
      case 1:
        obj.slide = u.isLastSlide(obj.slide) ? 0 : ++obj.slide;
        return !obj.slide;
      case -1:
        obj.slide = !obj.slide ? u.lastSlide : --obj.slide;
        return u.isLastSlide(obj.slide);
    }
  }


  function getNextSlideNr(direction) {
    return slideIndex + direction;
  }


  function getNextRewindSlideNr(direction) {
    // Change direction if rewind is true and it's the first
    // slide moving backward or last slide moving forward.
    if (direction > 0) {
      if (u.isLastSlide(currentSlideNr)) {
        return 0;
      }
    } else if (!currentSlideNr) {
        return u.lastSlide;
    }
    // Default: move to given direction
    return currentSlideNr + direction;
  }


  function getRelativeSlideNr(slideNr) {
    // To get next slide number relative to current position the offset from
    // base position needs to be calculated, since flipping slides causes
    // offsets for slideIndex when the infinite carousel effect is used.
    const currPos = getCurrentPosition(),
      currIndex = Math.ceil(currPos / slider.width),
      offsetCount = Math.ceil(currIndex / nrOfSlides),
      next = Math.abs(offsetCount * nrOfSlides - slideNr);

    return currPos > 0 ? next * -1 : next;
  }


  function getRelativeCloneNr(slideNr) {
    const currPos = getCurrentPosition() / slider.width,
      currIndex = (currPos < 0) ? Math.ceil(Math.abs(currPos)) : Math.floor(currPos * -1),
      isEven = !(Math.abs(currIndex % nrOfSlides) % 2),
      next = isEven && slideNr ? 1 : !isEven && !slideNr ? -1 : 0;

    return currIndex + next;
  }


  function setPosition(nextSlide, relative) {
    let next = relative ? u.getRelativeSlideNr(nextSlide) : nextSlide;

    // Stop slideshow whenever interaction has occured before taking action.
    stopSlideshow();


    const slideDistance = next * (100 / nrOfSlides) * -1 + stopPositions[0];
    slideIndex = next;
    // API Callback
    //o.beforeSlideChange && o.beforeSlideChange(activeSlide);

    slide(slideDistance);
  }


  let addToPosition = false;
  let subtractPosition = false;

  function slide(slideDistance) {
    let slideSpeed = o.slideSpeed,
      currPos = getCurrentPosition() / slider.container.offsetWidth * 100,
      start = currPos,
      change = slideDistance - start,
      currentTime = 0,
      increment = 20;

    function animate() {
      // Sliding ended
      if (currentTime > slideSpeed) {
        //setupSlider(currentSlideNr);
        //shouldResumeSlideshow(autoSlide);
        //o.afterSlideChange && o.afterSlideChange();
      }
      // Else
      else {
        !o.rewind && flip(hasReachedFlipPoint(currPos));

        currPos = easeOutQuint(currentTime, start, change, slideSpeed);
        currentTime += increment;
        transform(slider.container, currPos, '3d');
        // Recursively call RAF until slide distance is met
        slider.animationFrame = requestAnimationFrame(animate);
      }
    }
    // Init RAF recursion
    slider.animationFrame = requestAnimationFrame(animate);
  }


  // try quint easing
  function easeOutQuint(t, b, c, d) {
      t /= d;
      t--;
      return c*(t*t*t*t*t + 1) + b;
  };


  function startSlideshow() {
    slider.autoTimeOut = setTimeout(() => setPosition(u.getNextSlideNr(1), false, false, true), o.slideInterval);
  }


  function stopSlideshow() {
    cancelAnimationFrame(slider.animationFrame);
    clearTimeout(slider.autoTimeOut);
  }


  function shouldResumeSlideshow(autoSlide) {
    (o.slideShow && !o.stopAfterInteraction || autoSlide) && startSlideshow();
  }


  function move(direction) {
    currentSlideNr = getNextRewindSlideNr(direction);
    setPosition(u.getNextSlideNr(direction));
  }


  function next() {
    move(1);
  }


  function prev() {
    move(-1);
  }


  function setActiveDot(active) {
    if (o.dots) {
      removeClass(slider.dotWrap.querySelector(`.${classes.dotActiveClass}`), classes.dotActiveClass);
      addClass(slider.dots[!nrOfClones ? active : Math.abs(slideIndex % (nrOfSlides - nrOfClones))], classes.dotActiveClass);
    }
  }


  function onWidthChange() {
    //stopSlideshow();
    //shouldResumeSlideshow();
  }


  function touchInit() {
    let startPos,
      currPos,
      currentSlide;

    TouchEvents(slider.container, {
      mouse: o.mouseDrag,
      dragThreshold: o.dragThreshold,
      // Pass touch state actions
      start: (event) => {
        stopSlideshow();
        startPos = getCurrentPosition() / slider.container.offsetWidth * 100;
        currentSlide = slideIndex % nrOfSlides;
        // Add drag class
        addClass(slider.container, classes.dragging);
      },
      move: (event, direction, diff) => {
        if (direction === 'left' || direction === 'right') {
          const horizontalDiff = diff.X / slider.container.offsetWidth * 100;
          // Calculate changed position
          currPos = startPos + horizontalDiff;

          if (!o.rewind) {
            flip(hasReachedFlipPoint(currPos));
          } else if (!currentSlide && direction === 'right' || u.isLastSlide(currentSlide) && direction === 'left') {
            // Resist dragging if it's first slide
            // or last and if rewind is true
            currPos = startPos + (diff.X / 2.5);
          }
          transform(slider.container, currPos);
        }
      },
      end: (event, direction, diff) => {
        let targetSlide = slideIndex;

        // Only set new target slide if drag exceeds minimum drag distance
        if (Math.abs(diff.X) > o.minimumDragDistance) {
          if (direction === 'left') {
            targetSlide = o.rewind && u.isLastSlide(currentSlide) ? u.lastSlide : u.getNextSlideNr(1);
          } else if (direction === 'right') {
            targetSlide = o.rewind && !currentSlide ? 0 : u.getNextSlideNr(-1);
          }
        }
        setPosition(targetSlide, false, o.touchSpeed);
        // Remove drag class
        removeClass(slider.container, classes.dragging);
      }
    });
  }


  function setup() {
    const dotFrag = document.createDocumentFragment();
    slider.container = o.slideContainer || _this.children[0];
    nrOfSlides = slider.container.children.length;
    prefixedTransform = getSupport('transform');

    // Only set widths if one slide is provided or
    // transform is not supported in browser and bail.
    if (nrOfSlides <= 1 || !prefixedTransform) {
      forEachSlide(function(i) {
        this.container.children[i].style.width = '100%';
        this.container.style.width = `${nrOfSlides * 100}%`;
      });
      // Remove hardware acceleration if transform is supported
      prefixedTransform && transform(slider.container, 0);
      return;
    }

    // Special case: Add 2 clones if slider only has 2
    // slides and the infinite carousel effect is used.
    if (!o.rewind && nrOfSlides === 2) {
      const container = slider.container,
        children = container.children;
      container.appendChild(children[0].cloneNode(1));
      container.appendChild(children[nrOfSlides - 1].cloneNode(1));
      nrOfSlides += 2;
      nrOfClones = 2;
    }

    // Make utilities
    u = makeUtilities();
    // Round slide speed to nearest 10th to work with raf animation loop design
    o.slideSpeed = o.slideSpeed < 2 ? 2 : Math.ceil(o.slideSpeed / 10) * 10;


    forEachSlide(function(i) {
      // Cache slides
      this.slides.push(this.container.children[i]);

      // Prevent slider from breaking when tabbing during slide
      // transition which alters scrollLeft. Set scrollLeft to
      // 0 and slide to focused slide instead.
      addEvent(this.slides[i], 'focus', (e) => {
        stopSlideshow();
        _this.scrollLeft = 0;
        setPosition(i);
      }, true);

      if (o.dots) {
        const newDot = document.createElement('li');

        ((dot, nr) => {
          // Don't create dots for clones
          if (nr >= nrOfSlides - nrOfClones) return;

          // Make dots tabbable with "tabindex"
          addClass(dot, classes.dotItem);
          dot.setAttribute('tabindex', 0);
          dot.setAttribute('role', 'button');

          dot.innerHTML = '<span></span>';

          // Remove outlines from dots when clicked
          addEvent(dot, 'click', (e) => {
            setPosition(nr, true);
            //dot.blur();
          });

          // Don't remove outlines when tabbing and Enter
          // key is used to navigate with dots.
          addEvent(dot, 'keyup', (e) => {
            e.keyCode === 13 && setPosition(nr, true);
          });

          dotFrag.appendChild(dot);
        })(newDot, i);

        // Cache dots
        this.dots.push(newDot);

        // Add dots to slider or given dotContainer element
        if (u.isLastSlide(i)) {
          this.dotWrap = o.dotContainer || document.createElement('ul');
          this.dotWrap.appendChild(dotFrag);

          // Only add classname to dot container and
          // append it to slider if it's generated
          if (!o.dotContainer) {
            addClass(this.dotWrap, classes.dotWrap);
            _this.appendChild(this.dotWrap);
          }
        }
      }
    });

    // Listen for window resize events
    addEvent(window, 'resize', onWidthChange);
    addEvent(window, 'orientationchange', onWidthChange);

    // Listen for touch events
    touchInit();
    setupSlider();

    o.mouseDrag && addClass(slider.container, classes.mouseDrag);
    o.slideShow && startSlideshow();

    // API Callback after setup, expose API first with timeout
    o.onSetup && setTimeout(() => o.onSetup(nrOfSlides), 0);
  }


  // Init
  setup();


  // Expose slider API
  return {
    next,
    prev,
    stop: stopSlideshow,
    start: startSlideshow,
    setupSlider: (slideNr) => setupSlider(slideNr),
    moveTo: (slideNr, speed) => setPosition(slideNr, true, speed)
  };
}
