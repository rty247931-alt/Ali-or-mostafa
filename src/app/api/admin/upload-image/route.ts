import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { saveImage } from "@/lib/storage";

const FOLDERS = {
  settings: { folder: "settings", perm: "settings.update" },
  categories: { folder: "categories", perm: "product.update" },
  brands: { folder: "brands", perm: "product.update" },
  banners: { folder: "banners", perm: "settings.update" },
} as const;

export const POST = route(async (req) => {
  const fd = await req.formData();
  const entity = String(fd.get("entity") ?? "");
  if (!(entity in FOLDERS)) throw new ApiError(400, "نوع الصورة غير مدعوم");
  const config = FOLDERS[entity as keyof typeof FOLDERS];
  await requirePerm(config.perm);
  const file = fd.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "اختر ملف صورة");
  const url = await saveImage(file, config.folder);
  return json({ url }, 201);
});
