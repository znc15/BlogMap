/**
 * 后台管理交互 — AJAX 无刷新 + 页面过渡动画
 */

(function() {
  'use strict';

  // ===== 通用 AJAX =====
  function api(method, url, data) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (data) opts.body = JSON.stringify(data);
    return fetch(url, opts).then(function(r) { return r.json(); });
  }

  // ===== Toast =====
  function showToast(msg, icon) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.innerHTML = (icon || '') + ' ' + msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(function() { el.classList.remove('show'); }, 2400);
  }

  function successIcon() {
    return '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }

  // ===== 页面过渡动画 =====
  // 为所有内部链接添加过渡效果
  function initPageTransitions() {
    // 给 body 添加初始动画
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    document.body.style.transform = 'translateY(0)';

    // 拦截所有同域链接，添加过渡动画
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
          href.startsWith('http') || link.target === '_blank') {
        return;
      }

      // 跳过注销、已阻止的链接
      if (link.classList.contains('no-transition')) return;

      e.preventDefault();
      document.body.style.opacity = '0';
      document.body.style.transform = 'translateY(-6px)';

      setTimeout(function() {
        window.location.href = href;
      }, 180);
    });
  }

  // ===== 省份操作（AJAX 无刷新） =====

  // 删除省份 — 从表格移除行
  window.deleteProvince = function(id, name) {
    if (!confirm('确定要删除"' + name + '"吗？相关照片也会被删除。')) return;

    api('DELETE', '/api/admin/provinces/' + id)
      .then(function(data) {
        if (data.error) return showToast('删除失败: ' + data.error);

        // 从 DOM 移除表格行
        var row = document.querySelector('tr[data-province-id="' + id + '"]');
        if (row) {
          row.style.opacity = '0';
          row.style.transform = 'translateX(-20px)';
          row.style.transition = 'opacity 0.25s, transform 0.25s';
          setTimeout(function() { row.remove(); }, 260);
        } else {
          // 不在表格中（如在 dashboard），刷新
          setTimeout(function() { window.location.reload(); }, 600);
        }

        showToast(successIcon() + ' 已删除 ' + name);
        updateDashboardStats();
      })
      .catch(function() { showToast('删除失败，请重试'); });
  };

  // ===== 照片操作（AJAX 无刷新） =====

  // 上传照片
  window.uploadPhoto = function(input) {
    var file = input.files[0];
    if (!file) return;

    var provinceSelect = document.getElementById('provinceSelect');
    var provinceId = provinceSelect ? provinceSelect.value : null;
    if (!provinceId) return showToast('请先选择省份');

    var formData = new FormData();
    formData.append('photo', file);
    formData.append('provinceId', provinceId);

    // 显示上传中
    showToast('上传中...');

    fetch('/api/admin/photos', { method: 'POST', body: formData })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) return showToast('上传失败: ' + data.error);
        showToast(successIcon() + ' 上传成功');
        // 刷新照片区域
        setTimeout(function() { window.location.reload(); }, 600);
      })
      .catch(function(err) { showToast('上传失败: ' + err.message); });

    input.value = '';
  };

  // 编辑照片 — 通过抽屉弹窗（含 EXIF）
  window.editPhoto = function(id, caption, location, time, camera, aperture, shutter, iso, focal_length) {
    document.getElementById('editPhotoId').value = id;
    document.getElementById('editCaption').value = caption;
    document.getElementById('editLocation').value = location;
    document.getElementById('editTime').value = time || '';
    document.getElementById('editCamera').value = camera || '';
    document.getElementById('editAperture').value = aperture || '';
    document.getElementById('editShutter').value = shutter || '';
    document.getElementById('editIso').value = iso || '';
    document.getElementById('editFocalLength').value = focal_length || '';
    openDrawer('editPanel', 'editBackdrop');
  };

  function openDrawer(panelId, backdropId) {
    var panel = document.getElementById(panelId);
    var backdrop = document.getElementById(backdropId);
    panel.style.display = '';
    backdrop.style.display = '';
    // 强制回流
    panel.offsetHeight;
    panel.classList.add('open');
    backdrop.classList.add('open');
  }

  function closeDrawer(panelId, backdropId) {
    var panel = document.getElementById(panelId);
    var backdrop = document.getElementById(backdropId);
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    setTimeout(function() {
      panel.style.display = 'none';
      backdrop.style.display = 'none';
    }, 350);
  }

  window.closeEditPanel = function() {
    closeDrawer('editPanel', 'editBackdrop');
  };

  // 保存照片编辑（含 EXIF）
  window.savePhotoEdit = function() {
    var id = document.getElementById('editPhotoId').value;
    var caption = document.getElementById('editCaption').value.trim();
    var location = document.getElementById('editLocation').value.trim();
    var time = document.getElementById('editTime').value.trim();
    var camera = document.getElementById('editCamera').value.trim();
    var aperture = document.getElementById('editAperture').value.trim();
    var shutter = document.getElementById('editShutter').value.trim();
    var iso = document.getElementById('editIso').value.trim();
    var focal_length = document.getElementById('editFocalLength').value.trim();

    var body = { caption: caption, location: location, camera: camera, aperture: aperture, shutter: shutter, iso: iso, focal_length: focal_length };
    if (time) body.time = time;

    api('PUT', '/api/admin/photos/' + id, body)
      .then(function(data) {
        if (data.error) return showToast('保存失败: ' + data.error);

        // 更新照片卡片 DOM
        var card = document.querySelector('.photo-card[data-id="' + id + '"]');
        if (card) {
          var captionEl = card.querySelector('.photo-card-caption');
          var locationEl = card.querySelector('.photo-card-location');
          if (captionEl) captionEl.textContent = caption || '无描述';
          if (locationEl) locationEl.textContent = location || '';
          // 更新 EXIF 显示
          var exifEl = card.querySelector('.photo-exif');
          if (exifEl) {
            var parts = [];
            if (camera) parts.push('<span>' + escapeHtml(camera) + '</span>');
            if (aperture) parts.push('<span>' + escapeHtml(aperture) + '</span>');
            if (shutter) parts.push('<span>' + escapeHtml(shutter) + '</span>');
            if (iso) parts.push('<span>' + escapeHtml(iso) + '</span>');
            exifEl.innerHTML = parts.join('');
          }
        }

        closeDrawer('editPanel', 'editBackdrop');
        showToast(successIcon() + ' 已保存');
      })
      .catch(function(err) { showToast('保存失败: ' + err.message); });
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 删除照片 — 从网格移除卡片
  window.deletePhoto = function(id) {
    if (!confirm('确定要删除这张照片吗？')) return;

    api('DELETE', '/api/admin/photos/' + id)
      .then(function(data) {
        if (data.error) return showToast('删除失败: ' + data.error);

        var card = document.querySelector('.photo-card[data-id="' + id + '"]');
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          card.style.transition = 'opacity 0.25s, transform 0.25s';
          setTimeout(function() { card.remove(); }, 260);
        }

        showToast(successIcon() + ' 已删除');
        updateDashboardStats();
      })
      .catch(function() { showToast('删除失败'); });
  };

  // ===== 数据导入导出 =====

  window.exportData = function() {
    window.location.href = '/api/admin/export';
  };

  window.importData = function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      showToast('导入中...');
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          api('POST', '/api/admin/import', { data: data })
            .then(function(result) {
              if (result.error) return showToast('导入失败: ' + result.error);
              showToast(successIcon() + ' 成功导入 ' + result.imported + ' 个省份');
              setTimeout(function() { window.location.reload(); }, 800);
            })
            .catch(function() { showToast('导入失败'); });
        } catch (err) {
          showToast('解析 JSON 失败: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ===== 仪表盘数据刷新 =====

  function updateDashboardStats() {
    // 更新省份计数
    var visibleProvinces = document.querySelectorAll('tr[data-province-id]').length;
    var statCards = document.querySelectorAll('.stat-card-value');
    if (statCards.length >= 2) {
      // 实际数应通过 API 获取，这里做简单可视化更新
      fetch('/api/provinces')
        .then(function(r) { return r.json(); })
        .then(function(provinces) {
          var totalPhotos = 0;
          for (var i = 0; i < provinces.length; i++) {
            totalPhotos += (provinces[i].photos && provinces[i].photos.length) || 0;
          }
          if (statCards[0]) statCards[0].textContent = provinces.length;
          if (statCards[1]) statCards[1].textContent = totalPhotos;
        });
    }
  }

  // ===== 初始化 =====
  document.addEventListener('DOMContentLoaded', function() {
    // 页面入场动画
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(6px)';
    document.body.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    requestAnimationFrame(function() {
      document.body.style.opacity = '1';
      document.body.style.transform = 'translateY(0)';
    });

    // 初始化页面过渡
    initPageTransitions();

    // 省份表格行添加 data 属性
    var rows = document.querySelectorAll('.admin-table tbody tr');
    for (var i = 0; i < rows.length; i++) {
      var btn = rows[i].querySelector('.btn-danger[onclick*="deleteProvince"]');
      if (btn) {
        var match = btn.getAttribute('onclick').match(/deleteProvince\((\d+)/);
        if (match) {
          rows[i].setAttribute('data-province-id', match[1]);
        }
      }
    }
  });

  // 暴露工具函数
  window.showToast = showToast;

})();
