"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlatformPicker } from "./PlatformPicker";
import { InitialRatings } from "./InitialRatings";
import { VibePicker } from "./VibePicker";

const STEPS = ["Platforms", "Rate a Few", "Your Vibe"] as const;

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function savePlatforms() {
    setSaving(true);
    try {
      await fetch("/api/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: selectedPlatforms }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue() {
    if (step === 0) {
      if (selectedPlatforms.length === 0) return;
      await savePlatforms();
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-primary mb-1">Busted Board</h1>
        <p className="text-sm text-muted-foreground">Let&rsquo;s set you up.</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-8" role="list" aria-label="Setup steps">
        {STEPS.map((name, i) => (
          <div key={name} className="flex items-center gap-2" role="listitem">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-primary/40 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 transition-colors ${i < step ? "bg-primary/40" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {step === 0 && (
          <PlatformPicker
            selected={selectedPlatforms}
            onChange={setSelectedPlatforms}
          />
        )}
        {step === 1 && <InitialRatings />}
        {step === 2 && <VibePicker />}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        {step > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            className="text-muted-foreground"
          >
            ← Back
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          {step > 0 && step < 2 && (
            <Button variant="ghost" size="sm" onClick={handleContinue} className="text-muted-foreground">
              Skip
            </Button>
          )}
          <Button
            onClick={handleContinue}
            disabled={step === 0 && selectedPlatforms.length === 0 || saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Saving…" : step === 2 ? "Let's Go! →" : "Continue →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
