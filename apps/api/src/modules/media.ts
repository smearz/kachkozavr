import { createReadStream } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStudent } from "./auth-guards.js";
import { FilesystemStorageProvider } from "../storage/filesystem-provider.js";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const mediaRoot = process.env.MEDIA_ROOT ?? path.resolve(process.cwd(), "var", "media-private");
const storage = new FilesystemStorageProvider(mediaRoot);

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function canReadAttachment(user: { id: string; role: "trainer" | "student" }, attachmentId: string) {
  if (user.role === "student") {
    return prisma.reportAttachment.findFirst({
      where: {
        id: attachmentId,
        report: {
          student: {
            userId: user.id
          }
        }
      },
      select: {
        id: true,
        objectKey: true,
        mimeType: true,
        sizeBytes: true
      }
    });
  }

  return prisma.reportAttachment.findFirst({
    where: {
      id: attachmentId,
      report: {
        student: {
          memberships: {
            some: {
              group: {
                trainer: {
                  userId: user.id
                }
              }
            }
          }
        }
      }
    },
    select: {
      id: true,
      objectKey: true,
      mimeType: true,
      sizeBytes: true
    }
  });
}

export async function registerMediaRoutes(app: FastifyInstance) {
  app.post("/reports/:reportId/attachments", async (request, reply) => {
    const auth = await requireStudent(request, reply);
    if (!auth) return;

    const reportId = (request.params as { reportId?: string }).reportId;
    if (!reportId) {
      return reply.code(400).send({ error: "report_id_required" });
    }

    const report = await prisma.trainingReport.findFirst({
      where: {
        id: reportId,
        studentId: auth.studentId
      },
      select: { id: true }
    });
    if (!report) {
      return reply.code(404).send({ error: "report_not_found" });
    }

    const currentCount = await prisma.reportAttachment.count({
      where: { reportId: report.id }
    });
    if (currentCount >= 5) {
      return reply.code(400).send({ error: "attachment_limit_exceeded" });
    }

    const part = await request.file();
    if (!part) {
      return reply.code(400).send({ error: "file_required" });
    }

    if (!ALLOWED_MIME.has(part.mimetype)) {
      return reply.code(400).send({ error: "unsupported_mime_type", mimeType: part.mimetype });
    }

    const bytes = await part.toBuffer();
    if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
      return reply.code(400).send({ error: "file_too_large", maxBytes: MAX_FILE_SIZE_BYTES });
    }

    const ext = extensionForMime(part.mimetype);
    const objectKey = `${report.id}/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
    const stored = await storage.save({ objectKey, bytes });

    const attachment = await prisma.reportAttachment.create({
      data: {
        reportId: report.id,
        objectKey: stored.objectKey,
        mimeType: part.mimetype,
        sizeBytes: stored.sizeBytes
      },
      select: {
        id: true,
        reportId: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true
      }
    });

    return reply.code(201).send({ attachment });
  });

  app.get("/attachments/:attachmentId/content", async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const attachmentId = (request.params as { attachmentId?: string }).attachmentId;
    if (!attachmentId) {
      return reply.code(400).send({ error: "attachment_id_required" });
    }

    const attachment = await canReadAttachment(auth, attachmentId);
    if (!attachment) {
      return reply.code(404).send({ error: "attachment_not_found" });
    }

    const absolutePath = storage.getPath({ objectKey: attachment.objectKey });
    reply.header("content-length", String(attachment.sizeBytes));
    reply.type(attachment.mimeType);
    return reply.send(createReadStream(absolutePath));
  });
}
