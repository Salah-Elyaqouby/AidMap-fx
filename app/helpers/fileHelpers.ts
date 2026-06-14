// app/helpers/fileHelpers.ts

// ✅ fs: مكتبة Node.js لقراءة/كتابة الملفات على القرص (Server فقط)
import fs from "fs";

// ✅ path: للتعامل مع المسارات بشكل آمن على كل الأنظمة (Windows/Linux/Mac)
import path from "path";

// ✅ z: مكتبة Zod للتحقق من البيانات (Validation)
import { z } from "zod";

/* =========================================================
   1) File utilities: ensure + atomic write
   الهدف:
   - نتأكد إن الملف موجود (ولو مش موجود ننشئه)
   - نكتب بشكل "آمن" بدون ما نخرب الملف لو صار crash أثناء الكتابة
========================================================= */

/**
 * ✅ ensureJsonFile
 * تتأكد إن:
 * - المجلد موجود (وتنشئه لو مش موجود)
 * - الملف موجود (وتنشئه بمحتوى افتراضي لو مش موجود)
 */
export function ensureJsonFile(filePath: string, defaultValue: unknown = []) {
  // ناخذ مسار المجلد من مسار الملف
  const dir = path.dirname(filePath);

  // لو المجلد مش موجود → ننشئه (recursive يعني ينشئ كل المجلدات في الطريق)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // لو الملف مش موجود → ننشئه ونحط فيه defaultValue (مثلاً [])
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

/**
 * ✅ writeJsonAtomic
 * كتابة "ذرّية" Atomic:
 * - نكتب البيانات في ملف مؤقت (.tmp)
 * - ثم نستبدل الملف الأصلي بالملف المؤقت (rename)
 *
 * الفائدة:
 * إذا انقطع البرنامج أثناء الكتابة، ما يصير عندك ملف JSON ناقص/تالف.
 */
export function writeJsonAtomic(filePath: string, data: unknown) {
  ensureJsonFile(filePath, []);
  const tmp = `${filePath}.tmp`;

  // نكتب للملف المؤقت
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");

  // نستبدل الملف الأصلي (عملية rename غالبًا تكون atomic في أغلب الأنظمة)
  fs.renameSync(tmp, filePath);
}

/* =========================================================
   2) Zod safe read/write
   الهدف:
   - نقرأ JSON بأمان (مع catch للأخطاء)
   - نتحقق من شكل البيانات باستخدام Zod
========================================================= */

/**
 * ✅ readJsonUnknown
 * تقرأ JSON وترجع بيانات "unknown"
 * يعني: ما بنفترض شكلها، بس بنضمن إنها JSON صالح أو نرمي خطأ.
 */
export function readJsonUnknown(filePath: string, defaultValue: unknown = []) {
  // نتأكد الملف موجود قبل القراءة
  ensureJsonFile(filePath, defaultValue);

  // نقرأ نص الملف
  const raw = fs.readFileSync(filePath, "utf8").trim();

  // لو الملف فاضي → رجّع defaultValue
  if (!raw) return defaultValue;

  // نحاول نعمل parse
  try {
    return JSON.parse(raw);
  } catch (e) {
    // إذا JSON مش صالح → نرمي خطأ واضح
    throw new Error(
      `Invalid JSON format in ${filePath}: ${(e as Error).message}`
    );
  }
}

/**
 * ✅ readJsonWithZod
 * تقرأ JSON ثم تتحقق منه عبر Zod schema.
 * - إذا البيانات غلط → خطأ مع تفاصيل (أي field غلط ولماذا)
 * - إذا صح → ترجع typed data
 */
export function readJsonWithZod<T>(
  filePath: string,
  schema: z.ZodSchema<T>,
  defaultValue: unknown = []
): T {
  // نقرأ raw JSON (unknown)
  const json = readJsonUnknown(filePath, defaultValue);

  // نعمل validate باستخدام safeParse (ما يرمي exception تلقائيًا)
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    // نجمع تفاصيل أخطاء Zod (أسماء الحقول + سبب الخطأ)
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join(" | ");

    // نرمي Error موحد وواضح
    throw new Error(`Zod validation failed for ${filePath}: ${details}`);
  }

  // ✅ البيانات صالحة ومطابقة للـ schema
  return parsed.data;
}

/**
 * ✅ validateInputWithZod
 * تستخدم للتحقق من body القادم من request (POST/PUT)
 * - تحميك من بيانات ناقصة أو خاطئة قبل ما تخزنيها.
 */
export function validateInputWithZod<T>(
  input: unknown,
  schema: z.ZodSchema<T>,
  errorPrefix = "Invalid input"
): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join(" | ");

    throw new Error(`${errorPrefix}: ${details}`);
  }

  return parsed.data;
}

/* =========================================================
   3) Business validation: duplicate checks
   الهدف:
   - التحقق من التكرار (Unique constraint) مثل:
     - camp name ما يتكرر
     - beneficiary phone ما يتكرر
========================================================= */

/**
 * DuplicateKey:
 * - يا إما دالة واحدة ترجع المفتاح الفريد (مثل email)
 * - أو Array دوال (مثل name + phone) لو بدك أكثر من شرط uniqueness
 */
