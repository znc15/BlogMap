/**
 * ECharts 中国地图行迹
 * 依赖: ECharts 5.x (从 CDN 加载)
 * 数据: 从 TRAVEL_DATA 全局变量读取
 */

(function() {
  'use strict';

  // 省份大致中心坐标（用于灯火标记和轨迹）
  const PROVINCE_CENTERS = {
    "北京市": [116.4, 39.9],
    "天津市": [117.2, 39.1],
    "上海市": [121.5, 31.2],
    "重庆市": [106.5, 29.6],
    "河北省": [114.5, 38.0],
    "山西省": [112.5, 37.9],
    "辽宁省": [123.4, 41.8],
    "吉林省": [125.3, 43.9],
    "黑龙江省": [126.5, 45.7],
    "江苏省": [118.8, 32.0],
    "浙江省": [120.2, 30.3],
    "安徽省": [117.3, 31.8],
    "福建省": [119.3, 26.1],
    "江西省": [115.9, 28.7],
    "山东省": [117.0, 36.7],
    "河南省": [113.6, 34.7],
    "湖北省": [114.3, 30.6],
    "湖南省": [112.9, 28.2],
    "广东省": [113.3, 23.1],
    "海南省": [110.3, 20.0],
    "四川省": [104.1, 30.7],
    "贵州省": [106.7, 26.6],
    "云南省": [102.7, 25.0],
    "陕西省": [108.9, 34.3],
    "甘肃省": [103.8, 36.1],
    "青海省": [101.8, 36.6],
    "台湾省": [121.5, 25.0],
    "内蒙古自治区": [111.7, 40.8],
    "广西壮族自治区": [108.3, 22.8],
    "西藏自治区": [91.1, 29.6],
    "宁夏回族自治区": [106.3, 38.5],
    "新疆维吾尔自治区": [87.6, 43.8],
    "香港特别行政区": [114.2, 22.3],
    "澳门特别行政区": [113.5, 22.2]
  };

  // 解析"2024 年 8 月"这种字符串
  function parsePeriod(s) {
    var m = s.match(/(\d{4})\D+(\d{1,2})/);
    return m ? { y: +m[1], m: +m[2], key: +m[1] * 100 + +m[2] } : { y: 9999, m: 12, key: 999912 };
  }

  // 构建 dataMap
  var dataMap = {};
  function rebuildIndex() {
    dataMap = {};
    for (var i = 0; i < window.TRAVEL_DATA.length; i++) {
      var d = window.TRAVEL_DATA[i];
      dataMap[d.province] = d;
    }
  }
  rebuildIndex();

  // ===== 渲染函数 =====
  function renderPills() {
    var pillsEl = document.getElementById('pills');
    if (!pillsEl) return;
    pillsEl.innerHTML = '';
    for (var i = 0; i < window.TRAVEL_DATA.length; i++) {
      var d = window.TRAVEL_DATA[i];
      var el = document.createElement('div');
      el.className = 'pill';
      el.innerHTML = d.display + '<span class="count">' + d.photos.length + ' 张</span>';
      el.onclick = (function(province) {
        return function() { openDetail(province); };
      })(d.province);
      pillsEl.appendChild(el);
    }
  }

  function renderTimeline() {
    var track = document.getElementById('timelineTrack');
    if (!track) return;
    var sorted = window.TRAVEL_DATA.slice().sort(function(a, b) {
      return parsePeriod(a.period).key - parsePeriod(b.period).key;
    });
    track.innerHTML = sorted.map(function(d) {
      var p = parsePeriod(d.period);
      return '<div class="timeline-node" onclick="openDetail(\'' + d.province + '\')">' +
        '<div class="timeline-date">' + p.y + ' · ' + String(p.m).padStart(2, '0') + '月</div>' +
        '<div class="timeline-place">' + d.display + '</div>' +
        '<div class="timeline-count">' + d.photos.length + ' 张照片</div>' +
        '</div>';
    }).join('');
  }

  function updateStats() {
    var statProvinces = document.getElementById('stat-provinces');
    var statPhotos = document.getElementById('stat-photos');
    if (statProvinces) statProvinces.textContent = window.TRAVEL_DATA.length;
    if (statPhotos) {
      var total = 0;
      for (var i = 0; i < window.TRAVEL_DATA.length; i++) {
        total += window.TRAVEL_DATA[i].photos.length;
      }
      statPhotos.textContent = total;
    }
  }

  // ===== 地图渲染 =====
  var mapEl = document.getElementById('map');
  var chart = null;
  var mapTip = document.getElementById('mapTip');
  var geoLoaded = false;

  if (mapEl && typeof echarts !== 'undefined') {
    chart = echarts.init(mapEl);

    // 加载 GeoJSON
    var geoUrl = '/data/china-geo.json';
    fetch(geoUrl)
      .then(function(r) { return r.json(); })
      .then(function(geo) {
        echarts.registerMap('china', geo);
        geoLoaded = true;
        renderMap();
      })
      .catch(function(err) {
        // 如果本地没有，尝试从远程加载
        return fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
          .then(function(r) { return r.json(); })
          .then(function(geo) {
            echarts.registerMap('china', geo);
            geoLoaded = true;
            renderMap();
          })
          .catch(function() {
            mapEl.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-muted)">地图数据加载失败，请检查网络。</div>';
          });
      });
  }

  function renderMap() {
    if (!geoLoaded || !chart) return;

    var seriesData = window.TRAVEL_DATA.map(function(d) {
      return { name: d.province, value: d.photos.length };
    });

    // 灯火标记
    var lanternData = window.TRAVEL_DATA
      .filter(function(d) { return PROVINCE_CENTERS[d.province]; })
      .map(function(d) {
        var center = PROVINCE_CENTERS[d.province];
        return { name: d.display, province: d.province, value: [center[0], center[1], d.photos.length] };
      });

    // 旅行轨迹
    var sortedTravels = window.TRAVEL_DATA
      .filter(function(d) { return PROVINCE_CENTERS[d.province]; })
      .sort(function(a, b) { return parsePeriod(a.period).key - parsePeriod(b.period).key; });
    var trailData = [];
    for (var i = 0; i < sortedTravels.length - 1; i++) {
      trailData.push({
        coords: [PROVINCE_CENTERS[sortedTravels[i].province], PROVINCE_CENTERS[sortedTravels[i + 1].province]]
      });
    }

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(34,40,49,0.98)',
        borderColor: 'transparent',
        textStyle: { color: '#EEEEEE', fontFamily: 'inherit', fontSize: 13 },
        padding: [10, 14],
        formatter: function(p) {
          var name = (p.data && p.data.province) || p.name;
          var d = dataMap[name];
          if (d) {
            return '<b style="font-family:\'Noto Serif SC\',serif;font-size:15px">' + d.display + '</b><br/>' +
              '<span style="color:#D65A31">' + d.period + '</span><br/>' +
              '<span style="color:#EEEEEE">' + d.photos.length + ' 张照片 · 点击查看</span>';
          }
          return '<span style="color:#6B6A66">' + p.name + '</span><br/><span style="color:#AAA9A5;font-size:12px">尚未点亮</span>';
        }
      },
      geo: {
        map: 'china',
        roam: true,
        scaleLimit: { min: 1, max: 4 },
        center: [105, 36],
        zoom: 1.25,
        itemStyle: {
          areaColor: '#2C333B',
          borderColor: '#3A3F47',
          borderWidth: 0.6
        },
        emphasis: {
          itemStyle: { areaColor: '#393E46' },
          label: { show: false }
        },
        select: { disabled: true }
      },
      series: [
        {
          type: 'map',
          map: 'china',
          geoIndex: 0,
          data: seriesData,
          itemStyle: {
            areaColor: '#D65A31',
            borderColor: '#393E46',
            borderWidth: 1.2,
            shadowColor: 'rgba(214,90,49,0.40)',
            shadowBlur: 22
          },
          emphasis: {
            itemStyle: { areaColor: '#B84A28', borderWidth: 1.5, shadowBlur: 30 },
            label: { show: true, color: '#EEEEEE', fontWeight: 'bold', fontFamily: 'Noto Serif SC', fontSize: 13 }
          },
          select: { disabled: true },
          animationDuration: 1200,
          animationEasing: 'cubicOut'
        },
        {
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 1,
          polyline: false,
          effect: {
            show: true,
            period: 5,
            trailLength: 0.5,
            symbolSize: 5,
            color: '#D65A31',
            symbol: 'circle'
          },
          lineStyle: {
            color: '#D65A31',
            width: 1.4,
            opacity: 0.40,
            curveness: 0.22,
            type: 'dashed'
          },
          data: trailData,
          silent: true
        },
        {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 2,
          data: lanternData,
          symbolSize: function(val) { return 8 + Math.min(val[2], 10) * 1.2; },
          rippleEffect: { brushType: 'stroke', scale: 4, period: 4 },
          itemStyle: {
            color: '#D65A31',
            shadowColor: '#D65A31',
            shadowBlur: 18,
            opacity: 0.95
          },
          label: {
            show: true,
            formatter: '{b}',
            position: 'right',
            color: '#EEEEEE',
            fontFamily: 'Noto Serif SC',
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: 'rgba(34,40,49,0.88)',
            padding: [3, 8],
            borderRadius: 2,
            borderColor: 'rgba(214,90,49,0.25)',
            borderWidth: 1
          },
          emphasis: { scale: 1.4 }
        }
      ]
    });

    chart.off('click');
    chart.on('click', function(params) {
      var name = (params.data && params.data.province) || params.name;
      if (dataMap[name]) openDetail(name);
    });

    chart.off('mouseover');
    chart.on('mouseover', function(p) {
      var name = (p.data && p.data.province) || p.name;
      if (dataMap[name] && mapTip) mapTip.classList.add('show');
    });
    chart.off('mouseout', function() {
      if (mapTip) mapTip.classList.remove('show');
    });
  }

  // ===== 初始化 =====
  function init() {
    if (!window.TRAVEL_DATA) return;
    updateStats();
    renderPills();
    renderTimeline();
  }

  // 等待数据就绪
  if (window.TRAVEL_DATA && window.TRAVEL_DATA.length > 0) {
    init();
  } else {
    // 如果数据是通过 API 异步加载的
    document.addEventListener('DOMContentLoaded', function() {
      if (window.TRAVEL_DATA && window.TRAVEL_DATA.length > 0) {
        init();
      }
    });
  }

  // 窗口 resize
  window.addEventListener('resize', function() {
    if (chart) chart.resize();
  });

})();
