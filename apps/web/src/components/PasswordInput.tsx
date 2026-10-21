'use client';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

// Parol maydoni: ko'z tugmasi bilan parolni ko'rsatish/yashirish.
export function PasswordInput({ className = '', ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${className} w-full pr-11`} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
