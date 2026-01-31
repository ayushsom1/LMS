import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// POST - Add students to batch (supports bulk add)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batch_id } = await params;
    const body = await request.json();
    const { students } = body; // Array of { email, name? }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'Students array is required' }, { status: 400 });
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validStudents = students.filter(
      (s: { email: string; name?: string }) => s.email && emailRegex.test(s.email)
    );

    if (validStudents.length === 0) {
      return NextResponse.json({ error: 'No valid emails provided' }, { status: 400 });
    }

    // Insert students (ignore duplicates)
    const studentsToInsert = validStudents.map((s: { email: string; name?: string }) => ({
      batch_id,
      email: s.email.toLowerCase().trim(),
      name: s.name || null,
    }));

    const { data, error } = await supabaseAdmin
      .from('batch_students')
      .upsert(studentsToInsert, { onConflict: 'batch_id,email', ignoreDuplicates: true })
      .select();

    if (error) throw error;

    return NextResponse.json({
      added: data?.length || 0,
      total: validStudents.length,
    });
  } catch (error) {
    console.error('Failed to add students:', error);
    return NextResponse.json({ error: 'Failed to add students' }, { status: 500 });
  }
}

// DELETE - Remove student from batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batch_id } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const email = searchParams.get('email');

    if (!studentId && !email) {
      return NextResponse.json({ error: 'Student ID or email is required' }, { status: 400 });
    }

    let query = supabaseAdmin.from('batch_students').delete().eq('batch_id', batch_id);

    if (studentId) {
      query = query.eq('id', studentId);
    } else if (email) {
      query = query.eq('email', email.toLowerCase());
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove student:', error);
    return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 });
  }
}
