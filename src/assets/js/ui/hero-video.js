/**
 * hero-video.js — Apple 风格渐进增强视频播放
 *
 * 两种模式：
 *   data-hero-video-mode="auto"   (默认) 页面加载后进入视口 → 自动播放一次
 *   data-hero-video-mode="manual"         只通过用户点击播放
 *
 * 行为规则：
 *   1. 音频始终默认静音，仅静音按钮可切换。暂停/恢复不会动声音。
 *   2. 自动模式(auto)：页面加载后首次可见时自动播放一次。
 *      之后划出视口→暂停，划回→不恢复（需用户手动点击）。
 *   3. 手动模式(manual)：不自动播放，始终显示播放按钮等待点击。
 *      划出视口→暂停，划回→不恢复。
 *   4. 播放中 `data-hero-video-playing="true"` → CSS 控制各种元素显隐。
 *   5. 相同页面内同时只允许一个视频播放（互斥）。
 *
 * DOM 结构要求：
 *   <div data-hero-video>
 *     <img class="hero-video-poster" ... />
 *     <video class="hero-video-player" ... />
 *     <div class="hero-video-overlay">     ← 静音按钮等
 *       <button class="hero-video-mute">...</button>
 *       <button class="hero-video-playbtn">...</button>
 *       <button class="hero-video-fallback-btn">...</button>
 *     </div>
 *     <div class="hero-video-info" ...>    ← 浮层信息卡片
 *     </div>
 *   </div>
 */