export type DuplicateKey<T> =
  | ((item: T) => string)
  | Array<(item: T) => string>;

/**
 * normalizeKey:
 * لتوحيد النص قبل المقارنة:
 * - remove spaces حول النص
 * - lowercase
 */
function normalizeKey(v: string) {
  return v.trim().toLowerCase();
}

/**
 * ✅ assertNoDuplicates
 * تفحص Array وتمنع التكرار حسب uniqueBy
 * مثال:
 * assertNoDuplicates(camps, c => c.name, "Camp already exists")
 */
export function assertNoDuplicates<T>(
  items: T[],
  uniqueBy: DuplicateKey<T>,
  message = "Duplicate value"
) {
  // نحول uniqueBy إلى array دائمًا لتسهيل المنطق
  const fns = Array.isArray(uniqueBy) ? uniqueBy : [uniqueBy];

  // نفحص كل unique rule لوحدها
  for (const fn of fns) {
    const seen = new Set<string>();

    for (const it of items) {
      const raw = fn(it);
      if (!raw) continue;

      const k = normalizeKey(raw);

      // إذا المفتاح موجود من قبل → تكرار
      if (seen.has(k)) throw new Error(`${message}: ${raw}`);

      seen.add(k);
    }
  }
}

/* =========================================================
   4) Generic JSON "table" store (array CRUD)
   الهدف:
   - تعمل store عام يشبه جدول database بس داخل JSON file
   - يدعم:
     list/get/create/update/remove/removeAll
   - مع:
     ensure file + zod validate + duplicate validation
========================================================= */

/**
 * إعدادات الـ store العام:
 * - filePath: مسار ملف json
 * - fileSchema: schema للملف كله (غالبًا z.array(ItemSchema))
 * - createSchema: schema لمدخلات create (بدون id)
 * - updateSchema: schema لمدخلات update (partial بدون id)
 * - uniqueBy: optional للتحقق من التكرار
 * - makeId: مولد id (مثل randomUUID)
 */
export type JsonTableStoreConfig<T extends { id: string }> = {
  filePath: string;

  fileSchema: z.ZodSchema<T[]>;
  createSchema: z.ZodSchema<Omit<T, "id">>;
  updateSchema: z.ZodSchema<Partial<Omit<T, "id">>>;

  defaultValue?: T[];

  uniqueBy?: DuplicateKey<T>;
  duplicateMessage?: string;

  makeId: () => string;
};

/**
 * ✅ createJsonTableStore
 * ترجع object فيه functions CRUD جاهزة.
 */
export function createJsonTableStore<T extends { id: string }>(
  cfg: JsonTableStoreConfig<T>
) {
  const defaultValue = cfg.defaultValue ?? [];

  // قراءة كل البيانات من الملف بعد التحقق من schema
  function readAll(): T[] {
    return readJsonWithZod(cfg.filePath, cfg.fileSchema, defaultValue);
  }

  // كتابة كل البيانات بعد فحص التكرار (Business validation)
  function writeAll(data: T[]) {
    if (cfg.uniqueBy) {
      assertNoDuplicates(
        data,
        cfg.uniqueBy,
        cfg.duplicateMessage ?? "Duplicate"
      );
    }
    writeJsonAtomic(cfg.filePath, data);
  }

  // هذا اللي هيرجع للمستدعي
  return {
    /**
     * ✅ list: يرجع كل السجلات
     */
    list(): T[] {
      return readAll();
    },

    /**
     * ✅ getById: يرجع سجل واحد أو null
     */
    getById(id: string): T | null {
      const data = readAll();
      return data.find((x) => x.id === id) ?? null;
    },

    /**
     * ✅ create:
     * - يتحقق من body باستخدام createSchema
     * - يولد id
     * - يضيف السجل
     * - يمنع التكرار
     */
    create(input: unknown): T {
      const body = validateInputWithZod(input, cfg.createSchema, "Create failed");
      const data = readAll();

      const row: T = { id: cfg.makeId(), ...(body as any) };
      const next = [row, ...data];

      writeAll(next);
      return row;
    },

    /**
     * ✅ update:
     * - يتحقق من patch باستخدام updateSchema (partial)
     * - يتأكد إن id موجود
     * - يحدث السجل
     * - يمنع التكرار بعد التحديث
     */
    update(id: string, input: unknown): T {
      const patch = validateInputWithZod(input, cfg.updateSchema, "Update failed");
      const data = readAll();

      const i = data.findIndex((x) => x.id === id);
      if (i === -1) throw new Error("Not found");

      const updated = { ...data[i], ...(patch as any), id };
      const next = [...data];
      next[i] = updated;

      writeAll(next);
      return updated;
    },

    /**
     * ✅ remove: حذف سجل بالـ id
     */
    remove(id: string) {
      const data = readAll();
      const next = data.filter((x) => x.id !== id);
      writeAll(next);
    },

    /**
     * ✅ removeAll: حذف كل السجلات
     */
    removeAll() {
      writeAll([]);
    },
  };
}