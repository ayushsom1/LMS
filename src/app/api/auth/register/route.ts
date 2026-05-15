import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/server';
import { setSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        name: String(name).trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        role: 'student',
      })
      .select('id, name, email, role')
      .single();

    if (error || !user) throw error;

    await setSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