(function () {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  var ATTR = "data-hero-video";
  var CROSSFADE_MS = 1500;

  /* ── 全局活跃视频跟踪（互斥播放） ── */
  var _activeInstances = [];

  function pauseAllExcept(exceptState) {
    for (var i = 0; i < _activeInstances.length; i++) {
      var inst = _activeInstances[i];
      if (inst.state !== exceptState && inst.state.isPlaying) {
        inst.video.pause();
      }
    }
  }

  /* ── 初始化所有 hero-video 容器 ── */
  function init() {
    _activeInstances = [];
    var containers = document.querySelectorAll("[" + ATTR + "]");
    if (!containers.length) return;
    for (var i = 0; i < containers.length; i++) {
      setupContainer(containers[i]);
    }
  }

  /* ── 设置单个容器 ── */
  function setupContainer(container) {
    var poster = container.querySelector(".hero-video-poster");
    var video = container.querySelector(".hero-video-player");
    var overlay = container.querySelector(".hero-video-overlay");
    var muteBtn = container.querySelector(".hero-video-mute");
    var playBtn = container.querySelector(".hero-video-playbtn");

    if (!video || !poster) return;

    // Upgrade preload from "none" to "auto" when visible — saves bandwidth on SPA nav
    if (video.getAttribute("preload") === "none") {
      video.setAttribute("preload", "auto");
    }

    var isManual = container.getAttribute("data-hero-video-mode") === "manual";

    /* 初始化：关闭原生 controls，由 JS 统一管理 */
    video.controls = false;
    /* ── 状态 ── */
    var state = {
      hasStarted: false, // 是否首次播放（控制 crossfade 只执行一次）
      hasAutoPlayed: false, // 是否已自动播放过（auto 模式初始行为，永不重置）
      isPlaying: false,
      isMuted: true,
      savedTime: 0,
      observer: null,
      crossfadeTimer: null,
      failed: false,
      pausedByScroll: false,
      _scrollTimer: null,
    };

    var fallbackBtn = container.querySelector(".hero-video-fallback-btn");

    /* ── 无视频 src → 降级 ── */
    if (!video.getAttribute("src")) {
      state.failed = true;
      showFallback(container, poster, video, overlay, playBtn);
      _activeInstances.push({ state: state, video: video });
      return;
    }

    /* ── 确保播放按钮存在（居中）── */
    if (!playBtn) {
      // Reuse fallback-btn as playBtn if it exists (most SSG pages use this)
      if (fallbackBtn) {
        playBtn = fallbackBtn;
        playBtn.classList.add("hero-video-playbtn");
      } else {
        playBtn = document.createElement("button");
        playBtn.className = "hero-video-playbtn";
        playBtn.setAttribute("aria-label", "Play video");
        playBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
        container.appendChild(playBtn);
      }
    }

    /* ── 更新播放按钮外观 ── */
    function updatePlayBtn(isPlaying, isEnded) {
      console.log(
        "[hv] updatePlayBtn: isPlaying=" +
          isPlaying +
          " isEnded=" +
          isEnded +
          " playBtn=" +
          !!playBtn +
          " playBtn.className=" +
          (playBtn ? playBtn.className : "N/A")
      );
      if (!playBtn) return;
      if (isPlaying) {
        playBtn.style.display = "flex";
        playBtn.innerHTML = '<span class="material-symbols-outlined">pause</span>';
        playBtn.setAttribute("aria-label", "Pause video");
      } else if (isEnded) {
        playBtn.style.display = "flex";
        playBtn.innerHTML = '<span class="material-symbols-outlined">replay</span>';
        playBtn.setAttribute("aria-label", "Replay video");
        // Restore overlay visibility when video ends
        if (overlay) {
          overlay.style.opacity = "1";
          overlay.style.transition = "opacity 0.2s ease";
        }
      } else {
        playBtn.style.display = "flex";
        playBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
        playBtn.setAttribute("aria-label", "Play video");
        // Restore overlay visibility when paused
        if (overlay) {
          overlay.style.opacity = "1";
          overlay.style.transition = "opacity 0.2s ease";
        }
      }
    }

    /* ── 播放（统一入口） ── */
    function doPlay() {
      if (state.failed) return;

      /* 互斥：暂停其他视频 */
      pauseAllExcept(state);

      /* 确保视频可见（crossfadeToPoster 可能设了 display:none） */
      video.style.display = "";
      video.style.opacity = "1";

      /* 播放 */
      video.muted = state.isMuted;

      var promise = video.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(function (err) {
          console.warn("[hero-video] play() rejected:", err.message);
          state.failed = true;
          showFallback(container, poster, video, overlay, playBtn);
        });
      }
    }

    /* ── 自动模式首次播放 ── */
    function triggerAutoPlay() {
      if (state.failed || state.hasAutoPlayed) return;
      state.hasAutoPlayed = true;
      doPlay();
    }

    /* ── 播放按钮点击 ── */
    if (playBtn) {
      playBtn.addEventListener("click", function (e) {
        e.stopPropagation();

        if (state.isPlaying) {
          /* 正在播放 → 暂停 */
          state.pausedByScroll = false;
          video.pause();
          if (state.crossfadeTimer) {
            clearTimeout(state.crossfadeTimer);
            state.crossfadeTimer = null;
          }
        } else if (state.failed) {
          /* 视频之前出错 → 重试 */
          state.failed = false;
          state.pausedByScroll = false;
          video.muted = state.isMuted;
          doPlay();
        } else {
          /* 暂停/停止状态 → 恢复或首次播放 */
          state.pausedByScroll = false;
          if (state.hasStarted || state.savedTime > 0) {
            video.currentTime = state.savedTime;
          }
          doPlay();
        }
      });
    }

    /* ── poster 加载失败 → auto 模式尝试播放 ── */
    poster.addEventListener("error", function () {
      if (!isManual && !state.failed) {
        triggerAutoPlay();
      }
    });

    /* ── poster 加载成功 → 设置 Observer ── */
    function afterPosterReady() {
      setupObserver();
      updatePlayBtn(false, false);
    }

    poster.addEventListener("load", afterPosterReady);
    if (poster.complete && poster.naturalWidth > 0) {
      afterPosterReady();
    }

    /* ════════════════════════════════════════
       IntersectionObserver
       仅处理「划出视口 → 暂停」
       不处理「划入视口 → 播放」
      （auto 模式首次播放由页面加载时的初始检测触发）
       ════════════════════════════════════════ */
    function setupObserver() {
      if (state.observer) return;

      var ROOT_MARGIN = "-20% 0px -20% 0px";

      state.observer = new IntersectionObserver(
        function (entries) {
          var entry = entries[0];
          var ratio = entry.intersectionRatio;

          /* ── 不可见 → 暂停 ── */
          if (!entry.isIntersecting || ratio === 0) {
            if (state.isPlaying) {
              state.savedTime = video.currentTime;
              state.pausedByScroll = true;
              video.pause();
            }
            if (state.crossfadeTimer) {
              clearTimeout(state.crossfadeTimer);
              state.crossfadeTimer = null;
            }
            return;
          }

          /* ── 可见 → 如果之前因滚动暂停，恢复播放 ── */
          if (state.pausedByScroll) {
            state.pausedByScroll = false;
            if (state.savedTime > 0) {
              video.currentTime = state.savedTime;
            }
            if (!video.ended) {
              doPlay();
            }
            return;
          }

          /* ── 可见 — 尚未播放过 → 自动播 ── */
          if (state.hasStarted || state.hasAutoPlayed || isManual) return;
          if (state.isPlaying || state.failed) return;

          if (state.crossfadeTimer) clearTimeout(state.crossfadeTimer);
          state.crossfadeTimer = setTimeout(function () {
            if (state.hasAutoPlayed || state.hasStarted || state.failed) return;
            triggerAutoPlay();
          }, CROSSFADE_MS);
        },
        {
          rootMargin: ROOT_MARGIN,
          threshold: [0, 0.5, 1.0],
        }
      );

      state.observer.observe(container);
    }

    /* ════════════════════════════════════════
       Crossfade 动画
       ════════════════════════════════════════ */
    function crossfadeToVideo() {
      poster.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
      poster.style.opacity = "0";
      poster.style.pointerEvents = "none";

      video.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
      video.style.opacity = "1";

      container.setAttribute("data-hero-video-playing", "true");
    }

    function crossfadeToPoster() {
      poster.style.display = "";
      void poster.offsetHeight;

      poster.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
      poster.style.opacity = "1";
      poster.style.pointerEvents = "";

      video.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
      video.style.opacity = "0";

      container.removeAttribute("data-hero-video-playing");

      setTimeout(function () {
        video.style.display = "none";
      }, CROSSFADE_MS);
    }

    /* ── 视频事件 ── */
    video.addEventListener("play", function () {
      state.isPlaying = true;

      if (!state.hasStarted) {
        /* 首次播放 → crossfade */
        state.hasStarted = true;
        crossfadeToVideo();
      }

      container.setAttribute("data-hero-video-playing", "true");
      updatePlayBtn(true, false);
      autoHideControls();
    });

    video.addEventListener("pause", function () {
      state.isPlaying = false;
      container.removeAttribute("data-hero-video-playing");

      if (video.ended) {
        state.hasStarted = false;
        state.savedTime = 0;
        crossfadeToPoster();
        updatePlayBtn(false, true);
      } else {
        state.savedTime = video.currentTime;
        updatePlayBtn(false, false);
      }
    });

    video.addEventListener("ended", function () {
      /* loop 视频自动重播，不 crossfade 回 poster */
      if (video.loop) {
        return;
      }
      state.isPlaying = false;
      state.hasStarted = false;
      state.pausedByScroll = false;
      state.savedTime = 0;
      container.removeAttribute("data-hero-video-playing");
      crossfadeToPoster();
      updatePlayBtn(false, true);
    });

    video.addEventListener("error", function () {
      state.failed = true;
      state.hasStarted = false;
      showFallback(container, poster, video, overlay, playBtn);
    });

    /* ── 静音按钮（右上角 overlay 中）── */
    if (muteBtn) {
      muteBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        state.isMuted = !state.isMuted;
        video.muted = state.isMuted;
        muteBtn.innerHTML = state.isMuted
          ? '<span class="material-symbols-outlined text-white text-xl">volume_off</span>'
          : '<span class="material-symbols-outlined text-white text-xl">volume_up</span>';
        muteBtn.setAttribute("data-i18n", state.isMuted ? "hero_video_mute" : "hero_video_unmute");
      });

      // 全屏按钮（右上角，mute 旁边）
      if (overlay && !container.querySelector(".hero-video-fullscreen")) {
        var fullscreenBtn = document.createElement("button");
        fullscreenBtn.className = "hero-video-fullscreen";
        fullscreenBtn.setAttribute("aria-label", "Fullscreen");
        fullscreenBtn.innerHTML = '<span class="material-symbols-outlined text-white text-xl">fullscreen</span>';
        fullscreenBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else if (container.requestFullscreen) {
            container.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          }
        });
        overlay.appendChild(fullscreenBtn);
      }
    }

    /* ── Container 点击 → toggle play/pause ── */
    container.addEventListener("click", function (e) {
      // Ignore clicks on mute/fullscreen buttons (they have their own handlers)
      if (e.target.closest(".hero-video-mute, .hero-video-fullscreen")) return;
      console.log(
        "[hv] container.click: state.isPlaying=" +
          state.isPlaying +
          " target=" +
          (e.target.className || e.target.tagName) +
          " id=" +
          e.target.id
      );
      e.stopPropagation();
      if (state.isPlaying) {
        state.pausedByScroll = false;
        video.pause();
      } else {
        state.pausedByScroll = false;
        if (state.hasStarted || state.savedTime > 0) video.currentTime = state.savedTime;
        doPlay();
      }
    });

    /* ── 点击 poster 触发播放 ── */
    poster.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!state.isPlaying) {
        state.pausedByScroll = false;
        if (state.hasStarted || state.savedTime > 0) {
          video.currentTime = state.savedTime;
        }
        doPlay();
      }
    });

    /* ── 点击 video 切换播放/暂停（不切换音频） ── */
    var _videoClickTimer = null;
    video.addEventListener("click", function (e) {
      e.stopPropagation();
      // Ignore clicks that originate from native controls (they handle pause/play themselves)
      if (_videoClickTimer) {
        console.log("[hv] video.click: SUPPRESSED (native control click)");
        clearTimeout(_videoClickTimer);
        _videoClickTimer = null;
        return;
      }
      if (state.isPlaying) {
        state.pausedByScroll = false;
        video.pause();
      } else {
        if (state.hasStarted || state.savedTime > 0) {
          video.currentTime = state.savedTime;
        }
        doPlay();
      }
    });
    // When native controls trigger pause/play, suppress the next video click
    video.addEventListener("pause", function () {
      _videoClickTimer = setTimeout(function () {
        _videoClickTimer = null;
      }, 300);
    });
    video.addEventListener("play", function () {
      _videoClickTimer = setTimeout(function () {
        _videoClickTimer = null;
      }, 300);
    });

    /* ── Mobile: tap to toggle controls + playBtn visibility ── */
    container.addEventListener("touchstart", function (e) {
      // Don't interfere with scroll/swipe gestures
      if (e.touches.length > 1) return;
      console.log("[hv] container.touchstart: state.isPlaying=" + state.isPlaying + " isTouch=" + isTouchDevice());
      showControls();
      // Show native controls when playing, hide when paused
      video.controls = state.isPlaying;
      if (state.isPlaying) autoHideControls();
      else if (_hideBtnTimer) {
        clearTimeout(_hideBtnTimer);
        _hideBtnTimer = null;
      }
    });

    /* ── PC hover 显示原生 controls + playBtn ── */
    var _hideBtnTimer = null;

    function showControls() {
      if (playBtn) {
        playBtn.style.opacity = "1";
        playBtn.style.transition = "opacity 0.2s ease";
      }
      if (overlay) {
        overlay.style.opacity = "1";
        overlay.style.transition = "opacity 0.2s ease";
      }
      var fb = container.querySelector(".hero-video-fallback-btn");
      if (fb && !state.isPlaying) {
        fb.style.opacity = "1";
        fb.style.transition = "opacity 0.2s ease";
      }
      if (_hideBtnTimer) {
        clearTimeout(_hideBtnTimer);
        _hideBtnTimer = null;
      }
    }

    function autoHideControls() {
      if (!state.isPlaying) return;
      // Don't auto-hide on touch devices — user should always see controls
      if (isTouchDevice()) return;
      if (_hideBtnTimer) clearTimeout(_hideBtnTimer);
      _hideBtnTimer = setTimeout(function () {
        if (!state.isPlaying) return;
        if (playBtn) playBtn.style.opacity = "0";
        if (overlay) overlay.style.opacity = "0";
        var fb = container.querySelector(".hero-video-fallback-btn");
        if (fb) fb.style.opacity = "0";
      }, 2000);
    }

    function isTouchDevice() {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    }

    container.addEventListener("mousemove", function () {
      if (state.isPlaying) {
        showControls();
        autoHideControls();
      }
    });

    container.addEventListener("mouseenter", function () {
      if (state.isPlaying) {
        video.controls = true;
        showControls();
      }
    });
    container.addEventListener("mouseleave", function () {
      video.controls = false;
      if (state.isPlaying) autoHideControls();
    });

    /* ── 注册到全局 ── */
    _activeInstances.push({ state: state, video: video });
  }

  /* ════════════════════════════════════════
     降级模式
     ════════════════════════════════════════ */
  function showFallback(container, poster, video, overlay, playBtn) {
    container.removeAttribute("data-hero-video-playing");

    if (poster) {
      poster.style.opacity = "1";
      poster.style.display = "";
      poster.style.pointerEvents = "";
    }
    if (video) {
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
    }
    // Keep overlay visible (mute + fullscreen buttons still useful)
    // Reset playBtn appearance (handles both .hero-video-playbtn and .hero-video-fallback-btn)
    if (playBtn) {
      playBtn.style.display = "flex";
      playBtn.style.opacity = "1";
      playBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
      playBtn.setAttribute("aria-label", "Play video");
    }

    var fb = container.querySelector(".hero-video-fallback-btn");
    if (fb && fb !== playBtn) {
      fb.style.display = "flex";
      fb.style.opacity = "1";
    }
  }

  /* ════════════════════════════════════════
     初始化
     ════════════════════════════════════════ */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // SPA navigation: pause and release all videos
  document.addEventListener("spa:load", function () {
    if (typeof pauseAllExcept === "function") {
      pauseAllExcept(null);
    }
    _activeInstances = [];
  });

  _spaOn(
    document,
    "spa:ready",
    function () {
      setTimeout(init, 100);
    },
    "spa:ready:init"
  );
})();
