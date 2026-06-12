import { SetupWizard } from "@/components/onboarding/SetupWizard";

export const metadata = { title: "Welcome to Busted Board" };

export default function SetupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <SetupWizard />
    </div>
  );
}
