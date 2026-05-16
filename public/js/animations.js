/**
 * 动画系统 — 滚动揭示、图片渐入、数量跳动
 * 在页面加载后自动初始化
 */

(function() {
  'use strict';

  // ===== IntersectionObserver：滚动揭示 =====
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -24px 0px'
    });

    // 扫描所有 .reveal 和 .reveal-stagger 元素
    function observeReveals() {
      var reveals = document.querySelectorAll('.reveal:not(.visible)');
      for (var i = 0; i < reveals.length; i++) {
        revealObserver.observe(reveals[i]);
      }
    }

    // 初始扫描
    observeReveals();

    // DOM 变化后重新扫描（详情面板打开、AJAX 加载等）
    if (window.MutationObserver) {
      var domObserver = new MutationObserver(function() {
        observeReveals();
        observeImages();
        applyCountUp();
      });
      domObserver.observe(document.body, { childList: true, subtree: true });
    }
  } else {
    // 降级：直接显示所有元素
    document.addEventListener('DOMContentLoaded', function() {
      var reveals = document.querySelectorAll('.reveal, .reveal-stagger');
      for (var i = 0; i < reveals.length; i++) {
        reveals[i].classList.add('visible');
      }
    });
  }

  // ===== 图片渐入 =====
  function observeImages() {
    var imgs = document.querySelectorAll('img.img-fade:not(.loaded)');
    if (!('IntersectionObserver' in window)) {
      // 降级：直接显示
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].classList.add('loaded');
      }
      return;
    }

    var imgObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          img.onload = function() { img.classList.add('loaded'); };
          img.onerror = function() { img.classList.add('loaded'); };
          // 如果图片已经缓存加载完成
          if (img.complete) img.classList.add('loaded');
          imgObserver.unobserve(img);
        }
      });
    }, { threshold: 0.05, rootMargin: '100px' });

    for (var j = 0; j < imgs.length; j++) {
      imgObserver.observe(imgs[j]);
    }
  }

  // ===== 数量跳动（统计卡片） =====
  function applyCountUp() {
    var counts = document.querySelectorAll('.count-animate:not(.counted)');
    for (var i = 0; i < counts.length; i++) {
      counts[i].classList.add('counted');
    }
  }

  // 初始扫描图片和计数
  document.addEventListener('DOMContentLoaded', function() {
    observeImages();
    applyCountUp();

    // 自动给所有 .btn 添加涟漪效果
    var btns = document.querySelectorAll('.btn:not(.btn-ripple)');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.add('btn-ripple');
    }
  });

  // ===== 详情面板打开时重新触发动画 =====
  var detailObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.target.id === 'detailPanel' && mutation.target.classList.contains('open')) {
        // 延迟等待 DOM 渲染后重新绑定动画
        setTimeout(function() {
          observeReveals();
          observeImages();
          applyCountUp();
        }, 100);
      }
    });
  });

  var detailPanel = document.getElementById('detailPanel');
  if (detailPanel) {
    detailObserver.observe(detailPanel, { attributes: true, attributeFilter: ['class'] });
  }

})();
