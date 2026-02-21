import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Step {
  number: number;
  title: string;
  status: "pending" | "processing" | "completed";
}

interface StepProgressProps {
  steps: Step[];
}

const StepProgress = ({ steps }: StepProgressProps) => {
  const completedCount = steps.filter(s => s.status === "completed").length;
  const processingCount = steps.filter(s => s.status === "processing").length;
  const progressValue = ((completedCount + processingCount * 0.5) / steps.length) * 100;

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">분석 진행 상황</h3>
        <span className="text-sm font-medium text-primary">{completedCount} / {steps.length} 완료</span>
      </div>
      
      <div className="mb-6">
        <Progress value={progressValue} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {progressValue === 100 
            ? "✓ 전체 분석 완료" 
            : processingCount > 0 
              ? `STEP ${steps.find(s => s.status === "processing")?.number} 분석 중...`
              : "분석 대기 중"}
        </p>
      </div>

      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 relative",
                  step.status === "completed" && "bg-primary text-primary-foreground shadow-lg",
                  step.status === "processing" && "bg-accent text-accent-foreground",
                  step.status === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                {step.status === "processing" && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-accent/50" />
                )}
                {step.status === "completed" ? (
                  <Check className="w-5 h-5" />
                ) : step.status === "processing" ? (
                  <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[70px] leading-tight",
                  step.status === "completed" && "text-primary font-semibold",
                  step.status === "processing" && "text-accent font-semibold",
                  step.status === "pending" && "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 mx-1 h-0.5 min-w-[20px] relative">
                <div className="absolute inset-0 bg-muted rounded-full" />
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500",
                    steps[index + 1].status === "completed" && "w-full",
                    steps[index + 1].status === "processing" && "w-1/2",
                    steps[index + 1].status === "pending" && "w-0"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepProgress;
