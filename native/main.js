JSB.require("SelectionBridge");
JSB.require("StorageBridge");
JSB.require("PanelBridge");

JSB.newAddon = function (mainPath) {
  return JSB.defineClass("MNWriterAddon : JSExtension", {
    sceneWillConnect: function () {
      __MN_WRITER_PANEL__.connect(self, "top.museday.mn.writer", mainPath);
    },

    sceneDidDisconnect: function () {
      __MN_WRITER_PANEL__.disconnect(self);
    },

    notebookWillOpen: function () {
      __MN_WRITER_PANEL__.notebookWillOpen(self);
    },

    controllerWillLayoutSubviews: function (controller) {
      __MN_WRITER_PANEL__.layoutIfStudy(self, controller);
    },

    onWriterSelectionChanged: function () {
      __MN_WRITER_PANEL__.onSelectionChanged(self);
    },

    queryAddonCommandStatus: function () {
      return __MN_WRITER_PANEL__.commandStatus(self);
    },

    togglePanel: function () {
      __MN_WRITER_PANEL__.toggle(self);
    },
  });
};
