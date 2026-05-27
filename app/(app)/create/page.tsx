import CreateCourseForm from "./form";

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Create</p>
        <h1 className="mt-1 font-fredoka text-4xl font-[700] tracking-tight">
          New <span className="text-orange">course</span>
        </h1>
        <p className="mt-2 font-manrope text-sm text-ink-2">
          Fill in the details below and add at least one item to publish your course.
        </p>
      </div>

      <CreateCourseForm />
    </div>
  );
}
