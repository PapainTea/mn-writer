var __MN_WRITER_CITEKEY__ = (function () {
  var STORAGE_KEY = "mnzotero_citekeys";
  var INDEX_KEY = "mn_writer_citekeys";
  var HOST_KEY = "mn_zotero_connector_host";
  var PORT_KEY = "mn_zotero_connector_port";

  function defaults() {
    return NSUserDefaults.standardUserDefaults();
  }

  function readMap(key) {
    try {
      var raw = defaults().objectForKey(key);
      if (!raw) return {};
      if (typeof raw === "object") return raw;
      var parsed = JSON.parse(String(raw));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.log("[MN Writer] 读取引用键缓存失败：" + error);
      return {};
    }
  }

  function load() {
    return readMap(STORAGE_KEY);
  }

  /** Zotero 插件的本机监听地址；未配置时返回 null。 */
  function endpoint() {
    try {
      var host = String(defaults().objectForKey(HOST_KEY) || "").trim();
      var port = Number(defaults().objectForKey(PORT_KEY) || 0);
      if (!host || !port) return null;
      return { host: host, port: port };
    } catch (error) {
      console.log("[MN Writer] 读取 Zotero 连接信息失败：" + error);
      return null;
    }
  }

  /** 读取引用键索引与抓取时间。 */
  function loadIndex() {
    try {
      var raw = defaults().objectForKey(INDEX_KEY);
      if (!raw) return null;
      var parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!parsed || typeof parsed !== "object") return null;
      var values = parsed.values && typeof parsed.values === "object" ? parsed.values : {};
      return { at: Number(parsed.at) || 0, values: values };
    } catch (error) {
      console.log("[MN Writer] 读取引用键索引失败：" + error);
      return null;
    }
  }

  /** 写入引用键索引与抓取时间。 */
  function saveIndex(values, at) {
    try {
      var payload = { at: Number(at) || 0, values: values || {} };
      defaults().setObjectForKey(JSON.stringify(payload), INDEX_KEY);
      return true;
    } catch (error) {
      console.log("[MN Writer] 写入引用键索引失败：" + error);
      return false;
    }
  }

  return { load: load, endpoint: endpoint, loadIndex: loadIndex, saveIndex: saveIndex };
})();
