var __MN_WRITER_PANEL__ = (function () {
  var DEBOUNCE_SECONDS = 0.12;
  var SELECTION_NOTIFICATION = "SelectionChanged";

  function ensureState(context) {
    if (typeof context.panelGeneration !== "number") context.panelGeneration = 0;
    if (typeof context.panelVisible !== "boolean") context.panelVisible = false;
    if (!context.selectionTimer) context.selectionTimer = null;
    if (typeof context.lastSelectionKey !== "string") context.lastSelectionKey = "";
    return context;
  }

  function studyController(context) {
    try {
      if (!context || !context.window) return null;
      return Application.sharedInstance().studyController(context.window);
    } catch (error) {
      return null;
    }
  }

  function showHud(context, message) {
    try {
      Application.sharedInstance().showHUD(message, context.window, 2);
    } catch (error) {
      console.log("[MN Writer] " + message);
    }
  }

  function refreshCommands(context) {
    var controller = studyController(context);
    if (!controller) return;
    try {
      controller.refreshAddonCommands();
    } catch (error) {
      console.log("[MN Writer] 刷新工具栏状态失败：" + error);
    }
  }

  function clearSelectionTimer(context) {
    if (!context.selectionTimer) return;
    try {
      context.selectionTimer.invalidate();
    } catch (error) {
      console.log("[MN Writer] 清理防抖定时器失败：" + error);
    }
    context.selectionTimer = null;
  }

  function removeSelectionObserver(context) {
    clearSelectionTimer(context);
    try {
      NSNotificationCenter.defaultCenter().removeObserverName(context, SELECTION_NOTIFICATION);
    } catch (error) {
      console.log("[MN Writer] 移除选中监听失败：" + error);
    }
  }

  function addSelectionObserver(context) {
    var center = NSNotificationCenter.defaultCenter();
    center.removeObserverName(context, SELECTION_NOTIFICATION);
    center.addObserverSelectorName(context, "onWriterSelectionChanged:", SELECTION_NOTIFICATION);
  }

  // 唯一的面板释放路径：先收起浮层，再断开回调与监听，最后交给宿主回收。
  function releasePanel(context, reason) {
    var panel = context.panel;
    context.panel = null;
    context.panelVisible = false;
    context.panelGeneration = (context.panelGeneration || 0) + 1;
    removeSelectionObserver(context);
    context.lastSelectionKey = "";
    if (panel) {
      try {
        panel.hideFloating();
      } catch (error) {
        console.log("[MN Writer] 收起浮层失败（" + reason + "）：" + error);
      }
      try {
        panel.onMessage = null;
      } catch (error) {
        console.log("[MN Writer] 断开面板回调失败（" + reason + "）：" + error);
      }
      try {
        panel.teardown();
      } catch (error) {
        console.log("[MN Writer] 释放面板失败（" + reason + "）：" + error);
      }
    }
    refreshCommands(context);
  }

  function pushSelection(context) {
    var panel = context.panel;
    if (!panel) return;
    var noteIds = __MN_WRITER_SELECTION__.selectedNoteIds(context);
    var key = noteIds.join("|");
    if (key === context.lastSelectionKey) return;
    context.lastSelectionKey = key;
    try {
      panel.post("selection", { noteIds: noteIds });
    } catch (error) {
      console.log("[MN Writer] 推送选中卡片失败：" + error);
    }
  }

  function onSelectionChanged(context) {
    ensureState(context);
    clearSelectionTimer(context);
    context.selectionTimer = NSTimer.scheduledTimerWithTimeInterval(
      DEBOUNCE_SECONDS,
      false,
      function () {
        context.selectionTimer = null;
        pushSelection(context);
      },
    );
  }

  function handleMessage(context, generation, name, payload) {
    if (name === "ping") {
      return { ok: true, payload: payload === undefined ? null : payload };
    }
    if (name === "selection:list") {
      return { noteIds: __MN_WRITER_SELECTION__.selectedNoteIds(context) };
    }
    if (name === "storage:load") {
      var keys = payload && Array.isArray(payload.keys) ? payload.keys : [];
      return { values: __MN_WRITER_STORAGE__.load(keys) };
    }
    if (name === "storage:save") {
      return __MN_WRITER_STORAGE__.save(payload);
    }
    if (name === "__closed__") {
      // 旧面板迟到的关闭通知不能影响新面板。
      if (generation === context.panelGeneration) releasePanel(context, "页面关闭");
      return {};
    }
    throw new Error("未知的面板命令：" + name);
  }

  function createPanel(context) {
    var generation = context.panelGeneration + 1;
    context.panelGeneration = generation;

    var created = AddonWebPanel.panel();
    if (!created) return null;

    created.panelWidth = 960;
    created.maxContentHeight = 1200;
    created.onMessage = function (name, payload) {
      return handleMessage(context, generation, name, payload);
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
      return null;
    }
    return created;
  }

  function openPanel(context) {
    ensureState(context);
    var study = studyController(context);
    if (!study) {
      showHud(context, "请先在 MarginNote 中打开学习集");
      return false;
    }

    if (!context.panel) {
      var created = null;
      try {
        created = createPanel(context);
      } catch (error) {
        console.log("[MN Writer] 创建面板失败：" + error);
      }
      if (!created) {
        context.panel = null;
        showHud(context, "无法创建面板，请在沉浸模式下打开，并确认模板插件名单包含 " + context.addonid);
        return false;
      }
      context.panel = created;
      context.lastSelectionKey = "";
      addSelectionObserver(context);
    }

    try {
      context.panel.showFloatingIn(study);
    } catch (error) {
      showHud(context, "显示面板失败：" + error);
      releasePanel(context, "显示失败");
      return false;
    }
    context.panelVisible = true;
    refreshCommands(context);
    pushSelection(context);
    return true;
  }

  function layout(context) {
    if (!context.panel || !context.panelVisible) return;
    var study = studyController(context);
    if (!study) return;
    try {
      context.panel.showFloatingIn(study);
    } catch (error) {
      console.log("[MN Writer] 面板布局失败：" + error);
    }
  }

  function toggle(context) {
    ensureState(context);
    if (context.panelVisible) {
      releasePanel(context, "用户收起");
      return;
    }
    if (context.panel) releasePanel(context, "残留面板");
    openPanel(context);
  }

  function commandStatus(context) {
    ensureState(context);
    return {
      image: "icon.png",
      object: context,
      selector: "togglePanel:",
      checked: context.panelVisible,
    };
  }

  function connect(context, addonid, mainPath) {
    context.addonid = addonid;
    context.mainPath = mainPath;
    context.panel = null;
    context.panelVisible = false;
    context.panelGeneration = 0;
    context.selectionTimer = null;
    context.lastSelectionKey = "";
  }

  function disconnect(context) {
    releasePanel(context, "插件断开");
  }

  function notebookWillOpen(context) {
    openPanel(context);
  }

  function layoutIfStudy(context, controller) {
    if (controller === studyController(context)) layout(context);
  }

  return {
    connect: connect,
    disconnect: disconnect,
    notebookWillOpen: notebookWillOpen,
    layoutIfStudy: layoutIfStudy,
    onSelectionChanged: onSelectionChanged,
    commandStatus: commandStatus,
    toggle: toggle,
    open: openPanel,
    release: releasePanel,
  };
})();
