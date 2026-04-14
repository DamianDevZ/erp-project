import { CourseForm } from '../CourseForm';

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">New Training Course</h1>
        <p className="text-muted">Add a new course to the training catalog</p>
      </div>

      {/* Form */}
      <CourseForm />
    </div>
  );
}
