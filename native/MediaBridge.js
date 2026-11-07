var __MN_WRITER_MEDIA__ = (function () {
  /**
   * 按媒体哈希取回原始字节。
   *
   * 卡片正文里的图片用哈希记录，接口取不到时由这里按哈希取回，
   * 取回的数据以 Base64 文本返回，页面据此还原成图片地址。
   */
  function read(payload) {
    var hash = payload && payload.hash ? String(payload.hash) : "";
    if (!hash) throw new Error("媒体哈希无效");
    var mimeType = payload && payload.mimeType ? String(payload.mimeType) : "image/png";
    var data;
    try {
      data = Database.sharedInstance().getMediaByHash(hash);
    } catch (error) {
      console.log("[MN Writer] 媒体读取失败：" + String(error));
      return { base64: "", mimeType: mimeType };
    }
    if (!data) return { base64: "", mimeType: mimeType };
    var base64 = data.base64Encoding();
    if (!base64 || typeof base64 !== "string") {
      return { base64: "", mimeType: mimeType };
    }
    return { base64: base64, mimeType: mimeType };
  }

  return {
    read: read,
  };
})();
