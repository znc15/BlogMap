/**
 * 瀑布流相册 + 灯箱
 * 依赖: 全局变量 TRAVEL_DATA 或 PHOTOS_DATA
 * 提供: openDetail, closeDetail, openLightbox, navLightbox, closeLightbox
 */

(function() {
  'use strict';

  // ===== SVG 图标辅助 =====
  function svgPin() {
    return '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  }
  function svgClock() {
    return '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  }
  function svgCalendar() {
    return '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  }
  function svgCamera() {
    return '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  }

  // ===== 图片懒加载：图片加载后添加 loaded 类（用于模糊占位过渡） =====
  function initLazyImages() {
    var imgs = document.querySelectorAll('img.img-fade');
    imgs.forEach(function(img) {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('loaded');
      } else {
        img.addEventListener('load', function onLoad() {
          img.classList.add('loaded');
          img.removeEventListener('load', onLoad);
        });
        // 如果图片已经加载完成但事件未触发
        if (img.complete) {
          img.classList.add('loaded');
        }
      }
    });
  }

  // 在 DOM 变化时重新初始化（用于详情面板动态内容）
  var observer = new MutationObserver(function() {
    initLazyImages();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ===== 详情面板 =====
  var detailPanel = document.getElementById('detailPanel');
  var detailContent = document.getElementById('detailContent');
  var photoCache = [];

  window.openDetail = function(provinceName) {
    var data = null;
    if (window.TRAVEL_DATA) {
      for (var i = 0; i < window.TRAVEL_DATA.length; i++) {
        if (window.TRAVEL_DATA[i].province === provinceName) {
          data = window.TRAVEL_DATA[i];
          break;
        }
      }
    }
    if (!data) return;

    photoCache = data.photos;

    // 直接渲染纯文本日记（保持与 detail.ejs 一致的表现，
    // 但这里用纯文本因为 marked 在服务端渲染）
    var diaryHtml = '';
    if (data.diary && data.diary.length) {
      diaryHtml = data.diary.map(function(p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('');
    }

    var photosHtml = data.photos.map(function(p, i) {
      var exifHtml = '';
      if (p.camera || p.aperture || p.shutter || p.iso) {
        exifHtml = '<div class="photo-exif">';
        if (p.camera) exifHtml += '<span>' + escapeHtml(p.camera) + '</span>';
        if (p.aperture) exifHtml += '<span>' + escapeHtml(p.aperture) + '</span>';
        if (p.shutter) exifHtml += '<span>' + escapeHtml(p.shutter) + '</span>';
        if (p.iso) exifHtml += '<span>' + escapeHtml(p.iso) + '</span>';
        exifHtml += '</div>';
      }
      return '<div class="photo reveal" onclick="openLightbox(' + i + ')">' +
        '<img src="' + escapeAttr(p.src) + '" alt="' + escapeAttr(p.caption) + '" loading="lazy" class="img-fade">' +
        '<div class="photo-meta">' +
        '<div class="photo-caption">' + escapeHtml(p.caption) + '</div>' +
        '<div class="photo-info">' +
        '<span>' + svgPin() + ' ' + escapeHtml(p.location) + '</span>' +
        '<span>' + svgClock() + ' ' + escapeHtml(p.time) + '</span>' +
        '</div>' + exifHtml + '</div></div>';
    }).join('');

    detailContent.innerHTML =
      '<div class="detail-header">' +
      '<div class="detail-eyebrow">' + escapeHtml(data.province) + '</div>' +
      '<h1 class="detail-title">' + escapeHtml(data.display) + ' · 旅行记</h1>' +
      '<div class="detail-meta">' +
      '<span>' + svgCalendar() + ' ' + escapeHtml(data.period) + '</span>' +
      '<span>' + svgCamera() + ' ' + data.photos.length + ' 张照片</span>' +
      '</div></div>' +
      '<div class="detail-diary reveal">' + diaryHtml + '</div>' +
      '<div class="gallery reveal-stagger">' + photosHtml + '</div>';

    detailPanel.classList.add('open');
    document.body.style.overflow = 'hidden';
    detailPanel.scrollTop = 0;
  };

  window.closeDetail = function() {
    detailPanel.classList.remove('open');
    document.body.style.overflow = '';
  };

  // ===== 灯箱 =====
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var currentIndex = 0;

  window.openLightbox = function(index) {
    if (!photoCache.length) {
      if (typeof window.PHOTOS_DATA !== 'undefined') {
        photoCache = window.PHOTOS_DATA;
      } else {
        return;
      }
    }
    currentIndex = index;
    showLightboxImage();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  function showLightboxImage() {
    var p = photoCache[currentIndex];
    if (!p) return;
    lightboxImg.src = p.src;
    var exifInfo = '';
    if (p.camera || p.aperture || p.shutter || p.iso) {
      exifInfo = ' | ';
      if (p.camera) exifInfo += p.camera + ' ';
      if (p.aperture) exifInfo += p.aperture + ' ';
      if (p.shutter) exifInfo += p.shutter + ' ';
      if (p.iso) exifInfo += p.iso + ' ';
    }
    lightboxCaption.innerHTML =
      escapeHtml(p.caption) +
      '<small>' + escapeHtml(p.location) + ' · ' + escapeHtml(p.time) + exifInfo + '</small>';
  }

  window.navLightbox = function(delta) {
    if (!photoCache.length) return;
    currentIndex = (currentIndex + delta + photoCache.length) % photoCache.length;
    showLightboxImage();
  };

  window.closeLightbox = function() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (lightbox) {
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', function(e) {
    if (!lightbox || !lightbox.classList.contains('open')) {
      if (e.key === 'Escape' && detailPanel && detailPanel.classList.contains('open')) {
        closeDetail();
      }
      return;
    }
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
  });

  // ===== 辅助函数 =====
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;');
  }

  // ===== 导航栏滚动效果 =====
  var headerEl = document.getElementById('header');
  if (headerEl) {
    window.addEventListener('scroll', function() {
      headerEl.classList.toggle('scrolled', window.scrollY > 10);
    });
  }

  // ===== 初始化 =====
  document.addEventListener('DOMContentLoaded', function() {
    initLazyImages();
  });

})();
