import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "employee-docs";
const MAX = 20 * 1024 * 1024; // 20MB
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic", "application/pdf"];

// Upload an employee document (ID copy, house registration, bank book, etc.)
// HR/owner can upload for anyone; an employee can upload for themselves.
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const docType = String(form.get("docType") || "other");

  const canManageOthers = ctx.isOwner || can(ctx, "people", "edit");
  const formEmployeeId = String(form.get("employeeId") || "");
  const employeeId = canManageOthers ? formEmployeeId : ctx.employeeId || "";
  if (!employeeId) return new Response("employeeId required", { status: 400 });
  if (!canManageOthers && employeeId !== ctx.employeeId) return new Response("forbidden", { status: 403 });

  if (!(file instanceof File)) return new Response("no file", { status: 400 });
  if (file.size > MAX) return new Response("ไฟล์ใหญ่เกิน 20MB", { status: 413 });
  if (!OK_TYPES.includes(file.type)) return new Response("รองรับเฉพาะรูปภาพหรือ PDF", { status: 415 });

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${employeeId}/${docType}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const up = await admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: false });
  if (up.error) return new Response(up.error.message, { status: 500 });

  const { data: doc, error } = await admin
    .from("documents")
    .insert({
      title: file.name,
      employee_id: employeeId,
      doc_type: docType,
      storage_path: path,
      is_sensitive: true,
      visibility: "role",
      uploaded_by: ctx.userId,
    })
    .select("id, title, doc_type, storage_path, created_at")
    .single();

  if (error) {
    await admin.storage.from(BUCKET).remove([path]); // roll back the orphan file
    return new Response(error.message, { status: 500 });
  }

  // audit so HR/owner can see who added what (shows in the employee's History tab)
  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: canManageOthers ? "upload_document" : "self_upload_document",
    module: "people",
    entity: "documents",
    entity_id: employeeId,
    meta: { doc_type: docType, title: file.name },
  });

  return Response.json({ ok: true, doc });
}

// Delete a document. HR/owner can delete any; an employee can delete their own.
export async function DELETE(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const { documentId } = await req.json().catch(() => ({}));
  if (!documentId) return new Response("documentId required", { status: 400 });

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documents")
    .select("id, storage_path, employee_id")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return new Response("not found", { status: 404 });

  const canManageOthers = ctx.isOwner || can(ctx, "people", "edit");
  if (!canManageOthers && doc.employee_id !== ctx.employeeId) {
    return new Response("forbidden", { status: 403 });
  }

  if (doc.storage_path) await admin.storage.from(BUCKET).remove([doc.storage_path]);
  await admin.from("documents").delete().eq("id", documentId);

  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: canManageOthers ? "delete_document" : "self_delete_document",
    module: "people",
    entity: "documents",
    entity_id: doc.employee_id,
    meta: { document_id: documentId },
  });

  return Response.json({ ok: true });
}
