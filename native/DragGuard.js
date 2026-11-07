var __MN_WRITER_DRAG_GUARD__ = (function () {
  var DRAG_BAR_HEIGHT = 66;
  var MOVE_THRESHOLD = 3;

  var panelView = null;
  var panGesture = null;
  var origin = null;
  var active = false;
  var moved = false;

  function describe(object) {
    if (!object) return "nil";
    try {
      if (typeof object.description === "function") return String(object.description());
    } catch (error) {
      // 部分 JSB 对象没有描述方法。
    }
    try {
      return String(object);
    } catch (error) {
      return "unknown";
    }
  }

  function read(target, key) {
    try {
      return target[key];
    } catch (error) {
      return null;
    }
  }

  function listCount(list) {
    if (!list) return 0;
    if (typeof list.count === "function") return Number(list.count());
    return Number(list.length || 0);
  }

  function listAt(list, index) {
    if (typeof list.objectAtIndex === "function") return list.objectAtIndex(index);
    return list[index];
  }

  /**
   * 宿主的拖动手势挂在整块面板视图上，正文区域也能拖动窗口。
   * 关闭该手势后，由本模块的顶栏手势接管窗口移动。
   */
  function disable(panel) {
    if (!panel) return false;
    var view = read(panel, "view");
    if (!view) return false;
    var list = read(view, "gestureRecognizers");
    if (!list) return false;
    var found = false;
    for (var index = 0; index < listCount(list); index += 1) {
      var item = listAt(list, index);
      if (!item) continue;
      if (describe(item).indexOf("mn_handleDrag") < 0) continue;
      found = true;
      try {
        item.enabled = false;
      } catch (error) {
        found = false;
      }
      if (item.enabled === true) found = false;
    }
    return found;
  }

  /** 恢复宿主原有拖动手势，仅在自定义手势安装失败时使用。 */
  function enable(panel) {
    if (!panel) return false;
    var view = read(panel, "view");
    if (!view) return false;
    var list = read(view, "gestureRecognizers");
    if (!list) return false;
    var found = false;
    for (var index = 0; index < listCount(list); index += 1) {
      var item = listAt(list, index);
      if (!item) continue;
      if (describe(item).indexOf("mn_handleDrag") < 0) continue;
      try {
        item.enabled = true;
        found = true;
      } catch (error) {
        found = false;
      }
    }
    return found;
  }

  /** 网页视图在面板视图中的顶边，页面顶栏从这里开始。 */
  function contentTop(view, depth) {
    if (depth > 4) return null;
    var top = null;
    var subviews = read(view, "subviews");
    for (var index = 0; index < listCount(subviews); index += 1) {
      var subview = listAt(subviews, index);
      if (!subview) continue;
      if (describe(subview).indexOf("WebView") >= 0) {
        var frame = read(subview, "frame");
        if (frame) {
          var y = Number(frame.y);
          if (isFinite(y) && (top === null || y < top)) top = y;
        }
      }
      var nested = read(subview, "subviews");
      if (listCount(nested) === 0) continue;
      var inner = contentTop(subview, (depth || 0) + 1);
      if (inner === null) continue;
      var outer = read(subview, "frame");
      var offset = outer ? Number(outer.y) : 0;
      if (!isFinite(offset)) offset = 0;
      var absolute = inner + offset;
      if (top === null || absolute < top) top = absolute;
    }
    return top;
  }

  function detach() {
    var host = panelView;
    var gesture = panGesture;
    panelView = null;
    panGesture = null;
    origin = null;
    active = false;
    moved = false;
    if (!host || !gesture) return false;
    try {
      if (typeof host.removeGestureRecognizer === "function") {
        host.removeGestureRecognizer(gesture);
      }
    } catch (error) {
      console.log("[MN Writer] 移除顶栏拖动手势失败：" + error);
      return false;
    }
    return true;
  }

  /**
   * 在面板视图上安装顶栏拖动手势。
   * 手势覆盖整块面板，但只在页面顶栏范围内响应，正文区域保持原有交互。
   */
  function attach(addon, panel) {
    detach();
    if (!addon || !panel) return false;
    if (typeof UIPanGestureRecognizer === "undefined") return false;
    var view = read(panel, "view");
    if (!view) return false;
    var gesture;
    try {
      gesture = new UIPanGestureRecognizer(addon, "handleWriterDrag:");
      gesture.minimumNumberOfTouches = 1;
      gesture.maximumNumberOfTouches = 1;
      view.addGestureRecognizer(gesture);
    } catch (error) {
      console.log("[MN Writer] 安装顶栏拖动手势失败：" + error);
      return false;
    }
    try {
      gesture.delegate = addon;
      // 手势识别交给 delegate 限定在顶栏，正文触摸仍然交给网页处理。
      gesture.cancelsTouchesInView = false;
      gesture.delaysTouchesEnded = false;
    } catch (error) {
      console.log("[MN Writer] 设置顶栏拖动手势参数失败：" + error);
    }
    panelView = view;
    panGesture = gesture;
    return true;
  }

  function started(gesture) {
    var view = panelView;
    origin = null;
    moved = false;
    active = false;
    var point = gesture.locationInView(view);
    if (!point) return;
    var y = Number(point.y);
    if (!insideBar(y)) return;
    var frame = read(view, "frame");
    if (!frame) return;
    origin = { x: Number(frame.x), y: Number(frame.y) };
    active = true;
  }

  /** 顶栏带从面板顶边算起，网页视图有内边距时顺延。 */
  function insideBar(y) {
    if (!isFinite(y) || y < 0) return false;
    var top = contentTop(panelView, 0);
    if (top === null || !isFinite(top) || top < 0 || top > 64) top = 0;
    return y <= top + DRAG_BAR_HEIGHT;
  }

  function changed(gesture) {
    var view = panelView;
    if (!active || !origin || !view) return false;
    var translation = gesture.translationInView(view);
    if (!translation) return false;
    var dx = Number(translation.x) || 0;
    var dy = Number(translation.y) || 0;
    if (!moved) {
      if (Math.abs(dx) + Math.abs(dy) < MOVE_THRESHOLD) return false;
      moved = true;
    }
    var frame = read(view, "frame");
    if (!frame) return false;
    try {
      view.frame = {
        x: origin.x + dx,
        y: origin.y + dy,
        width: Number(frame.width),
        height: Number(frame.height),
      };
    } catch (error) {
      console.log("[MN Writer] 移动面板失败：" + error);
      return false;
    }
    return true;
  }

  /** 只有从顶栏开始的手势才参与识别，正文区域的滚动与选择不受影响。 */
  function shouldBegin(gesture) {
    var view = panelView;
    if (!view || !gesture) return false;
    var point = gesture.locationInView(view);
    if (!point) return false;
    return insideBar(Number(point.y));
  }

  function finished() {
    origin = null;
    active = false;
    moved = false;
  }

  /** 由 JSExtension 的 handleWriterDrag: 回调转交的手势状态。 */
  function pan(gesture) {
    if (!panelView || !gesture) return false;
    var state = Number(read(gesture, "state"));
    if (state === 1) {
      started(gesture);
      return true;
    }
    if (state === 2) return changed(gesture);
    if (state === 3 || state === 4) finished();
    return false;
  }

  return {
    disable: disable,
    enable: enable,
    attach: attach,
    detach: detach,
    shouldBegin: shouldBegin,
    dragging: function () {
      return panGesture !== null && origin !== null;
    },
    pan: pan,
  };
})();
