import { Button } from "@repo/ui/components/button";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const createEquipmentSteps = [
	"Equipo",
	"Unidades",
	"Alquiler individual",
	"Revisión",
] as const;

interface CreateEquipmentWizardShellProps {
	currentStep: number;
	children: ReactNode;
	onBack: () => void;
	onCancel: () => void;
	onContinue: () => void;
	isFinalStep: boolean;
	isSubmitting: boolean;
}

export function CreateEquipmentWizardShell({
	currentStep,
	children,
	onBack,
	onCancel,
	onContinue,
	isFinalStep,
	isSubmitting,
}: CreateEquipmentWizardShellProps) {
	return (
		<div className="mx-auto w-full max-w-5xl p-4 lg:p-6">
			<header className="mb-6 space-y-2 lg:mb-8">
				<h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
					Nuevo equipo
				</h1>
				<p className="max-w-2xl text-muted-foreground text-sm sm:text-base">
					Crea el equipo, sus unidades iniciales y, si corresponde, su
					presentación para alquiler individual.
				</p>
			</header>

			<nav aria-label="Progreso de creación" className="mb-6 lg:mb-8">
				<ol className="grid grid-cols-4 gap-1 rounded-lg bg-muted/20 p-1 sm:gap-2 sm:p-2">
					{createEquipmentSteps.map((label, index) => {
						const isActive = index === currentStep;
						const isComplete = index < currentStep;

						return (
							<li
								key={label}
								aria-current={isActive ? "step" : undefined}
								className={cn(
									"flex min-w-0 items-center justify-center gap-2 rounded-md px-2 py-2.5 text-center text-xs sm:justify-start sm:px-3 sm:text-sm",
									isActive &&
										"bg-background font-medium text-primary shadow-xs",
									!isActive && "text-muted-foreground",
								)}
							>
								<span
									className={cn(
										"grid size-5 shrink-0 place-items-center rounded-full border text-[11px]",
										isActive &&
											"border-primary bg-primary text-primary-foreground",
										isComplete && "border-primary text-primary",
									)}
								>
									{isComplete ? <Check className="size-3" /> : index + 1}
								</span>
								<span className="hidden truncate sm:block">{label}</span>
							</li>
						);
					})}
				</ol>
				<p className="mt-2 text-center font-medium text-sm sm:hidden">
					{createEquipmentSteps[currentStep]}
				</p>
			</nav>

			<div
				className={cn(
					"rounded-xl border bg-background p-4 sm:p-6 lg:p-8",
					currentStep !== 1 && currentStep !== 2 && "min-h-80",
				)}
			>
				{children}
			</div>

			<footer className="sticky bottom-0 z-10 mt-6 flex flex-col-reverse gap-3 border-t py-4 sm:flex-row sm:items-center">
				<Button
					type="button"
					variant="ghost"
					onClick={onCancel}
					disabled={isSubmitting}
					className="sm:mr-auto"
				>
					Cancelar
				</Button>
				{currentStep > 0 ? (
					<Button
						type="button"
						variant="outline"
						onClick={onBack}
						disabled={isSubmitting}
					>
						Atrás
					</Button>
				) : null}
				{isFinalStep ? (
					<Button key="submit" type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Creando..." : "Crear equipo"}
					</Button>
				) : (
					<Button
						key="continue"
						type="button"
						onClick={onContinue}
						disabled={isSubmitting}
					>
						Continuar
					</Button>
				)}
			</footer>
		</div>
	);
}
