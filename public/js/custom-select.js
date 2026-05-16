/**
 * 自定义下拉选择器 — 暗色主题
 * 自动将页面中 class="field-select" 的 select 替换为自定义组件
 * 保留原生 select 以支持表单提交和 onchange
 */

(function() {
  'use strict';

  // ===== SVG 箭头图标 =====
  function arrowSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  }

  // ===== 记录打开的实例，用于全局关闭 =====
  var activeInstance = null;

  // ===== 全局点击关闭 =====
  document.addEventListener('click', function(e) {
    if (activeInstance && !activeInstance.contains(e.target)) {
      activeInstance.classList.remove('open');
      // 隐藏 backdrop
      var backdrops = document.querySelectorAll('.custom-select-backdrop.active');
      for (var i = 0; i < backdrops.length; i++) {
        backdrops[i].classList.remove('active');
      }
      activeInstance = null;
    }
  });

  // ===== Escape 关闭 =====
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && activeInstance) {
      activeInstance.classList.remove('open');
      var backdrops = document.querySelectorAll('.custom-select-backdrop.active');
      for (var i = 0; i < backdrops.length; i++) {
        backdrops[i].classList.remove('active');
      }
      // 聚焦回触发按钮
      var trigger = activeInstance.querySelector('.custom-select-trigger');
      if (trigger) trigger.focus();
      activeInstance = null;
    }
  });

  // ===== 转换函数 =====
  function initCustomSelects() {
    var selects = document.querySelectorAll('select.field-select:not(.custom-select-initialized)');
    for (var i = 0; i < selects.length; i++) {
      convertSelect(selects[i]);
    }
  }

  function convertSelect(nativeSelect) {
    nativeSelect.classList.add('custom-select-initialized');

    // 获取选项列表
    var options = [];
    var selects = nativeSelect.querySelectorAll('option');
    for (var i = 0; i < selects.length; i++) {
      options.push({
        value: selects[i].value,
        text: selects[i].textContent.trim()
      });
    }

    // 创建容器
    var wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    // 创建触发按钮
    var trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('tabindex', '0');
    updateTriggerText();

    // 创建箭头
    var arrow = document.createElement('div');
    arrow.className = 'custom-select-arrow';
    arrow.innerHTML = arrowSvg();

    // 创建下拉面板
    var panel = document.createElement('div');
    panel.className = 'custom-select-panel';
    buildOptions();

    // 创建 backdrop（用于点击外部关闭的视觉层）
    var backdrop = document.createElement('div');
    backdrop.className = 'custom-select-backdrop';

    // 组装
    wrapper.appendChild(trigger);
    wrapper.appendChild(arrow);
    wrapper.appendChild(panel);
    wrapper.appendChild(backdrop);

    // 插入原生 select 旁边，隐藏原生 select
    nativeSelect.style.display = 'none';
    nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);

    // 事件绑定
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      toggle();
    });

    trigger.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!wrapper.classList.contains('open')) open();
        selectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!wrapper.classList.contains('open')) open();
        selectPrev();
      }
    });

    // 同步原生 select 变化（程序化修改时）
    var observer = new MutationObserver(function() {
      updateTriggerText();
      buildOptions();
    });
    observer.observe(nativeSelect, { attributes: true, childList: true, subtree: true, characterData: true });

    // 函数定义
    function updateTriggerText() {
      var val = nativeSelect.value;
      for (var i = 0; i < options.length; i++) {
        if (options[i].value === val) {
          if (val === '') {
            trigger.innerHTML = '<span class="custom-select-placeholder">' + escapeHtml(options[i].text) + '</span>';
          } else {
            trigger.textContent = options[i].text;
          }
          return;
        }
      }
      trigger.textContent = '';
    }

    function buildOptions() {
      var curVal = nativeSelect.value;
      panel.innerHTML = '';
      for (var i = 0; i < options.length; i++) {
        var opt = document.createElement('div');
        opt.className = 'custom-select-option';
        if (options[i].value === curVal) {
          opt.classList.add('selected');
        }
        opt.textContent = options[i].text;
        opt.setAttribute('data-value', options[i].value);

        opt.addEventListener('click', function(e) {
          e.stopPropagation();
          var val = this.getAttribute('data-value');
          nativeSelect.value = val;
          updateTriggerText();
          buildOptions();
          close();

          // 触发原生 onchange
          if (typeof nativeSelect.onchange === 'function') {
            nativeSelect.onchange({ target: nativeSelect });
          }
          // 触发 change 事件
          var event = new Event('change', { bubbles: true });
          nativeSelect.dispatchEvent(event);
        });

        panel.appendChild(opt);
      }
    }

    function toggle() {
      if (wrapper.classList.contains('open')) {
        close();
      } else {
        open();
      }
    }

    function open() {
      // 关闭其他打开的实例
      if (activeInstance && activeInstance !== wrapper) {
        activeInstance.classList.remove('open');
        var otherBackdrop = activeInstance.querySelector('.custom-select-backdrop');
        if (otherBackdrop) otherBackdrop.classList.remove('active');
      }

      // 更新选项（可能数据已变更）
      var newOptions = [];
      var newOpts = nativeSelect.querySelectorAll('option');
      for (var i = 0; i < newOpts.length; i++) {
        newOptions.push({
          value: newOpts[i].value,
          text: newOpts[i].textContent.trim()
        });
      }
      options = newOptions;
      buildOptions();

      wrapper.classList.add('open');
      backdrop.classList.add('active');
      activeInstance = wrapper;
    }

    function close() {
      wrapper.classList.remove('open');
      backdrop.classList.remove('active');
      if (activeInstance === wrapper) {
        activeInstance = null;
      }
    }

    function selectNext() {
      var items = panel.querySelectorAll('.custom-select-option');
      var idx = findSelectedIndex();
      if (idx < items.length - 1) {
        setHighlight(items[idx + 1]);
      }
    }

    function selectPrev() {
      var items = panel.querySelectorAll('.custom-select-option');
      var idx = findSelectedIndex();
      if (idx > 0) {
        setHighlight(items[idx - 1]);
      }
    }

    function findSelectedIndex() {
      var items = panel.querySelectorAll('.custom-select-option');
      for (var i = 0; i < items.length; i++) {
        if (items[i].classList.contains('selected')) return i;
      }
      return 0;
    }

    function setHighlight(el) {
      var items = panel.querySelectorAll('.custom-select-option');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('selected');
      }
      el.classList.add('selected');
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  // ===== 辅助 =====
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ===== 初始化 =====
  document.addEventListener('DOMContentLoaded', function() {
    initCustomSelects();
  });

  // 监听 DOM 变化（AJAX 加载等场景）
  if (window.MutationObserver) {
    var domObs = new MutationObserver(function() {
      initCustomSelects();
    });
    domObs.observe(document.body, { childList: true, subtree: true });
  }

  // ===== 暴露手动初始化 =====
  window.initCustomSelects = initCustomSelects;

})();
