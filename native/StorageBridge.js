var __MN_WRITER_STORAGE__ = (function () {
  var PREFIX = "mn_writer_";
  var LEGACY_DOCUMENTS_KEY = "mn-writer:documents:v1";
  var DIRECTORY_NAME = "MNWriter";
  var DOCUMENTS_FILE = "documents.json";
  var KNOWLEDGE_FILE = "knowledge.json";
  var UTF8_ENCODING = 4;

  function store() {
    return NSUserDefaults.standardUserDefaults();
  }

  function scopedKey(key) {
    return PREFIX + String(key);
  }

  function directoryPath() {
    try {
      var root = Application.sharedInstance().documentPath;
      if (!root) return null;
      return String(root) + "/" + DIRECTORY_NAME;
    } catch (error) {
      return null;
    }
  }

  function documentsPath() {
    var directory = directoryPath();
    return directory ? directory + "/" + DOCUMENTS_FILE : null;
  }

  function knowledgePath() {
    var directory = directoryPath();
    return directory ? directory + "/" + KNOWLEDGE_FILE : null;
  }

  function ensureDirectory(path) {
    try {
      var manager = NSFileManager.defaultManager();
      if (manager.fileExistsAtPath(path)) return true;
      return Boolean(
        manager.createDirectoryAtPathWithIntermediateDirectoriesAttributes(path, true, null),
      );
    } catch (error) {
      console.log("[MN Writer] 创建文稿目录失败：" + String(error));
      return false;
    }
  }

  function readFile(path) {
    try {
      var data = NSData.dataWithContentsOfFile(path);
      if (!data) return null;
      return String(NSString.stringWithContentsOfData(data) || "");
    } catch (error) {
      console.log("[MN Writer] 读取文稿文件失败：" + String(error));
      return null;
    }
  }

  function writeFile(path, text) {
    try {
      var data = NSString.stringWithString(String(text)).dataUsingEncoding(UTF8_ENCODING);
      if (!data) return false;
      return Boolean(data.writeToFileAtomically(path, true));
    } catch (error) {
      console.log("[MN Writer] 写入文稿文件失败：" + String(error));
      return false;
    }
  }

  function load(keys) {
    var values = {};
    (keys || []).forEach(function (key) {
      var value = store().objectForKey(scopedKey(key));
      if (value !== undefined && value !== null) values[String(key)] = String(value);
    });
    return values;
  }

  function save(payload) {
    if (!payload || typeof payload.key !== "string" || !payload.key) {
      throw new Error("存储键无效");
    }
    var key = scopedKey(payload.key);
    if (payload.value === null || payload.value === undefined) {
      store().removeObjectForKey(key);
    } else {
      store().setObjectForKey(String(payload.value), key);
    }
    return { ok: true };
  }

  /** 旧版本写在 NSUserDefaults 里的文稿数据。 */
  function legacyDocuments() {
    var value = store().objectForKey(scopedKey(LEGACY_DOCUMENTS_KEY));
    if (value === undefined || value === null) return null;
    return String(value);
  }

  /**
   * 读取文稿数据。
   *
   * 文稿保存在应用文档目录下的文件里，不写入 NSUserDefaults。
   * 旧版本把文稿写进了 NSUserDefaults，此处读到旧数据时搬到文件并清掉旧键。
   */
  function loadDocuments() {
    var path = documentsPath();
    if (!path) return { value: legacyDocuments(), migrated: false };
    var manager = NSFileManager.defaultManager();
    if (manager.fileExistsAtPath(path)) {
      return { value: readFile(path), migrated: false };
    }
    var legacy = legacyDocuments();
    if (legacy === null) {
      return { value: null, migrated: false };
    }
    var text = legacy;
    if (!ensureDirectory(directoryPath())) {
      return { value: text, migrated: false };
    }
    if (!writeFile(path, text)) {
      return { value: text, migrated: false };
    }
    store().removeObjectForKey(scopedKey(LEGACY_DOCUMENTS_KEY));
    console.log("[MN Writer] 文稿数据已迁移到本地文件");
    return { value: text, migrated: true };
  }

  function saveDocuments(payload) {
    var text = payload && typeof payload.value === "string" ? payload.value : "";
    var path = documentsPath();
    var written = Boolean(path && ensureDirectory(directoryPath()) && writeFile(path, text));
    if (!written) {
      // 文件不可用时暂存到 NSUserDefaults，保证内容不丢失。
      try {
        store().setObjectForKey(text, scopedKey(LEGACY_DOCUMENTS_KEY));
        console.log("[MN Writer] 文稿文件不可用，暂存到 NSUserDefaults");
      } catch (error) {
        throw new Error("文稿写入失败", { cause: error });
      }
      return { ok: false, fallback: true };
    }
    return { ok: true };
  }

  /**
   * 读取跨文稿的卡片使用记录。
   *
   * 记录随作者积累，独立于文稿保存在单独的文件里。
   */
  function loadKnowledge() {
    var path = knowledgePath();
    if (!path) return { value: null };
    return { value: readFile(path) };
  }

  function saveKnowledge(payload) {
    var text = payload && typeof payload.value === "string" ? payload.value : "";
    var path = knowledgePath();
    var written = Boolean(path && ensureDirectory(directoryPath()) && writeFile(path, text));
    if (!written) {
      try {
        store().setObjectForKey(text, scopedKey("mn-writer:knowledge:v1"));
      } catch (error) {
        throw new Error("知识记录写入失败", { cause: error });
      }
      return { ok: false, fallback: true };
    }
    return { ok: true };
  }

  return {
    load: load,
    save: save,
    loadDocuments: loadDocuments,
    saveDocuments: saveDocuments,
    loadKnowledge: loadKnowledge,
    saveKnowledge: saveKnowledge,
  };
})();
