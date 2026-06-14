'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircle, MapPin } from 'lucide-react';
import { signIn } from 'next-auth/react';
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
import { saveCurrentUser } from '@/app/api/project/helpers/helpers';
import { getSigninSchema, SigninSchemaType } from '../forms/signin-schema';

export default function Page() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(getSigninSchema()),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(values: SigninSchemaType) {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      if (response?.error) {
        try {
          const errorData = JSON.parse(response.error);
          setError(errorData.message);
        } catch {
          setError('بريد إلكتروني أو كلمة مرور غير صحيحة');
        }
      } else {
        const session = await fetch('/api/auth/session').then((r) => r.json());

        const roleSlug = session?.user?.roleSlug ?? '';
        const roleName = session?.user?.roleName ?? '';
        const role: 'admin' | 'user' =
          roleSlug === 'admin' || roleName?.toLowerCase() === 'admin' ? 'admin' : 'user';

        saveCurrentUser({
          id: session.user.id,
          email: session.user.email,
          role,
        });

        router.push('/dashboard');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="block w-full space-y-5"
       
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
            <MapPin className="size-5" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              تسجيل الدخول
            </h1>
            <p className="mt-1 text-sm text-slate-500">نظام الإغاثة الموحد — AidMap</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle className="text-right">{error}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="text-right">
              <FormLabel>البريد الإلكتروني</FormLabel>
              <FormControl>
                <Input
                  placeholder="أدخل بريدك الإلكتروني"
                  type="email"
                  autoComplete="email"
                  {...field}
                  className="text-right"
                />
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
              <div className="flex items-center justify-between gap-2.5">
                <FormLabel>كلمة المرور</FormLabel>
                <Link
                  href="/reset-password"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <Input
                  placeholder="أدخل كلمة المرور"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...field}
                  className="text-right pl-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-7 ms-1.5 bg-transparent!"
                  aria-label={passwordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {passwordVisible ? (
                    <EyeOff className="text-muted-foreground" />
                  ) : (
                    <Eye className="text-muted-foreground" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(!!checked)}
              />
              <label
                htmlFor="remember-me"
                className="text-sm leading-none text-muted-foreground cursor-pointer"
              >
                تذكرني على هذا الجهاز
              </label>
            </div>
          )}
        />

        <Button type="submit" disabled={isProcessing} className="w-full">
          {isProcessing ? (
            <LoaderCircle className="ml-2 size-4 animate-spin" />
          ) : null}
          {isProcessing ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          ليس لديك حساب؟{' '}
          <Link
            href="/signup"
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            إنشاء حساب جديد
          </Link>
        </p>
      </form>
    </Form>
  );
}
