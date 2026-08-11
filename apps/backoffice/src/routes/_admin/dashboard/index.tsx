import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import {
	ArrowRight,
	BadgeDollarSign,
	CheckCircle2,
	Clock,
	FileText,
	LayoutGrid,
	MapPin,
	Rocket,
	Warehouse,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_admin/dashboard/")({
	beforeLoad: async () => {
		throw redirect({ to: "/dashboard/calendar" });
	},
	component: DashboardHome,
});

type StepStatus = "LOCKED" | "IN_PROGRESS" | "COMPLETED";

interface StepConfig {
	id: string;
	title: string;
	description: string;
	icon: React.ElementType;
	path: string; // The URL to navigate to
}

// Static configuration for the steps (UI text, icons, routes)
const STOREFRONT_STEPS: StepConfig[] = [
	{
		id: "billing-unit",
		title: "Define tu Tipo de Alquiler",
		description: "Configura si operarás por día o por hora.",
		icon: MapPin,
		path: "/dashboard/settings",
	},
	{
		id: "location",
		title: "Define tu Ubicación",
		description:
			"Agrega la dirección de tu negocio para habilitar entregas locales y zonas de envío.",
		icon: MapPin,
		path: "/dashboard/branches",
	},
	{
		id: "hours",
		title: "Establece tu Horario de Operación",
		description:
			"Indica a tus clientes cuándo estás disponible para atender o hacer entregas.",
		icon: Clock,
		path: `/dashboard/branches/locationId/`,
	},
	{
		id: "catalog",
		title: "Organiza tu Catálogo",
		description:
			"Crea categorías para estructurar tu menú o lista de productos.",
		icon: LayoutGrid,
		path: "/dashboard/catalog/categories",
	},
	{
		id: "product",
		title: "Crea tu Primer Producto",
		description:
			"Agrega tu primer artículo al catálogo para comenzar a construir tu inventario.",
		icon: FileText,
		path: "/dashboard/catalog/products",
	},
	{
		id: "pricing",
		title: "Define el Precio de tu Producto",
		description:
			"Asigna una tarifa por día u hora a tu producto para que pueda ser publicado.",
		icon: BadgeDollarSign,
		path: "/dashboard/catalog/products/productId",
	},
	{
		id: "assets",
		title: "Agrega Unidades Físicas",
		description:
			"Registra las unidades físicas asociadas a tu producto, como bicicletas, habitaciones o equipos específicos.",
		icon: Warehouse,
		path: "/dashboard/catalog/products/productId",
	},
	{
		id: "golive",
		title: "Publica tu Tienda",
		description: "Revisa tu configuración y lanza tu tienda al público.",
		icon: Rocket,
		path: "/setup/go-live",
	},
];

const createInitialStepMap = (): Map<string, StepStatus> => {
	const map = new Map<string, StepStatus>();

	STOREFRONT_STEPS.forEach((step, index) => {
		if (index === 0) {
			// Initialize the first step ('location') as ACTIVE
			map.set(step.id, "IN_PROGRESS");
		} else {
			// All other steps are LOCKED
			map.set(step.id, "LOCKED");
		}
	});

	return map;
};

function DashboardHome() {
	const navigate = useNavigate();

	const [completedCount] = useState(0);
	const [stepStatuses] =
		useState<Map<string, StepStatus>>(createInitialStepMap);

	const handleNavigation = (path: string) => {
		navigate({ to: path });
	};

	return (
		<>
			<header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
				<h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
			</header>
			<main className="overflow-y-auto p-6">
				<div className="min-h-screen bg-gray-50 p-4 md:p-8">
					<div className="max-w-4xl mx-auto">
						{/* Header Section */}
						<div className="mb-8">
							<h1 className="text-2xl font-bold text-gray-900 tracking-tight">
								Finalize Your Storefront Setup
							</h1>
							<div className="mt-2 flex items-center justify-between text-sm text-gray-600">
								<span className="font-medium uppercase tracking-wider">
									{completedCount} OF {STOREFRONT_STEPS.length} STEPS COMPLETED
								</span>
								{/* Progress Bar */}
								<div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
									<div
										className="h-full bg-netrual-600 transition-all duration-500"
										style={{
											width: `${(completedCount / STOREFRONT_STEPS.length) * 100}%`,
										}}
									/>
								</div>
							</div>
						</div>

						{/* Steps Grid */}
						<div className="grid grid-cols-1 gap-4">
							{STOREFRONT_STEPS.map((step) => (
								<StepCard
									key={step.id}
									config={step}
									status={stepStatuses.get(step.id) || "LOCKED"}
									onNavigate={handleNavigation}
								/>
							))}
						</div>
					</div>
				</div>
			</main>
		</>
	);
}

interface StepCardProps {
	config: StepConfig;
	status: StepStatus;
	onNavigate: (path: string) => void;
}

const StepCard: React.FC<StepCardProps> = ({ config, status, onNavigate }) => {
	const isLocked = status === "LOCKED";
	const isActive = status === "IN_PROGRESS";
	const isCompleted = status === "COMPLETED";

	const handleCardClick = () => {
		if (!isLocked) {
			onNavigate(config.path);
		}
	};

	return (
		<Card
			className={clsx(
				"transition-all duration-200",
				!isLocked
					? "cursor-pointer hover:border-gray-400 hover:shadow-md"
					: "opacity-60 bg-gray-50 cursor-not-allowed",
				isActive
					? "border-neutral-500 ring-2 ring-neutral-100 shadow-sm"
					: "border-gray-200",
			)}
			onClick={handleCardClick}
		>
			<CardHeader className="flex flex-row items-start gap-4 space-y-0">
				<div
					className={`p-2 rounded-md ${isActive ? "bg-neutral-100 text-neutral-600" : "bg-gray-100 text-gray-600"}`}
				>
					<config.icon className="h-6 w-6" />
				</div>
				<div className="flex-1">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base font-medium">
							{config.title}
						</CardTitle>
						{isLocked && (
							<Badge
								variant="outline"
								className="text-gray-400 border-gray-300 text-xs"
							>
								LOCKED
							</Badge>
						)}
						{isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
					</div>
					<CardDescription className="mt-1 text-sm text-gray-500">
						{config.description}
					</CardDescription>
				</div>
			</CardHeader>

			{isActive && (
				<CardContent className="p-4 pt-0 flex justify-end">
					<Button
						size="sm"
						className="bg-black hover:bg-gray-800 text-white"
						onClick={(e) => {
							e.stopPropagation();
							onNavigate(config.path);
						}}
					>
						Continue Setup
						<ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			)}
		</Card>
	);
};
