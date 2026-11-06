var __MN_WRITER_SELECTION__ = (function () {
  function arrayFromNSArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    var count = typeof value.count === "function" ? Number(value.count()) : Number(value.length || 0);
    var result = [];
    for (var index = 0; index < count; index += 1) {
      if (typeof value.objectAtIndex === "function") result.push(value.objectAtIndex(index));
      else result.push(value[index]);
    }
    return result;
  }

  function noteIdOf(value) {
    if (!value) return "";
    if (value.note && value.note.note) {
      return String(value.note.note.noteId || value.note.note.noteid || "");
    }
    if (value.note && (value.note.noteId || value.note.noteid)) {
      return String(value.note.noteId || value.note.noteid);
    }
    if (value.noteId || value.noteid) return String(value.noteId || value.noteid);
    return "";
  }

  function studyController(context) {
    var window = context && context.window ? context.window : null;
    if (!window) return null;
    return Application.sharedInstance().studyController(window);
  }

  function selectedNoteIds(context) {
    try {
      var controller = studyController(context);
      if (!controller || !controller.notebookController) return [];
      var mindmapView = controller.notebookController.mindmapView;
      if (!mindmapView) return [];

      var seen = {};
      var ids = [];
      arrayFromNSArray(mindmapView.selViewLst).forEach(function (item) {
        var noteId = noteIdOf(item);
        if (!noteId || seen[noteId]) return;
        seen[noteId] = true;
        ids.push(noteId);
      });
      return ids;
    } catch (error) {
      console.log("[MN Writer] 读取脑图选中卡片失败：" + error);
      return [];
    }
  }

  return {
    arrayFromNSArray: arrayFromNSArray,
    selectedNoteIds: selectedNoteIds,
  };
})();
