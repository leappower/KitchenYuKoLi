/**
 * hero-video.js — Apple 风格渐进增强视频播放
 *
 * 两种模式：
 *   自动播放模式（首页/关于/应用场景）：进入视口 → 1.5s 后 crossfade 到静音自动播放
 *   手动播放模式（产品子分类/Support）：点击播放按钮后才开始播放
 *
 * 音频策略：默认静音，仅静音按钮可切换。暂停/恢复不会自动开启声音。
 *
 * 播放按钮：iOS 风格圆形按钮，覆盖在 poster 上方。
 *   播放中 → 按钮隐藏
 *   暂停中 → 按钮显示（pause 图标）
 *   停止后 → 按钮显示（play 图标）
 *
 * data-hero-video-mode="manual"  → 不自动播放，显示播放按钮等待点击
 * data-hero-video-mode="auto"    → 进入视口自动播放（默认）
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

  /* ── 全局活跃视频跟踪（同一页面只允许1个播放） ── */
  var _activeInstances = [];

  function pauseAllExcept(currentState) {
    for (var i = 0; i < _activeInstances.length; i++) {
      var inst = _activeInstances[i];
      if (inst.state !== currentState && inst.state.isPlaying) {
        doPause(inst.video, inst.state);
      }
    }
  }

  /* ── 找到所有 hero-video 容器 ── */
  function init() {
    _activeInstances = [];
    var containers = document.querySelectorAll("[" + ATTR + "]");
    if (!containers.length) return;

    for (var i = 0; i < containers.length; i++) {
      setupContainer(containers[i]);
    }
  }

  function setupContainer(container) {
    var poster = container.querySelector(".hero-video-poster");
    var video = container.querySelector(".hero-video-player");
    var overlay = container.querySelector(".hero-video-overlay");
    var muteBtn = container.querySelector(".hero-video-mute");
    var playBtn = container.querySelector(".hero-video-playbtn");
    var info = container.querySelector(".hero-video-info");
    var fallbackBtn = container.querySelector(".hero-video-fallback-btn");

    if (!video || !poster) return;

    /* 判断模式: manual 或 auto（默认） */
    var mode = container.getAttribute("data-hero-video-mode") || "auto";
    var isManual = mode === "manual";

    var state = {
      hasStarted: false,
      isPlaying: false,
      isMuted: true,
      savedTime: 0,
      observer: null,
      crossfadeTimer: null,
      failed: false,
      userPaused: false,  // 用户手动暂停
    };

    /* ── 如果没有视频 src 或 src 为空，直接降级 ── */
    if (!video.getAttribute("src")) {
      state.failed = true;
      showFallback(container, video, poster, overlay, playBtn);
      _activeInstances.push({ state: state, video: video });
      return;
    }

    /* ── 创建播放按钮（如果 HTML 中没有） ── */
    if (!playBtn) {
      playBtn = document.createElement("button");
      playBtn.className = "hero-video-playbtn";
      playBtn.setAttribute("aria-label", "Play video");
      playBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
      if (overlay) {
        overlay.appendChild(playBtn);
      } else {
        container.appendChild(playBtn);
      }
    }

    /* ── 播放/暂停按钮状态更新 ── */
    function updatePlayBtn(isPlaying, isEnded) {
      if (!playBtn) return;
      if (isPlaying) {
        playBtn.style.display = "none";
      } else if (isEnded) {
        playBtn.style.display = "flex";
        playBtn.innerHTML = '<span class="material-symbols-outlined">replay</span>';
        playBtn.setAttribute("aria-label", "Replay video");
      } else {
        playBtn.style.display = "flex";
        playBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
        playBtn.setAttribute("aria-label", "Play video");
      }
    }

    /* ── 播放/暂停按钮点击 ── */
    if (playBtn) {
      playBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (state.isPlaying) {
          /* 暂停 */
          state.userPaused = true;
          video.pause();
          /* 清除自动播放定时器 */
          if (state.crossfadeTimer) {
            clearTimeout(state.crossfadeTimer);
            state.crossfadeTimer = null;
          }
        } else if (state.failed) {
          state.failed = false;
          video.muted = state.isMuted;
          doPlay(state, video, poster, overlay, playBtn, info);
        } else if (state.hasStarted || state.savedTime > 0) {
          /* 恢复播放 */
          state.userPaused = false;
          video.currentTime = state.savedTime;
          doPlay(state, video, poster, overlay, playBtn, info);
        } else {
          /* 首次播放（仅适用于 manual 模式） */
          state.userPaused = false;
          doPlay(state, video, poster, overlay, playBtn, info);
        }
      });
    }

    /* ── 封面图加载失败 → 尝试播放 ── */
    poster.addEventListener("error", function () {
      if (!isManual && !state.failed) {
        attemptAutoPlay(state, video, poster, overlay, playBtn, info);
      }
    });

    /* ── 封面图加载成功 → 设置 Observer ── */
    poster.addEventListener("load", function () {
      if (!isManual) {
        setupIntersection(state, container, video, poster, overlay, playBtn, info);
      }
      /* manual 模式：显示播放按钮，等待用户点击 */
      updatePlayBtn(false, false);
    });

    if (poster.complete && poster.naturalWidth > 0) {
      if (!isManual) {
        setupIntersection(state, container, video, poster, overlay, playBtn, info);
      }
      /* manual 模式：显示播放按钮 */
      updatePlayBtn(false, false);
    }

    /* ── 视频事件 ── */
    video.addEventListener("play", function () {
      state.isPlaying = true;
      if (!state.hasStarted) {
        state.hasStarted = true;
        crossfadeToVideo(video, poster, overlay, playBtn);
      }
      updatePlayBtn(true, false);
      /* PC hover 时显示原生 controls */
      if (overlay) overlay.style.pointerEvents = "auto";
      /* 覆盖 overlay 上的 pointer-events 恢复 (PC hover 逻辑) */
    });

    video.addEventListener("pause", function () {
      state.isPlaying = false;
      if (video.ended) {
        state.hasStarted = false;
        state.savedTime = 0;
        crossfadeToPoster(video, poster, overlay, playBtn);
        updatePlayBtn(false, true);
      } else {
        state.savedTime = video.currentTime;
        updatePlayBtn(false, false);
      }
    });

    video.addEventListener("ended", function () {
      state.isPlaying = false;
      state.hasStarted = false;
      state.savedTime = 0;
      state.userPaused = false;
      crossfadeToPoster(video, poster, overlay, playBtn);
      updatePlayBtn(false, true);
    });

    video.addEventListener("error", function () {
      state.failed = true;
      state.hasStarted = false;
      showFallback(container, video, poster, overlay, playBtn);
    });

    /* ── 静音切换 — 仅通过静音按钮操作 ── */
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
    }

    /* 点击视频本身不切换静音（防止误触） */
    video.addEventListener("click", function (e) {
      /* 只有暂停/继续，不处理音频 */
      e.stopPropagation();
      if (state.isPlaying) {
        state.userPaused = true;
        video.pause();
      } else {
        state.userPaused = false;
        /* 视频已经有断点，恢复播放 */
        if (state.hasStarted || state.savedTime > 0) {
          video.currentTime = state.savedTime;
        }
        doPlay(state, video, poster, overlay, playBtn, info);
      }
    });

    /* ── PC: hover 显示/隐藏自定义控制层 ── */
    container.addEventListener("mouseenter", function () {
      /* if video is playing, show native controls */
      if (state.isPlaying) {
        video.controls = true;
      }
    });
    container.addEventListener("mouseleave", function () {
      video.controls = false;
    });

    /* 注册到全局 */
    _activeInstances.push({ state: state, video: video });
  }

  /* ── Video playback 逻辑 ── */

  function doPlay(state, video, poster, overlay, playBtn, info) {
    if (state.failed) return;

    /* 暂停其他视频 */
    pauseAllExcept(state);

    if (state.savedTime > 0 && !state.hasStarted) {
      /* 从断点恢复（video ended → poster 可见） */
      video.currentTime = state.savedTime;
      crossfadeToVideo(video, poster, overlay, playBtn);
    }

    /* 保持 mute 状态不变 */
    video.muted = state.isMuted;

    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function (err) {
        console.warn("[hero-video] play() rejected:", err.message);
        state.failed = true;
        showFallback(container, video, poster, overlay, playBtn);
      });
    }
  }

  /* Auto play 尝试（仅用于 auto 模式下的 IntersectionObserver 触发） */
  function attemptAutoPlay(state, video, poster, overlay, playBtn, info) {
    if (state.failed || state.userPaused) return;
    doPlay(state, video, poster, overlay, playBtn, info);
  }

  function doPause(video, state) {
    if (state.isPlaying) {
      state.savedTime = video.currentTime;
      video.pause();
    }
  }

  /* ── IntersectionObserver（仅 auto 模式使用） ── */
  function setupIntersection(state, container, video, poster, overlay, playBtn, info) {
    if (state.observer) return;
    var PLAY_THRESHOLD = 0.3;
    var PAUSE_THRESHOLD = 0.3;

    state.observer = new IntersectionObserver(
      function (entries) {
        var entry = entries[0];
        if (!entry.isIntersecting) {
          /* 不可见 → 暂停 */
          if (state.isPlaying) {
            doPause(video, state);
          }
          if (state.crossfadeTimer) {
            clearTimeout(state.crossfadeTimer);
            state.crossfadeTimer = null;
          }
          return;
        }

        var ratio = entry.intersectionRatio;

        if (ratio >= PLAY_THRESHOLD && !state.isPlaying && !state.failed && !state.userPaused) {
          /* 可见 → 1.5s 后自动播放 */
          if (state.crossfadeTimer) clearTimeout(state.crossfadeTimer);
          state.crossfadeTimer = setTimeout(function () {
            state.userPaused = false;
            attemptAutoPlay(state, video, poster, overlay, playBtn, info);
          }, CROSSFADE_MS);
        } else if (ratio <= PAUSE_THRESHOLD) {
          if (state.isPlaying) {
            doPause(video, state);
          }
          if (state.crossfadeTimer) {
            clearTimeout(state.crossfadeTimer);
            state.crossfadeTimer = null;
          }
        }
      },
      {
        threshold: [PAUSE_THRESHOLD, PLAY_THRESHOLD, 0.5, 0.8, 1.0],
      }
    );

    state.observer.observe(container);
  }

  /* ── Crossfade: poster → video ── */
  function crossfadeToVideo(video, poster, overlay, playBtn) {
    poster.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
    poster.style.opacity = "0";
    poster.style.pointerEvents = "none";

    video.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
    video.style.opacity = "1";

    if (overlay) {
      overlay.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
      overlay.style.opacity = "1";
    }

    if (playBtn) {
      playBtn.style.display = "none";
    }

    setTimeout(function () {
      poster.style.display = "none";
    }, CROSSFADE_MS);
  }

  /* ── Crossfade: video → poster ── */
  function crossfadeToPoster(video, poster, overlay, playBtn) {
    poster.style.display = "";
    void poster.offsetHeight;

    poster.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
    poster.style.opacity = "1";
    poster.style.pointerEvents = "";

    video.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
    video.style.opacity = "0";

    if (overlay) {
      overlay.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
      overlay.style.opacity = "0";
    }

    if (playBtn) {
      playBtn.style.display = "flex";
    }
  }

  /* ── 降级：显示静态封面图 + 播放按钮 ── */
  function showFallback(container, video, poster, overlay, playBtn) {
    if (poster) {
      poster.style.opacity = "1";
      poster.style.display = "";
      poster.style.pointerEvents = "";
    }
    if (video) {
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
    }
    if (overlay) {
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none";
    }

    /* 显示播放按钮用于降级后手动播放 */
    if (playBtn) {
      playBtn.style.display = "flex";
      playBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
      playBtn.setAttribute("aria-label", "Play video");
    }

    /* fallback-btn 兼容 */
    if (container) {
      var btn = container.querySelector(".hero-video-fallback-btn");
      if (btn) {
        btn.style.display = "flex";
      }
    }
  }

  /* ── 初始化 ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  _spaOn(
    document,
    "spa:ready",
    function () {
      setTimeout(init, 100);
    },
    "spa:ready:init"
  );
})();
