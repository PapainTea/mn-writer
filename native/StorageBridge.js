var __MN_WRITER_STORAGE__ = (function () {
  var PREFIX = "mn_writer_";

  function store() {
    return NSUserDefaults.standardUserDefaults();
  }

  function scopedKey(key) {
    return PREFIX + String(key);
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

  return {
    load: load,
    save: save,
  };
})();
