// رفع الصور: بنتأكد إن الملف صورة حقيقية، ونسمّيه اسم عشوائي
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { UPLOADS_DIR } = require("./config");

const IMG_PATH_RE = /^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/;

// بنقرا أول بايتات الملف عشان نعرف نوعه الحقيقي (مش بنصدّق اللي المتصفح بيقوله)
function detectExt(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

function saveImage(buf) {
  const ext = detectExt(buf);
  if (!ext) return null;
  const name = crypto.randomBytes(12).toString("hex") + "." + ext;
  fs.writeFileSync(path.join(UPLOADS_DIR, name), buf);
  return "/uploads/" + name;
}

// حذف صورة قديمة (بس لو مفيش منتج تاني بيستخدمها)
function removeImage(imgPath, products) {
  if (!imgPath || !IMG_PATH_RE.test(imgPath)) return;
  if (products.some((p) => p.image === imgPath)) return;
  fs.unlink(path.join(UPLOADS_DIR, path.basename(imgPath)), () => {});
}

module.exports = { IMG_PATH_RE, detectExt, saveImage, removeImage };
