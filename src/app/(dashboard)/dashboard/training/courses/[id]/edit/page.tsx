import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CourseForm } from '../../CourseForm';
import type { TrainingCourse } from '@/features/training';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCoursePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from('training_courses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !course) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">Edit Course</h1>
        <p className="text-muted">{course.name}</p>
      </div>

      {/* Form */}
      <CourseForm course={course as TrainingCourse} />
    </div>
  );
}
