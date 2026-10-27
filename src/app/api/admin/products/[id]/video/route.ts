import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { put } from "@vercel/blob";
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
 await requirePerm("product.update"); const file=(await req.formData()).get("file");
 if (!(file instanceof File)) throw new ApiError(400,"اختر ملف فيديو");
 if(file.size<16) throw new ApiError(400,"ملف الفيديو فارغ");
 const types:Record<string,string>={"video/mp4":"mp4","video/webm":"webm","video/quicktime":"mov","video/ogg":"ogv"};
 if(!types[file.type]) throw new ApiError(400,"استخدم MP4 أو WebM أو MOV أو OGG");
 const product=await db.product.findUnique({where:{id:params.id},select:{id:true,videoUrls:true,videoUrl:true}});
 if(!product) throw new ApiError(404,"المنتج غير موجود");
 if(!process.env.BLOB_READ_WRITE_TOKEN) throw new ApiError(500,"تخزين الفيديو غير مربوط بـ Vercel Blob");
 const blob=await put(`products/videos/${product.id}-${Date.now()}.${types[file.type]}`,file,{access:"public",addRandomSuffix:true,contentType:file.type});
 await db.product.update({where:{id:product.id},data:{videoUrl:blob.url,videoUrls:[...product.videoUrls,blob.url]}});
 return json({url:blob.url},201);
});
export const DELETE = route<{ params: { id: string } }>(async (req,{params})=>{
 await requirePerm("product.update"); const body=await req.json().catch(()=>({url:null}));
 const product=await db.product.findUnique({where:{id:params.id},select:{id:true,videoUrls:true,videoUrl:true}});
 if(!product) throw new ApiError(404,"المنتج غير موجود");
 const urls=product.videoUrls.filter((u)=>u!==body.url);
 await db.product.update({where:{id:params.id},data:{videoUrls:urls,videoUrl:urls[0]??null}});
 return json({deleted:true});
});
