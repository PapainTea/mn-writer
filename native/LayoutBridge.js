var __MN_WRITER_LAYOUT__ = (function () {
  var DRAG_BAR_HEIGHT = 36;
  var GAP = 8;
  var MIN_HEIGHT = 240;

  var getPanel = function () {
    return null;
  };
  var getStudy = function () {
    return null;
  };

  function configure(deps) {
    getPanel = deps.getPanel;
    getStudy = deps.getStudy;
  }

  function subviewCount(list) {
    if (!list) return 0;
    if (typeof list.count === "function") return Number(list.count());
    return Number(list.length || 0);
  }

  function subviewAt(list, index) {
    if (typeof list.objectAtIndex === "function") return list.objectAtIndex(index);
    return list[index];
  }

  /** 顶栏是贴着场景视图顶部、横跨大部分宽度的矮条。 */
  function topBarBottom(studyView) {
    var bottom = 0;
    try {
      var bounds = studyView.bounds;
      var subviews = studyView.subviews;
      var count = subviewCount(subviews);
      for (var index = 0; index < count; index += 1) {
        var frame = subviewAt(subviews, index).frame;
        if (!frame) continue;
        if (frame.y < -0.5 || frame.y > 0.5) continue;
        if (frame.height < 24 || frame.height > 96) continue;
        if (frame.width < bounds.width * 0.8) continue;
        if (frame.y + frame.height > bottom) bottom = frame.y + frame.height;
      }
    } catch (error) {
      console.log("[MN Writer] 读取顶栏高度失败：" + error);
    }
    return bottom;
  }

  /** 视图顶边在场景视图坐标系中的位置。 */
  function absoluteTop(view, studyView) {
    var top = 0;
    var current = view;
    while (current && current !== studyView) {
      try {
        top += Number(current.frame.y) || 0;
      } catch (error) {
        return top;
      }
      current = current.superview;
    }
    return top;
  }

  function safeTop(studyView) {
    var barBottom = topBarBottom(studyView);
    return barBottom + DRAG_BAR_HEIGHT + GAP;
  }

  /** 底部工具条的最上沿，用于限制面板高度。 */
  function bottomBarTop(studyView) {
    var bounds = studyView.bounds;
    var top = bounds.height;
    try {
      var subviews = studyView.subviews;
      var count = subviewCount(subviews);
      for (var index = 0; index < count; index += 1) {
        var frame = subviewAt(subviews, index).frame;
        if (!frame) continue;
        if (frame.y < bounds.height * 0.85) continue;
        if (frame.height < 20 || frame.height > 120) continue;
        if (frame.width > bounds.width * 0.95) continue;
        if (frame.y < top) top = frame.y;
      }
    } catch (error) {
      console.log("[MN Writer] 读取底部工具条位置失败：" + error);
    }
    return top;
  }

  function metrics() {
    var panel = getPanel();
    var study = getStudy();
    var view = panel && panel.view;
    var studyView = study && study.view;
    if (!view || !studyView) return null;
    var bounds = studyView.bounds;
    var top = safeTop(studyView);
    var bottom = bottomBarTop(studyView);
    return {
      top: top,
      maxWidth: Math.max(320, bounds.width - 24),
      maxHeight: Math.max(MIN_HEIGHT, bottom - top - GAP),
    };
  }

  /**
   * 面板连同顶部拖拽条一起避让场景顶栏。
   * 宿主扩大面板时可能向上生长，页面切换预设尺寸也会触发重排，
   * 因此每次布局后都要重新压回安全区。
   */
  function enforce() {
    var panel = getPanel();
    var study = getStudy();
    var view = panel && panel.view;
    var studyView = study && study.view;
    if (!view || !studyView) return null;
    var top = safeTop(studyView);
    var bounds = studyView.bounds;
    var bottom = bottomBarTop(studyView);
    var frame = view.frame;
    var nextY = Number(frame.y) || 0;
    var nextHeight = Number(frame.height) || 0;
    var currentTop = absoluteTop(view, studyView);
    if (currentTop < top) {
      var shift = top - currentTop;
      nextY += shift;
      nextHeight -= shift;
    }
    var maxHeight = bottom - top - GAP;
    if (nextHeight > maxHeight) nextHeight = maxHeight;
    if (nextHeight < MIN_HEIGHT) nextHeight = MIN_HEIGHT;
    if (nextY !== frame.y || nextHeight !== frame.height) {
      try {
        view.frame = {
          x: frame.x,
          y: nextY,
          width: frame.width,
          height: nextHeight,
        };
      } catch (error) {
        console.log("[MN Writer] 调整面板位置失败：" + error);
      }
    }
    var panelObj = getPanel();
    if (panelObj) {
      try {
        var limit = Math.max(MIN_HEIGHT, maxHeight);
        if (Number(panelObj.maxContentHeight) !== limit) {
          panelObj.maxContentHeight = limit;
        }
      } catch (error) {
        console.log("[MN Writer] 设置面板高度上限失败：" + error);
      }
    }
    return {
      top: top,
      maxWidth: Math.max(320, bounds.width - 24),
      maxHeight: Math.max(MIN_HEIGHT, maxHeight),
      frame: view.frame,
    };
  }

  return {
    configure: configure,
    metrics: metrics,
    enforce: enforce,
  };
})();
