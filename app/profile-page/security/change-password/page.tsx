'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      alert('الرجاء ملء جميع الحقول المطلوبة.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      alert('كلمة المرور الجديدة وتأكيدها غير متطابقتين.');
      return;
    }

    if (formData.newPassword.length < 6) {
      alert('يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل.');
      return;
    }

    try {
      const res = await fetch('/api/profile-page/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'فشل تحديث كلمة المرور.');
      }

      alert('تم تحديث كلمة المرور بنجاح.');
      router.push('/profile-page');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'حدث خطأ أثناء تغيير كلمة المرور.');
    }
  };

  return (
    <div className="w-full py-10" dir="rtl">
      <div className="mx-auto w-full max-w-[800px] px-6 space-y-6">
        
        {/* العنوان */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#181c32]">
            تغيير كلمة المرور
          </h1>
          <p className="text-sm text-muted-foreground">
            تحديث كلمة مرور حسابك
          </p>
        </div>

        {/* بطاقة النموذج */}
        <form
          onSubmit={handleSave}
          className="rounded-2xl border bg-background p-5 shadow-sm"
        >
          <h3 className="mb-4 font-semibold text-right">الأمان</h3>

          <div className="space-y-4 text-sm text-right">
            {/* كلمة المرور الحالية */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground">
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="أدخل كلمة المرور الحالية"
                className="h-9 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>

            {/* كلمة المرور الجديدة */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="أدخل كلمة المرور الجديدة"
                className="h-9 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>

            {/* تأكيد كلمة المرور */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="تأكيد كلمة المرور الجديدة"
                className="h-9 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>

            {/* الأزرار */}
            <div className="flex justify-end gap-3 pt-2">
              <Link
                href="/profile-page"
                className="h-9 rounded-md border px-4 text-xs font-medium hover:bg-muted flex items-center justify-center"
              >
                إلغاء
              </Link>

              <button
                type="submit"
                className="h-9 rounded-md bg-primary px-4 text-xs font-medium text-white hover:opacity-90 flex items-center justify-center"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}