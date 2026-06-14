'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircle, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getSignupSchema, SignupSchemaType } from '../forms/signup-schema';

export default function Page() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignupSchemaType>({
    resolver: zodResolver(getSignupSchema()),
    defaultValues: { name: '', email: '', password: '', passwordConfirmation: '', accept: false },
  });

  async function onSubmit(values: SignupSchemaType) {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'حدث خطأ أثناء إنشاء الحساب');
      } else {
        router.push('/signin');
      }
    } catch {
      setError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="block w-full space-y-4"
       
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
            <MapPin className="size-5" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">إنشاء حساب جديد</h1>
            <p className="mt-1 text-sm text-slate-500">أدخل بياناتك للانضمام إلى نظام الإغاثة</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertIcon><AlertCircle /></AlertIcon>
            <AlertTitle className="text-right">{error}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="text-right">
              <FormLabel>الاسم الكامل</FormLabel>
              <FormControl>
                <Input placeholder="أدخل اسمك الثلاثي" autoComplete="name" {...field} className="text-right" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="text-right">
              <FormLabel>البريد الإلكتروني</FormLabel>
              <FormControl>
                <Input placeholder="example@relief.org" type="email" autoComplete="email" {...field} className="text-right" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="text-right">
              <FormLabel>كلمة المرور</FormLabel>
              <div className="relative">
                <Input
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...field}
                  className="text-right pl-10"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={passwordVisible ? 'إخفاء' : 'إظهار'}
                >
                  {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="passwordConfirmation"
          render={({ field }) => (
            <FormItem className="text-right">
              <FormLabel>تأكيد كلمة المرور</FormLabel>
              <div className="relative">
                <Input
                  type={confirmVisible ? 'text' : 'password'}
                  placeholder="أعد كتابة كلمة المرور"
                  autoComplete="new-password"
                  {...field}
                  className="text-right pl-10"
                />
                <button
                  type="button"
                  onClick={() => setConfirmVisible((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={confirmVisible ? 'إخفاء' : 'إظهار'}
                >
                  {confirmVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accept"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    id="terms"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer select-none">
                  أوافق على{' '}
                  <Link href="#" className="font-semibold text-blue-600 hover:text-blue-700">
                    سياسة الخصوصية
                  </Link>{' '}
                  لنظام الإغاثة.
                </label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isProcessing} className="w-full">
          {isProcessing ? (
            <LoaderCircle className="ml-2 size-4 animate-spin" />
          ) : null}
          {isProcessing ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link href="/signin" className="font-semibold text-blue-600 hover:text-blue-700">
            تسجيل الدخول
          </Link>
        </p>
      </form>
    </Form>
  );
}
