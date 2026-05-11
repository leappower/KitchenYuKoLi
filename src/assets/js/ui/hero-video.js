/**
 * hero-video.js — B方案：Apple 风格渐进增强视频播放
 *
 * 交互流程：
 *   1. 首屏显示封面图（poster），视频 preload="metadata"
 *   2. 进入视口 → 1.5s 后 crossfade 到静音自动播放
 *   3. 点击视频 → 切换静音
 *   4. PC hover → 显示原生 controls
 *   5. 滚出视口 → 暂停（记忆断点）
 *   6. 滚回 → 从断点继续
 *   7. 视频播放失败 → 降级为静态封面图 + 播放按钮
 *   8. 视频结束 → fade 回封面图
 *
 * DOM 结构要求：
 *   <div data-hero-video>
 *     <img class="hero-video-poster" src="..." />          ← 封面图
 *     <video class="hero-video-player"
 *            src="aboutus.mp4" poster="..."
 *            preload="metadata" muted playsinline>          ← 视频（初始隐藏）
 *     </video>
 *     <div class="hero-video-overlay">                      ← 半透明磨砂覆盖层（初始隐藏）
 *       <button class="hero-video-mute">🔇</button>        ← 静音切换
 *     </div>
 *     <div class="hero-video-info">                         ← 底部信息卡片（保持不动）
 *       ...existing content...
 *     </div>
 *   </div>
 */
(function () {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  var ATTR = "data-hero-video";
  var CROSSFADE_MS = 1500;
  var PLAY_THRESHOLD = 0.3; // 30% 可见时播放
  var PAUSE_THRESHOLD = 0.1; // 10% 可见时暂停

  /* ── 找到所有 hero-video 容器 ── */
  function init() {
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
    var info = container.querySelector(".hero-video-info");

    if (!video || !poster) return;

    var state = {
      hasStarted: false,
      isPlaying: false,
      isMuted: true,
      savedTime: 0,
      observer: null,
      crossfadeTimer: null,
      failed: false,
    };

    /* ── 封面图加载失败 → 立即尝试播放 ── */
    poster.addEventListener("error", function () {
      attemptPlay(state, video, poster, overlay, info);
    });

    /* ── 封面图加载成功 → 等 IntersectionObserver 触发 ── */
    poster.addEventListener("load", function () {
      setupIntersection(state, container, video, poster, overlay, info);
    });

    /* 如果封面图已 cached/loadcomplete */
    if (poster.complete && poster.naturalWidth > 0) {
      setupIntersection(state, container, video, poster, overlay, info);
    }

    /* ── 视频事件 ── */
    video.addEventListener("play", function () {
      state.isPlaying = true;
      if (!state.hasStarted) {
        state.hasStarted = true;
        crossfadeToVideo(video, poster, overlay);
      }
    });

    video.addEventListener("pause", function () {
      state.isPlaying = false;
    });

    video.addEventListener("ended", function () {
      state.isPlaying = false;
      state.hasStarted = false;
      state.savedTime = 0;
      crossfadeToPoster(video, poster, overlay);
    });

    video.addEventListener("error", function () {
      state.failed = true;
      state.hasStarted = false;
      showFallback(container, video, poster, overlay);
    });

    /* ── 静音切换 ── */
    if (muteBtn) {
      muteBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        state.isMuted = !state.isMuted;
        video.muted = state.isMuted;
        muteBtn.textContent = state.isMuted ? "🔇" : "🔊";
        muteBtn.setAttribute("data-i18n", state.isMuted ? "hero_video_mute" : "hero_video_unmute");
      });
    }

    /* ── 点击视频 → 切换静音（移动端友好） ── */
    video.addEventListener("click", function () {
      state.isMuted = !state.isMuted;
      video.muted = state.isMuted;
      if (muteBtn) {
        muteBtn.textContent = state.isMuted ? "🔇" : "🔊";
      }
    });

    /* ── PC: hover 显示原生 controls ── */
    if (muteBtn && overlay) {
      container.addEventListener("mouseenter", function () {
        video.controls = true;
        if (overlay) overlay.style.opacity = "0";
      });
      container.addEventListener("mouseleave", function () {
        video.controls = false;
        if (overlay) overlay.style.opacity = "";
      });
    }
  }

  /* ── IntersectionObserver ── */
  function setupIntersection(state, container, video, poster, overlay, info) {
    if (state.observer) return;

    state.observer = new IntersectionObserver(
      function (entries) {
        var entry = entries[0];
        if (!entry.isIntersecting) {
          pauseVideo(state, video);
          return;
        }

        var ratio = entry.intersectionRatio;
        if (ratio >= PLAY_THRESHOLD && !state.isPlaying && !state.failed) {
          /* 延迟 1.5s 后自动播放（给封面图展示时间） */
          if (state.crossfadeTimer) clearTimeout(state.crossfadeTimer);
          state.crossfadeTimer = setTimeout(function () {
            attemptPlay(state, video, poster, overlay, info);
          }, CROSSFADE_MS);
        } else if (ratio <= PAUSE_THRESHOLD) {
          pauseVideo(state, video);
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

  /* ── 播放 ── */
  function attemptPlay(state, video, poster, overlay, info) {
    if (state.failed) return;

    /* 恢复断点 */
    if (state.savedTime > 0) {
      video.currentTime = state.savedTime;
    }

    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function (err) {
        /* Autoplay blocked or other error → 降级 */
        console.warn("[hero-video] play() rejected:", err.message);
        state.failed = true;
        showFallback(null, video, poster, overlay);
      });
    }
  }

  /* ── 暂停 ── */
  function pauseVideo(state, video) {
    if (state.isPlaying) {
      state.savedTime = video.currentTime;
      video.pause();
    }
  }

  /* ── Crossfade: poster → video ── */
  function crossfadeToVideo(video, poster, overlay) {
    poster.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
    poster.style.opacity = "0";
    poster.style.pointerEvents = "none";

    video.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
    video.style.opacity = "1";

    if (overlay) {
      overlay.style.transition = "opacity " + CROSSFADE_MS / 1000 + "s ease";
      overlay.style.opacity = "1";
    }

    setTimeout(function () {
      poster.style.display = "none";
    }, CROSSFADE_MS);
  }

  /* ── Crossfade: video → poster ── */
  function crossfadeToPoster(video, poster, overlay) {
    poster.style.display = "";
    /* Force reflow */
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
  }

  /* ── 降级：显示静态封面图 + 播放按钮 ── */
  function showFallback(container, video, poster, overlay) {
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

    /* 如果容器有 data-fallback-btn，显示播放按钮 */
    if (container) {
      var btn = container.querySelector(".hero-video-fallback-btn");
      if (btn) {
        btn.style.display = "flex";
        btn.addEventListener("click", function () {
          btn.style.display = "none";
          video.muted = true;
          video.style.opacity = "1";
          video.style.pointerEvents = "";
          video.play().catch(function () {});
        });
      }
    }
  }

  /* ── 初始化时机 ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* SPA 导航后重新初始化 */
  _spaOn(
    document,
    "spa:ready",
    function () {
      setTimeout(init, 100);
    },
    "spa:ready:init"
  );
})();
