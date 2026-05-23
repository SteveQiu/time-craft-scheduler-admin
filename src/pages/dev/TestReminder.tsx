import { useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import NotFound from "@/pages/NotFound";

const TestReminder = () => {
  const hostname = window.location.hostname;

  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return <NotFound />;
  }

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("Appointment Confirmed! 📅");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase.functions.invoke("reminder-smtp", {
      body: {
        to,
        subject,
        appointmentTime: appointmentTime || undefined,
      },
    });

    if (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to send reminder.",
      });
      setIsSubmitting(false);
      return;
    }

    setMessage({
      type: "success",
      text: `Reminder sent to ${to}`,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-amber-600">⚠️ DEV ONLY</p>
        <h1 className="mt-3 text-3xl font-semibold">SMTP Reminder Test</h1>
        <p className="mt-2 font-mono text-sm text-slate-600">
          Localhost-only page for manual reminder-smtp edge function checks.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block font-mono text-sm text-slate-700">to</span>
            <input
              type="email"
              required
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm outline-none transition focus:border-slate-500"
              placeholder="test@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-mono text-sm text-slate-700">subject</span>
            <input
              type="text"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-mono text-sm text-slate-700">appointmentTime</span>
            <input
              type="text"
              value={appointmentTime}
              onChange={(event) => setAppointmentTime(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm outline-none transition focus:border-slate-500"
              placeholder="e.g. May 24, 2026 at 10:00 AM"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 font-mono text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send Reminder"}
          </button>
        </form>

        {message ? (
          <p
            className={`mt-5 rounded-md border px-3 py-2 font-mono text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default TestReminder;
