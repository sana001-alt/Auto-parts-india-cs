var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.post("/api/delete-cloudinary-image", async (req, res) => {
    try {
      const { publicIds } = req.body;
      if (!publicIds || !Array.isArray(publicIds)) {
        return res.status(400).json({ error: "Missing or invalid publicIds array" });
      }
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "rqf1hlrx";
      const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      if (!apiKey || !apiSecret) {
        console.warn("[Cloudinary Delete API] API key or Secret missing in server environment. Skipping Cloudinary deletion.");
        return res.json({
          success: true,
          warning: "Cloudinary credentials not configured on server. Image cleanup skipped.",
          results: []
        });
      }
      const results = [];
      const errors = [];
      for (const rawPublicId of publicIds) {
        if (!rawPublicId || typeof rawPublicId !== "string") continue;
        let publicId = rawPublicId;
        if (rawPublicId.includes("cloudinary.com")) {
          const uploadIndex = rawPublicId.indexOf("/image/upload/");
          if (uploadIndex !== -1) {
            let path2 = rawPublicId.substring(uploadIndex + "/image/upload/".length);
            const segments = path2.split("/").filter(Boolean);
            const cleanSegments = segments.filter(
              (seg) => !seg.includes(",") && !/^(c|w|h|q|f|e|b|r|a|dpr|fl|co|l|u|pg|so|eo|s|bo|o|x|y|g|p|m|t|ar|cs|d|ki|dl)_/.test(seg) && !/^v\d+$/.test(seg)
            );
            if (cleanSegments.length > 0) {
              publicId = cleanSegments.join("/");
              const lastDot = publicId.lastIndexOf(".");
              if (lastDot !== -1) {
                publicId = publicId.substring(0, lastDot);
              }
            }
          }
        }
        try {
          const timestamp = Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3).toString();
          const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
          const signature = import_crypto.default.createHash("sha1").update(stringToSign).digest("hex");
          const params = new URLSearchParams();
          params.append("public_id", publicId);
          params.append("api_key", apiKey);
          params.append("timestamp", timestamp);
          params.append("signature", signature);
          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params.toString()
          });
          const data = await response.json().catch(() => ({ result: "error" }));
          console.log(`[Cloudinary Destroy] public_id: '${publicId}' -> result:`, data.result);
          if (data.result === "ok" || data.result === "not_found") {
            results.push({ publicId, status: data.result });
          } else {
            console.warn(`[Cloudinary Destroy Warning] '${publicId}' returned result: ${data.result}`);
            results.push({ publicId, status: data.result || "failed" });
          }
        } catch (err) {
          console.error(`[Cloudinary Destroy Error] Failed for '${publicId}':`, err);
          errors.push({ publicId, error: err.message || String(err) });
        }
      }
      return res.json({ success: true, results, errors });
    } catch (error) {
      console.error("Error in delete-cloudinary-image endpoint:", error);
      return res.json({ success: true, warning: error.message || "Internal Server Error", results: [] });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });
  app.get("/api/download/debug", (req, res) => {
    const filePath = import_path.default.join(process.cwd(), "app-debug.apk");
    res.download(filePath, "app-debug.apk", (err) => {
      if (err) {
        console.error("Failed to download debug APK from root, trying build outputs folder:", err);
        const fallbackPath = import_path.default.join(process.cwd(), "android/app/build/outputs/apk/debug/app-debug.apk");
        res.download(fallbackPath, "app-debug.apk", (err2) => {
          if (err2) {
            res.status(404).send("Debug APK not found. Please run the build script first.");
          }
        });
      }
    });
  });
  app.get("/api/download/release", (req, res) => {
    const filePath = import_path.default.join(process.cwd(), "app-release-unsigned.apk");
    res.download(filePath, "app-release-unsigned.apk", (err) => {
      if (err) {
        console.error("Failed to download release APK from root, trying build outputs folder:", err);
        const fallbackPath = import_path.default.join(process.cwd(), "android/app/build/outputs/apk/release/app-release-unsigned.apk");
        res.download(fallbackPath, "app-release-unsigned.apk", (err2) => {
          if (err2) {
            res.status(404).send("Release APK not found. Please run the build script first.");
          }
        });
      }
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
