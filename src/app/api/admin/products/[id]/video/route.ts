import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { put } from "@vercel/blob";
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
 await requirePerm("product.update"); const file=(await req.formData()).get("file");
 if (!(file instanceof File)) throw new ApiError(400,"اختر ملف فيديو"); if(file.size<16||file.size>100*1024*1024) throw new ApiError(400,"حجم الفيديو يجب ألا يتجاوز 100 ميجابايت");
 const types:Record<string,string>={"video/mp4":"mp4","video/webm":"webm","video/quicktime":"mov"}; if(!types[file.type]) throw new ApiError(400,"استخدم فيديو MP4 أو WebM أو MOV");
 const product=await db.product.findUnique({where:{id:params.id},select:{id:true}}); if(!product) throw new ApiError(404,"المنتج غير موجود"); if(!process.env.BLOB_READ_WRITE_TOKEN) throw new ApiError(500,"تخزين الملفات غير مُعد. اربط Blob Store بمشروع Vercel");
 const blob=await put(`products/videos/${product.id}-${Date.now()}.${types[file.type]}`,file,{access:"public",addRandomSuffix:true,contentType:file.type}); await db.product.update({where:{id:product.id},data:{videoUrl:blob.url}}); return json({url:blob.url},201);
});
export const DELETE = route<{ params: { id: string } }>(async (_req,{params})=>{await requirePerm("product.update");const product=await db.product.update({where:{id:params.id},data:{videoUrl:null},select:{id:true}});return json({id:product.id,deleted:true});});
