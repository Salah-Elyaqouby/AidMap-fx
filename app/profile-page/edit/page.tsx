'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/profile-page', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) throw new Error('Failed to load user profile');
        const data = await res.json();
        setFormData({
          name: data.name,
          email: data.email,
          password: '',
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        ...(formData.password.trim() !== '' && { password: formData.password }),
      };

      const res = await fetch('/api/profile-page/edit', {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'خطأ في تحديث الملف الشخصي');
      }

      router.refresh();
      router.push('/profile-page');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'خطأ في تحديث الملف الشخصي');
    }
  };

  if (loading) {
    return (
      <div className="w-full py-10" dir="rtl">
        <div className="mx-auto max-w-[800px] px-6 text-right">
          <p className="text-sm text-muted-foreground">جاري تحميل البيانات الشخصية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-10" dir="rtl">
      <div className="mx-auto w-full max-w-[800px] px-6 space-y-6">
        {/* العنوان */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">تعديل الملف الشخصي</h1>
          <p className="text-sm text-muted-foreground">
            قم بتحديث معلوماتك الشخصية.
          </p>
        </div>

        {/* نموذج البيانات */}
        <form
          onSubmit={handleSave}
          className="rounded-2xl border bg-background p-5 shadow-sm"
        >
          <h3 className="mb-4 font-semibold text-right">بيانات الحساب</h3>

          <div className="space-y-4 text-sm text-right">
            {/* الاسم الكامل */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground">الاسم الكامل</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="أدخل اسمك الكامل"
                className="h-9 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>

            {/* البريد الإلكتروني */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="أدخل بريدك الإلكتروني"
                className="h-9 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>

            {/* كلمة المرور */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground">كلمة المرور</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="أدخل كلمة مرور جديدة"
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