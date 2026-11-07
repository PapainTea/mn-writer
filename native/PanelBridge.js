var __MN_WRITER_PANEL__ = (function () {
  var SELECTION_NOTIFICATION = "SelectionChanged";
  var DEBOUNCE_SECONDS = 0.12;
  var LAYOUT_INTERVAL_SECONDS = 0.4;

  function create(config) {
    var panel = null;
    var selectionTimer = null;
    var layoutTimer = null;
    var lastSelectionKey = "";

    var layout = __MN_WRITER_LAYOUT__;
    layout.configure({
      getPanel: function () {
        return panel;
      },
      getStudy: studyController,
    });

    function studyController() {
      try {
        return Application.sharedInstance().studyController(config.getWindow());
      } catch (error) {
        return null;
      }
    }

    function refreshCommands() {
      try {
        var study = studyController();
        if (study) study.refreshAddonCommands();
      } catch (error) {
        console.log("[MN Writer] 刷新工具栏状态失败：" + error);
      }
    }

    function isOpen() {
      return Boolean(panel);
    }

    function open() {
      var study = studyController();
      if (!study) {
        return false;
      }
      if (panel) {
        panel.showFloatingInMode(study, "workspace");
        pushSelection();
        return true;
      }
      var created;
      try {
        created = AddonWebPanel.panel();
      } catch (error) {
        console.log("[MN Writer] 创建面板失败：" + error);
        created = null;
      }
      if (!created) {
        return false;
      }
      created.panelWidth = 960;
      created.maxContentHeight = 1200;
      created.onMessage = function (name, payload) {
        if (name === "__closed__") {
          panel = null;
          stopLayoutTimer();
          refreshCommands();
          return {};
        }
        return config.onMessage(name, payload);
      };
      var loaded = false;
      try {
        loaded = created.loadPanel();
      } catch (error) {
        console.log("[MN Writer] 加载面板失败：" + error);
      }
      if (!loaded) {
        try {
          created.teardown();
        } catch (error) {
          console.log("[MN Writer] 释放未加载的面板失败：" + error);
        }
        return false;
      }
      panel = created;
      try {
        panel.showFloatingInMode(study, "workspace");
      } catch (error) {
        console.log("[MN Writer] 显示面板失败：" + error);
        panel = null;
        return false;
      }
      lastSelectionKey = "";
      pushSelection();
      refreshCommands();
      layout.enforce();
      startLayoutTimer();
      return true;
    }

    function startLayoutTimer() {
      stopLayoutTimer();
      layoutTimer = NSTimer.scheduledTimerWithTimeInterval(
        LAYOUT_INTERVAL_SECONDS,
        true,
        function () {
          layout.enforce();
        },
      );
    }

    function stopLayoutTimer() {
      if (!layoutTimer) return;
      try {
        layoutTimer.invalidate();
      } catch (error) {
        console.log("[MN Writer] 停止布局定时器失败：" + error);
      }
      layoutTimer = null;
    }

    function close() {
      if (!panel) return;
      stopLayoutTimer();
      try {
        panel.hideFloating();
      } catch (error) {
        console.log("[MN Writer] 收起面板失败：" + error);
      }
      panel = null;
      refreshCommands();
    }

    function toggle() {
      if (isOpen()) {
        close();
        return true;
      }
      return open();
    }

    function post(event, data) {
      if (!panel) return;
      try {
        panel.post(event, data);
      } catch (error) {
        console.log("[MN Writer] 推送事件失败：" + error);
      }
    }

    function pushSelection() {
      if (!panel) return;
      var noteIds = __MN_WRITER_SELECTION__.selectedNoteIds({ window: config.getWindow() });
      var key = noteIds.join("|");
      if (key === lastSelectionKey) return;
      lastSelectionKey = key;
      post("selection", { noteIds: noteIds });
    }

    function handleSelectionChanged() {
      if (selectionTimer) selectionTimer.invalidate();
      selectionTimer = NSTimer.scheduledTimerWithTimeInterval(
        DEBOUNCE_SECONDS,
        false,
        function () {
          selectionTimer = null;
          pushSelection();
        },
      );
    }

    function installSelectionObserver(observer) {
      var center = NSNotificationCenter.defaultCenter();
      center.removeObserverName(observer, SELECTION_NOTIFICATION);
      center.addObserverSelectorName(observer, "onWriterSelectionChanged:", SELECTION_NOTIFICATION);
    }

    function removeSelectionObserver(observer) {
      if (selectionTimer) {
        try {
          selectionTimer.invalidate();
        } catch (error) {
          console.log("[MN Writer] 清理防抖定时器失败：" + error);
        }
        selectionTimer = null;
      }
      try {
        NSNotificationCenter.defaultCenter().removeObserverName(observer, SELECTION_NOTIFICATION);
      } catch (error) {
        console.log("[MN Writer] 移除选中监听失败：" + error);
      }
    }

    return {
      open: open,
      close: close,
      toggle: toggle,
      isOpen: isOpen,
      layout: layout.enforce,
      safeSize: layout.metrics,
      refreshCommands: refreshCommands,
      post: post,
      pushSelection: pushSelection,
      handleSelectionChanged: handleSelectionChanged,
      installSelectionObserver: installSelectionObserver,
      removeSelectionObserver: removeSelectionObserver,
    };
  }

  return { create: create };
})();
